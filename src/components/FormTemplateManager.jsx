import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../api/api';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const FormTemplateManager = () => {
  const [availableForms, setAvailableForms] = useState({ docxForms: [], pdfForms: [] });
  const [selectedForm, setSelectedForm] = useState(null);
  const [formStructure, setFormStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanningForm, setScanningForm] = useState(null);

  useEffect(() => {
    fetchAvailableForms();
  }, []);

  const fetchAvailableForms = async () => {
    try {
      const response = await leaveAPI.getAvailableForms();
      setAvailableForms(response.data || { docxForms: [], pdfForms: [] });
    } catch {
      toast.error('Failed to fetch available forms');
    } finally {
      setLoading(false);
    }
  };

  const scanFormStructure = async (form) => {
    setScanningForm(form.filename);
    try {
      const response = await leaveAPI.scanFormStructure(form.filename, form.staffType || 'Teaching');
      setFormStructure(response.data.structure);
      setSelectedForm(form);
      toast.success('Form structure scanned successfully');
    } catch {
      toast.error('Failed to scan form structure');
    } finally {
      setScanningForm(null);
    }
  };

  const getFormTypeColor = (type) => {
    switch (type) {
      case 'Casual Leave':
        return 'bg-blue-100 text-blue-800';
      case 'Earned Leave':
        return 'bg-green-100 text-green-800';
      case 'General Leave':
        return 'bg-gray-100 text-gray-800';
      case 'Activity Leave':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderFieldPresence = (structure) => {
    const fields = Object.entries(structure)
      .filter(([key, value]) => key.startsWith('has') && value === true)
      .map(([key]) => key.replace('has', '').replace(/([A-Z])/g, ' $1').trim());

    return fields.length > 0 ? fields.join(', ') : 'No specific fields detected';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Leave Application Template Manager</h2>
        
        {/* DOCX Forms */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
            DOCX Leave Templates ({availableForms.docxForms.length})
          </h3>
          
          {availableForms.docxForms.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No DOCX leave templates found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableForms.docxForms.map((form, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{form.filename}</h4>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getFormTypeColor(form.type)}`}>
                        {form.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => scanFormStructure(form)}
                      disabled={scanningForm === form.filename}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {scanningForm === form.filename ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      ) : (
                        <>
                          <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                          Scan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PDF Forms */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-red-600" />
            PDF Leave Templates ({availableForms.pdfForms.length})
          </h3>
          
          {availableForms.pdfForms.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No PDF leave templates found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableForms.pdfForms.map((form, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{form.filename}</h4>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getFormTypeColor(form.type)}`}>
                        {form.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Legacy PDF leave template
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Structure Details */}
      {selectedForm && formStructure && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Structure Analysis: {selectedForm.filename}
            </h3>
            <button
              onClick={() => {
                setSelectedForm(null);
                setFormStructure(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Template:</span>
                  <span className="font-medium">{selectedForm.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Leave Type:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormTypeColor(selectedForm.type)}`}>
                    {selectedForm.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium">DOCX</span>
                </div>
              </div>
            </div>

            {/* Detected Fields */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Detected Fields</h4>
              <div className="text-sm">
                <div className="mb-2">
                  <span className="text-gray-600">Form Fields:</span>
                  <div className="mt-1">
                    {formStructure.formFields && formStructure.formFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {formStructure.formFields.map((field, index) => (
                          <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {field}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">No fields detected</span>
                    )}
                  </div>
                </div>
                
                <div className="mb-2">
                  <span className="text-gray-600">Placeholders:</span>
                  <div className="mt-1">
                    {formStructure.placeholders && formStructure.placeholders.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {formStructure.placeholders.map((placeholder, index) => (
                          <span key={index} className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {placeholder}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">No placeholders detected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Field Presence Analysis */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Field Presence Analysis</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-700">
                <strong>Detected Fields:</strong> {renderFieldPresence(formStructure)}
              </div>
              
              {formStructure.rawText && (
                <div className="mt-3">
                  <details className="cursor-pointer">
                    <summary className="font-medium text-gray-700 hover:text-gray-900">
                      View Raw Text (Click to expand)
                    </summary>
                    <div className="mt-2 p-3 bg-white rounded border text-xs font-mono max-h-40 overflow-y-auto">
                      {formStructure.rawText.substring(0, 1000)}
                      {formStructure.rawText.length > 1000 && '...'}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>

          {/* Usage Information */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How this affects the leave form:</p>
                <p>
                  When users select "{selectedForm.type}" as their leave type, the form will automatically 
                  show fields based on this template's structure. Fields marked as detected will be 
                  available for input, while others will be hidden.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormTemplateManager;