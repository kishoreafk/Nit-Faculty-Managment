import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const DatabaseStatus = () => {
  const [status, setStatus] = useState({
    api: 'checking',
    database: 'checking',
    lastChecked: null
  });

  const checkStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, api: 'checking', database: 'checking' }));
      
      // Test API health
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        const data = await response.json();
        setStatus(prev => ({
          ...prev,
          api: 'connected',
          database: 'connected',
          lastChecked: new Date().toLocaleTimeString(),
          message: data.message
        }));
      } else {
        setStatus(prev => ({
          ...prev,
          api: 'error',
          database: 'error',
          lastChecked: new Date().toLocaleTimeString(),
          error: `HTTP ${response.status}`
        }));
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        api: 'error',
        database: 'error',
        lastChecked: new Date().toLocaleTimeString(),
        error: error.message
      }));
    }
  };

  useEffect(() => {
    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'checking':
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = (statusType) => {
    switch (statusType) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'checking':
      default:
        return 'Checking...';
    }
  };

  const getStatusColor = (statusType) => {
    switch (statusType) {
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'checking':
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor(status.api)}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
        <button
          onClick={checkStatus}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">API Server</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.api)}
            <span className="text-sm text-gray-600">{getStatusText(status.api)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Database</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.database)}
            <span className="text-sm text-gray-600">{getStatusText(status.database)}</span>
          </div>
        </div>
      </div>
      
      {status.lastChecked && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last checked: {status.lastChecked}
          </p>
        </div>
      )}
      
      {status.message && status.api === 'connected' && (
        <div className="mt-2">
          <p className="text-xs text-green-700 bg-green-100 rounded px-2 py-1">
            ✅ {status.message}
          </p>
        </div>
      )}
      
      {status.error && status.api === 'error' && (
        <div className="mt-2">
          <p className="text-xs text-red-700 bg-red-100 rounded px-2 py-1">
            ❌ {status.error}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Make sure the backend server is running on port 5000
          </p>
        </div>
      )}
    </div>
  );
};

export default DatabaseStatus;