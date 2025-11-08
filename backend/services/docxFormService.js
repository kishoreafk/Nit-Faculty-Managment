const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const { createReport } = require('docx-templates');
const mammoth = require('mammoth');
const formFieldMappings = require('../config/formFieldMappings.json');

class DocxFormService {
  constructor() {
    this.leaveDocumentsPath = path.join(__dirname, '..', 'Leave_Documents');
    this.formStructures = new Map();
  }

  // Scan DOCX structure and extract field placeholders
  async scanDocxStructure(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      // Extract placeholders using enhanced patterns
      const placeholders = [];
      
      formFieldMappings.placeholderPatterns.forEach(patternStr => {
        const pattern = new RegExp(patternStr, 'g');
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (match[1]) {
            placeholders.push(match[1].trim());
          }
        }
      });

      // Identify common form fields based on content
      const formFields = this.identifyFormFields(text);
      
      // Create dynamic field presence flags
      const fieldPresence = {};
      formFieldMappings.commonFields.forEach(field => {
        fieldPresence[`has${field.charAt(0).toUpperCase() + field.slice(1)}`] = formFields.includes(field);
      });
      
      // Add special field checks
      fieldPresence.hasMedicalCertificate = /medical.*certificate|health.*certificate/i.test(text);
      fieldPresence.hasMaternityFields = /maternity|pregnancy|delivery/i.test(text);
      fieldPresence.hasActivityFields = /activity|conference|seminar|workshop/i.test(text);
      fieldPresence.hasIllnessNature = /nature.*illness|illness.*nature/i.test(text);
      fieldPresence.hasExpectedDeliveryDate = /expected.*delivery|due.*date/i.test(text);
      fieldPresence.hasLeavePurpose = /purpose.*leave|leave.*purpose/i.test(text);
      fieldPresence.hasActivityDetails = /activity.*details|conference.*details/i.test(text);
      fieldPresence.hasActivityVenue = /venue|location|place/i.test(text);
      
