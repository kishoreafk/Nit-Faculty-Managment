import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const LeaveBalanceDisplay = ({ selectedLeaveType, onBalanceLoad }) => {
  const { faculty } = useAuth();
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (faculty?.id) {
      fetchLeaveBalance();
    }
  }, [faculty?.id]);

  const fetchLeaveBalance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/leave-balance/balance/${faculty.id}`);
      
      if (response.data.success) {
        const balanceData = response.data.data.balances || {};
        setBalances(balanceData);
        if (onBalanceLoad) {
          onBalanceLoad(balanceData);
        }
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      setError('Failed to load leave balance');
      
      // If balance doesn't exist, try to initialize it
      if (error.response?.status === 404) {
        await initializeBalance();
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeBalance = async () => {
    try {
      const response = await axios.post(`/api/leave-balance/initialize/${faculty.id}`);
      if (response.data.success) {
        const balanceData = response.data.data.balances || {};
        setBalances(balanceData);
        if (onBalanceLoad) {
          onBalanceLoad(balanceData);
        }
        setError(null);
      }
    } catch (error) {
      console.error('Error initializing leave balance:', error);
      setError('Failed to initialize leave balance');
    }
  };

  const getBalanceStatus = (balance) => {
    const percentage = (balance.balance / balance.allocated) * 100;
    if (percentage > 50) return 'good';
    if (percentage > 20) return 'warning';
    return 'critical';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />
          <span className="text-blue-700">Loading leave balance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={fetchLeaveBalance}
            className="text-red-600 hover:text-red-800 text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Leave Balance</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(balances || {}).map(([leaveTypeId, balance]) => {
          if (!balance || typeof balance !== 'object') return null;
          const status = getBalanceStatus(balance);
          const isSelected = selectedLeaveType === leaveTypeId;
          
          return (
            <div
              key={leaveTypeId}
              className={`border rounded-lg p-4 transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : getStatusColor(status)
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{balance.leaveType}</h4>
                {getStatusIcon(status)}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-medium">{balance.allocated} days</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used:</span>
                  <span className="font-medium text-red-600">{balance.used} days</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance:</span>
                  <span className={`font-medium ${
                    balance.balance > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {balance.balance} days
                  </span>
                </div>

                {balance.carryForward && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max Carry Forward:</span>
                    <span className="font-medium text-blue-600">{balance.maxCarryForward} days</span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Usage</span>
                  <span>{Math.round((balance.used / balance.allocated) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status === 'good' ? 'bg-green-500' :
                      status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((balance.used / balance.allocated) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {isSelected && balance.balance <= 0 && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                  ⚠️ Insufficient balance for this leave type
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedLeaveType && balances && balances[selectedLeaveType] && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Selected Leave Type: {balances[selectedLeaveType].leaveType}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Available Balance:</span>
              <span className={`ml-2 font-medium ${
                balances[selectedLeaveType].balance > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {balances[selectedLeaveType].balance || 0} days
              </span>
            </div>
            <div>
              <span className="text-blue-700">Max Days:</span>
              <span className="ml-2 font-medium text-blue-900">
                {balances[selectedLeaveType].maxDays || 0} days
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Leave balances are calculated based on your faculty type</p>
        <p>• Maximum leave days are allocated at the beginning of the year</p>
        <p>• Balance reduces as you apply for and take leave</p>
        <p>• Contact admin if you see any discrepancies in your balance</p>
      </div>
    </div>
  );
};

export default LeaveBalanceDisplay;