import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaveFormAPI } from '../api/api';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentArrowDownIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const EnhancedLeaveApplicationForm = ({ onClose, onSuccess }) => {
  const { faculty } = useAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedLeaveCategory, setSelectedLeaveCategory] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [adjustmentDuties, setAdjustmentDuties] = useState([
    { facultyName: '', date: '', time: '', designation: '' }
  ]);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const category = selectedTemplate.leaveCategories?.[0] || '';
      setSelectedLeaveCategory(category);
      if (category) fetchFormFields(category);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    // Auto-fill application date with current date and make it unchangeable
    if (formFields.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const updatedData = { ...formData };
      
      // Auto-fill faculty details
      if (formFields.some(f => f.name === 'name')) {
        updatedData.name = `${faculty?.firstName || ''} ${faculty?.lastName || ''}`.trim();
      }
      if (formFields.some(f => f.name === 'designation')) {
        updatedData.designation = faculty?.designation || '';
      }
      if (formFields.some(f => f.name === 'application_date')) {
        updatedData.application_date = today;
      }
      
      setFormData(updatedData);
    }
  }, [formFields, faculty]);

  useEffect(() => {
    calculateLeaveDays();
  }, [formData.leave_start_date, formData.leave_end_date, formData.leave_start, formData.leave_end]);

  const fetchTemplates = async () => {
    try {
      const response = await leaveFormAPI.getTemplates();
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load form templates');
    }
  };

  const fetchFormFields = async (category) => {
    try {
      const leaveCategory = category || selectedLeaveCategory;
      if (!leaveCategory) return;
      
      const response = await leaveFormAPI.getFormFields(leaveCategory, faculty?.facultyType || 'Teaching');
      
      if (response.data.success) {
        const fields = response.data.formFields || [];
        setFormFields(fields);
        
        // Initialize form data with default values
        const initialData = {};
        fields.forEach(field => {
          if (field.defaultValue) {
            initialData[field.name] = field.defaultValue;
          }
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Error fetching form fields:', error);
      toast.error('Failed to load form fields');
    }
  };

  const calculateLeaveDays = () => {
    const startDate = formData.leave_start_date || formData.leave_start;
    const endDate = formData.leave_end_date || formData.leave_end;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        setCalculatedDays(0);
        return;
      }
      
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      setCalculatedDays(days > 0 ? days : 0);
      
      // Auto-update form data with calculated days
      setFormData(prev => {
        const updatedData = { ...prev };
        if (formFields.some(f => f.name === 'no_of_days_leave')) {
          updatedData.no_of_days_leave = days;
        }
        if (formFields.some(f => f.name === 'no_of_leave_days')) {
          updatedData.no_of_leave_days = days;
        }
        return updatedData;
      });
    } else {
      setCalculatedDays(0);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleAdjustmentChange = (index, field, value) => {
    const updated = [...adjustmentDuties];
    updated[index][field] = value;
    setAdjustmentDuties(updated);
  };

  const addAdjustmentDuty = () => {
    setAdjustmentDuties([
      ...adjustmentDuties,
      { facultyName: '', date: '', time: '', designation: '' }
    ]);
  };

  const removeAdjustmentDuty = (index) => {
    if (adjustmentDuties.length > 1) {
      setAdjustmentDuties(adjustmentDuties.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTemplate || !selectedLeaveCategory) {
      toast.error('Please select a leave application template and leave type');
      return;
    }

    // Validate required fields (exclude leave_type as it's auto-filled from selectedLeaveCategory)
    const requiredFields = formFields.filter(field => field.required && field.name !== 'leave_type');
    const missingFields = requiredFields.filter(field => !formData[field.name]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    // Ensure leave_type is set from selectedLeaveCategory
    const submissionData = {
      ...formData,
      leave_type: selectedLeaveCategory,
      adjustment_duties: adjustmentDuties.filter(duty => duty.facultyName.trim()),
      calculated_days: calculatedDays
    };

    setLoading(true);
    try {
      // submissionData already prepared above

      const response = await leaveFormAPI.submitApplication({
        templateId: selectedTemplate.id,
        leaveCategory: selectedLeaveCategory,
        formData: submissionData
      });

      if (response.data.success) {
        toast.success('Leave application submitted successfully!');
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };



  const renderFormField = (field) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
            readOnly={field.auto_calculate}
          />
        );

      case 'date':
        const isApplicationDate = field.name === 'application_date';
        const minDate = field.name.includes('end') && (formData.leave_start_date || formData.leave_start) 
          ? (formData.leave_start_date || formData.leave_start) 
          : undefined;
        
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            min={minDate}
            className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isApplicationDate ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required={field.required}
            readOnly={isApplicationDate}
          />
        );

      default:
        return (
          <input
            type="text"
            value={field.name === 'leave_type' ? selectedLeaveCategory : value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              field.auto_fill || field.name === 'leave_type' ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
            readOnly={field.auto_fill || field.name === 'leave_type'}
          />
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <DocumentArrowDownIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Enhanced Leave Application
              </h2>
              <p className="text-blue-100 mt-1">Submit your leave application through the digital interface</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-blue-100">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Digital System</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Template Selection */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
              Leave Application Template *
            </label>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find(t => t.id === parseInt(e.target.value));
                setSelectedTemplate(template);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Leave Application Template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.formName}
                </option>
              ))}
            </select>
          </div>
          

        </div>

        {/* Dynamic Form Fields */}
        {formFields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Leave Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formFields.map(field => {
                // Skip adjustment_duties as it's handled separately
                if (field.name === 'adjustment_duties' || field.type === 'adjustment_table') return null;
                
                const isTextarea = field.type === 'textarea';
                const isAutoFill = field.auto_fill || field.name === 'leave_type';
                const isAutoCalc = field.autoCalculate || field.auto_calculate;
                const isAppDate = field.name === 'application_date';
                
                return (
                  <div key={field.name} className={isTextarea ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {isAppDate && <span className="text-gray-500 ml-1">(Auto-filled)</span>}
                      {isAutoFill && !isAppDate && <span className="text-blue-500 ml-1">(Auto-filled)</span>}
                      {isAutoCalc && <span className="text-green-500 ml-1">(Auto-calculated)</span>}
                    </label>
                    {field.name === 'leave_type' ? (
                      <input
                        type="text"
                        value={selectedLeaveCategory}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        readOnly
                      />
                    ) : (
                      renderFormField(field)
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calculated Days Display */}
            {calculatedDays > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">
                    Calculated Leave Days: {calculatedDays} days
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Adjustment of Duties */}
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Adjustment of Duties
              </h3>
              <button
                type="button"
                onClick={addAdjustmentDuty}
                className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Duty
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">S.No</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Faculty Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Date</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Time</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Designation</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustmentDuties.map((duty, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center">{index + 1}</td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={duty.facultyName}
                          onChange={(e) => handleAdjustmentChange(index, 'facultyName', e.target.value)}
                          className="w-full p-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                          placeholder="Faculty name"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="date"
                          value={duty.date}
                          onChange={(e) => handleAdjustmentChange(index, 'date', e.target.value)}
                          className="w-full p-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="time"
                          value={duty.time}
                          onChange={(e) => handleAdjustmentChange(index, 'time', e.target.value)}
                          className="w-full p-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={duty.designation}
                          onChange={(e) => handleAdjustmentChange(index, 'designation', e.target.value)}
                          className="w-full p-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                          placeholder="Designation"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {adjustmentDuties.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAdjustmentDuty(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || !selectedTemplate || !selectedLeaveCategory}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Submit Application
              </>
            )}
          </button>
          
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Fields marked with * are required</li>
            <li>• Auto-filled fields are populated from your profile</li>
            <li>• Leave days are automatically calculated from start and end dates</li>
            <li>• Add multiple adjustment duties as needed</li>
            <li>• All leave application details will be available in the system interface</li>
          </ul>
        </div>
      </form>
    </div>
  );
};

export default EnhancedLeaveApplicationForm;