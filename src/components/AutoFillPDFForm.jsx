import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AutoFillPDFForm = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-4 text-gray-800">PDF Services Removed</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-gray-700 mb-4">
            The PDF auto-fill service has been removed from the system. 
            All leave applications are now managed through the digital interface.
          </p>
          <p className="text-gray-600">
            Faculty and HOD can view all leave details directly in the system without needing PDF forms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoFillPDFForm;