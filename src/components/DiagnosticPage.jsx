import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DatabaseStatus from './DatabaseStatus';

const DiagnosticPage = () => {
  const [diagnostics, setDiagnostics] = useState({});
  const { faculty, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    const runDiagnostics = () => {
      const results = {
        timestamp: new Date().toISOString(),
        react: {
          version: React.version,
          strictMode: true,
        },
        auth: {
          loading,
          isAuthenticated,
          hasFaculty: !!faculty,
          facultyData: faculty ? { ...faculty, password: '[HIDDEN]' } : null,
        },
        localStorage: {
          hasToken: !!localStorage.getItem('token'),
          hasFaculty: !!localStorage.getItem('faculty'),
          tokenLength: localStorage.getItem('token')?.length || 0,
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          baseUrl: window.location.origin,
          pathname: window.location.pathname,
          userAgent: navigator.userAgent,
        },
        css: {
          tailwindLoaded: !!document.querySelector('style[data-vite-dev-id*="tailwind"]') || 
                         !!document.querySelector('link[href*="tailwind"]') ||
                         getComputedStyle(document.body).getPropertyValue('--tw-bg-opacity') !== '',
          customCssLoaded: !!document.querySelector('style[data-vite-dev-id*="index.css"]'),
        },
        api: {
          baseUrl: 'http://localhost:5000/api',
          corsEnabled: 'Unknown - needs testing',
        }
      };
      
      setDiagnostics(results);
    };

    runDiagnostics();
  }, [faculty, loading, isAuthenticated]);

  const testApiConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      setDiagnostics(prev => ({
        ...prev,
        api: {
          ...prev.api,
          healthCheck: 'SUCCESS',
          healthData: data,
          lastTested: new Date().toISOString(),
        }
      }));
    } catch (error) {
      setDiagnostics(prev => ({
        ...prev,
        api: {
          ...prev.api,
          healthCheck: 'FAILED',
          error: error.message,
          lastTested: new Date().toISOString(),
        }
      }));
    }
  };

  const clearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Application Diagnostics</h1>
          
          {/* Database Status */}
          <div className="mb-6">
            <DatabaseStatus />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* React Status */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-800 mb-3">React Status</h2>
              <div className="space-y-2 text-sm">
                <div>Version: <span className="font-mono">{diagnostics.react?.version}</span></div>
                <div>Strict Mode: <span className="font-mono">{diagnostics.react?.strictMode ? 'Enabled' : 'Disabled'}</span></div>
              </div>
            </div>

            {/* Authentication Status */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-800 mb-3">Authentication</h2>
              <div className="space-y-2 text-sm">
                <div>Loading: <span className="font-mono">{diagnostics.auth?.loading ? 'Yes' : 'No'}</span></div>
                <div>Authenticated: <span className="font-mono">{diagnostics.auth?.isAuthenticated ? 'Yes' : 'No'}</span></div>
                <div>Has Faculty: <span className="font-mono">{diagnostics.auth?.hasFaculty ? 'Yes' : 'No'}</span></div>
              </div>
            </div>

            {/* Local Storage */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-yellow-800 mb-3">Local Storage</h2>
              <div className="space-y-2 text-sm">
                <div>Has Token: <span className="font-mono">{diagnostics.localStorage?.hasToken ? 'Yes' : 'No'}</span></div>
                <div>Has Faculty: <span className="font-mono">{diagnostics.localStorage?.hasFaculty ? 'Yes' : 'No'}</span></div>
                <div>Token Length: <span className="font-mono">{diagnostics.localStorage?.tokenLength}</span></div>
              </div>
              <button 
                onClick={clearStorage}
                className="mt-3 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Clear Storage
              </button>
            </div>

            {/* Environment */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-purple-800 mb-3">Environment</h2>
              <div className="space-y-2 text-sm">
                <div>Node Env: <span className="font-mono">{diagnostics.environment?.nodeEnv}</span></div>
                <div>Base URL: <span className="font-mono">{diagnostics.environment?.baseUrl}</span></div>
                <div>Pathname: <span className="font-mono">{diagnostics.environment?.pathname}</span></div>
              </div>
            </div>

            {/* CSS Status */}
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-indigo-800 mb-3">CSS Status</h2>
              <div className="space-y-2 text-sm">
                <div>Tailwind: <span className="font-mono">{diagnostics.css?.tailwindLoaded ? 'Loaded' : 'Not Loaded'}</span></div>
                <div>Custom CSS: <span className="font-mono">{diagnostics.css?.customCssLoaded ? 'Loaded' : 'Not Loaded'}</span></div>
              </div>
            </div>

            {/* API Status */}
            <div className="bg-red-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-red-800 mb-3">API Status</h2>
              <div className="space-y-2 text-sm">
                <div>Base URL: <span className="font-mono">{diagnostics.api?.baseUrl}</span></div>
                <div>Health Check: <span className="font-mono">{diagnostics.api?.healthCheck || 'Not Tested'}</span></div>
                {diagnostics.api?.error && (
                  <div>Error: <span className="font-mono text-red-600">{diagnostics.api.error}</span></div>
                )}
              </div>
              <button 
                onClick={testApiConnection}
                className="mt-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Test API
              </button>
            </div>
          </div>

          {/* Raw Data */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Raw Diagnostic Data</h2>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              onClick={() => window.location.href = '/test'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Test Page
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Go to Login
            </button>
            <button 
              onClick={() => window.location.href = '/debug'}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              API Debug Console
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;