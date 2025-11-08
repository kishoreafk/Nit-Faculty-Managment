import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const PDFFormManager = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-4 text-gray-800">PDF Form Manager Removed</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-gray-700 mb-4">
            The PDF Form Manager has been removed from the system. 
            All form management is now handled through the digital interface.
          </p>
          <p className="text-gray-600">
            Leave applications and their details can be viewed and managed directly in the system 
            without requiring PDF form processing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PDFFormManager;