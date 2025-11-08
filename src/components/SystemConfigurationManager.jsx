import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { systemConfigAPI } from '../api/api';
import EnhancedLeaveAccrualManager from './EnhancedLeaveAccrualManager';


const SystemConfigurationManager = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('faculty-types');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Faculty Types State
  const [facultyTypes, setFacultyTypes] = useState([]);
  const [editingFacultyType, setEditingFacultyType] = useState(null);
  const [showAddFacultyType, setShowAddFacultyType] = useState(false);
  
  // Leave Types State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [showAddLeaveType, setShowAddLeaveType] = useState(false);

  useEffect(() => {
    fetchSystemConfiguration();
  }, []);

  const fetchSystemConfiguration = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching system configuration...');
      
      const response = await systemConfigAPI.getCompleteConfig();
      
      if (response.data.success) {
        setFacultyTypes(response.data.data.facultyTypes);
        setLeaveTypes(response.data.data.leaveTypes);
        console.log('✅ System configuration loaded:', response.data.data);
      } else {
        throw new Error('Failed to load system configuration');
      }
    } catch (error) {
      console.error('❌ Error fetching system configuration:', error);
      toast.error(`Failed to load system configuration: ${error.response?.data?.message || error.message}`);
      
      // Set default empty configurations
      setFacultyTypes([]);
      setLeaveTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Faculty Type Management
  const handleAddFacultyType = async (facultyTypeData) => {
    try {
      setSaving(true);
      const response = await systemConfigAPI.createFacultyType(facultyTypeData);
      
      if (response.data.success) {
        toast.success('Faculty type created successfully');
        setShowAddFacultyType(false);
        await fetchSystemConfiguration();
      } else {
        throw new Error('Failed to create faculty type');
      }
    } catch (error) {
      console.error('Error creating faculty type:', error);
      toast.error(`Failed to create faculty type: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFacultyType = async (typeId, facultyTypeData) => {
    try {
      setSaving(true);
      const response = await systemConfigAPI.updateFacultyType(typeId, facultyTypeData);
      
      if (response.data.success) {
        toast.success('Faculty type updated successfully');
        setEditingFacultyType(null);
        await fetchSystemConfiguration();
      } else {
        throw new Error('Failed to update faculty type');
      }
    } catch (error) {
      console.error('Error updating faculty type:', error);
      toast.error(`Failed to update faculty type: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFacultyType = async (typeId) => {
    if (window.confirm('Are you sure you want to delete this faculty type? This action cannot be undone.')) {
      try {
        const response = await systemConfigAPI.deleteFacultyType(typeId);
        
        if (response.data.success) {
          toast.success('Faculty type deleted successfully');
          await fetchSystemConfiguration();
        } else {
          throw new Error('Failed to delete faculty type');
        }
      } catch (error) {
        console.error('Error deleting faculty type:', error);
        toast.error(`Failed to delete faculty type: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  // Leave Type Management
  const handleAddLeaveType = async (leaveTypeData) => {
    try {
      setSaving(true);
      const response = await systemConfigAPI.createLeaveType(leaveTypeData);
      
      if (response.data.success) {
        toast.success('Leave type created successfully');
        setShowAddLeaveType(false);
        await fetchSystemConfiguration();
      } else {
        throw new Error('Failed to create leave type');
      }
    } catch (error) {
      console.error('Error creating leave type:', error);
      toast.error(`Failed to create leave type: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLeaveType = async (leaveTypeId, leaveTypeData) => {
    try {
      setSaving(true);
      const response = await systemConfigAPI.updateLeaveType(leaveTypeId, leaveTypeData);
      
      if (response.data.success) {
        toast.success('Leave type updated successfully');
        setEditingLeaveType(null);
        await fetchSystemConfiguration();
      } else {
        throw new Error('Failed to update leave type');
      }
    } catch (error) {
      console.error('Error updating leave type:', error);
      toast.error(`Failed to update leave type: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLeaveType = async (leaveTypeId) => {
    if (window.confirm('Are you sure you want to delete this leave type? This action cannot be undone.')) {
      try {
        const response = await systemConfigAPI.deleteLeaveType(leaveTypeId);
        
        if (response.data.success) {
          toast.success('Leave type deleted successfully');
          await fetchSystemConfiguration();
        } else {
          throw new Error('Failed to delete leave type');
        }
      } catch (error) {
        console.error('Error deleting leave type:', error);
        toast.error(`Failed to delete leave type: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading system configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
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
            onClick={() => setActiveTab('faculty-types')}
            className={`px-6 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'faculty-types'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserGroupIcon className="h-4 w-4" />
            <span>Faculty Types</span>
          </button>
          <button
            onClick={() => setActiveTab('leave-types')}
            className={`px-6 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'leave-types'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDaysIcon className="h-4 w-4" />
            <span>Leave Types & Entitlements</span>
          </button>
          <button
            onClick={() => setActiveTab('accrual-manager')}
            className={`px-6 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'accrual-manager'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CogIcon className="h-4 w-4" />
            <span>Accrual Management</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'faculty-types' && (
            <FacultyTypesTab
              facultyTypes={facultyTypes}
              editingFacultyType={editingFacultyType}
              setEditingFacultyType={setEditingFacultyType}
              showAddFacultyType={showAddFacultyType}
              setShowAddFacultyType={setShowAddFacultyType}
              onAdd={handleAddFacultyType}
              onUpdate={handleUpdateFacultyType}
              onDelete={handleDeleteFacultyType}
              saving={saving}
            />
          )}

          {activeTab === 'leave-types' && (
            <LeaveTypesTab
              leaveTypes={leaveTypes}
              facultyTypes={facultyTypes}
              editingLeaveType={editingLeaveType}
              setEditingLeaveType={setEditingLeaveType}
              showAddLeaveType={showAddLeaveType}
              setShowAddLeaveType={setShowAddLeaveType}
              onAdd={handleAddLeaveType}
              onUpdate={handleUpdateLeaveType}
              onDelete={handleDeleteLeaveType}
              saving={saving}
            />
          )}

          {activeTab === 'accrual-manager' && (
            <EnhancedLeaveAccrualManager onClose={() => setActiveTab('faculty-types')} />
          )}
        </div>
      </div>


    </div>
  );
};

// Faculty Types Tab Component
const FacultyTypesTab = ({ 
  facultyTypes, 
  editingFacultyType, 
  setEditingFacultyType,
  showAddFacultyType,
  setShowAddFacultyType,
  onAdd, 
  onUpdate, 
  onDelete, 
  saving 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Faculty Types Configuration</h3>
          <p className="text-sm text-gray-600">Manage different types of faculty and their properties</p>
        </div>
        <button
          onClick={() => setShowAddFacultyType(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Faculty Type</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {facultyTypes.map((facultyType) => (
          <FacultyTypeCard
            key={facultyType.type_id}
            facultyType={facultyType}
            isEditing={editingFacultyType === facultyType.type_id}
            onEdit={() => setEditingFacultyType(facultyType.type_id)}
            onSave={(data) => onUpdate(facultyType.type_id, data)}
            onCancel={() => setEditingFacultyType(null)}
            onDelete={() => onDelete(facultyType.type_id)}
            saving={saving}
          />
        ))}
      </div>

      {showAddFacultyType && (
        <AddFacultyTypeModal
          onClose={() => setShowAddFacultyType(false)}
          onSave={onAdd}
          saving={saving}
        />
      )}
    </div>
  );
};

// Leave Types Tab Component
const LeaveTypesTab = ({ 
  leaveTypes, 
  facultyTypes,
  editingLeaveType, 
  setEditingLeaveType,
  showAddLeaveType,
  setShowAddLeaveType,
  onAdd, 
  onUpdate, 
  onDelete, 
  saving 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Leave Types & Entitlements</h3>
          <p className="text-sm text-gray-600">Configure leave types and set entitlements for different faculty types</p>
        </div>
        <button
          onClick={() => setShowAddLeaveType(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Leave Type</span>
        </button>
      </div>

      <div className="space-y-4">
        {leaveTypes.map((leaveType) => (
          <LeaveTypeCard
            key={leaveType.leave_type_id}
            leaveType={leaveType}
            facultyTypes={facultyTypes}
            isEditing={editingLeaveType === leaveType.leave_type_id}
            onEdit={() => setEditingLeaveType(leaveType.leave_type_id)}
            onSave={(data) => onUpdate(leaveType.leave_type_id, data)}
            onCancel={() => setEditingLeaveType(null)}
            onDelete={() => onDelete(leaveType.leave_type_id)}
            saving={saving}
          />
        ))}
      </div>

      {showAddLeaveType && (
        <AddLeaveTypeModal
          facultyTypes={facultyTypes}
          onClose={() => setShowAddLeaveType(false)}
          onSave={onAdd}
          saving={saving}
        />
      )}
    </div>
  );
};

// Faculty Type Card Component
const FacultyTypeCard = ({ facultyType, isEditing, onEdit, onSave, onCancel, onDelete, saving }) => {
  const [formData, setFormData] = useState({
    name: facultyType.name || '',
    description: facultyType.description || '',
    permissions: facultyType.permissions || [],
    benefits: facultyType.benefits || [],
    probation_period: facultyType.probation_period || 6,
    contract_specific: facultyType.contract_specific || false,
    contract_duration: facultyType.contract_duration || '',
    temporary: facultyType.temporary || false,
    max_tenure: facultyType.max_tenure || ''
  });

  const handleSave = () => {
    onSave(formData);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probation Period (months)</label>
              <input
                type="number"
                value={formData.probation_period}
                onChange={(e) => setFormData({...formData, probation_period: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.contract_specific}
                onChange={(e) => setFormData({...formData, contract_specific: e.target.checked})}
                className="mr-2"
              />
              Contract Specific
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.temporary}
                onChange={(e) => setFormData({...formData, temporary: e.target.checked})}
                className="mr-2"
              />
              Temporary
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={onCancel}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={onDelete}
              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900">{facultyType.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{facultyType.description}</p>
          
          <div className="mt-3 space-y-2">
            <div className="flex items-center text-sm">
              <span className="font-medium text-gray-700">Probation:</span>
              <span className="ml-2 text-gray-600">{facultyType.probation_period} months</span>
            </div>
            
            {facultyType.contract_specific && (
              <div className="flex items-center text-sm">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Contract</span>
                {facultyType.contract_duration && (
                  <span className="ml-2 text-gray-600">{facultyType.contract_duration}</span>
                )}
              </div>
            )}
            
            {facultyType.temporary && (
              <div className="flex items-center text-sm">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Temporary</span>
                {facultyType.max_tenure && (
                  <span className="ml-2 text-gray-600">Max: {facultyType.max_tenure}</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={onEdit}
          className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
          <span>Edit</span>
        </button>
      </div>
    </div>
  );
};

// Leave Type Card Component
const LeaveTypeCard = ({ leaveType, facultyTypes, isEditing, onEdit, onSave, onCancel, onDelete, saving }) => {
  const [formData, setFormData] = useState({
    name: leaveType.name || '',
    description: leaveType.description || '',
    requires_approval: leaveType.requires_approval || true,
    requires_medical_certificate: leaveType.requires_medical_certificate || false,
    advance_notice_days: leaveType.advance_notice_days || 1,
    carry_forward: leaveType.carry_forward || false,
    max_carry_forward_days: leaveType.max_carry_forward_days || 0,
    encashment_allowed: leaveType.encashment_allowed || false,
    accrual_rate: leaveType.accrual_rate || 0,
    accrual_period: leaveType.accrual_period || 'monthly',
    approval_hierarchy: leaveType.approval_hierarchy || [],
    special_conditions: leaveType.special_conditions || '',
    gender_specific: leaveType.gender_specific || '',
    bond_required: leaveType.bond_required || false,
    bond_period: leaveType.bond_period || '',
    partial_salary: leaveType.partial_salary || false,
    salary_deduction_percent: leaveType.salary_deduction_percent || 0,
    extendable: leaveType.extendable || false,
    max_extension_days: leaveType.max_extension_days || 0,
    conversion_rule: leaveType.conversion_rule || '',
    faculty_entitlements: leaveType.faculty_entitlements || {}
  });

  const handleSave = () => {
    onSave(formData);
  };

  const updateEntitlement = (facultyTypeId, field, value) => {
    setFormData(prev => ({
      ...prev,
      faculty_entitlements: {
        ...prev.faculty_entitlements,
        [facultyTypeId]: {
          ...prev.faculty_entitlements[facultyTypeId],
          [field]: value
        }
      }
    }));
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-green-200 rounded-lg p-6 shadow-sm">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Advance Notice (days)</label>
              <input
                type="number"
                value={formData.advance_notice_days}
                onChange={(e) => setFormData({...formData, advance_notice_days: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              rows={2}
            />
          </div>

          {/* Faculty Entitlements */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Faculty Entitlements</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {facultyTypes.map((facultyType) => (
                <div key={facultyType.type_id} className="border border-gray-200 rounded-lg p-3">
                  <h6 className="font-medium text-gray-900 mb-2">{facultyType.name}</h6>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Days</label>
                      <input
                        type="number"
                        value={formData.faculty_entitlements[facultyType.type_id]?.maxDays || 0}
                        onChange={(e) => updateEntitlement(facultyType.type_id, 'maxDays', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <label className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={formData.faculty_entitlements[facultyType.type_id]?.isApplicable || false}
                        onChange={(e) => updateEntitlement(facultyType.type_id, 'isApplicable', e.target.checked)}
                        className="mr-1"
                      />
                      Applicable
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.requires_approval}
                onChange={(e) => setFormData({...formData, requires_approval: e.target.checked})}
                className="mr-2"
              />
              Requires Approval
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.requires_medical_certificate}
                onChange={(e) => setFormData({...formData, requires_medical_certificate: e.target.checked})}
                className="mr-2"
              />
              Medical Certificate
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.carry_forward}
                onChange={(e) => setFormData({...formData, carry_forward: e.target.checked})}
                className="mr-2"
              />
              Carry Forward
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.encashment_allowed}
                onChange={(e) => setFormData({...formData, encashment_allowed: e.target.checked})}
                className="mr-2"
              />
              Encashment Allowed
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={onCancel}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={onDelete}
              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900">{leaveType.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{leaveType.description}</p>
          
          {/* Faculty Entitlements Display */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Entitlements:</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(leaveType.faculty_entitlements || {}).map(([facultyType, entitlement]) => (
                <div key={facultyType} className="text-xs">
                  <span className="font-medium capitalize">{facultyType.replace('_', ' ')}:</span>
                  <span className={`ml-1 ${entitlement.isApplicable ? 'text-green-600' : 'text-red-600'}`}>
                    {entitlement.isApplicable ? `${entitlement.maxDays} days` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Properties */}
          <div className="mt-3 flex flex-wrap gap-2">
            {leaveType.requires_approval && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Requires Approval</span>
            )}
            {leaveType.requires_medical_certificate && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Medical Certificate</span>
            )}
            {leaveType.carry_forward && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Carry Forward</span>
            )}
            {leaveType.encashment_allowed && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Encashment</span>
            )}
          </div>
        </div>
        
        <button
          onClick={onEdit}
          className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
          <span>Edit</span>
        </button>
      </div>
    </div>
  );
};

// Add Faculty Type Modal (simplified for brevity)
const AddFacultyTypeModal = ({ onClose, onSave, saving }) => {
  const [formData, setFormData] = useState({
    type_id: '',
    name: '',
    description: '',
    permissions: [],
    benefits: [],
    probation_period: 6,
    contract_specific: false,
    contract_duration: '',
    temporary: false,
    max_tenure: ''
  });

  const handleSave = () => {
    if (!formData.type_id || !formData.name) {
      toast.error('Type ID and name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Faculty Type</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type ID</label>
            <input
              type="text"
              value={formData.type_id}
              onChange={(e) => setFormData({...formData, type_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., guest_faculty"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Guest Faculty"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Leave Type Modal (simplified for brevity)
const AddLeaveTypeModal = ({ facultyTypes, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState({
    leave_type_id: '',
    name: '',
    description: '',
    requires_approval: true,
    requires_medical_certificate: false,
    advance_notice_days: 1,
    carry_forward: false,
    max_carry_forward_days: 0,
    encashment_allowed: false,
    accrual_rate: 0,
    accrual_period: 'monthly',
    approval_hierarchy: ['hod'],
    special_conditions: '',
    gender_specific: '',
    bond_required: false,
    bond_period: '',
    partial_salary: false,
    salary_deduction_percent: 0,
    extendable: false,
    max_extension_days: 0,
    conversion_rule: '',
    faculty_entitlements: {}
  });

  const handleSave = () => {
    if (!formData.leave_type_id || !formData.name) {
      toast.error('Leave type ID and name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Add Leave Type</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type ID</label>
              <input
                type="text"
                value={formData.leave_type_id}
                onChange={(e) => setFormData({...formData, leave_type_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="e.g., paternity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Paternity Leave"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              rows={2}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigurationManager;