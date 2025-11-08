const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const pdf2json = require('pdf2json');
const { createReport } = require('docx-templates');
const libre = require('libreoffice-convert');
const { promisify } = require('util');
const convertAsync = promisify(libre.convert);
const docxFormService = require('./docxFormService');
const formPositions = require('../config/formPositions.json');

class PDFFormService {
  constructor() {
    this.leaveDocumentsPath = path.join(__dirname, '..', 'Leave_Documents');
    this.formFieldsCache = new Map();
  }

  // Extract form fields from existing PDF
  async extractFormFields(pdfPath) {
    try {
      if (this.formFieldsCache.has(pdfPath)) {
        return this.formFieldsCache.get(pdfPath);
      }

      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Check if PDF has existing form fields
      const form = pdfDoc.getForm();
      const existingFields = form.getFields();
      
      let extractedFields = [];
      
      if (existingFields.length > 0) {
        // PDF has existing form fields
        extractedFields = existingFields.map(field => ({
          name: field.getName(),
          type: this.getFieldType(field),
          required: field.isRequired ? field.isRequired() : false,
          value: this.getFieldValue(field)
        }));
      } else {
        // Extract text and identify potential form fields
        const textData = await pdfParse(pdfBuffer);
        extractedFields = this.identifyFormFieldsFromText(textData.text);
      }
      
      this.formFieldsCache.set(pdfPath, extractedFields);
      return extractedFields;
      
    } catch (error) {
      console.error('Error extracting form fields:', error);
      return this.getDefaultFormFields();
    }
  }

  // Get field type from PDF form field
  getFieldType(field) {
    if (field.constructor.name.includes('TextField')) return 'text';
    if (field.constructor.name.includes('CheckBox')) return 'checkbox';
    if (field.constructor.name.includes('Dropdown')) return 'dropdown';
    if (field.constructor.name.includes('RadioGroup')) return 'radio';
    return 'text';
  }

  // Get field value from PDF form field
  getFieldValue(field) {
    try {
      if (field.constructor.name.includes('TextField')) {
        return field.getText ? field.getText() : '';
      }
      if (field.constructor.name.includes('CheckBox')) {
        return field.isChecked ? field.isChecked() : false;
      }
      if (field.constructor.name.includes('Dropdown')) {
        return field.getSelected ? field.getSelected() : [];
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  // Identify form fields from text content
  identifyFormFieldsFromText(text) {
    const fields = [];
    const lines = text.split('\n');
    
    const fieldPatterns = [
      { pattern: /name\s*:?\s*_+|name\s*\[\s*\]/i, name: 'name', type: 'text' },
      { pattern: /employee\s*id\s*:?\s*_+|emp\s*id\s*:?\s*_+/i, name: 'employeeId', type: 'text' },
      { pattern: /designation\s*:?\s*_+/i, name: 'designation', type: 'text' },
      { pattern: /department\s*:?\s*_+/i, name: 'department', type: 'text' },
      { pattern: /leave\s*type\s*:?\s*_+/i, name: 'leaveType', type: 'text' },
      { pattern: /start\s*date\s*:?\s*_+|from\s*:?\s*_+/i, name: 'startDate', type: 'date' },
      { pattern: /end\s*date\s*:?\s*_+|to\s*:?\s*_+/i, name: 'endDate', type: 'date' },
      { pattern: /reason\s*:?\s*_+|purpose\s*:?\s*_+/i, name: 'reason', type: 'textarea' },
      { pattern: /contact\s*:?\s*_+|phone\s*:?\s*_+/i, name: 'contactDuringLeave', type: 'text' },
      { pattern: /address\s*:?\s*_+/i, name: 'address', type: 'textarea' },
      { pattern: /signature\s*:?\s*_+/i, name: 'signature', type: 'signature' },
      { pattern: /date\s*:?\s*_+/i, name: 'applicationDate', type: 'date' },
      { pattern: /medical\s*certificate/i, name: 'medicalCertificate', type: 'checkbox' },
      { pattern: /alternative\s*arrangement/i, name: 'alternativeArrangement', type: 'textarea' }
    ];
    
    fieldPatterns.forEach(({ pattern, name, type }) => {
      if (pattern.test(text)) {
        fields.push({ name, type, required: ['name', 'startDate', 'endDate', 'reason'].includes(name) });
      }
    });
    
    return fields.length > 0 ? fields : this.getDefaultFormFields();
  }

  // Get default form fields
  getDefaultFormFields() {
    return [
      { name: 'name', type: 'text', required: true },
      { name: 'employeeId', type: 'text', required: false },
      { name: 'designation', type: 'text', required: false },
      { name: 'department', type: 'text', required: false },
      { name: 'leaveType', type: 'text', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'reason', type: 'textarea', required: true },
      { name: 'contactDuringLeave', type: 'text', required: false },
      { name: 'alternativeArrangement', type: 'textarea', required: false },
      { name: 'applicationDate', type: 'date', required: false },
      { name: 'medicalCertificate', type: 'checkbox', required: false }
    ];
  }

  // Create fillable PDF form from template
  async createFillablePDFForm(templatePath, outputPath = null) {
    try {
      const pdfBuffer = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const form = pdfDoc.getForm();
      
      // Extract text to identify field positions
      const textData = await pdfParse(pdfBuffer);
      const fieldPositions = this.extractFieldPositions(textData.text);
      
      // Add form fields to PDF
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height } = firstPage.getSize();
      
      fieldPositions.forEach(({ name, x, y, width = 150, height: fieldHeight = 20 }) => {
        try {
          const adjustedY = height - y - fieldHeight;
          
          if (name === 'medicalCertificate') {
            const checkBox = form.createCheckBox(name);
            checkBox.addToPage(firstPage, {
              x: x,
              y: adjustedY,
              width: 15,
              height: 15
            });
          } else if (name.includes('Date')) {
            const textField = form.createTextField(name);
            textField.addToPage(firstPage, {
              x: x,
              y: adjustedY,
              width: width,
              height: fieldHeight,
              borderWidth: 1,
              backgroundColor: rgb(1, 1, 1)
            });
            textField.setFontSize(10);
          } else {
            const textField = form.createTextField(name);
            textField.addToPage(firstPage, {
              x: x,
              y: adjustedY,
              width: width,
              height: fieldHeight,
              borderWidth: 1,
              backgroundColor: rgb(1, 1, 1)
            });
            textField.setFontSize(10);
            
            if (name === 'reason' || name === 'alternativeArrangement') {
              textField.enableMultiline();
            }
          }
        } catch (fieldError) {
          console.warn(`Could not create field ${name}:`, fieldError.message);
        }
      });
      
      const pdfBytes = await pdfDoc.save();
      
      if (outputPath) {
        fs.writeFileSync(outputPath, pdfBytes);
      }
      
      return pdfBytes;
      
    } catch (error) {
      console.error('Error creating fillable PDF form:', error);
      throw error;
    }
  }

  // Extract field positions from text
  extractFieldPositions(text) {
    const positions = [];
    const lines = text.split('\n');
    
    const fieldMappings = [
      { pattern: /name\s*:?\s*_+/i, name: 'name', x: 200, y: 150 },
      { pattern: /employee\s*id\s*:?\s*_+/i, name: 'employeeId', x: 200, y: 180 },
      { pattern: /designation\s*:?\s*_+/i, name: 'designation', x: 200, y: 210 },
      { pattern: /department\s*:?\s*_+/i, name: 'department', x: 200, y: 240 },
      { pattern: /leave\s*type\s*:?\s*_+/i, name: 'leaveType', x: 200, y: 300 },
      { pattern: /start\s*date\s*:?\s*_+|from\s*:?\s*_+/i, name: 'startDate', x: 200, y: 330 },
      { pattern: /end\s*date\s*:?\s*_+|to\s*:?\s*_+/i, name: 'endDate', x: 350, y: 330 },
      { pattern: /reason\s*:?\s*_+/i, name: 'reason', x: 200, y: 380, width: 300, height: 60 },
      { pattern: /contact\s*:?\s*_+/i, name: 'contactDuringLeave', x: 200, y: 480 },
      { pattern: /alternative\s*arrangement/i, name: 'alternativeArrangement', x: 200, y: 450, width: 300, height: 40 },
      { pattern: /medical\s*certificate/i, name: 'medicalCertificate', x: 200, y: 510 },
      { pattern: /date\s*of\s*application/i, name: 'applicationDate', x: 200, y: 540 }
    ];
    
    fieldMappings.forEach(({ pattern, name, x, y, width, height }) => {
      if (pattern.test(text)) {
        positions.push({ name, x, y, width, height });
      }
    });
    
    return positions;
  }

  getAvailableForms(staffType = 'Teaching') {
    const formsPath = path.join(this.leaveDocumentsPath, staffType);
    
    if (!fs.existsSync(formsPath)) {
      return [];
    }

    const forms = fs.readdirSync(formsPath)
      .filter(file => file.endsWith('.pdf'))
      .map(file => ({
        filename: file,
        path: path.join(formsPath, file),
        type: this.getLeaveTypeFromFilename(file),
        staffType
      }));

    return forms;
  }

  getLeaveTypeFromFilename(filename) {
    if (filename.includes('CL_Form')) return 'Casual Leave';
    if (filename.includes('EL_Form')) return 'Earned Leave';
    if (filename.includes('Leave_Form')) return 'General Leave';
    if (filename.includes('CPDA')) return 'Activity Leave';
    return 'General Leave';
  }

  getFormTemplate(leaveType, staffType = 'Teaching', contractType = 'Regular') {
    const forms = this.getAvailableForms(staffType);
    
    // Form mapping based on staff type and leave category
    let casualLeaveTypes, earnedLeaveTypes, generalLeaveTypes;
    
    if (staffType === 'Teaching') {
      casualLeaveTypes = ['Casual Leave', 'Compensatory Leave', 'RH Leave', 'Special Leave', 'Sick Leave'];
      earnedLeaveTypes = ['Earned Leave', 'Commuted Leave', 'Half Pay Leave'];
      generalLeaveTypes = ['Maternity Leave', 'Paternity Leave', 'Study Leave', 'Medical Leave'];
    } else {
      casualLeaveTypes = ['Casual Leave', 'Compensatory Leave', 'RH Leave', 'Sick Leave'];
      earnedLeaveTypes = ['Earned Leave', 'Commuted Leave', 'Half Pay Leave'];
      generalLeaveTypes = ['Maternity Leave', 'Paternity Leave', 'Study Leave', 'Medical Leave', 'Special Leave'];
    }
    
    let pattern;
    if (casualLeaveTypes.includes(leaveType)) {
      pattern = contractType === 'Regular' ? 'CL_Form' : 'Leave_Form';
    } else if (earnedLeaveTypes.includes(leaveType)) {
      pattern = contractType === 'Regular' ? 'EL_Form' : 'Leave_Form';
    } else if (generalLeaveTypes.includes(leaveType)) {
      pattern = 'Leave_Form';
    } else {
      pattern = 'Leave_Form';
    }

    let form = forms.find(f => f.filename.includes(pattern));
    return form || forms[0];
  }

  // Fill PDF form with data (supports both fillable forms and text overlay)
  async fillPDFForm(templatePath, facultyData, leaveData) {
    try {
      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      
      // Check if PDF has fillable form fields
      const formFields = form.getFields();
      
      if (formFields.length > 0) {
        // Fill existing form fields
        return await this.fillFormFields(pdfDoc, form, facultyData, leaveData);
      } else {
        // Use text overlay method
        return await this.fillWithTextOverlay(pdfDoc, templatePath, facultyData, leaveData);
      }
      
    } catch (error) {
      console.error('Error filling PDF form:', error);
      throw error;
    }
  }

  // Fill existing form fields in PDF
  async fillFormFields(pdfDoc, form, facultyData, leaveData) {
    try {
      const fieldMappings = {
        'name': `${facultyData.firstName} ${facultyData.lastName}`,
        'employeeId': facultyData.employeeId || '',
        'designation': facultyData.designation || '',
        'department': facultyData.department || '',
        'leaveType': leaveData.leaveType,
        'leave_type': leaveData.leaveType,
        'startDate': new Date(leaveData.startDate || leaveData.leave_start_date || leaveData.leave_start).toLocaleDateString(),
        'endDate': new Date(leaveData.endDate || leaveData.leave_end_date || leaveData.leave_end).toLocaleDateString(),
        'leave_start_date': new Date(leaveData.startDate || leaveData.leave_start_date || leaveData.leave_start).toLocaleDateString(),
        'leave_end_date': new Date(leaveData.endDate || leaveData.leave_end_date || leaveData.leave_end).toLocaleDateString(),
        'leave_start': new Date(leaveData.startDate || leaveData.leave_start_date || leaveData.leave_start).toLocaleDateString(),
        'leave_end': new Date(leaveData.endDate || leaveData.leave_end_date || leaveData.leave_end).toLocaleDateString(),
        'reason': leaveData.reason || '',
        'contactDuringLeave': leaveData.contactDuringLeave || '',
        'contact_info': leaveData.contactDuringLeave || leaveData.contact_info || '',
        'alternativeArrangement': leaveData.alternativeArrangement || '',
        'applicationDate': new Date().toLocaleDateString(),
        'application_date': new Date().toLocaleDateString(),
        'medicalCertificate': leaveData.medicalCertificate || false,
        'no_of_days_leave': leaveData.no_of_days_leave || leaveData.calculatedDays || this.calculateLeaveDays(leaveData.startDate || leaveData.leave_start_date, leaveData.endDate || leaveData.leave_end_date),
        'no_of_leave_days': leaveData.no_of_leave_days || leaveData.calculatedDays || this.calculateLeaveDays(leaveData.startDate || leaveData.leave_start_date, leaveData.endDate || leaveData.leave_end_date)
      };
      
      const fields = form.getFields();
      
      fields.forEach(field => {
        const fieldName = field.getName();
        const value = fieldMappings[fieldName];
        
        if (value !== undefined) {
          try {
            if (field.constructor.name.includes('TextField')) {
              field.setText(String(value));
            } else if (field.constructor.name.includes('CheckBox')) {
              if (value) field.check();
              else field.uncheck();
            }
          } catch (fieldError) {
            console.warn(`Could not fill field ${fieldName}:`, fieldError.message);
          }
        }
      });
      
      // Flatten the form to prevent further editing
      form.flatten();
      
      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Error filling form fields:', error);
      throw error;
    }
  }

  // Fill PDF using text overlay method
  async fillWithTextOverlay(pdfDoc, templatePath, facultyData, leaveData) {
    try {
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const staffType = this.getStaffType({ designation: facultyData.designation });
      const positions = this.getFormPositions(templatePath, staffType);
      
      // Fill basic fields
      this.fillTextField(firstPage, positions.name, `${facultyData.firstName} ${facultyData.lastName}`, font, height);
      this.fillTextField(firstPage, positions.designation, facultyData.designation, font, height);
      
      // Handle leave days with date field
      if (positions.leaveDaysWithDate) {
        const leaveDaysText = this.formatLeaveDaysWithDate(leaveData);
        this.fillTextField(firstPage, positions.leaveDaysWithDate, leaveDaysText, font, height);
      }
      
      // Fill reason
      if (positions.reason && leaveData.reason) {
        this.fillTextArea(firstPage, positions.reason, leaveData.reason, font, height);
      }
      
      // Fill date fields for EL forms
      if (positions.leaveFromDate && Array.isArray(positions.leaveFromDate)) {
        this.fillDateFields(firstPage, positions.leaveFromDate, leaveData.leaveFromDate || leaveData.startDate, font, height);
      }
      
      if (positions.leaveToDate && Array.isArray(positions.leaveToDate)) {
        this.fillDateFields(firstPage, positions.leaveToDate, leaveData.leaveToDate || leaveData.endDate, font, height);
      }
      
      // Fill number of days
      if (positions.noOfDaysLeave) {
        const days = leaveData.noOfDaysLeave || this.calculateLeaveDays(leaveData.leaveFromDate || leaveData.startDate, leaveData.leaveToDate || leaveData.endDate);
        this.fillTextField(firstPage, positions.noOfDaysLeave, days.toString(), font, height);
      }
      
      // Fill checkboxes for nature of leave
      this.fillCheckboxes(firstPage, positions, leaveData, font, height);
      
      // Fill contact information
      if (positions.contactNo && leaveData.contactNo) {
        this.fillTextField(firstPage, positions.contactNo, leaveData.contactNo, font, height);
      }
      
      // Fill address fields
      this.fillAddressFields(firstPage, positions, leaveData, font, height);
      
      // Fill application date
      if (positions.applicationDate) {
        this.fillTextField(firstPage, positions.applicationDate, new Date().toLocaleDateString('en-GB'), font, height);
      }
      
      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Error filling with text overlay:', error);
      throw error;
    }
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
  
  // Helper method to fill text area
  fillTextArea(page, position, text, font, pageHeight, fontSize = 10) {
    if (position && text) {
      const lines = this.wrapText(text, 300, font, fontSize);
      lines.forEach((line, index) => {
        page.drawText(line, {
          x: position.x,
          y: pageHeight - position.y - (index * 12),
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });
    }
  }
  
  // Helper method to fill date fields (for forms with multiple date positions)
  fillDateFields(page, positions, dateValue, font, pageHeight, fontSize = 10) {
    if (positions && dateValue) {
      const date = new Date(dateValue);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      
      // Fill day, month, year in separate positions
      if (positions[0]) this.fillTextField(page, positions[0], day[0], font, pageHeight, fontSize);
      if (positions[1]) this.fillTextField(page, positions[1], day[1], font, pageHeight, fontSize);
      if (positions[2]) this.fillTextField(page, positions[2], month[0], font, pageHeight, fontSize);
      if (positions[3]) this.fillTextField(page, positions[3], month[1], font, pageHeight, fontSize);
      if (positions[4]) this.fillTextField(page, positions[4], year[2], font, pageHeight, fontSize);
      if (positions[5]) this.fillTextField(page, positions[5], year[3], font, pageHeight, fontSize);
    }
  }
  
  // Helper method to fill checkboxes
  fillCheckboxes(page, positions, leaveData, font, pageHeight) {
    const checkMark = '✓';
    
    if (positions.natureOfLeave_EL && leaveData.natureOfLeave_EL) {
      this.fillTextField(page, positions.natureOfLeave_EL, checkMark, font, pageHeight, 12);
    }
    if (positions.natureOfLeave_HPL && leaveData.natureOfLeave_HPL) {
      this.fillTextField(page, positions.natureOfLeave_HPL, checkMark, font, pageHeight, 12);
    }
    if (positions.natureOfLeave_COML && leaveData.natureOfLeave_COML) {
      this.fillTextField(page, positions.natureOfLeave_COML, checkMark, font, pageHeight, 12);
    }
    if (positions.natureOfLeave_EOL && leaveData.natureOfLeave_EOL) {
      this.fillTextField(page, positions.natureOfLeave_EOL, checkMark, font, pageHeight, 12);
    }
    if (positions.reasonLTC && leaveData.reasonLTC) {
      this.fillTextField(page, positions.reasonLTC, checkMark, font, pageHeight, 12);
    }
    if (positions.reasonOthers && leaveData.reasonOthers) {
      this.fillTextField(page, positions.reasonOthers, checkMark, font, pageHeight, 12);
    }
  }
  
  // Helper method to fill address fields
  fillAddressFields(page, positions, leaveData, font, pageHeight) {
    if (positions.addressLine1 && leaveData.addressLine1) {
      this.fillTextField(page, positions.addressLine1, leaveData.addressLine1, font, pageHeight);
    }
    if (positions.addressLine2 && leaveData.addressLine2) {
      this.fillTextField(page, positions.addressLine2, leaveData.addressLine2, font, pageHeight);
    }
    if (positions.addressLine3 && leaveData.addressLine3) {
      this.fillTextField(page, positions.addressLine3, leaveData.addressLine3, font, pageHeight);
    }
  }
  
  // Format leave days with date
  formatLeaveDaysWithDate(leaveData) {
    const startDate = leaveData.leaveFromDate || leaveData.startDate;
    const endDate = leaveData.leaveToDate || leaveData.endDate;
    const days = leaveData.noOfDaysLeave || this.calculateLeaveDays(startDate, endDate);
    
    if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-GB');
      const end = new Date(endDate).toLocaleDateString('en-GB');
      return `${days} days (${start} to ${end})`;
    }
    
    return days ? `${days} days` : '';
  }

  getFormPositions(templatePath, staffType = 'Teaching') {
    const filename = path.basename(templatePath);
    
    // Determine form type from filename
    let formType = 'Leave_Form';
    if (filename.includes('CL_Form')) formType = 'CL_Form';
    else if (filename.includes('EL_Form')) formType = 'EL_Form';
    else if (filename.includes('CPDA')) formType = 'CPDA';
    
    // Get positions from config with fallback
    const positions = formPositions[staffType]?.[formType] || 
                     formPositions['Teaching']?.[formType] || 
                     formPositions['Teaching']['Leave_Form'] || {};
    
    return positions;
  }

  wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  // Generate PDF leave form (primary method)
  async generateLeaveForm(facultyData, leaveData, staffType = 'Teaching') {
    try {
      const contractType = this.getContractType(facultyData);
      const template = this.getFormTemplate(leaveData.leaveType, staffType, contractType);
      
      if (template) {
        // Use existing PDF template
        const pdfBytes = await this.fillPDFForm(template.path, facultyData, leaveData);
        
        return {
          pdfBytes: pdfBytes,
          templateUsed: template.filename,
          leaveType: template.type,
          formFields: await this.extractFormFields(template.path)
        };
      } else {
        // Fallback: create a simple PDF form
        return await this.createSimplePDFForm(facultyData, leaveData, staffType);
      }
      
    } catch (error) {
      console.error('Error generating leave form:', error);
      // Final fallback: create a simple PDF form
      return await this.createSimplePDFForm(facultyData, leaveData, staffType);
    }
  }

  // Generate fillable PDF template from existing PDF
  async generateFillablePDFTemplate(templatePath, outputPath = null) {
    try {
      const fillablePdfBytes = await this.createFillablePDFForm(templatePath, outputPath);
      const formFields = await this.extractFormFields(templatePath);
      
      return {
        pdfBytes: fillablePdfBytes,
        formFields: formFields,
        templatePath: templatePath
      };
      
    } catch (error) {
      console.error('Error generating fillable PDF template:', error);
      throw error;
    }
  }

  async createSimplePDFForm(facultyData, leaveData, staffType) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let yPosition = 800;
      const leftMargin = 50;
      const lineHeight = 18;
      
      // Header
      page.drawText('NATIONAL INSTITUTE OF TECHNOLOGY PUDUCHERRY', {
        x: leftMargin + 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
      
      page.drawText('-'.repeat(80), {
        x: leftMargin,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      page.drawText('CASUAL / COMPENSATORY / RH / SPCL LEAVE APPLICATION FORM', {
        x: leftMargin + 20,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
      
      page.drawText('(Please strike out whichever is not applicable)', {
        x: leftMargin + 80,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      // Form fields
      const startDate = leaveData.startDate || leaveData.leave_start_date || leaveData.leave_start;
      const endDate = leaveData.endDate || leaveData.leave_end_date || leaveData.leave_end;
      const calculatedDays = leaveData.calculatedDays || leaveData.no_of_days_leave || leaveData.no_of_leave_days || this.calculateLeaveDays(startDate, endDate);
      
      const fields = [
        ['1. Name', `${facultyData.firstName} ${facultyData.lastName}`],
        ['2. Designation', facultyData.designation || ''],
        ['3. No. of Days of leave required with date:', `${calculatedDays} days (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`],
        ['4. Reason for leave', leaveData.reason || ''],
        ['5. Adjustment of Duties', leaveData.alternativeArrangement || leaveData.adjustment_faculty_name || '']
      ];
      
      fields.forEach(([label, value]) => {
        page.drawText(`${label}:`, {
          x: leftMargin,
          y: yPosition,
          size: 11,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
        
        if (value) {
          const lines = this.wrapText(value, 450, font, 11);
          lines.forEach(line => {
            page.drawText(line, {
              x: leftMargin + 20,
              y: yPosition,
              size: 11,
              font: font,
              color: rgb(0, 0, 0),
            });
            yPosition -= lineHeight;
          });
        } else {
          yPosition -= lineHeight;
        }
        yPosition -= 10;
      });
      
      // Table for adjustment of duties
      yPosition -= 20;
      const tableHeaders = ['S. No', 'Date', 'Time', 'Name of the faculty / staff', 'Signature'];
      const colWidths = [50, 80, 60, 200, 100];
      let xPos = leftMargin;
      
      tableHeaders.forEach((header, i) => {
        page.drawText(header, {
          x: xPos,
          y: yPosition,
          size: 10,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        xPos += colWidths[i];
      });
      yPosition -= 40;
      
      // Signature section
      yPosition -= 40;
      page.drawText(`Date of application: ${new Date().toLocaleDateString()}`, {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Signature of the Applicant: ____________________', {
        x: leftMargin + 250,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;
      
      // Recommendation section
      page.drawText('Recommendation of Section Head / Reporting Officer:', {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 60;
      
      page.drawText('Signature with designation: ____________________', {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;
      
      // Office use section
      page.drawText('(FOR USE IN OFFICE)', {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      const officeFields = [
        'Leave at Credit: _____ day(s)',
        'Leave taken now: _____ day(s)',
        'Balance of leave at Credit: _____ day(s)'
      ];
      
      officeFields.forEach(field => {
        page.drawText(field, {
          x: leftMargin,
          y: yPosition,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
      });
      
      yPosition -= 20;
      page.drawText('Supdt / Asst Reg: ____________________', {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 40;
      page.drawText('Granted / Not Granted: ____________________', {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 30;
      page.drawText('HoD / Registrar: ____________________', {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      const pdfBytes = await pdfDoc.save();
      
      return {
        pdfBytes: pdfBytes,
        templateUsed: 'NIT Puducherry Leave Form',
        leaveType: leaveData.leaveType
      };
      
    } catch (error) {
      console.error('Error creating simple PDF form:', error);
      throw error;
    }
  }
  
  calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }

  getContractType(facultyData) {
    if (facultyData.designation && facultyData.designation.toLowerCase().includes('contract')) {
      return 'Contract';
    }
    return 'Regular';
  }

  getStaffType(facultyData) {
    const teachingDesignations = ['professor', 'assistant professor', 'associate professor', 'lecturer'];
    const designation = (facultyData.designation || '').toLowerCase();
    
    if (teachingDesignations.some(d => designation.includes(d))) {
      return 'Teaching';
    }
    return 'Non-Teaching';
  }

  // Get form structure for frontend (PDF version)
  async getFormStructure(leaveType, staffType = 'Teaching', contractType = 'Regular') {
    try {
      const template = this.getFormTemplate(leaveType, staffType, contractType);
      
      if (template) {
        const formFields = await this.extractFormFields(template.path);
        
        return {
          templateName: template.filename,
          leaveType: template.type || leaveType,
          formFields: formFields,
          staffType: staffType,
          contractType: contractType,
          isPDF: true
        };
      } else {
        return {
          templateName: 'Default PDF Form',
          leaveType: leaveType,
          formFields: this.getDefaultFormFields(),
          staffType: staffType,
          contractType: contractType,
          isPDF: true
        };
      }
      
    } catch (error) {
      console.error('Error getting PDF form structure:', error);
      return {
        templateName: 'Default PDF Form',
        leaveType: leaveType,
        formFields: this.getDefaultFormFields(),
        staffType: staffType,
        contractType: contractType,
        isPDF: true
      };
    }
  }

  // Convert existing PDF to fillable form
  async convertToFillableForm(inputPath, outputPath) {
    try {
      const fillablePdfBytes = await this.createFillablePDFForm(inputPath, outputPath);
      return fillablePdfBytes;
    } catch (error) {
      console.error('Error converting to fillable form:', error);
      throw error;
    }
  }

  // Get all available PDF forms with their field information
  async getAllFormsWithFields(staffType = 'Teaching') {
    try {
      const forms = this.getAvailableForms(staffType);
      const formsWithFields = [];
      
      for (const form of forms) {
        try {
          const formFields = await this.extractFormFields(form.path);
          formsWithFields.push({
            ...form,
            formFields: formFields,
            fieldCount: formFields.length
          });
        } catch (error) {
          console.warn(`Could not extract fields from ${form.filename}:`, error.message);
          formsWithFields.push({
            ...form,
            formFields: this.getDefaultFormFields(),
            fieldCount: this.getDefaultFormFields().length
          });
        }
      }
      
      return formsWithFields;
      
    } catch (error) {
      console.error('Error getting forms with fields:', error);
      return [];
    }
  }
}

module.exports = new PDFFormService();