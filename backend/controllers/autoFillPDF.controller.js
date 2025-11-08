const autoFillPDFService = require('../services/autoFillPDFService');
const db = require('../config/db');

class AutoFillPDFController {
  // Auto-fill PDF form with faculty and leave data
  async autoFillForm(req, res) {
    try {
      const { formType, staffType, facultyData, leaveData } = req.body;
      
      if (!formType || !staffType || !facultyData || !leaveData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: formType, staffType, facultyData, leaveData'
        });
      }

      const pdfBytes = await autoFillPDFService.autoFillPDFForm(
        formType,
        staffType,
        facultyData,
        leaveData
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${formType}_${staffType}_filled.pdf"`);
      res.send(Buffer.from(pdfBytes));

    } catch (error) {
      console.error('Error auto-filling PDF form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-fill PDF form',
        error: error.message
      });
    }
  }

  // Smart auto-fill with automatic detection
  async smartAutoFill(req, res) {
    try {
      const { facultyId, leaveId } = req.body;
      
      if (!facultyId || !leaveId) {
        return res.status(400).json({
          success: false,
          message: 'Faculty ID and Leave ID are required'
        });
      }

      // Fetch faculty data
      const facultyQuery = 'SELECT * FROM faculty WHERE id = ?';
      const [facultyRows] = await db.execute(facultyQuery, [facultyId]);
      
      if (facultyRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }

      // Fetch leave data
      const leaveQuery = 'SELECT * FROM leave_applications WHERE id = ?';
      const [leaveRows] = await db.execute(leaveQuery, [leaveId]);
      
      if (leaveRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Leave application not found'
        });
      }

      const facultyData = facultyRows[0];
      const leaveData = leaveRows[0];

      const result = await autoFillPDFService.smartAutoFillForm(facultyData, leaveData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="leave_form_${leaveId}_filled.pdf"`);
      res.send(Buffer.from(result.pdfBytes));

    } catch (error) {
      console.error('Error in smart auto-fill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-fill PDF form',
        error: error.message
      });
    }
  }

  // Auto-fill with current user data
  async autoFillWithCurrentUser(req, res) {
    try {
      const userId = req.user?.facultyId;
      const { leaveData, formType, staffType } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!leaveData) {
        return res.status(400).json({
          success: false,
          message: 'Leave data is required'
        });
      }

      // Fetch current user data
      const facultyQuery = 'SELECT * FROM faculty WHERE id = ?';
      const [facultyRows] = await db.execute(facultyQuery, [userId]);
      
      if (facultyRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const facultyData = facultyRows[0];

      let result;
      if (formType && staffType) {
        // Use specified form type and staff type
        const pdfBytes = await autoFillPDFService.autoFillPDFForm(
          formType,
          staffType,
          facultyData,
          leaveData
        );
        result = { pdfBytes, formType, staffType };
      } else {
        // Use smart auto-fill
        result = await autoFillPDFService.smartAutoFillForm(facultyData, leaveData);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="leave_form_auto_filled.pdf"`);
      res.send(Buffer.from(result.pdfBytes));

    } catch (error) {
      console.error('Error auto-filling with current user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-fill PDF form',
        error: error.message
      });
    }
  }

  // Get available forms for auto-fill
  async getAvailableForms(req, res) {
    try {
      const forms = autoFillPDFService.getAvailableFormsForAutoFill();
      
      res.json({
        success: true,
        forms
      });

    } catch (error) {
      console.error('Error getting available forms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available forms',
        error: error.message
      });
    }
  }

  // Preview form structure
  async previewFormStructure(req, res) {
    try {
      const { formType, staffType } = req.query;
      
      if (!formType || !staffType) {
        return res.status(400).json({
          success: false,
          message: 'Form type and staff type are required'
        });
      }

      const positions = autoFillPDFService.getFormPositions(formType, staffType);
      
      res.json({
        success: true,
        formType,
        staffType,
        positions,
        fieldCount: Object.keys(positions).length
      });

    } catch (error) {
      console.error('Error previewing form structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview form structure',
        error: error.message
      });
    }
  }

  // Auto-detect form type for leave
  async autoDetectFormType(req, res) {
    try {
      const { leaveType, facultyId } = req.body;
      
      if (!leaveType || !facultyId) {
        return res.status(400).json({
          success: false,
          message: 'Leave type and faculty ID are required'
        });
      }

      // Fetch faculty data for detection
      const facultyQuery = 'SELECT * FROM faculty WHERE id = ?';
      const [facultyRows] = await db.execute(facultyQuery, [facultyId]);
      
      if (facultyRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }

      const facultyData = facultyRows[0];
      const staffType = autoFillPDFService.detectStaffType(facultyData);
      const contractType = autoFillPDFService.detectContractType(facultyData);
      const formType = autoFillPDFService.autoDetectFormType(leaveType, staffType, contractType);

      res.json({
        success: true,
        detectedFormType: formType,
        detectedStaffType: staffType,
        detectedContractType: contractType,
        leaveType
      });

    } catch (error) {
      console.error('Error auto-detecting form type:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-detect form type',
        error: error.message
      });
    }
  }

  // Bulk auto-fill for multiple leave applications
  async bulkAutoFill(req, res) {
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
          // Fetch leave data
          const leaveQuery = 'SELECT la.*, f.* FROM leave_applications la JOIN faculty f ON la.faculty_id = f.id WHERE la.id = ?';
          const [rows] = await db.execute(leaveQuery, [leaveId]);
          
          if (rows.length === 0) {
            errors.push({ leaveId, error: 'Leave application not found' });
            continue;
          }

          const data = rows[0];
          const facultyData = {
            firstName: data.firstName,
            lastName: data.lastName,
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

          const result = await autoFillPDFService.smartAutoFillForm(facultyData, leaveData);
          
          results.push({
            leaveId,
            success: true,
            formType: result.formType,
            staffType: result.staffType
          });

        } catch (error) {
          errors.push({ leaveId, error: error.message });
        }
      }

      res.json({
        success: true,
        processed: results.length,
        errors: errors.length,
        results,
        errors
      });

    } catch (error) {
      console.error('Error in bulk auto-fill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process bulk auto-fill',
        error: error.message
      });
    }
  }
}

module.exports = new AutoFillPDFController();