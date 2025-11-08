const pool = require('../config/db');

// Get available leave forms based on staff type
const getLeaveFormTemplates = async (req, res) => {
  try {
    const { staffType } = req.query;
    const facultyData = req.user;
    
    // Determine staff type if not provided
    const finalStaffType = staffType || facultyData.facultyType || 'Teaching';
    
    const [templates] = await pool.execute(
      'SELECT * FROM leave_form_templates WHERE staff_type = ?',
      [finalStaffType]
    );
    
    const formattedTemplates = templates.map(template => {
      try {
        let leaveCategories, formFields;
        
        // Handle leave_categories
        if (typeof template.leave_categories === 'string') {
          leaveCategories = JSON.parse(template.leave_categories || '[]');
        } else if (Array.isArray(template.leave_categories)) {
          leaveCategories = template.leave_categories;
        } else {
          leaveCategories = [];
        }
        
        // Handle form_fields
        if (typeof template.form_fields === 'string') {
          formFields = JSON.parse(template.form_fields || '[]');
        } else if (Array.isArray(template.form_fields)) {
          formFields = template.form_fields;
        } else {
          formFields = [];
        }
        
        return {
          id: template.id,
          formName: template.form_name,
          staffType: template.staff_type,
          leaveCategories,
          formFields
        };
      } catch (parseError) {
        console.error('JSON parse error for template:', template.id, parseError);
        return {
          id: template.id,
          formName: template.form_name,
          staffType: template.staff_type,
          leaveCategories: [],
          formFields: []
        };
      }
    });
    
    res.json({
      success: true,
      staffType: finalStaffType,
      templates: formattedTemplates
    });
  } catch (error) {
    console.error('Get leave form templates error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get form fields for a specific leave category
const getFormFields = async (req, res) => {
  try {
    const { leaveCategory, staffType } = req.query;
    const facultyData = req.user;
    
    // Determine staff type
    const finalStaffType = staffType || facultyData.facultyType || 'Teaching';
    
    // Find template that supports this leave category
    const [templates] = await pool.execute(
      'SELECT * FROM leave_form_templates WHERE staff_type = ? AND JSON_CONTAINS(leave_categories, ?)',
      [finalStaffType, JSON.stringify(leaveCategory)]
    );
    
    if (templates.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No form template found for this leave category' 
      });
    }
    
    const template = templates[0];
    let formFields;
    try {
      // Handle case where form_fields might be already an object
      if (typeof template.form_fields === 'string') {
        formFields = JSON.parse(template.form_fields || '[]');
      } else if (Array.isArray(template.form_fields)) {
        formFields = template.form_fields;
      } else {
        formFields = [];
      }
    } catch (parseError) {
      console.error('JSON parse error for form fields:', template.id, parseError);
      formFields = [];
    }
    
    // Auto-fill fields with faculty data
    const autoFilledFields = formFields.map(field => {
      const fieldCopy = { ...field };
      
      if (field.auto_fill) {
        switch (field.auto_fill) {
          case 'faculty_name':
            fieldCopy.defaultValue = `${facultyData.firstName} ${facultyData.lastName}`;
            break;
          case 'employee_id':
            fieldCopy.defaultValue = facultyData.employeeId || '';
            break;
          case 'department':
            fieldCopy.defaultValue = facultyData.department || '';
            break;
          case 'designation':
          case 'faculty_designation':
            fieldCopy.defaultValue = facultyData.designation || '';
            break;
          case 'current_date':
            fieldCopy.defaultValue = new Date().toISOString().split('T')[0];
            break;
          case 'pending':
            fieldCopy.defaultValue = 'Pending';
            break;
        }
      }
      
      return fieldCopy;
    });
    
    res.json({
      success: true,
      templateId: template.id,
      formName: template.form_name,
      leaveCategory,
      staffType: finalStaffType,
      formFields: autoFilledFields
    });
  } catch (error) {
    console.error('Get form fields error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Submit leave application
const submitLeaveApplication = async (req, res) => {
  try {
    const { templateId, leaveCategory, formData } = req.body;
    const facultyId = req.user.facultyId;
    
    // Calculate leave days if date fields are present
    let calculatedDays = 0;
    const startDateField = formData.leave_start || formData.leave_start_date;
    const endDateField = formData.leave_end || formData.leave_end_date;
    
    if (startDateField && endDateField) {
      const startDate = new Date(startDateField);
      const endDate = new Date(endDateField);
      calculatedDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // Auto-fill calculated days in form data
      if (formData.no_of_days_leave !== undefined) {
        formData.no_of_days_leave = calculatedDays;
      }
      if (formData.no_of_leave_days !== undefined) {
        formData.no_of_leave_days = calculatedDays;
      }
    }
    
    // Ensure status is set to Pending and application date is current date
    formData.status = 'Pending';
    formData.application_date = new Date().toISOString().split('T')[0];
    
    // Insert leave application
    const [result] = await pool.execute(
      'INSERT INTO leave_applications (faculty_id, template_id, leave_category, form_data, calculated_days, status, created_at) VALUES (?, ?, ?, ?, ?, "Pending", NOW())',
      [facultyId, templateId, leaveCategory, JSON.stringify(formData), calculatedDays]
    );
    
    res.json({
      success: true,
      message: 'Leave application submitted successfully',
      applicationId: result.insertId,
      calculatedDays
    });
  } catch (error) {
    console.error('Submit leave application error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get faculty's leave applications
const getMyLeaveApplications = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    
    const [applications] = await pool.execute(
      `SELECT la.*, lft.form_name, lft.staff_type,
              f.firstName as approvedByFirstName, f.lastName as approvedByLastName
       FROM leave_applications la 
       JOIN leave_form_templates lft ON la.template_id = lft.id
       LEFT JOIN faculty f ON la.approved_by = f.id 
       WHERE la.faculty_id = ? 
       ORDER BY la.created_at DESC`,
      [facultyId]
    );
    
    const formattedApplications = applications.map(app => {
      try {
        if (app.form_data && typeof app.form_data === 'string') {
          return { ...app, form_data: JSON.parse(app.form_data || '{}') };
        }
        if (app.form_data && typeof app.form_data === 'object') {
          return { ...app, form_data: app.form_data };
        }
        return { ...app, form_data: {} };
      } catch (parseError) {
        console.error('JSON parse error for application:', app.id, parseError);
        return { ...app, form_data: {} };
      }
    });
    
    res.json({
      success: true,
      applications: formattedApplications
    });
  } catch (error) {
    console.error('Get my leave applications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all leave applications (for admin)
const getAllLeaveApplications = async (req, res) => {
  try {
    const [applications] = await pool.execute(
      `SELECT la.*, lft.form_name, lft.staff_type,
              fac.firstName, fac.lastName, fac.department, fac.employeeId,
              f.firstName as approvedByFirstName, f.lastName as approvedByLastName
       FROM leave_applications la 
       JOIN leave_form_templates lft ON la.template_id = lft.id
       JOIN faculty fac ON la.faculty_id = fac.id
       LEFT JOIN faculty f ON la.approved_by = f.id 
       ORDER BY la.created_at DESC`
    );
    
    const formattedApplications = applications.map(app => {
      try {
        if (app.form_data && typeof app.form_data === 'string') {
          return { ...app, form_data: JSON.parse(app.form_data || '{}') };
        }
        if (app.form_data && typeof app.form_data === 'object') {
          return { ...app, form_data: app.form_data };
        }
        return { ...app, form_data: {} };
      } catch (parseError) {
        console.error('JSON parse error for application:', app.id, parseError);
        return { ...app, form_data: {} };
      }
    });
    
    res.json({
      success: true,
      applications: formattedApplications
    });
  } catch (error) {
    console.error('Get all leave applications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Review leave application
const reviewLeaveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, rejectionReason } = req.body;
    const { facultyId } = req.user;
    
    let query, params;
    
    if (status === 'Rejected') {
      query = `UPDATE leave_applications 
               SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ? 
               WHERE id = ?`;
      params = [status, facultyId, rejectionReason, applicationId];
    } else {
      query = `UPDATE leave_applications 
               SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL 
               WHERE id = ?`;
      params = [status, facultyId, applicationId];
    }
    
    const [result] = await pool.execute(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Leave application not found' });
    }

    // Log admin action with detailed information
    const [appDetails] = await pool.execute(
      `SELECT la.leave_category, la.form_data, f.firstName, f.lastName 
       FROM leave_applications la 
       JOIN faculty f ON la.faculty_id = f.id 
       WHERE la.id = ?`,
      [applicationId]
    );
    
    if (appDetails.length > 0) {
      const appInfo = appDetails[0];
      let formData = {};
      try {
        formData = typeof appInfo.form_data === 'string' ? JSON.parse(appInfo.form_data) : appInfo.form_data;
      } catch (e) {
        formData = {};
      }
      
      const startDate = formData.leave_start || formData.leave_start_date;
      const endDate = formData.leave_end || formData.leave_end_date;
      const dateRange = startDate && endDate ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})` : '';
      
      const logDetails = `${status} ${appInfo.leave_category} application for ${appInfo.firstName} ${appInfo.lastName}${dateRange}${rejectionReason ? '. Reason: ' + rejectionReason : ''}`;
      
      await pool.execute(
        `INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_item_id, details) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          facultyId,
          status === 'Approved' ? 'leave_approved' : 'leave_rejected',
          appDetails[0].faculty_id || null,
          applicationId,
          logDetails
        ]
      );
    }
    
    res.json({ success: true, message: 'Leave application updated successfully' });
  } catch (error) {
    console.error('Review leave application error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete leave application (faculty can delete own Pending applications; admins can delete any)
const deleteLeaveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const requester = req.user; // contains facultyId and role

    // Fetch application to verify ownership and status
    const [rows] = await pool.execute(
      `SELECT id, faculty_id, status FROM leave_applications WHERE id = ?`,
      [applicationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave application not found' });
    }

    const app = rows[0];

    // Permission checks
    const isAdmin = requester?.role === 'admin';
    const isOwner = app.faculty_id === requester.facultyId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this application' });
    }

    // If faculty (non-admin), only allow delete when Pending
    if (!isAdmin && app.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending applications can be deleted' });
    }

    await pool.execute(`DELETE FROM leave_applications WHERE id = ?`, [applicationId]);

    return res.json({ success: true, message: 'Leave application deleted successfully' });
  } catch (error) {
    console.error('Delete leave application error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getLeaveFormTemplates,
  getFormFields,
  submitLeaveApplication,
  getMyLeaveApplications,
  getAllLeaveApplications,
  reviewLeaveApplication,
  deleteLeaveApplication
};