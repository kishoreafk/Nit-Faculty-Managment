import React from 'react';

const TestPage = () => {
  console.log('TestPage: Rendering test page');
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Page</h1>
        <p className="text-gray-600">If you can see this, React is working!</p>
        <div className="mt-4 p-4 bg-blue-100 rounded-lg">
          <p className="text-blue-800">Check the browser console for debugging logs</p>
        </div>
      </div>
    </div>
  );
};

export default TestPage; 