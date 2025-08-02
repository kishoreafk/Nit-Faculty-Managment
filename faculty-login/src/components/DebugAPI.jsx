import React, { useState } from 'react';
import { authAPI } from '../api/api';

const DebugAPI = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testHealthCheck = async () => {
    setLoading(true);
    try {
      addResult('Testing health check...', 'info');
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      addResult(`✅ Health check successful: ${JSON.stringify(data)}`, 'success');
    } catch (error) {
      addResult(`❌ Health check failed: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  const testSignupAPI = async () => {
    setLoading(true);
    try {
      addResult('Testing signup API...', 'info');
      const testData = {
        firstName: 'Debug',
        lastName: 'Test',
        email: `debug.test.${Date.now()}@university.edu`,
        password: 'testpassword123',
        phone: '+1234567894',
        department: 'Computer Science',
        employeeId: `EMP${Date.now()}`
      };
      
      addResult(`Sending data: ${JSON.stringify(testData)}`, 'info');
      const response = await authAPI.signup(testData);
      addResult(`✅ Signup successful: ${JSON.stringify(response.data)}`, 'success');
    } catch (error) {
      addResult(`❌ Signup failed: ${error.response?.data?.message || error.message}`, 'error');
      if (error.response) {
        addResult(`Status: ${error.response.status}`, 'error');
        addResult(`Full error: ${JSON.stringify(error.response.data)}`, 'error');
      }
    }
    setLoading(false);
  };

  const testLoginAPI = async () => {
    setLoading(true);
    try {
      addResult('Testing login API...', 'info');
      const loginData = {
        email: 'test.user@university.edu',
        password: 'testpassword123'
      };
      
      addResult(`Sending data: ${JSON.stringify(loginData)}`, 'info');
      const response = await authAPI.login(loginData);
      addResult(`✅ Login successful: ${JSON.stringify(response.data)}`, 'success');
    } catch (error) {
      addResult(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'error');
      if (error.response) {
        addResult(`Status: ${error.response.status}`, 'error');
        addResult(`Full error: ${JSON.stringify(error.response.data)}`, 'error');
      }
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">API Debug Console</h2>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={testHealthCheck}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Health Check
        </button>
        <button
          onClick={testSignupAPI}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Signup API
        </button>
        <button
          onClick={testLoginAPI}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Login API
        </button>
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
        <h3 className="font-semibold mb-2">Results:</h3>
        {results.length === 0 ? (
          <p className="text-gray-500">No results yet. Click a button to test.</p>
        ) : (
          results.map((result, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded text-sm ${
                result.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : result.type === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              <span className="font-mono text-xs text-gray-500">[{result.timestamp}]</span>{' '}
              {result.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugAPI;