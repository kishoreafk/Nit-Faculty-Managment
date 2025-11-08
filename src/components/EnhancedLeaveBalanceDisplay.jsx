import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import api from '../api/api';
import toast from 'react-hot-toast';

const EnhancedLeaveBalanceDisplay = ({ selectedLeaveType, onBalanceLoad }) => {
  const { faculty } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaveConfig, setLeaveConfig] = useState(null);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [accrualHistory, setAccrualHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (faculty?.id) {
      fetchEnhancedLeaveConfig();
      fetchBalanceSummary();
    }
  }, [faculty?.id]);

  useEffect(() => {
    if (selectedLeaveType && showHistory) {
      fetchAccrualHistory(selectedLeaveType);
    }
  }, [selectedLeaveType, showHistory]);

  const fetchEnhancedLeaveConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/enhanced-leave/faculty/${faculty.id}/leave-config`);
      
      if (response.data.success) {
        setLeaveConfig(response.data.data);
        
        // Convert to format expected by parent component
        const balances = {};
        response.data.data.leaveTypes.forEach(lt => {
          balances[lt.leave_type_id] = {
            balance: lt.balance.current,
            used: lt.balance.used,
            accrued: lt.balance.accrued,
            carriedForward: lt.balance.carriedForward,
            encashed: lt.balance.encashed
          };
        });
        
        if (onBalanceLoad) {
          onBalanceLoad(balances);
        }
      }
    } catch (error) {
      console.error('Error fetching enhanced leave config:', error);
      toast.error('Failed to load enhanced leave configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceSummary = async () => {
    try {
      const response = await api.get(`/enhanced-leave/faculty/${faculty.id}/balance-summary?year=${currentYear}`);
      
      if (response.data.success) {
        setBalanceSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching balance summary:', error);
    }
  };

  const fetchAccrualHistory = async (leaveTypeId) => {
    try {
      const response = await api.get(`/enhanced-leave/faculty/${faculty.id}/accrual-history?leaveTypeId=${leaveTypeId}&year=${currentYear}&limit=10`);
      
      if (response.data.success) {
        setAccrualHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching accrual history:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getLeaveTypeConfig = (leaveTypeId) => {
    return leaveConfig?.leaveTypes.find(lt => lt.leave_type_id === leaveTypeId);
  };

  const renderLeaveTypeCard = (leaveType) => {
    const isSelected = selectedLeaveType === leaveType.leave_type_id;
    const balance = leaveType.balance;
    const policies = leaveType.policies;
    
    return (
      <div 
        key={leaveType.leave_type_id}
        className={`border rounded-lg p-4 transition-all ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{leaveType.name}</h3>
            <p className="text-sm text-gray-600">{leaveType.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{balance.current}</div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <div className="text-sm font-medium text-green-600">{balance.accrued}</div>
            <div className="text-xs text-gray-500">Accrued</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-red-600">{balance.used}</div>
            <div className="text-xs text-gray-500">Used</div>
          </div>
          {balance.carriedForward > 0 && (
            <div className="text-center">
              <div className="text-sm font-medium text-orange-600">{balance.carriedForward}</div>
              <div className="text-xs text-gray-500">Carried Forward</div>
            </div>
          )}
          {balance.encashed > 0 && (
            <div className="text-center">
              <div className="text-sm font-medium text-purple-600">{balance.encashed}</div>
              <div className="text-xs text-gray-500">Encashed</div>
            </div>
          )}
        </div>

        {/* Enhanced Policy Information */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Category:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              policies.leaveCategory === 'paid' ? 'bg-green-100 text-green-800' :
              policies.leaveCategory === 'unpaid' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {policies.leaveCategory}
            </span>
          </div>

          {policies.annualReset && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Reset Date:</span>
              <span className="flex items-center">
                <ArrowPathIcon className="h-3 w-3 mr-1" />
                {policies.resetDate}
              </span>
            </div>
          )}

          {policies.consecutiveLimit > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Max Consecutive:</span>
              <span>{policies.consecutiveLimit} days</span>
            </div>
          )}

          {policies.monthlyLimit > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Monthly Limit:</span>
              <span>{policies.monthlyLimit} days</span>
            </div>
          )}

          {policies.autoApprovalLimit > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Auto Approval:</span>
              <span className="flex items-center text-green-600">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                ≤ {policies.autoApprovalLimit} days
              </span>
            </div>
          )}

          {policies.halfDayAllowed && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Half Day:</span>
              <span className="flex items-center text-green-600">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Allowed
              </span>
            </div>
          )}

          {!policies.weekendCount && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Weekends:</span>
              <span className="text-green-600">Excluded</span>
            </div>
          )}
        </div>

        {/* Restrictions and Warnings */}
        {leaveType.restrictions && leaveType.restrictions.length > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center text-yellow-800 text-xs font-medium mb-1">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              Upcoming Restrictions
            </div>
            {leaveType.restrictions.slice(0, 2).map((restriction, index) => (
              <div key={index} className="text-xs text-yellow-700">
                {formatDate(restriction.startDate)} - {formatDate(restriction.endDate)}: {restriction.reason}
              </div>
            ))}
          </div>
        )}

        {/* Eligibility Status */}
        {!leaveType.isEligible && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center text-red-800 text-xs font-medium">
              <XCircleIcon className="h-3 w-3 mr-1" />
              Not Eligible - Need {leaveType.serviceMonthsRequired - leaveType.currentServiceMonths} more months of service
            </div>
          </div>
        )}

        {/* Encashment Information */}
        {leaveType.encashment_allowed && balance.current > 0 && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center text-green-800 text-xs font-medium">
              <CurrencyDollarIcon className="h-3 w-3 mr-1" />
              Encashment Available
            </div>
          </div>
        )}

        {/* Next Reset Information */}
        {balance.nextResetDate && (
          <div className="mt-3 text-xs text-gray-500 flex items-center">
            <CalendarIcon className="h-3 w-3 mr-1" />
            Next Reset: {formatDate(balance.nextResetDate)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!leaveConfig) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center text-yellow-800">
          <InformationCircleIcon className="h-5 w-5 mr-2" />
          <span>Enhanced leave configuration not available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {balanceSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Leave Summary for {balanceSummary.year}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{balanceSummary.totalBalance}</div>
              <div className="text-sm text-blue-700">Total Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{balanceSummary.totalUsed}</div>
              <div className="text-sm text-red-700">Total Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{balanceSummary.totalCarriedForward}</div>
              <div className="text-sm text-orange-700">Carried Forward</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{balanceSummary.totalEncashed}</div>
              <div className="text-sm text-purple-700">Encashed</div>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Faculty Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Type:</span>
            <span className="ml-2 font-medium">{leaveConfig.facultyInfo.type}</span>
          </div>
          <div>
            <span className="text-gray-600">Joining Date:</span>
            <span className="ml-2 font-medium">{formatDate(leaveConfig.facultyInfo.joiningDate)}</span>
          </div>
          <div>
            <span className="text-gray-600">Service:</span>
            <span className="ml-2 font-medium">{leaveConfig.facultyInfo.serviceMonths} months</span>
          </div>
        </div>
      </div>

      {/* Leave Types */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Available Leave Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaveConfig.leaveTypes
            .filter(lt => lt.is_applicable && lt.isEligible)
            .map(renderLeaveTypeCard)}
        </div>
      </div>

      {/* Ineligible Leave Types */}
      {leaveConfig.leaveTypes.some(lt => lt.is_applicable && !lt.isEligible) && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-4">Ineligible Leave Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {leaveConfig.leaveTypes
              .filter(lt => lt.is_applicable && !lt.isEligible)
              .map(renderLeaveTypeCard)}
          </div>
        </div>
      )}

      {/* Accrual History */}
      {selectedLeaveType && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Recent Activity - {getLeaveTypeConfig(selectedLeaveType)?.name}
            </h3>
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) {
                  fetchAccrualHistory(selectedLeaveType);
                }
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {showHistory && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {accrualHistory.length > 0 ? (
                accrualHistory.map((record, index) => (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.accrualType === 'adjustment' ? 'Balance Adjustment' : 
                         record.accrualType === 'monthly' ? 'Monthly Accrual' :
                         record.accrualType === 'yearly' ? 'Annual Credit' : 
                         record.accrualType}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(record.accrualDate)}
                        {record.remarks && ` - ${record.remarks}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        record.accrualAmount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {record.accrualAmount > 0 ? '+' : ''}{record.accrualAmount}
                      </div>
                      <div className="text-xs text-gray-500">
                        Balance: {record.balanceAfter}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No recent activity found
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedLeaveBalanceDisplay;