import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LeaveCalculator = () => {
  const [formData, setFormData] = useState({
    facultyType: 'teaching',
    joiningDate: '',
    calculationDate: new Date().toISOString().split('T')[0],
    previousYearBalance: {},
    usedLeaveThisYear: {}
  });

  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [facultyEntitlements, setFacultyEntitlements] = useState(null);

  const facultyTypes = [
    { value: 'teaching', label: 'Teaching Faculty' },
    { value: 'non_teaching', label: 'Non-Teaching Faculty' },
    { value: 'contract', label: 'Contract Faculty' },
    { value: 'visiting', label: 'Visiting Faculty' }
  ];

  // Load faculty entitlements when faculty type changes
  useEffect(() => {
    if (formData.facultyType) {
      loadFacultyEntitlements(formData.facultyType);
    }
  }, [formData.facultyType]);

  const loadFacultyEntitlements = async (facultyType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/enhanced-leave-calculator/faculty-entitlements/${facultyType}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setFacultyEntitlements(response.data.data);
    } catch (error) {
      console.error('Error loading faculty entitlements:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreviousYearBalanceChange = (leaveType, value) => {
    setFormData(prev => ({
      ...prev,
      previousYearBalance: {
        ...prev.previousYearBalance,
        [leaveType]: { balance: parseInt(value) || 0 }
      }
    }));
  };

  const handleUsedLeaveChange = (leaveType, value) => {
    setFormData(prev => ({
      ...prev,
      usedLeaveThisYear: {
        ...prev.usedLeaveThisYear,
        [leaveType]: parseInt(value) || 0
      }
    }));
  };

  const calculateLeaveBalance = async () => {
    if (!formData.facultyType || !formData.joiningDate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/enhanced-leave-calculator/calculate-comprehensive-balance',
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setLeaveBalance(response.data.data);
    } catch (error) {
      console.error('Error calculating leave balance:', error);
      setError(error.response?.data?.message || 'Failed to calculate leave balance');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!leaveBalance) {
      setError('Please calculate leave balance first');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/enhanced-leave-calculator/generate-report',
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Create and download report as JSON
      const reportData = JSON.stringify(response.data.data, null, 2);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-balance-report-${formData.facultyType}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Enhanced Leave Calculator</h2>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faculty Type *
          </label>
          <select
            name="facultyType"
            value={formData.facultyType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {facultyTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Joining Date *
          </label>
          <input
            type="date"
            name="joiningDate"
            value={formData.joiningDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calculation Date
          </label>
          <input
            type="date"
            name="calculationDate"
            value={formData.calculationDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Previous Year Balance and Used Leave Inputs */}
      {facultyEntitlements && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Previous Year Balance</h3>
            <div className="space-y-3">
              {Object.entries(facultyEntitlements.leaveTypes).map(([leaveType, config]) => (
                <div key={leaveType}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {config.name}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    onChange={(e) => handlePreviousYearBalanceChange(leaveType, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Used This Year</h3>
            <div className="space-y-3">
              {Object.entries(facultyEntitlements.leaveTypes).map(([leaveType, config]) => (
                <div key={leaveType}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {config.name}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    onChange={(e) => handleUsedLeaveChange(leaveType, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={calculateLeaveBalance}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Calculating...' : 'Calculate Leave Balance'}
        </button>

        {leaveBalance && (
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Report
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Leave Balance Results */}
      {leaveBalance && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Leave Balance Summary</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{leaveBalance.summary.totalAllocated}</div>
                <div className="text-sm text-gray-600">Total Allocated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{leaveBalance.summary.totalCarryForward}</div>
                <div className="text-sm text-gray-600">Carry Forward</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{leaveBalance.summary.totalAvailable}</div>
                <div className="text-sm text-gray-600">Total Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{leaveBalance.summary.totalUsed}</div>
                <div className="text-sm text-gray-600">Total Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{leaveBalance.summary.totalBalance}</div>
                <div className="text-sm text-gray-600">Total Balance</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <p><strong>Faculty Type:</strong> {leaveBalance.facultyType}</p>
              <p><strong>Joining Date:</strong> {leaveBalance.joiningDate}</p>
              <p><strong>Service Months:</strong> {leaveBalance.serviceMonths}</p>
              <p><strong>Calculation Date:</strong> {leaveBalance.calculationDate}</p>
            </div>
          </div>

          {/* Individual Leave Type Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(leaveBalance.leaveBalances).map(([leaveType, balance]) => (
              <div key={leaveType} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">{balance.leaveType}</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Allocated:</span>
                    <span className="font-medium">{balance.allocated} days</span>
                  </div>
                  
                  {balance.carryForward > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carry Forward:</span>
                      <span className="font-medium text-green-600">{balance.carryForward} days</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Available:</span>
                    <span className="font-medium">{balance.totalAvailable} days</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-medium text-red-600">{balance.used} days</span>
                  </div>
                  
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-800 font-medium">Balance:</span>
                    <span className="font-bold text-blue-600">{balance.balance} days</span>
                  </div>
                  
                  {balance.canCarryForward && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Carry Forward:</span>
                      <span className="font-medium">{balance.maxCarryForward} days</span>
                    </div>
                  )}
                </div>

                {/* Earned Leave Accrual Details */}
                {balance.accrualDetails && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Accrual Details</h5>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Monthly Accrual: {balance.accrualDetails.monthlyAccrual} days</div>
                      <div>Total Months: {balance.accrualDetails.totalMonths}</div>
                      <div>Total Accrued: {balance.accrualDetails.totalAccrued} days</div>
                      {balance.accrualDetails.cappedAtMax && (
                        <div className="text-orange-600">⚠️ Capped at maximum</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCalculator;