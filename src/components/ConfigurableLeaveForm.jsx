import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { XMarkIcon, CalendarIcon, DocumentTextIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/api';
import AdjustmentDutiesTable from './AdjustmentDutiesTable';
import LeaveBalanceDisplay from './LeaveBalanceDisplay';

const ConfigurableLeaveForm = ({ onClose, onSubmit }) => {
  const { faculty } = useAuth();
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState({});
  const [formTemplates, setFormTemplates] = useState({});
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [leaveBalances, setLeaveBalances] = useState({});
  const [leaveConfig, setLeaveConfig] = useState({});

  // Get faculty type from faculty data
  const getFacultyTypeId = (facultyType) => {
    const typeMap = {
      'Teaching': 'teaching',
      'Non-Teaching': 'non_teaching',
      'Contract': 'contract',
      'Visiting Faculty': 'visiting'
    };
    return typeMap[facultyType] || 'teaching';
  };

  const facultyTypeId = getFacultyTypeId(faculty?.facultyType || 'Teaching');

  useEffect(() => {
    fetchLeaveConfiguration();
  }, [facultyTypeId]);

  useEffect(() => {
    if (selectedLeaveType && formTemplates[selectedLeaveType]) {
      const template = formTemplates[selectedLeaveType];
      setFormFields(template.fields || []);
      initializeFormData(template.fields || []);
    }
  }, [selectedLeaveType, formTemplates]);

  const fetchLeaveConfiguration = async () => {
    try {
      setConfigLoading(true);
      
      // Use legacy config directly
      const response = await api.get(`/config/leave-types`);
      
      if (response.data.success) {
        const leaveTypesData = response.data.data.leaveTypes || {};
        
        // Filter leave types applicable to this faculty type
        const applicableLeaveTypes = {};
        Object.entries(leaveTypesData).forEach(([key, value]) => {
          if (value.applicableFor && value.applicableFor.includes(facultyTypeId)) {
            applicableLeaveTypes[key] = {
              id: key,
              name: value.name || key,
              description: value.description || '',
              maxDays: typeof value.maxDays === 'object' ? value.maxDays[facultyTypeId] : value.maxDays,
              ...value
            };
          }
        });
        
        setLeaveTypes(applicableLeaveTypes);
        setLeaveConfig(applicableLeaveTypes);
        
        // Generate form templates
        const templates = {};
        Object.keys(applicableLeaveTypes).forEach(leaveTypeId => {
          templates[leaveTypeId] = generateFormTemplate(leaveTypeId, applicableLeaveTypes[leaveTypeId]);
        });
        setFormTemplates(templates);
      } else {
        throw new Error('Failed to load leave configuration');
      }
    } catch (error) {
      console.error('Error fetching leave config:', error);
      toast.error('Failed to load leave form configuration');
      
      // Fallback configuration
      const fallbackLeaveTypes = {
        casual: { 
          id: 'casual', 
          name: 'Casual Leave', 
          description: 'Short-term leave for personal reasons',
          maxDays: 12,
          advanceNotice: 1,
          requiresApproval: true,
          carryForward: false
        },
        earned: { 
          id: 'earned', 
          name: 'Earned Leave', 
          description: 'Annual earned leave for vacation',
          maxDays: 30,
          advanceNotice: 7,
          requiresApproval: true,
          carryForward: true,
          maxCarryForwardDays: 40,
          encashmentAllowed: true
        },
        medical: { 
          id: 'medical', 
          name: 'Medical Leave', 
          description: 'Leave for medical treatment',
          maxDays: 90,
          requiresApproval: true,
          requiresMedicalCertificate: true,
          advanceNotice: 0
        }
      };
      
      setLeaveTypes(fallbackLeaveTypes);
      
      // Generate basic form templates
      const templates = {};
      Object.keys(fallbackLeaveTypes).forEach(leaveTypeId => {
        templates[leaveTypeId] = generateFormTemplate(leaveTypeId, fallbackLeaveTypes[leaveTypeId]);
      });
      setFormTemplates(templates);
    } finally {
      setConfigLoading(false);
    }
  };

  const generateFormTemplate = (leaveTypeId, leaveTypeConfig) => {
    const baseFields = [
      {
        name: 'faculty_name',
        label: 'Faculty Name',
        type: 'text',
        required: true,
        autoFill: 'faculty_name',
        readonly: true
      },
      {
        name: 'employee_id',
        label: 'Employee ID',
        type: 'text',
        required: true,
        autoFill: 'employee_id',
        readonly: true
      },
      {
        name: 'designation',
        label: 'Designation',
        type: 'text',
        required: true,
        autoFill: 'designation',
        readonly: true
      },
      {
        name: 'department',
        label: 'Department',
        type: 'text',
        required: true,
        autoFill: 'department',
        readonly: true
      },
      {
        name: 'leave_start_date',
        label: 'Leave Start Date',
        type: 'date',
        required: true
      },
      {
        name: 'leave_end_date',
        label: 'Leave End Date',
        type: 'date',
        required: true
      },
      {
        name: 'no_of_days_leave',
        label: 'Number of Days',
        type: 'number',
        required: true,
        autoCalculate: true,
        readonly: true
      },
      {
        name: 'reason_for_leave',
        label: 'Reason for Leave',
        type: 'textarea',
        required: true,
        placeholder: 'Please provide detailed reason for leave'
      }
    ];

    // Add specific fields based on leave type configuration
    const additionalFields = [];

    if (leaveTypeConfig.requiresMedicalCertificate) {
      additionalFields.push({
        name: 'medical_certificate',
        label: 'Medical Certificate',
        type: 'file',
        required: true,
        accept: '.pdf,.jpg,.jpeg,.png'
      });
    }

    if (leaveTypeConfig.bondRequired) {
      additionalFields.push({
        name: 'bond_acknowledgment',
        label: `I acknowledge that this leave requires a bond period of ${leaveTypeConfig.bondPeriod}`,
        type: 'checkbox',
        required: true
      });
    }

    if (leaveTypeConfig.partialSalary) {
      additionalFields.push({
        name: 'salary_deduction_acknowledgment',
        label: `I acknowledge that ${leaveTypeConfig.salaryDeductionPercent}% salary deduction applies`,
        type: 'checkbox',
        required: true
      });
    }

    if (leaveTypeConfig.specialConditions) {
      additionalFields.push({
        name: 'special_conditions_acknowledgment',
        label: `Special Conditions: ${leaveTypeConfig.specialConditions}`,
        type: 'checkbox',
        required: true
      });
    }

    // Add contact information for longer leaves
    if (leaveTypeConfig.maxDays > 7) {
      additionalFields.push({
        name: 'emergency_contact',
        label: 'Emergency Contact Number',
        type: 'tel',
        required: true
      });
    }

    // Add arrangement for duties if applicable
    if (['earned', 'medical', 'study'].includes(leaveTypeId)) {
      additionalFields.push({
        name: 'duty_arrangements',
        label: 'Arrangement of Duties',
        type: 'adjustment_table',
        required: true
      });
    }

    return {
      templateName: `${leaveTypeConfig.name} Application Form`,
      fields: [...baseFields, ...additionalFields]
    };
  };

  const initializeFormData = (fields) => {
    const initialData = {};
    
    fields.forEach(field => {
      if (field.autoFill && faculty) {
        switch (field.autoFill) {
          case 'faculty_name':
            initialData[field.name] = `${faculty.firstName} ${faculty.lastName}`;
            break;
          case 'designation':
            initialData[field.name] = faculty.designation || '';
            break;
          case 'department':
            initialData[field.name] = faculty.department || '';
            break;
          case 'employee_id':
            initialData[field.name] = faculty.employeeId || '';
            break;
          case 'current_date':
            initialData[field.name] = new Date().toISOString().split('T')[0];
            break;
          default:
            initialData[field.name] = field.defaultValue || '';
        }
      } else if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue;
      } else {
        initialData[field.name] = '';
      }
    });
    
    setFormData(initialData);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Auto-calculate number of days if start and end dates are provided
    if ((name === 'leave_start_date' || name === 'leave_end_date') && 
        formData.leave_start_date && formData.leave_end_date) {
      
      const startDate = new Date(name === 'leave_start_date' ? newValue : formData.leave_start_date);
      const endDate = new Date(name === 'leave_end_date' ? newValue : formData.leave_end_date);
      
      if (startDate && endDate && startDate <= endDate) {
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        
        setFormData(prev => ({
          ...prev,
          [name]: newValue,
          no_of_days_leave: daysDiff
        }));
      }
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    formFields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    // Additional validation for date ranges
    if (formData.leave_start_date && formData.leave_end_date) {
      const startDate = new Date(formData.leave_start_date);
      const endDate = new Date(formData.leave_end_date);
      
      if (startDate > endDate) {
        newErrors.leave_end_date = 'End date must be after start date';
      }

      // Check advance notice requirement
      const selectedConfig = leaveConfig[selectedLeaveType];
      if (selectedConfig && selectedConfig.advanceNotice > 0) {
        const today = new Date();
        const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        if (daysDiff < selectedConfig.advanceNotice) {
          newErrors.leave_start_date = `This leave type requires ${selectedConfig.advanceNotice} days advance notice`;
        }
      }
    }

    // Validate leave balance
    const requestedDays = parseInt(formData.no_of_days_leave || 0);
    if (selectedLeaveType && leaveBalances[selectedLeaveType] && requestedDays > 0) {
      const availableBalance = leaveBalances[selectedLeaveType].balance || 0;
      if (requestedDays > availableBalance && availableBalance > 0) {
        newErrors.no_of_days_leave = `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${requestedDays} days`;
      }
    }

    // Check maximum days limit
    const selectedConfig = leaveConfig[selectedLeaveType];
    if (selectedConfig && selectedConfig.maxDays > 0 && requestedDays > selectedConfig.maxDays) {
      newErrors.no_of_days_leave = `Maximum ${selectedConfig.maxDays} days allowed for this leave type`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        leaveType: selectedLeaveType,
        facultyType: facultyTypeId,
        templateName: formTemplates[selectedLeaveType]?.templateName || `${selectedLeaveType} Leave Form`,
        leaveConfig: leaveConfig[selectedLeaveType] // Include leave configuration
      };

      await onSubmit(submitData);
      toast.success('Leave application submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting leave application:', error);
      toast.error('Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const fieldError = errors[field.name];
    const isReadonly = field.readonly || field.autoFill || field.autoCalculate;
    const commonClasses = `w-full px-3 py-2 border rounded-lg transition-colors ${
      fieldError ? 'border-red-500' : 'border-gray-300'
    } ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {isReadonly && (
                <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                  Auto-filled
                </span>
              )}
            </label>
            <textarea
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              placeholder={field.placeholder}
              required={field.required}
              readOnly={isReadonly}
              rows={3}
              className={commonClasses}
            />
            {fieldError && <p className="text-red-500 text-sm">{fieldError}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {isReadonly && (
                <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                  Auto-filled
                </span>
              )}
            </label>
            <select
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              required={field.required}
              disabled={isReadonly}
              className={commonClasses}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {fieldError && <p className="text-red-500 text-sm">{fieldError}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name={field.name}
                checked={formData[field.name] || false}
                onChange={handleInputChange}
                required={field.required}
                disabled={isReadonly}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </span>
            </label>
            {fieldError && <p className="text-red-500 text-sm">{fieldError}</p>}
          </div>
        );

      case 'file':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              name={field.name}
              onChange={handleInputChange}
              required={field.required}
              accept={field.accept}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {fieldError && <p className="text-red-500 text-sm">{fieldError}</p>}
          </div>
        );

      case 'adjustment_table':
        return (
          <AdjustmentDutiesTable
            key={field.name}
            field={field}
            value={formData[field.name] || []}
            onChange={(value) => handleInputChange({ target: { name: field.name, value } })}
            error={fieldError}
          />
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {isReadonly && (
                <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                  Auto-filled
                </span>
              )}
            </label>
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              placeholder={field.placeholder}
              required={field.required}
              readOnly={isReadonly}
              className={commonClasses}
            />
            {fieldError && <p className="text-red-500 text-sm">{fieldError}</p>}
          </div>
        );
    }
  };

  if (configLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leave form configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Apply for Leave</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Leave Balance Display */}
          <LeaveBalanceDisplay
            selectedLeaveType={selectedLeaveType}
            onBalanceLoad={setLeaveBalances}
          />

          {/* Leave Type Selection - Only shown once */}
          {!selectedLeaveType && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">Select Leave Type</h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Choose the type of leave you want to apply for <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLeaveType}
                  onChange={(e) => setSelectedLeaveType(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select leave type</option>
                  {Object.entries(leaveTypes).map(([key, leaveType]) => (
                    <option key={key} value={key}>
                      {typeof leaveType === 'object' && leaveType.name ? leaveType.name : key}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Selected Leave Type Display */}
          {selectedLeaveType && leaveTypes[selectedLeaveType] && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">
                  Selected: {leaveTypes[selectedLeaveType]?.name}
                </h3>
                <p className="text-sm text-green-700">
                  {leaveTypes[selectedLeaveType]?.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedLeaveType('');
                  setFormFields([]);
                  setFormData({});
                }}
                className="text-green-600 hover:text-green-800 text-sm underline"
              >
                Change Leave Type
              </button>
            </div>
          )}

          {/* Dynamic Form Fields */}
          {selectedLeaveType && formFields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formFields.map(renderField)}
            </div>
          )}

          {/* Enhanced Leave Type Information */}
          {selectedLeaveType && leaveTypes[selectedLeaveType] && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Leave Information & Policies
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Description:</strong> {leaveTypes[selectedLeaveType].description}</p>
                    {leaveTypes[selectedLeaveType].maxDays && (
                      <p><strong>Maximum Days:</strong> {typeof leaveTypes[selectedLeaveType].maxDays === 'object' ? 
                        leaveTypes[selectedLeaveType].maxDays[facultyTypeId] || 0 : 
                        leaveTypes[selectedLeaveType].maxDays} days</p>
                    )}
                    {leaveTypes[selectedLeaveType].advanceNotice && (
                      <p><strong>Advance Notice:</strong> {leaveTypes[selectedLeaveType].advanceNotice} days</p>
                    )}
                  </div>
                  <div>
                    {leaveTypes[selectedLeaveType].carryForward && (
                      <p className="text-green-600">
                        <strong>✓ Carry Forward:</strong> Up to {leaveTypes[selectedLeaveType].maxCarryForwardDays || 'unlimited'} days
                      </p>
                    )}
                    {leaveTypes[selectedLeaveType].encashmentAllowed && (
                      <p className="text-green-600"><strong>✓ Encashment:</strong> Allowed</p>
                    )}
                    {leaveTypes[selectedLeaveType].extendable && (
                      <p className="text-blue-600">
                        <strong>Extendable:</strong> Up to {leaveTypes[selectedLeaveType].maxExtensionDays} days
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Special conditions and warnings */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  {leaveTypes[selectedLeaveType].requiresMedicalCertificate && (
                    <p className="text-orange-600 font-medium">⚠️ Medical certificate required</p>
                  )}
                  {leaveTypes[selectedLeaveType].bondRequired && (
                    <p className="text-red-600 font-medium">
                      ⚠️ Bond required: {leaveTypes[selectedLeaveType].bondPeriod}
                    </p>
                  )}
                  {leaveTypes[selectedLeaveType].partialSalary && (
                    <p className="text-orange-600 font-medium">
                      ⚠️ Salary deduction: {leaveTypes[selectedLeaveType].salaryDeductionPercent}%
                    </p>
                  )}
                  {leaveTypes[selectedLeaveType].specialConditions && (
                    <p className="text-purple-600 font-medium">
                      📋 Special Conditions: {leaveTypes[selectedLeaveType].specialConditions}
                    </p>
                  )}
                  {leaveTypes[selectedLeaveType].genderSpecific && (
                    <p className="text-pink-600 font-medium">
                      👤 Gender Specific: {leaveTypes[selectedLeaveType].genderSpecific}
                    </p>
                  )}
                </div>

                {/* Approval hierarchy */}
                {leaveTypes[selectedLeaveType].approvalHierarchy && leaveTypes[selectedLeaveType].approvalHierarchy.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p><strong>Approval Process:</strong></p>
                    <div className="flex items-center space-x-2 mt-1">
                      {leaveTypes[selectedLeaveType].approvalHierarchy.map((approver, index) => (
                        <React.Fragment key={approver}>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
                            {approver.replace('_', ' ')}
                          </span>
                          {index < leaveTypes[selectedLeaveType].approvalHierarchy.length - 1 && (
                            <span className="text-blue-600">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedLeaveType}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Submitting...' : 'Submit Application'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigurableLeaveForm;