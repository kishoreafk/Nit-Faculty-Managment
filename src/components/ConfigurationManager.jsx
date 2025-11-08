import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import axios from 'axios';

const ConfigurationManager = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('signup');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Signup Configuration
  const [signupConfig, setSignupConfig] = useState({ departments: [], facultyTypes: [] });
  const [editingDept, setEditingDept] = useState(null);
  const [editingFacultyType, setEditingFacultyType] = useState(null);
  
  // Leave Configuration
  const [leaveConfig, setLeaveConfig] = useState({ leaveTypes: {}, formTemplates: {} });
  const [editingLeaveType, setEditingLeaveType] = useState(null);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching configurations...');
      
      // Fetch signup configuration
      console.log('📋 Fetching signup configuration...');
      const signupResponse = await axios.get('/api/config/signup');
      console.log('📋 Signup response:', signupResponse.data);
      
      if (signupResponse.data.success) {
        setSignupConfig(signupResponse.data.data);
        console.log('✅ Signup config loaded:', signupResponse.data.data);
      } else {
        console.warn('⚠️ Signup config response not successful');
      }
      
      // Fetch leave configuration
      console.log('🏖️ Fetching leave configuration...');
      const leaveResponse = await axios.get('/api/config/leave-applications');
      console.log('🏖️ Leave response:', leaveResponse.data);
      
      if (leaveResponse.data.success) {
        setLeaveConfig(leaveResponse.data.data);
        console.log('✅ Leave config loaded:', leaveResponse.data.data);
      } else {
        console.warn('⚠️ Leave config response not successful');
      }
    } catch (error) {
      console.error('❌ Error fetching configurations:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      toast.error(`Failed to load configurations: ${error.response?.data?.message || error.message}`);
      
      // Set default empty configurations to prevent errors
      setSignupConfig({ departments: [], facultyTypes: [] });
      setLeaveConfig({ leaveTypes: {}, formTemplates: {} });
    } finally {
      setLoading(false);
    }
  };

  const saveSignupConfig = async () => {
    try {
      setSaving(true);
      const response = await axios.put('/api/config/signup', signupConfig);
      
      if (response.data.success) {
        toast.success('Signup configuration saved successfully');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving signup config:', error);
      toast.error('Failed to save signup configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveLeaveConfig = async () => {
    try {
      setSaving(true);
      const response = await axios.put('/api/config/leave-applications', leaveConfig);
      
      if (response.data.success) {
        toast.success('Leave configuration saved successfully');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving leave config:', error);
      toast.error('Failed to save leave configuration');
    } finally {
      setSaving(false);
    }
  };

  // Department Management
  const addDepartment = () => {
    const newDept = {
      id: `dept_${Date.now()}`,
      name: '',
      code: '',
      description: ''
    };
    setSignupConfig(prev => ({
      ...prev,
      departments: [...prev.departments, newDept]
    }));
    setEditingDept(newDept.id);
  };

  const updateDepartment = (id, field, value) => {
    setSignupConfig(prev => ({
      ...prev,
      departments: prev.departments.map(dept => 
        dept.id === id ? { ...dept, [field]: value } : dept
      )
    }));
  };

  const deleteDepartment = (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      setSignupConfig(prev => ({
        ...prev,
        departments: prev.departments.filter(dept => dept.id !== id)
      }));
    }
  };

  // Faculty Type Management
  const addFacultyType = () => {
    const newType = {
      id: `type_${Date.now()}`,
      name: '',
      description: '',
      permissions: [],
      leaveCategories: []
    };
    setSignupConfig(prev => ({
      ...prev,
      facultyTypes: [...prev.facultyTypes, newType]
    }));
    setEditingFacultyType(newType.id);
  };

  const updateFacultyType = (id, field, value) => {
    setSignupConfig(prev => ({
      ...prev,
      facultyTypes: prev.facultyTypes.map(type => 
        type.id === id ? { ...type, [field]: value } : type
      )
    }));
  };

  const deleteFacultyType = (id) => {
    if (window.confirm('Are you sure you want to delete this faculty type?')) {
      setSignupConfig(prev => ({
        ...prev,
        facultyTypes: prev.facultyTypes.filter(type => type.id !== id)
      }));
    }
  };

  // Leave Type Management
  const addLeaveType = () => {
    const newLeaveType = {
      id: `leave_${Date.now()}`,
      name: '',
      description: '',
      maxDays: 30,
      applicableFor: [],
      requiresApproval: true,
      advanceNotice: 1
    };
    setLeaveConfig(prev => ({
      ...prev,
      leaveTypes: {
        ...prev.leaveTypes,
        [newLeaveType.id]: newLeaveType
      }
    }));
    setEditingLeaveType(newLeaveType.id);
  };

  const updateLeaveType = (id, field, value) => {
    setLeaveConfig(prev => ({
      ...prev,
      leaveTypes: {
        ...prev.leaveTypes,
        [id]: {
          ...prev.leaveTypes[id],
          [field]: value
        }
      }
    }));
  };

  const deleteLeaveType = (id) => {
    if (window.confirm('Are you sure you want to delete this leave type?')) {
      setLeaveConfig(prev => {
        const newLeaveTypes = { ...prev.leaveTypes };
        delete newLeaveTypes[id];
        return {
          ...prev,
          leaveTypes: newLeaveTypes
        };
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CogIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">System Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('signup')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'signup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Signup Configuration
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'leave'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Leave Configuration
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'signup' && (
            <div className="space-y-8">
              {/* Departments Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Departments</h3>
                  <button
                    onClick={addDepartment}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Department</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(signupConfig.departments || []).map((dept) => (
                    <div key={dept.id} className="border border-gray-200 rounded-lg p-4">
                      {editingDept === dept.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input
                            type="text"
                            placeholder="Department Name"
                            value={dept.name || ''}
                            onChange={(e) => updateDepartment(dept.id, 'name', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Code (e.g., CS)"
                            value={dept.code || ''}
                            onChange={(e) => updateDepartment(dept.id, 'code', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={dept.description || ''}
                            onChange={(e) => updateDepartment(dept.id, 'description', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingDept(null)}
                              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <CheckIcon className="h-4 w-4" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => deleteDepartment(dept.id)}
                              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{dept.name || 'Unnamed Department'}</h4>
                            <p className="text-sm text-gray-600">{dept.code || 'No Code'} - {dept.description || 'No Description'}</p>
                          </div>
                          <button
                            onClick={() => setEditingDept(dept.id)}
                            className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Faculty Types Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Faculty Types</h3>
                  <button
                    onClick={addFacultyType}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Faculty Type</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(signupConfig.facultyTypes || []).map((type) => (
                    <div key={type.id} className="border border-gray-200 rounded-lg p-4">
                      {editingFacultyType === type.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Faculty Type Name"
                              value={type.name || ''}
                              onChange={(e) => updateFacultyType(type.id, 'name', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Description"
                              value={type.description || ''}
                              onChange={(e) => updateFacultyType(type.id, 'description', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingFacultyType(null)}
                              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <CheckIcon className="h-4 w-4" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => deleteFacultyType(type.id)}
                              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{type.name || 'Unnamed Type'}</h4>
                            <p className="text-sm text-gray-600">{type.description || 'No Description'}</p>
                          </div>
                          <button
                            onClick={() => setEditingFacultyType(type.id)}
                            className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveSignupConfig}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Signup Configuration'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-8">
              {/* Leave Types Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Leave Types</h3>
                  <button
                    onClick={addLeaveType}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Leave Type</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {Object.values(leaveConfig.leaveTypes || {}).map((leaveType) => (
                    <div key={leaveType.id} className="border border-gray-200 rounded-lg p-4">
                      {editingLeaveType === leaveType.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Leave Type Name"
                              value={leaveType.name || ''}
                              onChange={(e) => updateLeaveType(leaveType.id, 'name', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              placeholder="Max Days"
                              value={leaveType.maxDays || ''}
                              onChange={(e) => updateLeaveType(leaveType.id, 'maxDays', parseInt(e.target.value))}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <textarea
                            placeholder="Description"
                            value={leaveType.description || ''}
                            onChange={(e) => updateLeaveType(leaveType.id, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingLeaveType(null)}
                              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <CheckIcon className="h-4 w-4" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => deleteLeaveType(leaveType.id)}
                              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{leaveType.name || 'Unnamed'}</h4>
                            <p className="text-sm text-gray-600">
                              Max: {(() => {
                                if (typeof leaveType.maxDays === 'object' && leaveType.maxDays !== null) {
                                  const maxDaysEntries = Object.entries(leaveType.maxDays);
                                  return maxDaysEntries.map(([key, value]) => `${key}: ${value}`).join(', ') + ' days';
                                }
                                return (leaveType.maxDays || 0) + ' days';
                              })()} - {leaveType.description || 'No description'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Applicable for: {(() => {
                                try {
                                  if (Array.isArray(leaveType.applicableFor)) {
                                    return leaveType.applicableFor.join(', ');
                                  }
                                  if (typeof leaveType.applicableFor === 'object' && leaveType.applicableFor !== null) {
                                    return Object.keys(leaveType.applicableFor).join(', ');
                                  }
                                  if (typeof leaveType.applicableFor === 'string') {
                                    return leaveType.applicableFor;
                                  }
                                  return 'Not specified';
                                } catch (error) {
                                  console.error('Error rendering applicableFor:', error, leaveType.applicableFor);
                                  return 'Error displaying data';
                                }
                              })()}
                            </p>
                          </div>
                          <button
                            onClick={() => setEditingLeaveType(leaveType.id)}
                            className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveLeaveConfig}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Leave Configuration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigurationManager;