const pdfFormService = require('./pdfFormService');
const formPositions = require('../config/formPositions.json');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

class AutoFillPDFService {
  constructor() {
    this.leaveDocumentsPath = path.join(__dirname, '..', 'Leave_Documents');
  }

  // Auto-fill PDF form with data from frontend
  async autoFillPDFForm(formType, staffType, facultyData, leaveData) {
    try {
      // Get the appropriate PDF template
      const templatePath = this.getTemplatePath(formType, staffType);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }

      // Load PDF and get positions
      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height } = firstPage.getSize();
      
      // Get form positions based on form type and staff type
      const positions = this.getFormPositions(formType, staffType);
      
      // Auto-fetch and fill data
      const autoFilledData = this.prepareAutoFillData(facultyData, leaveData);
      
      // Fill the form based on form type
      await this.fillFormByType(firstPage, positions, autoFilledData, font, height, formType);
      
      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Error auto-filling PDF form:', error);
      throw error;
    }
  }

  // Get template path based on form type and staff type
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

  // Get form positions from configuration
  getFormPositions(formType, staffType) {
    return formPositions[staffType]?.[formType] || {};
  }

  // Prepare auto-fill data by combining faculty and leave data
  prepareAutoFillData(facultyData, leaveData) {
    const currentDate = new Date();
    
    return {
      // Basic faculty information
      name: `${facultyData.firstName || ''} ${facultyData.lastName || ''}`.trim(),
      designation: facultyData.designation || '',
      department: facultyData.department || '',
      employeeId: facultyData.employeeId || '',
      
      // Leave information
      leaveType: leaveData.leaveType || '',
      startDate: leaveData.startDate || leaveData.leave_start_date || '',
      endDate: leaveData.endDate || leaveData.leave_end_date || '',
      reason: leaveData.reason || '',
      noOfDaysLeave: leaveData.noOfDaysLeave || this.calculateLeaveDays(
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

  // Fill form based on form type
  async fillFormByType(page, positions, data, font, pageHeight, formType) {
    switch (formType) {
      case 'CL_Form':
        this.fillCLForm(page, positions, data, font, pageHeight);
        break;
      case 'EL_Form':
        this.fillELForm(page, positions, data, font, pageHeight);
        break;
      case 'Leave_Form':
        this.fillLeaveForm(page, positions, data, font, pageHeight);
        break;
      default:
        this.fillBasicForm(page, positions, data, font, pageHeight);
    }
  }

  // Fill Casual Leave form
  fillCLForm(page, positions, data, font, pageHeight) {
    // Basic information
    this.fillTextField(page, positions.name, data.name, font, pageHeight);
    this.fillTextField(page, positions.designation, data.designation, font, pageHeight);
    this.fillTextField(page, positions.leaveDaysWithDate, data.leaveDaysWithDate, font, pageHeight);
    this.fillTextField(page, positions.reason, data.reason, font, pageHeight);
    this.fillTextField(page, positions.applicationDate, data.applicationDate, font, pageHeight);
    
    // Adjustment of duties
    if (positions.adjustmentFacultyName) {
      this.fillTextField(page, positions.adjustmentFacultyName, data.adjustmentFacultyName, font, pageHeight);
    }
    if (positions.adjustmentDate) {
      this.fillTextField(page, positions.adjustmentDate, data.adjustmentDate, font, pageHeight);
    }
    if (positions.adjustmentTime) {
      this.fillTextField(page, positions.adjustmentTime, data.adjustmentTime, font, pageHeight);
    }
  }

  // Fill Earned Leave form
  fillELForm(page, positions, data, font, pageHeight) {
    // Basic information
    this.fillTextField(page, positions.name, data.name, font, pageHeight);
    this.fillTextField(page, positions.designation, data.designation, font, pageHeight);
    
    // Nature of leave checkboxes
    this.fillCheckbox(page, positions.natureOfLeave_EL, data.natureOfLeave_EL, font, pageHeight);
    this.fillCheckbox(page, positions.natureOfLeave_HPL, data.natureOfLeave_HPL, font, pageHeight);
    this.fillCheckbox(page, positions.natureOfLeave_COML, data.natureOfLeave_COML, font, pageHeight);
    this.fillCheckbox(page, positions.natureOfLeave_EOL, data.natureOfLeave_EOL, font, pageHeight);
    
    // Number of days
    this.fillTextField(page, positions.noOfDaysLeave, data.noOfDaysLeave?.toString(), font, pageHeight);
    
    // Date fields (split into individual characters)
    if (positions.leaveFromDate && data.startDate) {
      this.fillDateFields(page, positions.leaveFromDate, data.startDate, font, pageHeight);
    }
    if (positions.leaveToDate && data.endDate) {
      this.fillDateFields(page, positions.leaveToDate, data.endDate, font, pageHeight);
    }
    
    // Reason checkboxes
    this.fillCheckbox(page, positions.reasonLTC, data.reasonLTC, font, pageHeight);
    this.fillCheckbox(page, positions.reasonOthers, data.reasonOthers, font, pageHeight);
    
    // LTC block year
    if (positions.ltcBlockYear && data.ltcBlockYear) {
      this.fillLTCBlockYear(page, positions.ltcBlockYear, data.ltcBlockYear, font, pageHeight);
    }
    
    // Contact and address
    this.fillTextField(page, positions.contactNo, data.contactNo, font, pageHeight);
    this.fillTextField(page, positions.addressLine1, data.addressLine1, font, pageHeight);
    this.fillTextField(page, positions.addressLine2, data.addressLine2, font, pageHeight);
    this.fillTextField(page, positions.addressLine3, data.addressLine3, font, pageHeight);
    
    // Application date
    this.fillTextField(page, positions.applicationDate, data.applicationDate, font, pageHeight);
    
    // Adjustment of duties (for faculty forms)
    if (positions.adjustmentSNo) {
      this.fillTextField(page, positions.adjustmentSNo, '1', font, pageHeight);
    }
    if (positions.adjustmentFacultyName) {
      this.fillTextField(page, positions.adjustmentFacultyName, data.adjustmentFacultyName, font, pageHeight);
    }
    if (positions.adjustmentDate) {
      this.fillTextField(page, positions.adjustmentDate, data.adjustmentDate, font, pageHeight);
    }
    if (positions.adjustmentTime) {
      this.fillTextField(page, positions.adjustmentTime, data.adjustmentTime, font, pageHeight);
    }
  }

  // Fill general Leave form (contract faculty)
  fillLeaveForm(page, positions, data, font, pageHeight) {
    // Basic information
    this.fillTextField(page, positions.name, data.name, font, pageHeight);
    this.fillTextField(page, positions.designation, data.designation, font, pageHeight);
    this.fillTextField(page, positions.leaveDaysWithDate, data.leaveDaysWithDate, font, pageHeight);
    this.fillTextField(page, positions.reason, data.reason, font, pageHeight);
    this.fillTextField(page, positions.applicationDate, data.applicationDate, font, pageHeight);
    
    // Adjustment of duties
    if (positions.adjustmentSNo) {
      this.fillTextField(page, positions.adjustmentSNo, '1', font, pageHeight);
    }
    if (positions.adjustmentFacultyName) {
      this.fillTextField(page, positions.adjustmentFacultyName, data.adjustmentFacultyName, font, pageHeight);
    }
    if (positions.adjustmentDate) {
      this.fillTextField(page, positions.adjustmentDate, data.adjustmentDate, font, pageHeight);
    }
    if (positions.adjustmentTime) {
      this.fillTextField(page, positions.adjustmentTime, data.adjustmentTime, font, pageHeight);
    }
  }

  // Fill basic form (fallback)
  fillBasicForm(page, positions, data, font, pageHeight) {
    this.fillTextField(page, positions.name, data.name, font, pageHeight);
    this.fillTextField(page, positions.designation, data.designation, font, pageHeight);
    this.fillTextField(page, positions.reason, data.reason, font, pageHeight);
    this.fillTextField(page, positions.applicationDate, data.applicationDate, font, pageHeight);
  }

  // Helper method to fill text field
  fillTextField(page, position, text, font, pageHeight, fontSize = 10) {
    if (position && text) {
      page.drawText(String(text), {
        x: position.x,
        y: pageHeight - position.y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Helper method to fill checkbox
  fillCheckbox(page, position, isChecked, font, pageHeight) {
    if (position && isChecked) {
      page.drawText('✓', {
        x: position.x,
        y: pageHeight - position.y,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Helper method to fill date fields (split into individual positions)
  fillDateFields(page, positions, dateValue, font, pageHeight) {
    if (positions && dateValue) {
      const date = new Date(dateValue);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      
      // Fill day, month, year in separate positions
      if (positions[0]) this.fillTextField(page, positions[0], day[0], font, pageHeight, 10);
      if (positions[1]) this.fillTextField(page, positions[1], day[1], font, pageHeight, 10);
      if (positions[2]) this.fillTextField(page, positions[2], month[0], font, pageHeight, 10);
      if (positions[3]) this.fillTextField(page, positions[3], month[1], font, pageHeight, 10);
      if (positions[4]) this.fillTextField(page, positions[4], year[2], font, pageHeight, 10);
      if (positions[5]) this.fillTextField(page, positions[5], year[3], font, pageHeight, 10);
    }
  }

  // Helper method to fill LTC block year
  fillLTCBlockYear(page, positions, year, font, pageHeight) {
    if (positions && year) {
      const yearStr = year.toString();
      if (positions[0]) this.fillTextField(page, positions[0], yearStr[0], font, pageHeight, 10);
      if (positions[1]) this.fillTextField(page, positions[1], yearStr[1], font, pageHeight, 10);
      if (positions[2]) this.fillTextField(page, positions[2], yearStr[2], font, pageHeight, 10);
      if (positions[3]) this.fillTextField(page, positions[3], yearStr[3], font, pageHeight, 10);
    }
  }

  // Format leave days with date
  formatLeaveDaysWithDate(leaveData) {
    const startDate = leaveData.startDate || leaveData.leave_start_date;
    const endDate = leaveData.endDate || leaveData.leave_end_date;
    const days = leaveData.noOfDaysLeave || this.calculateLeaveDays(startDate, endDate);
    
    if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-GB');
      const end = new Date(endDate).toLocaleDateString('en-GB');
      return `${days} days (${start} to ${end})`;
    }
    
    return days ? `${days} days` : '';
  }

  // Calculate leave days
  calculateLeaveDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }

  // Get available forms for auto-fill
  getAvailableFormsForAutoFill() {
    return {
      'Teaching': {
        'CL_Form': 'Casual Leave Form (Faculty Regular)',
        'EL_Form': 'Earned Leave Form (Faculty Regular)',
        'Leave_Form': 'Leave Form (Faculty Contract)'
      },
      'Non-Teaching': {
        'CL_Form': 'Casual Leave Form (Non-Teaching Staff Regular)',
        'EL_Form': 'Earned Leave Form (Non-Teaching Staff Regular)'
      }
    };
  }

  // Auto-detect form type based on leave type
  autoDetectFormType(leaveType, staffType, contractType = 'Regular') {
    const casualLeaveTypes = ['Casual Leave', 'Compensatory Leave', 'RH Leave', 'Special Leave', 'Sick Leave'];
    const earnedLeaveTypes = ['Earned Leave', 'Commuted Leave', 'Half Pay Leave', 'Extraordinary Leave'];
    
    if (contractType === 'Contract') {
      return 'Leave_Form';
    }
    
    if (casualLeaveTypes.includes(leaveType)) {
      return 'CL_Form';
    } else if (earnedLeaveTypes.includes(leaveType)) {
      return 'EL_Form';
    } else {
      return staffType === 'Teaching' ? 'Leave_Form' : 'CL_Form';
    }
  }

  // Main method to auto-fill form with smart detection
  async smartAutoFillForm(facultyData, leaveData) {
    try {
      // Auto-detect staff type
      const staffType = this.detectStaffType(facultyData);
      
      // Auto-detect contract type
      const contractType = this.detectContractType(facultyData);
      
      // Auto-detect form type
      const formType = this.autoDetectFormType(leaveData.leaveType, staffType, contractType);
      
      // Auto-fill the form
      const pdfBytes = await this.autoFillPDFForm(formType, staffType, facultyData, leaveData);
      
      return {
        pdfBytes,
        formType,
        staffType,
        contractType,
        templateUsed: this.getTemplatePath(formType, staffType)
      };
      
    } catch (error) {
      console.error('Error in smart auto-fill:', error);
      throw error;
    }
  }

  // Detect staff type from faculty data
  detectStaffType(facultyData) {
    const teachingDesignations = ['professor', 'assistant professor', 'associate professor', 'lecturer'];
    const designation = (facultyData.designation || '').toLowerCase();
    
    if (teachingDesignations.some(d => designation.includes(d))) {
      return 'Teaching';
    }
    return 'Non-Teaching';
  }

  // Detect contract type from faculty data
  detectContractType(facultyData) {
    const designation = (facultyData.designation || '').toLowerCase();
    if (designation.includes('contract') || designation.includes('visiting')) {
      return 'Contract';
    }
    return 'Regular';
  }
}

module.exports = new AutoFillPDFService();