const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const formPositions = require('../config/formPositions.json');

class EnhancedAutoFillService {
  constructor() {
    this.leaveDocumentsPath = path.join(__dirname, '..', 'Leave_Documents');
    this.errors = [];
    this.warnings = [];
  }

  // Main auto-fill method with comprehensive error checking
  async autoFillPDFWithValidation(formData) {
    this.errors = [];
    this.warnings = [];

    try {
      // Validate input data
      const validationResult = this.validateInputData(formData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get template path
      const templatePath = this.getTemplatePath(formData.formType, formData.staffType);
      
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }

      // Load PDF
      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height } = firstPage.getSize();

      // Get form positions
      const positions = this.getFormPositions(formData.formType, formData.staffType);
      
      // Prepare data for filling
      const autoFilledData = this.prepareAutoFillData(formData);
      
      // Fill form with error tracking
      await this.fillFormWithErrorTracking(firstPage, positions, autoFilledData, font, height, formData.formType);
      
      const pdfBytes = await pdfDoc.save();
      
      return {
        success: true,
        pdfBytes,
        errors: this.errors,
        warnings: this.warnings,
        fieldsProcessed: Object.keys(positions).length,
        formType: formData.formType,
        staffType: formData.staffType
      };

    } catch (error) {
      console.error('Error in enhanced auto-fill:', error);
      return {
        success: false,
        error: error.message,
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  // Validate input data
  validateInputData(formData) {
    const errors = [];
    
    // Required fields validation
    if (!formData.formType) errors.push('Form type is required');
    if (!formData.staffType) errors.push('Staff type is required');
    if (!formData.facultyData) errors.push('Faculty data is required');
    if (!formData.leaveData) errors.push('Leave data is required');

    // Faculty data validation
    if (formData.facultyData) {
      if (!formData.facultyData.firstName && !formData.facultyData.name) {
        errors.push('Faculty name is required');
      }
      if (!formData.facultyData.designation) {
        errors.push('Faculty designation is required');
      }
    }

    // Leave data validation
    if (formData.leaveData) {
      if (!formData.leaveData.leaveType) {
        errors.push('Leave type is required');
      }
      if (!formData.leaveData.startDate && !formData.leaveData.leave_start_date) {
        errors.push('Leave start date is required');
      }
      if (!formData.leaveData.endDate && !formData.leaveData.leave_end_date) {
        errors.push('Leave end date is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get template path with validation
  getTemplatePath(formType, staffType) {
    const formMappings = {
      'CL_Form': {
        'Teaching': '002-CL_Form-Faculty_Regular.pdf',
        'Non-Teaching': '001-CL_Form-Non_Teaching_Staff_Regular.pdf'
      },
      'EL_Form': {
        'Teaching': '004-EL_Form_Faculty_Regular.pdf',
        'Non-Teaching': '003-EL_Form-Non_Teaching_Staff_Regular.pdf'
      },
      'Leave_Form': {
        'Teaching': '005-Leave_Form_Faculty_Contract.pdf',
        'Non-Teaching': '005-Leave_Form_Faculty_Contract.pdf'
      }
    };

    const filename = formMappings[formType]?.[staffType];
    if (!filename) {
      throw new Error(`No template found for ${formType} - ${staffType}`);
    }

    const folderName = staffType === 'Teaching' ? 'Teaching' : 'Non-Teaching';
    return path.join(this.leaveDocumentsPath, folderName, filename);
  }

  // Get form positions with validation
  getFormPositions(formType, staffType) {
    const positions = formPositions[staffType]?.[formType];
    if (!positions) {
      throw new Error(`No positions found for ${formType} - ${staffType}`);
    }
    return positions;
  }

  // Prepare auto-fill data with comprehensive mapping
  prepareAutoFillData(formData) {
    const { facultyData, leaveData } = formData;
    const currentDate = new Date();
    
    return {
      // Basic faculty information
      name: facultyData.name || `${facultyData.firstName || ''} ${facultyData.lastName || ''}`.trim(),
      designation: facultyData.designation || '',
      department: facultyData.department || '',
      employeeId: facultyData.employeeId || '',
      
      // Leave information
      leaveType: leaveData.leaveType || '',
      startDate: leaveData.startDate || leaveData.leave_start_date || '',
      endDate: leaveData.endDate || leaveData.leave_end_date || '',
      reason: leaveData.reason || '',
      noOfDaysLeave: leaveData.noOfDaysLeave || leaveData.no_of_days_leave || this.calculateLeaveDays(
        leaveData.startDate || leaveData.leave_start_date,
        leaveData.endDate || leaveData.leave_end_date
      ),
      
      // Contact information
      contactNo: leaveData.contactNo || facultyData.phone || '',
      addressLine1: leaveData.addressLine1 || facultyData.address || '',
      addressLine2: leaveData.addressLine2 || '',
      addressLine3: leaveData.addressLine3 || '',
      
      // Application date (auto-filled)
      applicationDate: currentDate.toLocaleDateString('en-GB'),
      
      // Leave nature checkboxes
      natureOfLeave_EL: leaveData.leaveType === 'Earned Leave',
      natureOfLeave_HPL: leaveData.leaveType === 'Half Pay Leave',
      natureOfLeave_COML: leaveData.leaveType === 'Commuted Leave',
      natureOfLeave_EOL: leaveData.leaveType === 'Extraordinary Leave',
      
      // Reason checkboxes
      reasonLTC: leaveData.reason?.toLowerCase().includes('ltc') || false,
      reasonOthers: !leaveData.reason?.toLowerCase().includes('ltc'),
      
      // LTC block year (if applicable)
      ltcBlockYear: leaveData.ltcBlockYear || currentDate.getFullYear().toString(),
      
      // Adjustment of duties
      adjustmentFacultyName: leaveData.adjustmentFacultyName || '',
      adjustmentDate: leaveData.adjustmentDate || '',
      adjustmentTime: leaveData.adjustmentTime || '',
      
      // Leave days with date (formatted)
      leaveDaysWithDate: this.formatLeaveDaysWithDate(leaveData)
    };
  }

  // Fill form with comprehensive error tracking
  async fillFormWithErrorTracking(page, positions, data, font, pageHeight, formType) {
    const fieldMappings = this.getFieldMappings(formType);
    
    for (const [fieldName, fieldConfig] of Object.entries(fieldMappings)) {
      try {
        const position = positions[fieldName];
        const value = data[fieldConfig.dataKey];
        
        if (!position) {
          this.warnings.push(`Position not found for field: ${fieldName}`);
          continue;
        }

        if (value === undefined || value === null || value === '') {
          this.warnings.push(`No data available for field: ${fieldName}`);
          continue;
        }

        // Fill based on field type
        switch (fieldConfig.type) {
          case 'text':
            this.fillTextField(page, position, value, font, pageHeight, fieldConfig.fontSize);
            break;
          case 'checkbox':
            this.fillCheckbox(page, position, value, font, pageHeight);
            break;
          case 'date':
            this.fillDateFields(page, position, value, font, pageHeight);
            break;
          case 'year':
            this.fillYearFields(page, position, value, font, pageHeight);
            break;
          default:
            this.fillTextField(page, position, value, font, pageHeight);
        }
        
      } catch (error) {
        this.errors.push(`Error filling field ${fieldName}: ${error.message}`);
      }
    }
  }

  // Get field mappings for different form types
  getFieldMappings(formType) {
    const commonFields = {
      name: { dataKey: 'name', type: 'text', fontSize: 10 },
      designation: { dataKey: 'designation', type: 'text', fontSize: 10 },
      reason: { dataKey: 'reason', type: 'text', fontSize: 9 },
      applicationDate: { dataKey: 'applicationDate', type: 'text', fontSize: 10 }
    };

    const formSpecificFields = {
      'CL_Form': {
        ...commonFields,
        leaveDaysWithDate: { dataKey: 'leaveDaysWithDate', type: 'text', fontSize: 9 },
        adjustmentFacultyName: { dataKey: 'adjustmentFacultyName', type: 'text', fontSize: 9 },
        adjustmentDate: { dataKey: 'adjustmentDate', type: 'text', fontSize: 9 },
        adjustmentTime: { dataKey: 'adjustmentTime', type: 'text', fontSize: 9 },
        adjustmentSNo: { dataKey: 'adjustmentSNo', type: 'text', fontSize: 9 }
      },
      'EL_Form': {
        ...commonFields,
        natureOfLeave_EL: { dataKey: 'natureOfLeave_EL', type: 'checkbox' },
        natureOfLeave_HPL: { dataKey: 'natureOfLeave_HPL', type: 'checkbox' },
        natureOfLeave_COML: { dataKey: 'natureOfLeave_COML', type: 'checkbox' },
        natureOfLeave_EOL: { dataKey: 'natureOfLeave_EOL', type: 'checkbox' },
        noOfDaysLeave: { dataKey: 'noOfDaysLeave', type: 'text', fontSize: 10 },
        leaveFromDate: { dataKey: 'startDate', type: 'date' },
        leaveToDate: { dataKey: 'endDate', type: 'date' },
        reasonLTC: { dataKey: 'reasonLTC', type: 'checkbox' },
        reasonOthers: { dataKey: 'reasonOthers', type: 'checkbox' },
        ltcBlockYear: { dataKey: 'ltcBlockYear', type: 'year' },
        contactNo: { dataKey: 'contactNo', type: 'text', fontSize: 9 },
        addressLine1: { dataKey: 'addressLine1', type: 'text', fontSize: 9 },
        addressLine2: { dataKey: 'addressLine2', type: 'text', fontSize: 9 },
        addressLine3: { dataKey: 'addressLine3', type: 'text', fontSize: 9 },
        adjustmentFacultyName: { dataKey: 'adjustmentFacultyName', type: 'text', fontSize: 9 },
        adjustmentDate: { dataKey: 'adjustmentDate', type: 'text', fontSize: 9 },
        adjustmentTime: { dataKey: 'adjustmentTime', type: 'text', fontSize: 9 },
        adjustmentSNo: { dataKey: 'adjustmentSNo', type: 'text', fontSize: 9 }
      },
      'Leave_Form': {
        ...commonFields,
        leaveDaysWithDate: { dataKey: 'leaveDaysWithDate', type: 'text', fontSize: 9 },
        adjustmentFacultyName: { dataKey: 'adjustmentFacultyName', type: 'text', fontSize: 9 },
        adjustmentDate: { dataKey: 'adjustmentDate', type: 'text', fontSize: 9 },
        adjustmentTime: { dataKey: 'adjustmentTime', type: 'text', fontSize: 9 },
        adjustmentSNo: { dataKey: 'adjustmentSNo', type: 'text', fontSize: 9 }
      }
    };

    return formSpecificFields[formType] || commonFields;
  }

  // Enhanced text field filling with error handling
  fillTextField(page, position, text, font, pageHeight, fontSize = 10) {
    try {
      if (position && text !== undefined && text !== null) {
        const textStr = String(text).substring(0, 50); // Limit text length
        page.drawText(textStr, {
          x: position.x,
          y: pageHeight - position.y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    } catch (error) {
      this.errors.push(`Error filling text field at (${position.x}, ${position.y}): ${error.message}`);
    }
  }

  // Enhanced checkbox filling with error handling
  fillCheckbox(page, position, isChecked, font, pageHeight) {
    try {
      if (position && isChecked) {
        page.drawText('✓', {
          x: position.x,
          y: pageHeight - position.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    } catch (error) {
      this.errors.push(`Error filling checkbox at (${position.x}, ${position.y}): ${error.message}`);
    }
  }

  // Enhanced date field filling with error handling
  fillDateFields(page, positions, dateValue, font, pageHeight) {
    try {
      if (positions && Array.isArray(positions) && dateValue) {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          this.warnings.push(`Invalid date format: ${dateValue}`);
          return;
        }
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        
        const dateChars = [day[0], day[1], month[0], month[1], year[2], year[3]];
        
        for (let i = 0; i < Math.min(positions.length, dateChars.length); i++) {
          if (positions[i]) {
            this.fillTextField(page, positions[i], dateChars[i], font, pageHeight, 10);
          }
        }
      }
    } catch (error) {
      this.errors.push(`Error filling date fields: ${error.message}`);
    }
  }

  // Enhanced year field filling with error handling
  fillYearFields(page, positions, year, font, pageHeight) {
    try {
      if (positions && Array.isArray(positions) && year) {
        const yearStr = year.toString();
        for (let i = 0; i < Math.min(positions.length, 4); i++) {
          if (positions[i] && yearStr[i]) {
            this.fillTextField(page, positions[i], yearStr[i], font, pageHeight, 10);
          }
        }
      }
    } catch (error) {
      this.errors.push(`Error filling year fields: ${error.message}`);
    }
  }

  // Calculate leave days with validation
  calculateLeaveDays(startDate, endDate) {
    try {
      if (!startDate || !endDate) return 0;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        this.warnings.push('Invalid date format for leave calculation');
        return 0;
      }
      
      const timeDiff = end.getTime() - start.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    } catch (error) {
      this.warnings.push(`Error calculating leave days: ${error.message}`);
      return 0;
    }
  }

  // Format leave days with date
  formatLeaveDaysWithDate(leaveData) {
    const startDate = leaveData.startDate || leaveData.leave_start_date;
    const endDate = leaveData.endDate || leaveData.leave_end_date;
    const days = leaveData.noOfDaysLeave || leaveData.no_of_days_leave || this.calculateLeaveDays(startDate, endDate);
    
    if (startDate && endDate) {
      try {
        const start = new Date(startDate).toLocaleDateString('en-GB');
        const end = new Date(endDate).toLocaleDateString('en-GB');
        return `${days} days (${start} to ${end})`;
      } catch (error) {
        this.warnings.push('Error formatting leave dates');
        return days ? `${days} days` : '';
      }
    }
    
    return days ? `${days} days` : '';
  }

  // Get validation report
  getValidationReport() {
    return {
      hasErrors: this.errors.length > 0,
      hasWarnings: this.warnings.length > 0,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  // Clear errors and warnings
  clearValidation() {
    this.errors = [];
    this.warnings = [];
  }
}

module.exports = new EnhancedAutoFillService();