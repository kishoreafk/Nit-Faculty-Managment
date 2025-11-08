import React, { useState, useEffect } from 'react';
import { 
  CalculatorIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import axios from 'axios';
import api from '../api/api';

// Separate component for entitlement card to avoid hooks rule violation
const EntitlementCard = ({ entitlement, isEditing, onEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    maxDays: entitlement.maxDays,
    isApplicable: entitlement.isApplicable,
    monthlyAccrualRate: entitlement.monthlyAccrualRate,
    yearlyAccrualRate: entitlement.yearlyAccrualRate,
    calculationMethod: entitlement.calculationMethod,
    workingDaysPerMonth: entitlement.workingDaysPerMonth,
    prorationMethod: entitlement.prorationMethod
  });

  useEffect(() => {
    setFormData({
      maxDays: entitlement.maxDays,
      isApplicable: entitlement.isApplicable,
      monthlyAccrualRate: entitlement.monthlyAccrualRate,
      yearlyAccrualRate: entitlement.yearlyAccrualRate,
      calculationMethod: entitlement.calculationMethod,
      workingDaysPerMonth: entitlement.workingDaysPerMonth,
      prorationMethod: entitlement.prorationMethod
    });
  }, [entitlement]);

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-blue-200 rounded-lg p-4 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">
              {entitlement.leaveTypeName} - {entitlement.facultyType}
            </h4>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Days</label>
              <input
                type="number"
                value={formData.maxDays}
                onChange={(e) => setFormData({...formData, maxDays: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Accrual Rate</label>
              <input
                type="number"
                step="0.01"
                value={formData.monthlyAccrualRate}
                onChange={(e) => setFormData({...formData, monthlyAccrualRate: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Accrual Rate</label>
              <input
                type="number"
                step="0.01"
                value={formData.yearlyAccrualRate}
                onChange={(e) => setFormData({...formData, yearlyAccrualRate: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Method</label>
              <select
                value={formData.calculationMethod}
                onChange={(e) => setFormData({...formData, calculationMethod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="daily">Daily</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Working Days/Month</label>
              <input
                type="number"
                value={formData.workingDaysPerMonth}
                onChange={(e) => setFormData({...formData, workingDaysPerMonth: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proration Method</label>
              <select
                value={formData.prorationMethod}
                onChange={(e) => setFormData({...formData, prorationMethod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
                <option value="working_days">Working Days</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isApplicable}
              onChange={(e) => setFormData({...formData, isApplicable: e.target.checked})}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">Applicable</label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{entitlement.leaveTypeName}</h4>
          <p className="text-sm text-gray-600 capitalize">{entitlement.facultyType.replace('_', ' ')}</p>
          
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Max Days:</span>
              <span className="ml-2 font-medium">{entitlement.maxDays}</span>
            </div>
            <div>
              <span className="text-gray-600">Monthly Rate:</span>
              <span className="ml-2 font-medium text-blue-600">{entitlement.monthlyAccrualRate}</span>
            </div>
            <div>
              <span className="text-gray-600">Yearly Rate:</span>
              <span className="ml-2 font-medium text-green-600">{entitlement.yearlyAccrualRate}</span>
            </div>
            <div>
              <span className="text-gray-600">Method:</span>
              <span className="ml-2 font-medium capitalize">{entitlement.calculationMethod}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              entitlement.isApplicable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {entitlement.isApplicable ? 'Applicable' : 'Not Applicable'}
            </span>
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

const LeaveCalculationManager = ({ facultyTypes, leaveTypes, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [calculationRules, setCalculationRules] = useState([]);
  const [calculationFunctions, setCalculationFunctions] = useState([]);
  const [entitlements, setEntitlements] = useState({});
  const [editingRule, setEditingRule] = useState(null);
  const [editingEntitlement, setEditingEntitlement] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);

  useEffect(() => {
    fetchCalculationData();
  }, []);

  const fetchCalculationData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/enhanced-system-config/complete-enhanced');
      
      if (response.data.success) {
        setCalculationRules(response.data.data.calculationRules || []);
        setCalculationFunctions(response.data.data.calculationFunctions || []);
        
        // Process entitlements into a more manageable format
        const entitlementsMap = {};
        response.data.data.leaveTypes.forEach(lt => {
          Object.entries(lt.faculty_entitlements).forEach(([facultyType, entitlement]) => {
            const key = `${facultyType}-${lt.leave_type_id}`;
            entitlementsMap[key] = {
              ...entitlement,
              facultyType,
              leaveTypeId: lt.leave_type_id,
              leaveTypeName: lt.name
            };
          });
        });
        setEntitlements(entitlementsMap);
      }
    } catch (error) {
      console.error('Error fetching calculation data:', error);
      toast.error('Failed to load calculation configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntitlement = async (facultyType, leaveTypeId, data) => {
    try {
      const response = await api.put(`/enhanced-system-config/faculty-entitlements/${facultyType}/${leaveTypeId}`, data);
      
      if (response.data.success) {
        toast.success('Entitlement updated successfully');
        setEditingEntitlement(null);
        await fetchCalculationData();
      }
    } catch (error) {
      console.error('Error updating entitlement:', error);
      toast.error('Failed to update entitlement');
    }
  };

  const handleCreateRule = async (ruleData) => {
    try {
      const response = await api.post('/enhanced-system-config/calculation-rules', ruleData);
      
      if (response.data.success) {
        toast.success('Calculation rule created successfully');
        setShowAddRule(false);
        await fetchCalculationData();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error('Failed to create calculation rule');
    }
  };

  const handleUpdateRule = async (ruleId, ruleData) => {
    try {
      const response = await api.put(`/enhanced-system-config/calculation-rules/${ruleId}`, ruleData);
      
      if (response.data.success) {
        toast.success('Calculation rule updated successfully');
        setEditingRule(null);
        await fetchCalculationData();
      }
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update calculation rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this calculation rule?')) {
      try {
        const response = await api.delete(`/enhanced-system-config/calculation-rules/${ruleId}`);
        
        if (response.data.success) {
          toast.success('Calculation rule deleted successfully');
          await fetchCalculationData();
        }
      } catch (error) {
        console.error('Error deleting rule:', error);
        toast.error('Failed to delete calculation rule');
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading calculation configuration...</p>
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
            <h2 className="text-xl font-semibold text-gray-900">Leave Calculation Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Leave Entitlements Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Faculty Leave Entitlements & Accrual Rates
                </h3>
                <p className="text-sm text-gray-600">Configure how much leave each faculty type gets per month/year</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(entitlements).map(([key, entitlement]) => (
                <EntitlementCard
                  key={key}
                  entitlement={entitlement}
                  isEditing={editingEntitlement === key}
                  onEdit={() => setEditingEntitlement(key)}
                  onSave={(data) => handleUpdateEntitlement(entitlement.facultyType, entitlement.leaveTypeId, data)}
                  onCancel={() => setEditingEntitlement(null)}
                />
              ))}
            </div>
          </div>

          {/* Calculation Rules Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Advanced Calculation Rules</h3>
                <p className="text-sm text-gray-600">Define progressive rates and custom calculation methods</p>
              </div>
              <button
                onClick={() => setShowAddRule(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Rule</span>
              </button>
            </div>

            <div className="space-y-4">
              {calculationRules.map((rule) => (
                <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{rule.rule_name}</h4>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Faculty Type:</span>
                          <span className="ml-2 font-medium capitalize">{rule.faculty_type_id?.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Leave Type:</span>
                          <span className="ml-2 font-medium">{rule.leave_type_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Service Range:</span>
                          <span className="ml-2 font-medium">{rule.service_months_from}-{rule.service_months_to} months</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Method:</span>
                          <span className="ml-2 font-medium capitalize">{rule.calculation_method?.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Base Rate:</span>
                          <span className="ml-2 font-medium text-blue-600">{rule.base_rate}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Effective:</span>
                          <span className="ml-2 font-medium">{new Date(rule.effective_from).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {rule.progressive_rates && Object.keys(rule.progressive_rates).length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-600">Progressive Rates:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {Object.entries(rule.progressive_rates).map(([range, rate]) => (
                              <span key={range} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {range}: {rate}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingRule(rule.id)}
                        className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculation Functions Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Calculation Functions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calculationFunctions.map((func) => (
                <div key={func.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900">{func.function_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{func.description}</p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Formula:</span>
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-xs font-mono">
                      {func.formula_template}
                    </code>
                  </div>
                  {func.example_usage && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Example:</span>
                      <p className="text-xs text-gray-600 mt-1">{func.example_usage}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveCalculationManager;