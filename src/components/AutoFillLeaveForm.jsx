import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AutoFillLeaveForm = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Auto-Fill Services Removed</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-gray-700 mb-4">
            The auto-fill leave form service has been removed from the system. 
            All leave applications are now managed through the digital interface.
          </p>
          <p className="text-gray-600">
            Faculty and HOD can view all leave details directly in the system without needing auto-fill forms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoFillLeaveForm;

};

export default AutoFillLeaveForm;