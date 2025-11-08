const fieldMappingService = require('../services/fieldMappingService');
const pdfFormService = require('../services/pdfFormService');

class FormMappingController {
  // Get form structure for user input
  async getFormStructure(req, res) {
    try {
      const { staffType = 'Teaching', leaveType = 'Casual Leave' } = req.query;
      
      const formStructure = fieldMappingService.getFormStructure(staffType, leaveType);
      
      res.json({
        success: true,
        data: {
          staffType,
          leaveType,
          fields: formStructure,
          totalFields: formStructure.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting form structure',
        error: error.message
      });
    }
  }

  // Process user input and generate PDF
  async processFormInput(req, res) {
    try {
      const { staffType, leaveType, userInput, facultyData } = req.body;
      
      // Validate input
      const validation = fieldMappingService.validateInput(userInput, staffType, leaveType);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Map user input to form fields
      const mappedFields = fieldMappingService.mapUserInputToFields(userInput, staffType, leaveType);
      
      // Generate PDF with mapped data
      const pdfResult = await pdfFormService.generateLeaveForm(
        facultyData,
        { ...userInput, mappedFields },
        staffType
      );

      res.json({
        success: true,
        data: {
          mappedFields,
          pdfGenerated: true,
          templateUsed: pdfResult.templateUsed
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing form input',
        error: error.message
      });
    }
  }

  // Get field mapping for specific form
  async getFieldMapping(req, res) {
    try {
      const { staffType = 'Teaching', leaveType = 'Casual Leave' } = req.query;
      
      const mapping = fieldMappingService.getFieldMapping(staffType, leaveType);
      
      res.json({
        success: true,
        data: {
          staffType,
          leaveType,
          fieldMapping: mapping
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting field mapping',
        error: error.message
      });
    }
  }

  // Submit leave request with dynamic form data
  async submitLeaveWithFormData(req, res) {
    try {
      const { staffType, leaveType, userInput } = req.body;
      const facultyData = req.user;
      
      // Validate and map form data
      const validation = fieldMappingService.validateInput(userInput, staffType, leaveType);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const mappedFields = fieldMappingService.mapUserInputToFields(userInput, staffType, leaveType);
      
      // Create leave request data
      const leaveRequestData = {
        leaveType: mappedFields.Text5 || leaveType,
        startDate: mappedFields.Text6 || mappedFields.Text5,
        endDate: mappedFields.Text8 || mappedFields.Text7,
        reason: mappedFields.Text10 || mappedFields.Text9,
        alternativeArrangement: mappedFields.Text11 || mappedFields.Text10 || '',
        contactDuringLeave: mappedFields.Text12 || mappedFields.Text14 || '',
        medicalCertificate: mappedFields.Text14 === 'true' || mappedFields.Text17 === 'true',
        staffType,
        formFieldData: userInput,
        pdfFieldMapping: mappedFields
      };

      // Submit to database
      const pool = require('../config/db');
      const [result] = await pool.execute(
        `INSERT INTO leave_requests (faculty_id, leaveType, startDate, endDate, reason, alternativeArrangement, contactDuringLeave, medicalCertificate, staff_type, form_field_data, pdf_field_mapping) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          facultyData.facultyId,
          leaveRequestData.leaveType,
          leaveRequestData.startDate,
          leaveRequestData.endDate,
          leaveRequestData.reason,
          leaveRequestData.alternativeArrangement,
          leaveRequestData.contactDuringLeave,
          leaveRequestData.medicalCertificate,
          staffType,
          JSON.stringify(userInput),
          JSON.stringify(mappedFields)
        ]
      );

      res.json({
        success: true,
        data: {
          leaveId: result.insertId,
          message: 'Leave request submitted successfully'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error submitting leave request',
        error: error.message
      });
    }
  }
}

module.exports = new FormMappingController();