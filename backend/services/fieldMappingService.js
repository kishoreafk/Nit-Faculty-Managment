const pdfFormService = require('./pdfFormService');

class FieldMappingService {
  constructor() {
    // Field mapping for each form type
    this.fieldMappings = {
      // Teaching Staff - Casual Leave (14 fields)
      'Teaching_CL': {
        Text1: { label: 'Name', type: 'text', required: true },
        Text2: { label: 'Employee ID', type: 'text', required: true },
        Text3: { label: 'Designation', type: 'text', required: true },
        Text4: { label: 'Department', type: 'text', required: true },
        Text5: { label: 'Leave Type', type: 'text', required: true },
        Text6: { label: 'Start Date', type: 'date', required: true },
        Text8: { label: 'End Date', type: 'date', required: true },
        Text9: { label: 'Number of Days', type: 'number', required: true },
        Text10: { label: 'Reason for Leave', type: 'textarea', required: true },
        Text11: { label: 'Alternative Arrangement', type: 'textarea', required: false },
        Text12: { label: 'Contact During Leave', type: 'text', required: false },
        Text13: { label: 'Application Date', type: 'date', required: true },
        Text14: { label: 'Medical Certificate', type: 'checkbox', required: false },
        Text15: { label: 'Signature', type: 'text', required: false }
      },
      
      // Teaching Staff - Earned Leave (20 fields)
      'Teaching_EL': {
        Text1: { label: 'Name', type: 'text', required: true },
        Text2: { label: 'Employee ID', type: 'text', required: true },
        Text3: { label: 'Designation', type: 'text', required: true },
        Text4: { label: 'Department', type: 'text', required: true },
        Text5: { label: 'Leave Type', type: 'text', required: true },
        Text6: { label: 'Start Date', type: 'date', required: true },
        Text7: { label: 'End Date', type: 'date', required: true },
        Text8: { label: 'Number of Days', type: 'number', required: true },
        Text9: { label: 'Reason for Leave', type: 'textarea', required: true },
        Text10: { label: 'Leave Purpose', type: 'textarea', required: true },
        Text11: { label: 'Activity Details', type: 'textarea', required: false },
        Text12: { label: 'Activity Venue', type: 'text', required: false },
        Text13: { label: 'Alternative Arrangement', type: 'textarea', required: false },
        Text14: { label: 'Contact During Leave', type: 'text', required: false },
        Text15: { label: 'Address During Leave', type: 'textarea', required: false },
        Text16: { label: 'Application Date', type: 'date', required: true },
        Text17: { label: 'Medical Certificate', type: 'checkbox', required: false },
        Text18: { label: 'Expected Delivery Date', type: 'date', required: false },
        Text19: { label: 'Illness Nature', type: 'textarea', required: false },
        Text20: { label: 'Signature', type: 'text', required: false }
      },
      
      // Teaching Staff - General Leave (14 fields)
      'Teaching_General': {
        Text1: { label: 'Name', type: 'text', required: true },
        Text2: { label: 'Employee ID', type: 'text', required: true },
        Text3: { label: 'Designation', type: 'text', required: true },
        Text4: { label: 'Department', type: 'text', required: true },
        Text5: { label: 'Leave Type', type: 'text', required: true },
        Text6: { label: 'Start Date', type: 'date', required: true },
        Text7: { label: 'End Date', type: 'date', required: true },
        Text8: { label: 'Number of Days', type: 'number', required: true },
        Text9: { label: 'Reason for Leave', type: 'textarea', required: true },
        Text10: { label: 'Alternative Arrangement', type: 'textarea', required: false },
        Text11: { label: 'Contact During Leave', type: 'text', required: false },
        Text12: { label: 'Application Date', type: 'date', required: true },
        Text13: { label: 'Medical Certificate', type: 'checkbox', required: false },
        Text14: { label: 'Signature', type: 'text', required: false }
      },
      
      // Non-Teaching Staff - Casual Leave (11 fields)
      'NonTeaching_CL': {
        Text1: { label: 'Name', type: 'text', required: true },
        Text2: { label: 'Employee ID', type: 'text', required: true },
        Text3: { label: 'Designation', type: 'text', required: true },
        Text4: { label: 'Department', type: 'text', required: true },
        Text5: { label: 'Start Date', type: 'date', required: true },
        Text6: { label: 'End Date', type: 'date', required: true },
        Text8: { label: 'Number of Days', type: 'number', required: true },
        Text9: { label: 'Reason for Leave', type: 'textarea', required: true },
        Text10: { label: 'Alternative Arrangement', type: 'textarea', required: false },
        Text11: { label: 'Application Date', type: 'date', required: true },
        Text12: { label: 'Signature', type: 'text', required: false }
      },
      
      // Non-Teaching Staff - Earned Leave (18 fields)
      'NonTeaching_EL': {
        Text1: { label: 'Name', type: 'text', required: true },
        Text2: { label: 'Employee ID', type: 'text', required: true },
        Text3: { label: 'Designation', type: 'text', required: true },
        Text4: { label: 'Department', type: 'text', required: true },
        Text5: { label: 'Leave Type', type: 'text', required: true },
        Text6: { label: 'Start Date', type: 'date', required: true },
        Text7: { label: 'End Date', type: 'date', required: true },
        Text8: { label: 'Number of Days', type: 'number', required: true },
        Text9: { label: 'Reason for Leave', type: 'textarea', required: true },
        Text10: { label: 'Leave Purpose', type: 'textarea', required: true },
        Text11: { label: 'Activity Details', type: 'textarea', required: false },
        Text12: { label: 'Activity Venue', type: 'text', required: false },
        Text13: { label: 'Alternative Arrangement', type: 'textarea', required: false },
        Text14: { label: 'Contact During Leave', type: 'text', required: false },
        Text15: { label: 'Address During Leave', type: 'textarea', required: false },
        Text16: { label: 'Application Date', type: 'date', required: true },
        Text17: { label: 'Medical Certificate', type: 'checkbox', required: false },
        Text18: { label: 'Signature', type: 'text', required: false }
      },
      
      // Non-Teaching Staff - General Leave (11 fields)
      'NonTeaching_General': {
        Text1: { label: 'Name', type: 'text', required: true },
        Text2: { label: 'Employee ID', type: 'text', required: true },
        Text3: { label: 'Designation', type: 'text', required: true },
        Text4: { label: 'Department', type: 'text', required: true },
        Text5: { label: 'Start Date', type: 'date', required: true },
        Text6: { label: 'End Date', type: 'date', required: true },
        Text7: { label: 'Number of Days', type: 'number', required: true },
        Text8: { label: 'Reason for Leave', type: 'textarea', required: true },
        Text9: { label: 'Alternative Arrangement', type: 'textarea', required: false },
        Text10: { label: 'Application Date', type: 'date', required: true },
        Text11: { label: 'Signature', type: 'text', required: false }
      }
    };
  }

