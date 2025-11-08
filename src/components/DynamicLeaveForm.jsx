import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const DynamicLeaveForm = () => {
  const { faculty } = useAuth();
  const [, setTemplates] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [staffType, setStaffType] = useState('');
  const [selectedLeaveCategory, setSelectedLeaveCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [templateId, setTemplateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);


  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedLeaveCategory && staffType) {
      fetchFormFields();
    }
  }, [selectedLeaveCategory, staffType]);

  useEffect(() => {
    if (faculty && formFields.length > 0) {
      const initialData = {};
      formFields.forEach(field => {
        if (field.auto_fill && faculty) {
          switch (field.auto_fill) {
            case 'faculty_name':
              initialData[field.name] = `${faculty.firstName} ${faculty.lastName}`;
              break;
            case 'designation':
              initialData[field.name] = faculty.designation || '';
              break;
            case 'current_date':
              initialData[field.name] = new Date().toISOString().split('T')[0];
              break;
            case 'pending':
              initialData[field.name] = 'Pending';
              break;
            default:
              initialData[field.name] = field.defaultValue || '';
          }
        } else if (field.auto_increment && field.name === 'serial_number') {
          // Generate auto-increment serial number
          initialData[field.name] = Date.now().toString().slice(-6);
        } else {
          initialData[field.name] = formData[field.name] || field.defaultValue || '';
        }
      });
      setFormData(initialData);
    }
  }, [faculty, formFields]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/leave-forms/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
        setStaffType(data.staffType);
        
        const allCategories = new Set();
        data.templates.forEach(template => {
          template.leaveCategories.forEach(category => allCategories.add(category));
        });
        
        const categoriesArray = Array.from(allCategories);
        if (categoriesArray.length === 0) {
          const categories = data.staffType === 'Teaching' 
            ? ['Casual Leave', 'Earned Leave', 'General Leave']
            : ['Casual Leave', 'Earned Leave', 'General Leave'];
          setAvailableCategories(categories);
        } else {
          setAvailableCategories(categoriesArray);
        }
      } else {
        const categories = staffType === 'Teaching' 
          ? ['Casual Leave', 'Earned Leave', 'General Leave']
          : ['Casual Leave', 'Earned Leave', 'General Leave'];
        setAvailableCategories(categories);
        setStaffType('Teaching');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setAvailableCategories(['Casual Leave', 'Earned Leave', 'General Leave']);
      setStaffType('Teaching');
    }
  };

  // Try to fetch PDF-derived structure first for the selected category and staff type
  const fetchPDFFormStructure = useCallback(async () => {
    if (!selectedLeaveCategory || !staffType) return null;
    try {
      const response = await fetch(
        `/api/files/pdf/form-structure?leaveType=${encodeURIComponent(selectedLeaveCategory)}&staffType=${encodeURIComponent(staffType)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data?.structure?.formFields?.length > 0) {
        const templateName = data?.structure?.templateName || '';
        const fromTemplate = deriveFieldsFromTemplateName(templateName, selectedLeaveCategory, staffType);
        const normalized = (fromTemplate && fromTemplate.length > 0)
          ? fromTemplate
          : normalizePDFFields(data.structure.formFields, selectedLeaveCategory);
        setFormFields(normalized);
        // Try to get DB templateId for submission compatibility
        try {
          const tplRes = await fetch(
            `/api/leave-forms/fields?leaveCategory=${encodeURIComponent(selectedLeaveCategory)}&staffType=${encodeURIComponent(staffType)}`,
            { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
          );
          const tplData = await tplRes.json();
          if (tplData?.success) {
            setTemplateId(tplData.templateId);
          } else {
            setTemplateId(null);
          }
        } catch (_) {
          setTemplateId(null);
        }

        // Seed initial data
        const initial = {};
        normalized.forEach(field => {
          if (field.auto_fill && faculty) {
            switch (field.auto_fill) {
              case 'faculty_name':
                initial[field.name] = `${faculty.firstName} ${faculty.lastName}`;
                break;
              case 'designation':
                initial[field.name] = faculty.designation || '';
                break;
              case 'department':
                initial[field.name] = faculty.department || '';
                break;
              case 'current_date':
                initial[field.name] = new Date().toISOString().split('T')[0];
                break;
              default:
                initial[field.name] = field.defaultValue || '';
            }
          } else if (field.defaultValue !== undefined) {
            initial[field.name] = field.defaultValue;
          } else {
            initial[field.name] = '';
          }
        });
        setFormData(initial);
        return normalized;
      }
    } catch (e) {
      console.warn('PDF structure fetch failed, will fallback to DB templates');
    }
    return null;
  }, [selectedLeaveCategory, staffType, faculty]);

  // Convert raw PDF field list to app-friendly fields
  const normalizePDFFields = (rawFields, leaveCategory) => {
    const toLabel = (name) => {
      if (!name) return '';
      const spaced = name
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
      return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    };

    return rawFields.map((f) => {
      const base = {
        name: f.name,
        label: toLabel(f.name),
        type: ['text', 'textarea', 'checkbox', 'date', 'time', 'select'].includes(f.type) ? f.type : (f.type === 'dropdown' ? 'select' : 'text'),
        required: !!f.required,
      };

      // Map well-known names to our canonical field naming and metadata
      switch (f.name) {
        case 'name':
          return { ...base, label: 'Name', auto_fill: 'faculty_name' };
        case 'designation':
          return { ...base, label: 'Designation', auto_fill: 'designation' };
        case 'department':
          return { ...base, label: 'Department', auto_fill: 'department' };
        case 'employeeId':
          return { ...base, label: 'Employee ID' };
        case 'leaveType':
          return { ...base, label: 'Leave Type', name: 'leave_type', defaultValue: leaveCategory };
        case 'startDate':
          return { ...base, label: 'Leave Start Date', name: 'leave_start', type: 'date', required: true };
        case 'endDate':
          return { ...base, label: 'Leave End Date', name: 'leave_end', type: 'date', required: true };
        case 'applicationDate':
          return { ...base, label: 'Application Date', name: 'application_date', type: 'date', auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] };
        case 'reason':
          return { ...base, label: 'Reason', type: 'textarea' };
        case 'alternativeArrangement':
          return { ...base, label: 'Adjustment of Duties', type: 'textarea' };
        case 'contactDuringLeave':
          return { ...base, label: 'Contact During Leave' };
        case 'medicalCertificate':
          return { ...base, label: 'Medical Certificate', type: 'checkbox' };
        default:
          return base;
      }
    });
  };

  // Build fields from known template names and the provided canonical sets
  const deriveFieldsFromTemplateName = (templateName, leaveCategory, staff) => {
    const tn = (templateName || '').toLowerCase();

    const auto = {
      name: { auto_fill: 'faculty_name' },
      designation: { auto_fill: 'designation' },
      application_date: { auto_fill: 'current_date', type: 'date', defaultValue: new Date().toISOString().split('T')[0] },
      application_status: { auto_fill: 'pending', defaultValue: 'Pending' },
    };

    const field = (name, label, type = 'text', extra = {}) => ({ name, label, type, required: !!extra.required, ...extra });
    const withAuto = (arr) => arr.map(f => (auto[f.name] ? { ...f, ...auto[f.name] } : f));

    const isTeaching = staff === 'Teaching';
    const isContract = tn.includes('contract');

    const commonCL = [
      field('leave_type', 'Leave Type', 'text', { defaultValue: leaveCategory, required: true }),
      field('name', 'Name', 'text', { required: true }),
      field('designation', 'Designation', 'text', { required: true }),
      field('leave_start_date', 'Leave Start Date', 'date', { required: true }),
      field('leave_end_date', 'Leave End Date', 'date', { required: true }),
      field('no_of_days_leave', 'No. of Days Leave', 'number', { required: true, auto_calculate: true }),
      field('reason', 'Reason', 'textarea', { required: true }),
      field('serial_number', 'Serial Number', 'text'),
      field('adjustment_date', 'Adjustment Date', 'date'),
      field('adjustment_time', 'Adjustment Time', 'time'),
      field('adjustment_faculty_name', 'Adjustment Faculty Name', 'text'),
      field('application_date', 'Application Date', 'date', { required: true }),
      field('application_status', 'Application Status', 'text', { required: true }),
    ];

    const commonLeaveContract = [
      field('name', 'Name', 'text', { required: true }),
      field('designation', 'Designation', 'text', { required: true }),
      field('leave_start_date', 'Leave Start Date', 'date', { required: true }),
      field('leave_end_date', 'Leave End Date', 'date', { required: true }),
      field('no_of_days_leave', 'No. of Days Leave', 'number', { required: true, auto_calculate: true }),
      field('reason', 'Reason', 'textarea', { required: true }),
      field('adjustment_faculty_name', 'Adjustment Faculty Name', 'text'),
      field('adjustment_time', 'Adjustment Time', 'time'),
      field('adjustment_date', 'Adjustment Date', 'date'),
      field('serial_number', 'Serial Number', 'text'),
      field('application_date', 'Application Date', 'date', { required: true }),
      field('application_status', 'Application Status', 'text', { required: true }),
    ];

    const teachingEL = [
      field('leave_type', 'Leave Type', 'text', { defaultValue: leaveCategory, required: true }),
      field('name', 'Name', 'text', { required: true }),
      field('designation', 'Designation', 'text', { required: true }),
      field('nature_of_leave', 'Nature of Leave', 'checkbox'),
      field('MC_FC_enclosed', 'MC/FC Enclosed', 'checkbox'),
      field('no_of_leave_days', 'No. of Leave Days', 'number', { required: true, auto_calculate: true }),
      field('leave_start', 'Leave Start', 'date', { required: true }),
      field('leave_end', 'Leave End', 'date', { required: true }),
      field('prefix_leave_start', 'Prefix Leave Start', 'date'),
      field('prefix_leave_end', 'Prefix Leave End', 'date'),
      field('suffix_leave_start', 'Suffix Leave Start', 'date'),
      field('suffix_leave_end', 'Suffix Leave End', 'date'),
      field('LTC_block_year', 'LTC Block Year', 'text'),
      field('LTC_leave_type', 'LTC Leave Type', 'checkbox'),
      field('other_reason', 'Other Reason', 'checkbox'),
      field('other_reason_details', 'Other Reason Details', 'text'),
      field('address', 'Address', 'textarea'),
      field('contact_info', 'Contact Info', 'text'),
      field('adjustment_faculty_name', 'Adjustment Faculty Name', 'text'),
      field('adjustment_time', 'Adjustment Time', 'time'),
      field('adjustment_date', 'Adjustment Date', 'date'),
      field('serial_number', 'Serial Number', 'text'),
      field('application_date', 'Application Date', 'date', { required: true }),
      field('application_status', 'Application Status', 'text', { required: true }),
    ];

    const nonTeachingEL = [
      field('leave_type', 'Leave Type', 'text', { defaultValue: leaveCategory, required: true }),
      field('name', 'Name', 'text', { required: true }),
      field('designation', 'Designation', 'text', { required: true }),
      field('nature_of_leave', 'Nature of Leave', 'checkbox'),
      field('MC_FC_enclosed', 'MC/FC Enclosed', 'checkbox'),
      field('no_of_days_leave', 'No. of Days Leave', 'number', { required: true, auto_calculate: true }),
      field('leave_start_date', 'Leave Start Date', 'date', { required: true }),
      field('leave_end_date', 'Leave End Date', 'date', { required: true }),
      field('prefix_leave_start', 'Prefix Leave Start', 'date'),
      field('prefix_leave_end', 'Prefix Leave End', 'date'),
      field('suffix_leave_start', 'Suffix Leave Start', 'date'),
      field('suffix_leave_end', 'Suffix Leave End', 'date'),
      field('leave_reason_LTC', 'Leave Reason LTC', 'checkbox'),
      field('LTC_block_year', 'LTC Block Year', 'text'),
      field('leave_other_reason', 'Leave Other Reason', 'checkbox'),
      field('other_leave_reason', 'Other Leave Reason', 'text'),
      field('address_info_during_leave', 'Address Info During Leave Period', 'textarea'),
      field('contact_info', 'Contact Info', 'text'),
      field('application_date', 'Application Date', 'date', { required: true }),
      field('application_status', 'Application Status', 'text', { required: true }),
    ];

    const nonTeachingCL = [
      field('name', 'Name', 'text', { required: true }),
      field('designation', 'Designation', 'text', { required: true }),
      field('leave_start_date', 'Leave Start Date', 'date', { required: true }),
      field('leave_end_date', 'Leave End Date', 'date', { required: true }),
      field('no_of_days_leave', 'No. of Days Leave', 'number', { required: true, auto_calculate: true }),
      field('reason', 'Reason', 'textarea', { required: true }),
      field('date_of_application', 'Date of Application', 'date', { required: true }),
      field('application_status', 'Application Status', 'text', { required: true }),
      field('leave_type', 'Leave Type', 'text', { defaultValue: leaveCategory, required: true }),
      field('adjustment_faculty_name_designation', 'Adjustment Faculty Name and Designation', 'text'),
    ];

    const nonTeachingContract = [
      field('name', 'Name', 'text', { required: true }),
      field('designation', 'Designation', 'text', { required: true }),
      field('leave_start_date', 'Leave Start Date', 'date', { required: true }),
      field('leave_end_date', 'Leave End Date', 'date', { required: true }),
      field('no_of_leave_days', 'No. of Leave Days', 'number', { required: true, auto_calculate: true }),
      field('reason', 'Reason', 'textarea', { required: true }),
      field('application_date', 'Application Date', 'date', { required: true }),
      field('adjustment_faculty_name_designation', 'Adjustment Faculty Name and Designation', 'text'),
      field('application_status', 'Application Status', 'text', { required: true }),
    ];

    if (tn.includes('cl_form') && isTeaching && !isContract) return withAuto(commonCL);
    if (tn.includes('el_form') && isTeaching && !isContract) return withAuto(teachingEL);
    if (tn.includes('leave_form') && isTeaching && isContract) return withAuto(commonLeaveContract);
    if (tn.includes('cl_form') && !isTeaching && !isContract) return withAuto(nonTeachingCL);
    if (tn.includes('el_form') && !isTeaching && !isContract) return withAuto(nonTeachingEL);
    if (tn.includes('leave_form') && !isTeaching && isContract) return withAuto(nonTeachingContract);
    return [];
  };

  const fetchFormFields = useCallback(async () => {
    try {
      // 1) Prefer PDF-derived structure if available
      const pdfFields = await fetchPDFFormStructure();
      if (pdfFields && pdfFields.length) {
        return; // already set state inside
      }

      // 2) Fallback to DB-driven templates
      const response = await fetch(
        `/api/leave-forms/fields?leaveCategory=${encodeURIComponent(selectedLeaveCategory)}&staffType=${staffType}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setFormFields(data.formFields);
        setTemplateId(data.templateId);
        
        const initialData = {};
        data.formFields.forEach(field => {
          if (field.auto_fill && faculty) {
            switch (field.auto_fill) {
              case 'faculty_name':
                initialData[field.name] = `${faculty.firstName} ${faculty.lastName}`;
                break;
              case 'designation':
                initialData[field.name] = faculty.designation || '';
                break;
              case 'current_date':
                initialData[field.name] = new Date().toISOString().split('T')[0];
                break;
              case 'pending':
                initialData[field.name] = 'Pending';
                break;
              default:
                initialData[field.name] = field.defaultValue || '';
            }
          } else {
            initialData[field.name] = field.defaultValue || '';
          }
        });
        setFormData(initialData);
      } else {
        const defaultFields = getDefaultFormFields(selectedLeaveCategory);
        setFormFields(defaultFields);
        setTemplateId(null);
        
        const initialData = {};
        defaultFields.forEach(field => {
          if (field.auto_fill && faculty) {
            switch (field.auto_fill) {
              case 'faculty_name':
                initialData[field.name] = `${faculty.firstName} ${faculty.lastName}`;
                break;
              case 'designation':
                initialData[field.name] = faculty.designation || '';
                break;
              case 'current_date':
                initialData[field.name] = new Date().toISOString().split('T')[0];
                break;
              case 'pending':
                initialData[field.name] = 'Pending';
                break;
              default:
                initialData[field.name] = field.defaultValue || '';
            }
          } else {
            initialData[field.name] = field.defaultValue || '';
          }
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Error fetching form fields:', error);
      const defaultFields = getDefaultFormFields(selectedLeaveCategory);
      setFormFields(defaultFields);
      setTemplateId(null);
      
      const initialData = {};
      defaultFields.forEach(field => {
        if (field.auto_fill && faculty) {
          switch (field.auto_fill) {
            case 'faculty_name':
              initialData[field.name] = `${faculty.firstName} ${faculty.lastName}`;
              break;
            case 'designation':
              initialData[field.name] = faculty.designation || '';
              break;
            case 'current_date':
              initialData[field.name] = new Date().toISOString().split('T')[0];
              break;
            case 'pending':
              initialData[field.name] = 'Pending';
              break;
            default:
              initialData[field.name] = field.defaultValue || '';
          }
        } else {
          initialData[field.name] = field.defaultValue || '';
        }
      });
      setFormData(initialData);
    }
  }, [selectedLeaveCategory, staffType]);



  const getDefaultFormFields = (leaveCategory) => {
    const pdfFormStructure = getPDFFormStructure(leaveCategory, staffType);
    if (pdfFormStructure.length > 0) {
      return pdfFormStructure;
    }
    
    const baseFields = [
      { name: 'name', label: 'Name', type: 'text', required: true, auto_fill: 'faculty_name', defaultValue: faculty ? `${faculty.firstName} ${faculty.lastName}` : '' },
      { name: 'designation', label: 'Designation', type: 'text', required: true, auto_fill: 'designation', defaultValue: faculty?.designation || '' },
      { name: 'leave_type', label: 'Leave Type', type: 'text', required: true, defaultValue: leaveCategory },
      { name: 'leave_start_date', label: 'Leave Start Date', type: 'date', required: true },
      { name: 'leave_end_date', label: 'Leave End Date', type: 'date', required: true },
      { name: 'no_of_days_leave', label: 'No. of Days Leave', type: 'number', required: true, auto_calculate: true },
      { name: 'reason', label: 'Reason for Leave', type: 'textarea', required: true },
      { name: 'application_date', label: 'Application Date', type: 'date', required: true, auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] },
      { name: 'application_status', label: 'Status', type: 'text', required: true, auto_fill: 'pending', defaultValue: 'Pending' }
    ];

    return baseFields;
  };

  const getPDFFormStructure = (leaveCategory, staffType) => {
    const structures = {
      'Teaching': {
        'Casual Leave': [
          { name: 'leave_type', label: 'Leave Type', type: 'select', required: true, defaultValue: leaveCategory, options: ['CASUAL', 'COMPENSATORY', 'RH LEAVE', 'SPCL LEAVE'] },
          { name: 'name', label: 'Name', type: 'text', required: true, auto_fill: 'faculty_name', defaultValue: faculty ? `${faculty.firstName} ${faculty.lastName}` : '' },
          { name: 'designation', label: 'Designation', type: 'text', required: true, auto_fill: 'designation', defaultValue: faculty?.designation || '' },
          { name: 'leave_start_date', label: 'Leave Start Date', type: 'date', required: true },
          { name: 'leave_end_date', label: 'Leave End Date', type: 'date', required: true },
          { name: 'no_of_days_leave', label: 'No. of Days Leave', type: 'number', required: true, auto_calculate: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'serial_number', label: 'Serial Number', type: 'text', required: false, auto_increment: true },
          { name: 'adjustment_date', label: 'Adjustment Date', type: 'date', required: false },
          { name: 'adjustment_time', label: 'Adjustment Time', type: 'time', required: false },
          { name: 'adjustment_faculty_name', label: 'Adjustment Faculty Name', type: 'text', required: false },
          { name: 'application_date', label: 'Application Date', type: 'date', required: true, auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] },
          { name: 'application_status', label: 'Application Status', type: 'text', required: true, auto_fill: 'pending', defaultValue: 'Pending' }
        ],
        'Earned Leave': [
          { name: 'leave_type', label: 'Leave Type', type: 'select', required: true, defaultValue: leaveCategory, options: ['APPLICATION FOR EARNED LEAVE', 'COMMUTED LEAVE', 'HALF PAY LEAVE'] },
          { name: 'name', label: 'Name', type: 'text', required: true, auto_fill: 'faculty_name', defaultValue: faculty ? `${faculty.firstName} ${faculty.lastName}` : '' },
          { name: 'designation', label: 'Designation', type: 'text', required: true, auto_fill: 'designation', defaultValue: faculty?.designation || '' },
          { name: 'nature_of_leave', label: 'Nature of Leave', type: 'checkbox-group', required: false, options: ['EL', 'HPL', 'COM.L', 'E.O.L'] },
          { name: 'MC_FC_enclosed', label: 'If Com L, whether MC/FC is enclosed', type: 'radio', required: false, options: ['Yes', 'No'] },
          { name: 'no_of_leave_days', label: 'No. of Leave Days', type: 'number', required: true, auto_calculate: true },
          { name: 'leave_start_date', label: 'Leave Start Date', type: 'date', required: true },
          { name: 'leave_end_date', label: 'Leave End Date', type: 'date', required: true },
          { name: 'prefix_leave_start', label: 'Prefix Leave Start', type: 'date', required: false },
          { name: 'prefix_leave_end', label: 'Prefix Leave End', type: 'date', required: false },
          { name: 'suffix_leave_start', label: 'Suffix Leave Start', type: 'date', required: false },
          { name: 'suffix_leave_end', label: 'Suffix Leave End', type: 'date', required: false },
          { name: 'LTC_block_year', label: 'LTC Block Year', type: 'text', required: false, placeholder: '__ - __' },
          { name: 'LTC_leave_type', label: 'LTC Leave Type', type: 'checkbox', required: false },
          { name: 'other_reason', label: 'Other Reason', type: 'checkbox', required: false },
          { name: 'other_reason_details', label: 'Other Reason Details', type: 'text', required: false },
          { name: 'address', label: 'Address During Leave', type: 'textarea', required: false },
          { name: 'contact_info', label: 'Contact Info (Mobile)', type: 'text', required: false },
          { name: 'adjustment_faculty_name', label: 'Adjustment Faculty Name', type: 'text', required: false },
          { name: 'adjustment_time', label: 'Adjustment Time', type: 'time', required: false },
          { name: 'adjustment_date', label: 'Adjustment Date', type: 'date', required: false },
          { name: 'serial_number', label: 'Serial Number', type: 'text', required: false, auto_increment: true },
          { name: 'application_date', label: 'Application Date', type: 'date', required: true, auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] },
          { name: 'application_status', label: 'Application Status', type: 'text', required: true, auto_fill: 'pending', defaultValue: 'Pending' }
        ],
        'General Leave': [
          { name: 'leave_type', label: 'Leave Type', type: 'text', required: true, defaultValue: leaveCategory },
          { name: 'name', label: 'Name', type: 'text', required: true, auto_fill: 'faculty_name', defaultValue: faculty ? `${faculty.firstName} ${faculty.lastName}` : '' },
          { name: 'designation', label: 'Designation', type: 'text', required: true, auto_fill: 'designation', defaultValue: faculty?.designation || '' },
          { name: 'leave_start_date', label: 'Leave Start Date', type: 'date', required: true },
          { name: 'leave_end_date', label: 'Leave End Date', type: 'date', required: true },
          { name: 'no_of_days_leave', label: 'No. of Days Leave', type: 'number', required: true, auto_calculate: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'application_date', label: 'Application Date', type: 'date', required: true, auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] },
          { name: 'application_status', label: 'Application Status', type: 'text', required: true, auto_fill: 'pending', defaultValue: 'Pending' }
        ]
      },
      'Non-Teaching': {
        'Casual Leave': [
          { name: 'leave_type', label: 'Leave Type', type: 'select', required: true, defaultValue: leaveCategory, options: ['CASUAL', 'COMPENSATORY', 'RH LEAVE'] },
          { name: 'name', label: 'Name', type: 'text', required: true, auto_fill: 'faculty_name', defaultValue: faculty ? `${faculty.firstName} ${faculty.lastName}` : '' },
          { name: 'designation', label: 'Designation', type: 'text', required: true, auto_fill: 'designation', defaultValue: faculty?.designation || '' },
          { name: 'leave_start_date', label: 'Leave Start Date', type: 'date', required: true },
          { name: 'leave_end_date', label: 'Leave End Date', type: 'date', required: true },
          { name: 'no_of_days_leave', label: 'No. of Days Leave', type: 'number', required: true, auto_calculate: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'application_date', label: 'Application Date', type: 'date', required: true, auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] },
          { name: 'adjustment_faculty_name_designation', label: 'Adjustment Faculty Name and Designation', type: 'text', required: false },
          { name: 'application_status', label: 'Application Status', type: 'text', required: true, auto_fill: 'pending', defaultValue: 'Pending' }
        ],
        'Earned Leave': [
          { name: 'leave_type', label: 'Leave Type', type: 'select', required: true, defaultValue: leaveCategory, options: ['APPLICATION FOR EARNED LEAVE', 'COMMUTED LEAVE', 'HALF PAY LEAVE'] },
          { name: 'name', label: 'Name', type: 'text', required: true, auto_fill: 'faculty_name', defaultValue: faculty ? `${faculty.firstName} ${faculty.lastName}` : '' },
          { name: 'designation', label: 'Designation', type: 'text', required: true, auto_fill: 'designation', defaultValue: faculty?.designation || '' },
          { name: 'nature_of_leave', label: 'Nature of Leave', type: 'checkbox-group', required: false, options: ['EL', 'HPL', 'COM.L', 'E.O.L'] },
          { name: 'MC_FC_enclosed', label: 'If Com L, whether MC/FC is enclosed', type: 'radio', required: false, options: ['Yes', 'No'] },
          { name: 'no_of_days_leave', label: 'No. of Days Leave', type: 'number', required: true, auto_calculate: true },
          { name: 'leave_start_date', label: 'Leave Start Date', type: 'date', required: true },
          { name: 'leave_end_date', label: 'Leave End Date', type: 'date', required: true },
          { name: 'prefix_leave_start', label: 'Prefix Leave Start', type: 'date', required: false },
          { name: 'prefix_leave_end', label: 'Prefix Leave End', type: 'date', required: false },
          { name: 'suffix_leave_start', label: 'Suffix Leave Start', type: 'date', required: false },
          { name: 'suffix_leave_end', label: 'Suffix Leave End', type: 'date', required: false },
          { name: 'leave_reason_LTC', label: 'Leave Reason LTC', type: 'checkbox', required: false },
          { name: 'LTC_block_year', label: 'LTC Block Year', type: 'text', required: false, placeholder: '__ - __' },
          { name: 'leave_other_reason', label: 'Leave Other Reason', type: 'checkbox', required: false },
          { name: 'other_leave_reason', label: 'Other Leave Reason Details', type: 'text', required: false },
          { name: 'address_info_during_leave', label: 'Address Info During Leave', type: 'textarea', required: false },
          { name: 'contact_info', label: 'Contact Info (Mobile)', type: 'text', required: false },
          { name: 'application_date', label: 'Application Date', type: 'date', required: true, auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] },
          { name: 'application_status', label: 'Application Status', type: 'text', required: true, auto_fill: 'pending', defaultValue: 'Pending' }
        ],
        'General Leave': [
          { name: 'leave_type', label: 'Leave Type', type: 'text', required: true, defaultValue: leaveCategory },
          { name: 'name', label: 'Name', type: 'text', required: true, auto_fill: 'faculty_name', defaultValue: faculty ? `${faculty.firstName} ${faculty.lastName}` : '' },
          { name: 'designation', label: 'Designation', type: 'text', required: true, auto_fill: 'designation', defaultValue: faculty?.designation || '' },
          { name: 'leave_start_date', label: 'Leave Start Date', type: 'date', required: true },
          { name: 'leave_end_date', label: 'Leave End Date', type: 'date', required: true },
          { name: 'no_of_days_leave', label: 'No. of Days Leave', type: 'number', required: true, auto_calculate: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'application_date', label: 'Application Date', type: 'date', required: true, auto_fill: 'current_date', defaultValue: new Date().toISOString().split('T')[0] },
          { name: 'application_status', label: 'Application Status', type: 'text', required: true, auto_fill: 'pending', defaultValue: 'Pending' }
        ]
      }
    };

    return structures[staffType]?.[leaveCategory] || [];
  };

  const calculateLeaveDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };
      
      // Auto-calculate leave days for all date field variations
      if (
        fieldName === 'leave_start_date' || fieldName === 'leave_end_date' ||
        fieldName === 'leave_start' || fieldName === 'leave_end'
      ) {
        // Check for different date field name variations
        const startField = newData.leave_start_date || newData.leave_start;
        const endField = newData.leave_end_date || newData.leave_end;
        
        if (startField && endField) {
          const days = calculateLeaveDays(startField, endField);
          if (newData.no_of_leave_days !== undefined) newData.no_of_leave_days = days;
          if (newData.no_of_days_leave !== undefined) newData.no_of_days_leave = days;
        }
      }
      
      // Generate serial number if it's an auto-increment field and empty
      if (fieldName === 'serial_number' && !value) {
        const serialField = formFields.find(f => f.name === 'serial_number');
        if (serialField?.auto_increment) {
          newData.serial_number = Date.now().toString().slice(-6);
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const response = await fetch('/api/leave-forms/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          templateId,
          leaveCategory: selectedLeaveCategory,
          formData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Leave application submitted successfully!');
        setFormData({});
        setSelectedLeaveCategory('');
        window.location.reload();
      } else {
        setErrors([result.message]);
      }
    } catch {
      setErrors(['Error submitting form']);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const { name, label, type, required, options } = field;
    const value = formData[name] || '';

    switch (type) {
      case 'select':
        const isLeaveTypeField = name === 'leave_type' || name === 'leaveType';
        return (
          <select
            key={name}
            value={value}
            onChange={(e) => handleInputChange(name, e.target.value)}
            required={required}
            disabled={isLeaveTypeField}
            className={`w-full p-2 border rounded-md ${isLeaveTypeField ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : ''}`}
          >
            <option value="">Select {label}</option>
            {options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            key={name}
            value={value}
            onChange={(e) => handleInputChange(name, e.target.value)}
            required={required}
            className="w-full p-2 border rounded-md"
            rows="3"
          />
        );
      
      case 'checkbox':
        return (
          <div key={name} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleInputChange(name, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Yes</span>
          </div>
        );
      
      case 'checkbox-group':
        return (
          <div key={name} className="space-y-2">
            {field.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleInputChange(name, [...currentValues, option]);
                    } else {
                      handleInputChange(name, currentValues.filter(v => v !== option));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </div>
            ))}
          </div>
        );
      
      case 'radio':
        return (
          <div key={name} className="space-y-2">
            {field.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </div>
            ))}
          </div>
        );
      
      case 'time':
        return (
          <input
            key={name}
            type="time"
            value={value}
            onChange={(e) => handleInputChange(name, e.target.value)}
            required={required}
            className="w-full p-2 border rounded-md"
          />
        );
      
      case 'date':
        return (
          <input
            key={name}
            type="date"
            value={value}
            onChange={(e) => handleInputChange(name, e.target.value)}
            required={required}
            className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${field.auto_fill ? 'bg-green-50 border-green-200' : ''}`}
            readOnly={field.auto_fill}
            style={{ minHeight: '40px' }}
          />
        );
      
      case 'number':
        return (
          <input
            key={name}
            type="number"
            value={value}
            onChange={(e) => handleInputChange(name, e.target.value)}
            required={required}
            className={`w-full p-2 border rounded-md ${field.auto_calculate ? 'bg-blue-50 border-blue-200' : ''}`}
            readOnly={field.auto_calculate}
          />
        );
      
      default:
        return (
          <input
            key={name}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(name, e.target.value)}
            required={required}
            placeholder={field.placeholder}
            className={`w-full p-2 border rounded-md ${field.auto_fill ? 'bg-green-50 border-green-200' : ''} ${field.auto_increment ? 'bg-blue-50 border-blue-200' : ''} ${(name === 'leave_type' || name === 'leaveType') ? 'bg-gray-100 border-gray-300' : ''}`}
            readOnly={field.auto_fill || field.auto_increment || (name === 'leave_type' || name === 'leaveType')}
          />
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Leave Application Form</h2>
      
      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-700">
          <strong>Staff Type:</strong> {staffType}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Leave Category</label>
        <select
          value={selectedLeaveCategory}
          onChange={(e) => setSelectedLeaveCategory(e.target.value)}
          className="w-full p-2 border rounded-md"
          required
        >
          <option value="">Select Leave Category</option>
          {availableCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

      </div>



      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      {formFields.length > 0 && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                  {field.auto_fill && <span className="text-green-600 ml-1 text-xs">(Auto-filled)</span>}
                  {field.auto_calculate && <span className="text-blue-600 ml-1 text-xs">(Auto-calculated)</span>}
                  {field.auto_increment && <span className="text-purple-600 ml-1 text-xs">(Auto-increment)</span>}
                  {(field.name === 'leave_type' || field.name === 'leaveType') && <span className="text-gray-600 ml-1 text-xs">(Non-editable)</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading || !selectedLeaveCategory}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Leave Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DynamicLeaveForm;