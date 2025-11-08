const enhancedAutoFillService = require('../services/enhancedAutoFillService');
const db = require('../config/db');

class EnhancedAutoFillController {
  // Enhanced auto-fill with comprehensive validation
  async autoFillWithValidation(req, res) {
    try {
      const { formType, staffType, facultyData, leaveData } = req.body;
      
      const formData = {
        formType,
        staffType,
        facultyData,
        leaveData
      };

      const result = await enhancedAutoFillService.autoFillPDFWithValidation(formData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Auto-fill failed',
          error: result.error,
          errors: result.errors,
          warnings: result.warnings
        });
      }

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${formType}_${staffType}_filled.pdf"`);
      
      // Add validation info to headers
      res.setHeader('X-Validation-Errors', result.errors.length.toString());
      res.setHeader('X-Validation-Warnings', result.warnings.length.toString());
      res.setHeader('X-Fields-Processed', result.fieldsProcessed.toString());
      
      res.send(Buffer.from(result.pdfBytes));

    } catch (error) {
      console.error('Error in enhanced auto-fill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-fill PDF form',
        error: error.message
      });
    }
  }

  // Auto-fill with current user and validation
  async autoFillCurrentUserWithValidation(req, res) {
    try {
      const userId = req.user?.id;
      const { formType, staffType, leaveData } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Fetch current user data
      const facultyQuery = 'SELECT * FROM users WHERE id = ?';
      const [facultyRows] = await db.execute(facultyQuery, [userId]);
      
      if (facultyRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const facultyData = facultyRows[0];
      
      const formData = {
        formType,
        staffType,
        facultyData,
        leaveData
      };

      const result = await enhancedAutoFillService.autoFillPDFWithValidation(formData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Auto-fill failed',
          error: result.error,
          errors: result.errors,
          warnings: result.warnings
        });
      }

      // Set response headers with validation info
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="leave_form_filled.pdf"`);
      res.setHeader('X-Validation-Errors', result.errors.length.toString());
      res.setHeader('X-Validation-Warnings', result.warnings.length.toString());
      res.setHeader('X-Fields-Processed', result.fieldsProcessed.toString());
      
      res.send(Buffer.from(result.pdfBytes));

    } catch (error) {
      console.error('Error in enhanced auto-fill with current user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-fill PDF form',
        error: error.message
      });
    }
  }

  // Auto-fill from leave application ID with validation
  async autoFillFromLeaveId(req, res) {
    try {
      const { leaveId, formType, staffType } = req.body;
      
      if (!leaveId) {
        return res.status(400).json({
          success: false,
          message: 'Leave ID is required'
        });
      }

      // Fetch leave application with user data
      const query = `
        SELECT la.*, u.firstName, u.lastName, u.designation, u.department, 
               u.employeeId, u.phone, u.address, u.email
        FROM leave_applications la 
        JOIN users u ON la.user_id = u.id 
        WHERE la.id = ?
      `;
      
      const [rows] = await db.execute(query, [leaveId]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Leave application not found'
        });
      }

      const data = rows[0];
      
      const facultyData = {
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        designation: data.designation,
        department: data.department,
        employeeId: data.employeeId,
        phone: data.phone,
        address: data.address,
        email: data.email
      };

      const leaveData = {
        leaveType: data.leave_type,
        startDate: data.leave_start_date,
        endDate: data.leave_end_date,
        reason: data.reason,
        noOfDaysLeave: data.no_of_days_leave,
        contactNo: data.phone,
        addressLine1: data.address
      };

      // Auto-detect form type and staff type if not provided
      let finalFormType = formType;
      let finalStaffType = staffType;
      
      if (!finalStaffType) {
        finalStaffType = this.detectStaffType(facultyData);
      }
      
      if (!finalFormType) {
        finalFormType = this.autoDetectFormType(leaveData.leaveType, finalStaffType);
      }

      const formData = {
        formType: finalFormType,
        staffType: finalStaffType,
        facultyData,
        leaveData
      };

      const result = await enhancedAutoFillService.autoFillPDFWithValidation(formData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Auto-fill failed',
          error: result.error,
          errors: result.errors,
          warnings: result.warnings
        });
      }

      // Set response headers with validation info
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="leave_form_${leaveId}_filled.pdf"`);
      res.setHeader('X-Validation-Errors', result.errors.length.toString());
      res.setHeader('X-Validation-Warnings', result.warnings.length.toString());
      res.setHeader('X-Fields-Processed', result.fieldsProcessed.toString());
      
      res.send(Buffer.from(result.pdfBytes));

    } catch (error) {
      console.error('Error in auto-fill from leave ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-fill PDF form',
        error: error.message
      });
    }
  }

  // Validate form data without filling
  async validateFormData(req, res) {
    try {
      const { formType, staffType, facultyData, leaveData } = req.body;
      
      const formData = {
        formType,
        staffType,
        facultyData,
        leaveData
      };

      // Clear previous validation
      enhancedAutoFillService.clearValidation();
      
      // Validate input data
      const validationResult = enhancedAutoFillService.validateInputData(formData);
      
      // Get form positions to check field availability
      let positionsAvailable = false;
      let fieldCount = 0;
      
      try {
        const positions = enhancedAutoFillService.getFormPositions(formType, staffType);
        positionsAvailable = true;
        fieldCount = Object.keys(positions).length;
      } catch (error) {
        validationResult.errors.push(`Form positions not available: ${error.message}`);
      }

      // Check template availability
      let templateAvailable = false;
      try {
        const templatePath = enhancedAutoFillService.getTemplatePath(formType, staffType);
        templateAvailable = require('fs').existsSync(templatePath);
        if (!templateAvailable) {
          validationResult.errors.push('PDF template not found');
        }
      } catch (error) {
        validationResult.errors.push(`Template error: ${error.message}`);
      }

      res.json({
        success: validationResult.isValid && positionsAvailable && templateAvailable,
        validation: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: enhancedAutoFillService.warnings
        },
        formInfo: {
          formType,
          staffType,
          templateAvailable,
          positionsAvailable,
          fieldCount
        },
        dataInfo: {
          facultyDataProvided: !!facultyData,
          leaveDataProvided: !!leaveData,
          requiredFieldsPresent: validationResult.isValid
        }
      });

    } catch (error) {
      console.error('Error validating form data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate form data',
        error: error.message
      });
    }
  }

  // Get validation report for a specific form
  async getValidationReport(req, res) {
    try {
      const report = enhancedAutoFillService.getValidationReport();
      
      res.json({
        success: true,
        report
      });

    } catch (error) {
      console.error('Error getting validation report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get validation report',
        error: error.message
      });
    }
  }

  // Batch auto-fill with validation
  async batchAutoFillWithValidation(req, res) {
    try {
      const { leaveIds } = req.body;
      
      if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Leave IDs array is required'
        });
      }

      const results = [];
      const errors = [];

      for (const leaveId of leaveIds) {
        try {
          // Fetch leave application with user data
          const query = `
            SELECT la.*, u.firstName, u.lastName, u.designation, u.department, 
                   u.employeeId, u.phone, u.address
            FROM leave_applications la 
            JOIN users u ON la.user_id = u.id 
            WHERE la.id = ?
          `;
          
          const [rows] = await db.execute(query, [leaveId]);
          
          if (rows.length === 0) {
            errors.push({ leaveId, error: 'Leave application not found' });
            continue;
          }

          const data = rows[0];
          
          const facultyData = {
            firstName: data.firstName,
            lastName: data.lastName,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            designation: data.designation,
            department: data.department,
            employeeId: data.employeeId,
            phone: data.phone,
            address: data.address
          };

          const leaveData = {
            leaveType: data.leave_type,
            startDate: data.leave_start_date,
            endDate: data.leave_end_date,
            reason: data.reason,
            noOfDaysLeave: data.no_of_days_leave
          };

          // Auto-detect form type and staff type
          const staffType = this.detectStaffType(facultyData);
          const formType = this.autoDetectFormType(leaveData.leaveType, staffType);

          const formData = {
            formType,
            staffType,
            facultyData,
            leaveData
          };

          const result = await enhancedAutoFillService.autoFillPDFWithValidation(formData);
          
          results.push({
            leaveId,
            success: result.success,
            formType,
            staffType,
            errors: result.errors || [],
            warnings: result.warnings || [],
            fieldsProcessed: result.fieldsProcessed || 0
          });

        } catch (error) {
          errors.push({ leaveId, error: error.message });
        }
      }

      res.json({
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors
      });

    } catch (error) {
      console.error('Error in batch auto-fill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process batch auto-fill',
        error: error.message
      });
    }
  }

  // Helper method to detect staff type
  detectStaffType(facultyData) {
    const teachingDesignations = ['professor', 'assistant professor', 'associate professor', 'lecturer'];
    const designation = (facultyData.designation || '').toLowerCase();
    
    if (teachingDesignations.some(d => designation.includes(d))) {
      return 'Teaching';
    }
    return 'Non-Teaching';
  }

  // Helper method to auto-detect form type
  autoDetectFormType(leaveType, staffType) {
    const casualLeaveTypes = ['Casual Leave', 'Compensatory Leave', 'RH Leave', 'Special Leave', 'Sick Leave'];
    const earnedLeaveTypes = ['Earned Leave', 'Commuted Leave', 'Half Pay Leave', 'Extraordinary Leave'];
    
    if (casualLeaveTypes.includes(leaveType)) {
      return 'CL_Form';
    } else if (earnedLeaveTypes.includes(leaveType)) {
      return 'EL_Form';
    } else {
      return staffType === 'Teaching' ? 'Leave_Form' : 'CL_Form';
    }
  }
}

module.exports = new EnhancedAutoFillController();