  // Get form key based on staff type and leave type
  getFormKey(staffType, leaveType) {
    const staff = staffType === 'Teaching' ? 'Teaching' : 'NonTeaching';
    
    if (leaveType.includes('Casual') || leaveType.includes('Sick') || leaveType.includes('Compensatory')) {
      return `${staff}_CL`;
    } else if (leaveType.includes('Earned')) {
      return `${staff}_EL`;
    } else {
      return `${staff}_General`;
    }
  }

  // Get field mapping for specific form
  getFieldMapping(staffType, leaveType) {
    const formKey = this.getFormKey(staffType, leaveType);
    return this.fieldMappings[formKey] || {};
  }

  // Get form structure for user input
  getFormStructure(staffType, leaveType) {
    const mapping = this.getFieldMapping(staffType, leaveType);
    
    return Object.entries(mapping).map(([fieldName, config]) => ({
      fieldName,
      label: config.label,
      type: config.type,
      required: config.required,
      placeholder: this.getPlaceholder(config.type, config.label)
    }));
  }

  // Get placeholder text for input fields
  getPlaceholder(type, label) {
    switch (type) {
      case 'date': return 'YYYY-MM-DD';
      case 'number': return 'Enter number';
      case 'textarea': return `Enter ${label.toLowerCase()}`;
      case 'checkbox': return '';
      default: return `Enter ${label.toLowerCase()}`;
    }
  }

  // Map user input to form fields
  mapUserInputToFields(userInput, staffType, leaveType) {
    const mapping = this.getFieldMapping(staffType, leaveType);
    const mappedData = {};

    Object.entries(mapping).forEach(([fieldName, config]) => {
      let value = userInput[fieldName] || userInput[config.label] || '';
      
      // Auto-fill Application Date
      if (config.label === 'Application Date') {
        value = new Date().toISOString().split('T')[0];
      }
      
      // Calculate number of days
      if (config.label === 'Number of Days') {
        const startDate = userInput.Text6 || userInput['Start Date'] || userInput.startDate;
        const endDate = userInput.Text8 || userInput.Text7 || userInput['End Date'] || userInput.endDate;
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          value = days.toString();
        }
      }
      
      mappedData[fieldName] = value;
    });

    return mappedData;
  }

  // Validate user input
  validateInput(userInput, staffType, leaveType) {
    const mapping = this.getFieldMapping(staffType, leaveType);
    const errors = [];

    Object.entries(mapping).forEach(([fieldName, config]) => {
      if (config.required) {
        const value = userInput[fieldName] || userInput[config.label];
        if (!value || value.toString().trim() === '') {
          errors.push(`${config.label} is required`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new FieldMappingService();