      return {
        placeholders: [...new Set(placeholders)],
        formFields,
        rawText: text,
        ...fieldPresence
      };
    } catch (error) {
      console.error('Error scanning DOCX structure:', error);
      throw error;
    }
  }

  // Identify form fields based on content analysis
  identifyFormFields(text) {
    const fields = [];
    const lowerText = text.toLowerCase();
    
    // Use enhanced field patterns from configuration
    Object.entries(formFieldMappings.fieldPatterns).forEach(([fieldName, patterns]) => {
      const found = patterns.some(pattern => {
        const regex = new RegExp(pattern, 'im');
        return regex.test(lowerText);
      });
      
      if (found) {
        fields.push(fieldName);
      }
    });

    return fields;
  }

  // Get available DOCX forms
  getAvailableForms(staffType = 'Teaching') {
    let forms = [];
    
    // Get forms from staff type folder
    const formsPath = path.join(this.leaveDocumentsPath, staffType);
    if (fs.existsSync(formsPath)) {
      const staffForms = fs.readdirSync(formsPath)
        .filter(file => file.endsWith('.docx'))
        .map(file => ({
          filename: file,
          path: path.join(formsPath, file),
          type: this.getLeaveTypeFromFilename(file),
          staffType
        }));
      forms = forms.concat(staffForms);
    }
    
    // Get activity forms (available for all staff types)
    const activityPath = path.join(this.leaveDocumentsPath, 'Activity');
    if (fs.existsSync(activityPath)) {
      const activityForms = fs.readdirSync(activityPath)
        .filter(file => file.endsWith('.docx'))
        .map(file => ({
          filename: file,
          path: path.join(activityPath, file),
          type: 'Activity Leave',
          staffType: 'Activity'
        }));
      forms = forms.concat(activityForms);
    }

    return forms;
  }

  // Get leave type from filename
  getLeaveTypeFromFilename(filename) {
    if (filename.includes('CL_Form')) return 'Casual Leave';
    if (filename.includes('EL_Form')) return 'Earned Leave';
    if (filename.includes('Leave_Form')) return 'General Leave';
    if (filename.includes('CPDA')) return 'Activity Leave';
    return 'General Leave';
  }

  // Get form template based on leave type and staff type
  getFormTemplate(leaveType, staffType = 'Teaching', contractType = 'Regular') {
    const forms = this.getAvailableForms(staffType);
    
    // Form mapping based on staff type and leave category
    let casualLeaveTypes, earnedLeaveTypes, generalLeaveTypes;
    
    if (staffType === 'Teaching') {
      // Teaching staff categories
      casualLeaveTypes = ['Casual Leave', 'Compensatory Leave', 'RH Leave', 'Special Leave', 'Sick Leave'];
      earnedLeaveTypes = ['Earned Leave', 'Commuted Leave', 'Half Pay Leave'];
      generalLeaveTypes = ['Maternity Leave', 'Paternity Leave', 'Study Leave', 'Medical Leave'];
    } else {
      // Non-Teaching staff categories (based on document analysis)
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
    
    return form || forms.find(f => f.staffType === staffType) || forms[0];
  }

  // Generate filled DOCX form
  async generateDocxForm(facultyData, leaveData, staffType = 'Teaching') {
    try {
      const contractType = this.getContractType(facultyData);
      const template = this.getFormTemplate(leaveData.leaveType, staffType, contractType);
      
      if (!template) {
        throw new Error('No suitable form template found');
      }

      // Scan template structure if not cached
      if (!this.formStructures.has(template.path)) {
        const structure = await this.scanDocxStructure(template.path);
        this.formStructures.set(template.path, structure);
      }

      const templateBuffer = fs.readFileSync(template.path);
      
      const structure = this.formStructures.get(template.path);
      
      // Prepare data based on specific placeholders found in this template
      const templateData = this.prepareTemplateDataForForm(facultyData, leaveData, structure.placeholders);
      
      // Generate filled document
      const filledBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        cmdDelimiter: ['{', '}'],
        failFast: false
      });

      return {
        docxBuffer: filledBuffer,
        templateUsed: template.filename,
        leaveType: template.type,
        structure: this.formStructures.get(template.path)
      };
      
    } catch (error) {
      console.error('Error generating DOCX form:', error);
      // Fallback: create a simple DOCX with the data
      return await this.createSimpleDocxForm(facultyData, leaveData, staffType);
    }
  }

  // Prepare template data based on specific form placeholders
  prepareTemplateDataForForm(facultyData, leaveData, placeholders) {
    const currentDate = new Date().toLocaleDateString();
    const startDate = new Date(leaveData.startDate).toLocaleDateString();
    const endDate = new Date(leaveData.endDate).toLocaleDateString();
    const totalDays = this.calculateLeaveDays(leaveData.startDate, leaveData.endDate);
    
    const templateData = {};
    
    // Map each placeholder found in the template
    placeholders.forEach(placeholder => {
      const key = placeholder.toLowerCase();
      
      switch (key) {
        case 'name':
          templateData[placeholder] = `${facultyData.firstName} ${facultyData.lastName}`;
          break;
        case 'designation':
          templateData[placeholder] = facultyData.designation || '';
          break;
        case 'no.of days':
        case 'no of days':
          templateData[placeholder] = `${totalDays} days (${startDate} - ${endDate})`;
          break;
        case 'reason':
          templateData[placeholder] = leaveData.reason || '';
          break;
        case 'leave type':
          templateData[placeholder] = leaveData.leaveType;
          break;
        case 'leave count':
          templateData[placeholder] = totalDays;
          break;
        case 'leave start date':
          templateData[placeholder] = startDate;
          break;
        case 'leave end date':
          templateData[placeholder] = endDate;
          break;
        case 'address':
          templateData[placeholder] = leaveData.address || leaveData.contactDuringLeave || '';
          break;
        case 'contact number':
          templateData[placeholder] = leaveData.contactDuringLeave || '';
          break;
        case 'application date':
        case 'date of application':
          templateData[placeholder] = currentDate;
          break;
        case 'application status':
          templateData[placeholder] = 'Granted / Not Granted';
          break;
        case 'date':
          templateData[placeholder] = currentDate;
          break;
        // Empty fields for manual filling
        case 'sr.no':
        case 'time':
        case 'staff name':
          templateData[placeholder] = leaveData.adjustmentStaffName || '';
          break;
        case 'faculty name':
        case 'name of the faculty':
          templateData[placeholder] = leaveData.adjustmentStaffName || '';
          break;
        case 'adjustmnet name and department':
          templateData[placeholder] = leaveData.adjustmentNameAndDepartment || '';
          break;
        case 'time':
          templateData[placeholder] = leaveData.adjustmentTime || '';
          break;
        case 'prefix':
        case 'start date':
        case 'suffix  start date':
        case 'end date':
        case 'suffix end date':
          templateData[placeholder] = '';
          break;
        default:
          // For any unmapped placeholder, try to find a reasonable default
          templateData[placeholder] = this.getDefaultValueForPlaceholder(placeholder, facultyData, leaveData);
      }
    });
    
    return templateData;
  }
  
  // Get default value for unmapped placeholders
  getDefaultValueForPlaceholder(placeholder, facultyData, leaveData) {
    const key = placeholder.toLowerCase();
    
    if (key.includes('name')) return `${facultyData.firstName} ${facultyData.lastName}`;
    if (key.includes('date')) return new Date().toLocaleDateString();
    if (key.includes('reason')) return leaveData.reason || '';
    if (key.includes('contact')) return leaveData.contactDuringLeave || '';
    if (key.includes('designation')) return facultyData.designation || '';
    if (key.includes('department')) return facultyData.department || '';
    
    return ''; // Default empty for unknown placeholders
  }

  // Create a simple DOCX form as fallback
  async createSimpleDocxForm(facultyData, leaveData, staffType) {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "LEAVE APPLICATION FORM",
                  bold: true,
                  size: 28
                })
              ],
              alignment: "center"
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "Name: ", bold: true }),
                new TextRun({ text: `${facultyData.firstName} ${facultyData.lastName}` })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Employee ID: ", bold: true }),
                new TextRun({ text: facultyData.employeeId || '' })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Department: ", bold: true }),
                new TextRun({ text: facultyData.department || '' })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Designation: ", bold: true }),
                new TextRun({ text: facultyData.designation || '' })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "Leave Type: ", bold: true }),
                new TextRun({ text: leaveData.leaveType })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Start Date: ", bold: true }),
                new TextRun({ text: new Date(leaveData.startDate).toLocaleDateString() })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "End Date: ", bold: true }),
                new TextRun({ text: new Date(leaveData.endDate).toLocaleDateString() })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Days: ", bold: true }),
                new TextRun({ text: this.calculateLeaveDays(leaveData.startDate, leaveData.endDate).toString() })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "Reason for Leave: ", bold: true })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: leaveData.reason || '' })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "Alternative Arrangement: ", bold: true })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: leaveData.alternativeArrangement || '' })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "Contact During Leave: ", bold: true }),
                new TextRun({ text: leaveData.contactDuringLeave || '' })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "Application Date: ", bold: true }),
                new TextRun({ text: new Date().toLocaleDateString() })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "Applicant Signature: ____________________" })
              ]
            })
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      
      return {
        docxBuffer: buffer,
        templateUsed: 'Generated Form',
        leaveType: 'General Leave',
        structure: {
          placeholders: [],
          formFields: ['name', 'employeeId', 'department', 'leaveType', 'startDate', 'endDate', 'reason'],
          hasName: true,
          hasEmployeeId: true,
          hasDepartment: true,
          hasLeaveType: true,
          hasStartDate: true,
          hasEndDate: true,
          hasReason: true
        }
      };
    } catch (error) {
      console.error('Error creating simple DOCX form:', error);
      throw error;
    }
  }

  // Calculate leave days
  calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }

  // Get contract type
  getContractType(facultyData) {
    if (facultyData.designation && facultyData.designation.toLowerCase().includes('contract')) {
      return 'Contract';
    }
    return 'Regular';
  }

  // Get staff type
  getStaffType(facultyData) {
    const teachingDesignations = ['professor', 'assistant professor', 'associate professor', 'lecturer'];
    const designation = (facultyData.designation || '').toLowerCase();
    
    if (teachingDesignations.some(d => designation.includes(d))) {
      return 'Teaching';
    }
    return 'Non-Teaching';
  }

  // Get form structure for frontend
  async getFormStructure(leaveType, staffType = 'Teaching', contractType = 'Regular') {
    try {
      const template = this.getFormTemplate(leaveType, staffType, contractType);
      
      if (!template) {
        return this.getDefaultFormStructure(leaveType);
      }

      let structure;
      if (!this.formStructures.has(template.path)) {
        structure = await this.scanDocxStructure(template.path);
        this.formStructures.set(template.path, structure);
      } else {
        structure = this.formStructures.get(template.path);
      }

      // Merge with default structure to ensure leave-type specific fields are included
      const defaultStructure = this.getDefaultFormStructure(leaveType);
      const mergedStructure = {
        ...structure,
        ...defaultStructure,
        // Keep the scanned structure's detected fields but add defaults for missing ones
        templateName: template.filename,
        leaveType: template.type || leaveType
      };

      return mergedStructure;
    } catch (error) {
      console.error('Error getting form structure:', error);
      return this.getDefaultFormStructure(leaveType);
    }
  }

  // Get default form structure
  getDefaultFormStructure(leaveType) {
    // Start with common fields
    const baseFields = {};
    formFieldMappings.commonFields.forEach(field => {
      baseFields[`has${field.charAt(0).toUpperCase() + field.slice(1)}`] = true;
    });
    
    // Add default special fields
    baseFields.hasMedicalCertificate = false;
    baseFields.hasMaternityFields = false;
    baseFields.hasActivityFields = false;
    baseFields.hasIllnessNature = false;
    baseFields.hasExpectedDeliveryDate = false;
    baseFields.hasLeavePurpose = false;
    baseFields.hasActivityDetails = false;
    baseFields.hasActivityVenue = false;

    // Add leave type specific fields
    const specificFields = formFieldMappings.leaveTypeSpecificFields[leaveType] || [];
    specificFields.forEach(field => {
      baseFields[`has${field.charAt(0).toUpperCase() + field.slice(1)}`] = true;
    });
    
    // Special handling for certain leave types
    if (leaveType === 'Maternity Leave' || leaveType === 'Paternity Leave') {
      baseFields.hasMaternityFields = true;
      baseFields.hasExpectedDeliveryDate = true;
    }
    if (leaveType === 'Activity Leave' || leaveType === 'Conference Leave') {
      baseFields.hasActivityFields = true;
      baseFields.hasActivityDetails = true;
      baseFields.hasActivityVenue = true;
      baseFields.hasLeavePurpose = true;
    }
    if (leaveType === 'Sick Leave') {
      baseFields.hasMedicalCertificate = true;
      baseFields.hasIllnessNature = true;
    }
    if (leaveType === 'Earned Leave') {
      baseFields.hasLeavePurpose = true;
    }

    return {
      ...baseFields,
      formFields: Object.keys(baseFields)
        .filter(key => baseFields[key] && key.startsWith('has'))
        .map(key => key.replace('has', '').toLowerCase()),
      placeholders: [],
      templateName: 'Default Form',
      leaveType
    };
  }
}

module.exports = new DocxFormService();