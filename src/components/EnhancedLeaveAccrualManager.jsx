import React, { useState, useEffect } from 'react';
import { 
  CalculatorIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  CogIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { enhancedAccrualAPI } from '../api/api';

const EnhancedLeaveAccrualManager = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('accrual-rules');
  const [facultyTypes, setFacultyTypes] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [accrualRules, setAccrualRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/enhanced-system-config/complete-enhanced');
      
      if (response.data.success) {
        setFacultyTypes(response.data.data.facultyTypes);
        setLeaveTypes(response.data.data.leaveTypes);
        setAccrualRules(response.data.data.calculationRules || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load accrual configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (ruleData) => {
    try {
      const response = await enhancedAccrualAPI.createAccrualRule(ruleData);
      
      if (response.data.success) {
        toast.success('Accrual rule created successfully');
        setShowAddRule(false);
        await fetchData();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error('Failed to create accrual rule');
    }
  };

  const handleUpdateRule = async (ruleId, ruleData) => {
    try {
      const response = await enhancedAccrualAPI.updateAccrualRule(ruleId, ruleData);
      
      if (response.data.success) {
        toast.success('Accrual rule updated successfully');
        setEditingRule(null);
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update accrual rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this accrual rule?')) {
      try {
        const response = await enhancedAccrualAPI.deleteAccrualRule(ruleId);
        
        if (response.data.success) {
          toast.success('Accrual rule deleted successfully');
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting rule:', error);
        if (error.response?.status === 404) {
          toast.error('Accrual rule not found. It may have already been deleted.');
          // Refresh the data to sync with the server
          await fetchData();
        } else {
          toast.error('Failed to delete accrual rule');
        }
      }
    }
  };

  const handleCleanupUnknownFaculty = async () => {
    if (window.confirm('Are you sure you want to delete all accrual rules with unknown faculty types? This action cannot be undone.')) {
      try {
        setLoading(true);
        const response = await enhancedAccrualAPI.cleanupUnknownFaculty();
        
        if (response.data.success) {
          const { deleted_count, records } = response.data.data;
          if (deleted_count > 0) {
            toast.success(`Successfully deleted ${deleted_count} records with unknown faculty types`);
            console.log('Deleted records:', records);
          } else {
            toast.success('No records with unknown faculty types found');
          }
          await fetchData();
        }
      } catch (error) {
        console.error('Error cleaning up unknown faculty records:', error);
        toast.error('Failed to clean up unknown faculty records');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading accrual configuration...</p>
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
            <CalculatorIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Enhanced Leave Accrual Management</h2>
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
            onClick={() => setActiveTab('accrual-rules')}
            className={`px-6 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'accrual-rules'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CogIcon className="h-4 w-4" />
            <span>Accrual Rules</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'accrual-rules' && (
            <AccrualRulesTab
              accrualRules={accrualRules}
              facultyTypes={facultyTypes}
              leaveTypes={leaveTypes}
              editingRule={editingRule}
              setEditingRule={setEditingRule}
              showAddRule={showAddRule}
              setShowAddRule={setShowAddRule}
              onCreateRule={handleCreateRule}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
              onCleanupUnknownFaculty={handleCleanupUnknownFaculty}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Accrual Rules Tab Component
const AccrualRulesTab = ({ 
  accrualRules, 
  facultyTypes, 
  leaveTypes, 
  editingRule, 
  setEditingRule,
  showAddRule,
  setShowAddRule,
  onCreateRule, 
  onUpdateRule, 
  onDeleteRule,
  onCleanupUnknownFaculty 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Leave Accrual Rules</h3>
          <p className="text-sm text-gray-600">Configure how leave is accrued for different faculty types and leave types</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCleanupUnknownFaculty}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Cleanup Unknown Faculty</span>
          </button>
          <button
            onClick={() => setShowAddRule(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Accrual Rule</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {accrualRules.map((rule) => (
          <AccrualRuleCard
            key={rule.id}
            rule={rule}
            facultyTypes={facultyTypes}
            leaveTypes={leaveTypes}
            isEditing={editingRule === rule.id}
            onEdit={() => setEditingRule(rule.id)}
            onSave={(data) => onUpdateRule(rule.id, data)}
            onCancel={() => setEditingRule(null)}
            onDelete={() => onDeleteRule(rule.id)}
          />
        ))}
      </div>

      {showAddRule && (
        <AddAccrualRuleModal
          facultyTypes={facultyTypes}
          leaveTypes={leaveTypes}
          onClose={() => setShowAddRule(false)}
          onSave={onCreateRule}
        />
      )}
    </div>
  );
};

// Accrual Rule Card Component
const AccrualRuleCard = ({ 
  rule, 
  facultyTypes, 
  leaveTypes, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete 
}) => {
  const [formData, setFormData] = useState({
    ruleName: rule.rule_name,
    facultyTypeId: rule.faculty_type_id,
    leaveTypeId: rule.leave_type_id,
    accrualPeriod: rule.accrual_period || 'monthly',
    accrualAmount: rule.accrual_amount,
    maxCarryOver: rule.max_carry_over || 0,
    unlimitedLeave: rule.unlimited_leave || false,
    serviceMonthsFrom: rule.service_months_from,
    serviceMonthsTo: rule.service_months_to,
    calculationMethod: rule.calculation_method,
    effectiveFrom: rule.effective_from ? rule.effective_from.split('T')[0] : '',
    effectiveTo: rule.effective_to ? rule.effective_to.split('T')[0] : '',
    isActive: rule.is_active,
    accrualSettings: rule.accrual_settings || {}
  });

  useEffect(() => {
    setFormData({
      ruleName: rule.rule_name,
      facultyTypeId: rule.faculty_type_id,
      leaveTypeId: rule.leave_type_id,
      accrualPeriod: rule.accrual_period || 'monthly',
      accrualAmount: rule.accrual_amount,
      maxCarryOver: rule.max_carry_over || 0,
      unlimitedLeave: rule.unlimited_leave || false,
      serviceMonthsFrom: rule.service_months_from,
      serviceMonthsTo: rule.service_months_to,
      calculationMethod: rule.calculation_method,
      effectiveFrom: rule.effective_from ? rule.effective_from.split('T')[0] : '',
      effectiveTo: rule.effective_to ? rule.effective_to.split('T')[0] : '',
      isActive: rule.is_active,
      accrualSettings: rule.accrual_settings || {}
    });
  }, [rule]);

  const facultyType = facultyTypes.find(ft => ft.type_id === rule.faculty_type_id);
  const leaveType = leaveTypes.find(lt => lt.leave_type_id === rule.leave_type_id);

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Edit Accrual Rule</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => onSave(formData)}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                <CheckIcon className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={onCancel}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={formData.ruleName}
                onChange={(e) => setFormData({...formData, ruleName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Type</label>
              <select
                value={formData.facultyTypeId}
                onChange={(e) => setFormData({...formData, facultyTypeId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {facultyTypes.map(ft => (
                  <option key={ft.type_id} value={ft.type_id}>{ft.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={formData.leaveTypeId}
                onChange={(e) => setFormData({...formData, leaveTypeId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {leaveTypes.map(lt => (
                  <option key={lt.leave_type_id} value={lt.leave_type_id}>{lt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Period</label>
              <select
                value={formData.accrualPeriod}
                onChange={(e) => setFormData({...formData, accrualPeriod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Amount (Days/Hours)</label>
              <input
                type="number"
                step="0.01"
                value={formData.accrualAmount}
                onChange={(e) => setFormData({...formData, accrualAmount: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Carry-over Limit</label>
              <input
                type="number"
                value={formData.maxCarryOver}
                onChange={(e) => setFormData({...formData, maxCarryOver: parseInt(e.target.value)})}
                disabled={formData.unlimitedLeave}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.unlimitedLeave}
                onChange={(e) => setFormData({...formData, unlimitedLeave: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Unlimited Leave</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <h4 className="font-semibold text-gray-900">{rule.rule_name}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              rule.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {rule.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Faculty Type:</span>
              <p className="font-medium">{facultyType?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-600">Leave Type:</span>
              <p className="font-medium">{leaveType?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-600">Accrual Rate:</span>
              <p className="font-medium text-blue-600">{rule.base_rate} days/{rule.calculation_method}</p>
            </div>
            <div>
              <span className="text-gray-600">Service Range:</span>
              <p className="font-medium">{rule.service_months_from}-{rule.service_months_to} months</p>
            </div>
          </div>

          {rule.unlimited_leave && (
            <div className="mt-3">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                Unlimited Leave
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={onDelete}
            className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Accrual Rule Modal Component
const AddAccrualRuleModal = ({ facultyTypes, leaveTypes, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    ruleName: '',
    facultyTypeId: facultyTypes[0]?.type_id || '',
    leaveTypeId: leaveTypes[0]?.leave_type_id || '',
    accrualPeriod: 'monthly',
    accrualAmount: 0,
    maxCarryOver: 0,
    unlimitedLeave: false,
    serviceMonthsFrom: 0,
    serviceMonthsTo: 999,
    calculationMethod: 'fixed_monthly',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    isActive: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Add New Accrual Rule</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={formData.ruleName}
                  onChange={(e) => setFormData({...formData, ruleName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Teaching EL Progressive"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Type</label>
                <select
                  required
                  value={formData.facultyTypeId}
                  onChange={(e) => setFormData({...formData, facultyTypeId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {facultyTypes.map(ft => (
                    <option key={ft.type_id} value={ft.type_id}>{ft.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select
                  required
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({...formData, leaveTypeId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {leaveTypes.map(lt => (
                    <option key={lt.leave_type_id} value={lt.leave_type_id}>{lt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Period</label>
                <select
                  value={formData.accrualPeriod}
                  onChange={(e) => setFormData({...formData, accrualPeriod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Amount (Days/Hours)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.accrualAmount}
                  onChange={(e) => setFormData({...formData, accrualAmount: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Carry-over Limit</label>
                <input
                  type="number"
                  value={formData.maxCarryOver}
                  onChange={(e) => setFormData({...formData, maxCarryOver: parseInt(e.target.value)})}
                  disabled={formData.unlimitedLeave}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.unlimitedLeave}
                  onChange={(e) => setFormData({...formData, unlimitedLeave: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Unlimited Leave</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Rule
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};



export default EnhancedLeaveAccrualManager;