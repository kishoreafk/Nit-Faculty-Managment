import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

const MonthlyLeaveCalculator = () => {
  const [facultyType, setFacultyType] = useState('teaching');
  const [joiningDate, setJoiningDate] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyCalculations, setMonthlyCalculations] = useState([]);
  const [leaveEntitlements, setLeaveEntitlements] = useState({});
  const [loading, setLoading] = useState(false);

  const facultyTypes = [
    { value: 'teaching', label: 'Teaching Faculty' },
    { value: 'non_teaching', label: 'Non-Teaching Staff' },
    { value: 'contract', label: 'Contract Faculty' },
    { value: 'visiting', label: 'Visiting Faculty' }
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchLeaveEntitlements();
  }, []);

  const fetchLeaveEntitlements = async () => {
    try {
      const response = await fetch('/api/monthly-leave-calculation/faculty-entitlements');
      const data = await response.json();
      if (data.success) {
        setLeaveEntitlements(data.data);
      }
    } catch (error) {
      console.error('Error fetching leave entitlements:', error);
    }
  };

  const calculateMonthlyLeave = async () => {
    if (!joiningDate) {
      alert('Please select joining date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/monthly-leave-calculation/monthly-breakdown?facultyType=${facultyType}&joiningDate=${joiningDate}&year=${currentYear}`
      );
      const data = await response.json();
      
      if (data.success) {
        const monthlyData = data.data.monthlyBreakdown.map(month => ({
          month: month.monthName,
          monthIndex: month.month - 1,
          monthsInService: month.monthsInService,
          earnedLeaveAccrual: {
            monthlyAccrual: month.earnedLeave.monthlyAccrual,
            totalAccrued: month.earnedLeave.cumulativeAccrual,
            maxAnnual: month.earnedLeave.maxAnnual
          },
          applicableLeaves: month.applicableLeaves,
          isEligible: month.isEligible
        }));
        setMonthlyCalculations(monthlyData);
      } else {
        console.error('Error from API:', data.message);
        alert('Error calculating leave: ' + data.message);
      }
    } catch (error) {
      console.error('Error calculating monthly leave:', error);
      alert('Error calculating leave. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // These functions are now handled by the backend API

  const getTotalLeaveBalance = () => {
    if (monthlyCalculations.length === 0) return {};

    const lastMonth = monthlyCalculations[monthlyCalculations.length - 1];
    const entitlements = leaveEntitlements[facultyType];
    
    if (!entitlements) return {};

    const balance = {};
    Object.entries(entitlements.leaveTypes || {}).forEach(([leaveId, leave]) => {
      if (leaveId === 'earned') {
        balance[leaveId] = {
          name: leave.name,
          allocated: lastMonth.earnedLeaveAccrual.totalAccrued,
          maxDays: leave.maxDays
        };
      } else {
        balance[leaveId] = {
          name: leave.name,
          allocated: leave.maxDays,
          maxDays: leave.maxDays
        };
      }
    });

    return balance;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Monthly Leave Calculator</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Faculty Type</label>
            <Select
              value={facultyType}
              onValueChange={setFacultyType}
              className="w-full"
            >
              {facultyTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Joining Date</label>
            <Input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <Input
              type="number"
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              min="2020"
              max="2030"
              className="w-full"
            />
          </div>
        </div>

        <Button 
          onClick={calculateMonthlyLeave}
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading ? 'Calculating...' : 'Calculate Monthly Leave'}
        </Button>
      </Card>

      {monthlyCalculations.length > 0 && (
        <>
          {/* Annual Summary */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Annual Leave Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(getTotalLeaveBalance()).map(([leaveId, leave]) => (
                <div key={leaveId} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600">{leave.name}</h4>
                  <p className="text-2xl font-bold text-blue-600">{leave.allocated}</p>
                  <p className="text-sm text-gray-500">days allocated</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly Breakdown */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Monthly Leave Calculation</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Month</th>
                    <th className="text-left p-3">Service Months</th>
                    <th className="text-left p-3">EL Accrual</th>
                    <th className="text-left p-3">Total EL</th>
                    <th className="text-left p-3">Applicable Leaves</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyCalculations.map((month, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{month.month}</td>
                      <td className="p-3">{month.monthsInService}</td>
                      <td className="p-3">
                        {month.isEligible ? `+${month.earnedLeaveAccrual.monthlyAccrual}` : '-'}
                      </td>
                      <td className="p-3">
                        {month.isEligible ? month.earnedLeaveAccrual.totalAccrued.toFixed(1) : '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {month.applicableLeaves.map(leave => (
                            <Badge key={leave.id} variant="secondary" className="text-xs">
                              {leave.name} ({leave.maxDays})
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={month.isEligible ? "default" : "secondary"}>
                          {month.isEligible ? 'Eligible' : 'Not Eligible'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Leave Types Details */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Leave Types & Rules</h3>
            {leaveEntitlements[facultyType] && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(leaveEntitlements[facultyType].leaveTypes || {}).map(([leaveId, leave]) => (
                  <div key={leaveId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{leave.name}</h4>
                      <Badge variant="outline">{leave.maxDays} days</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{leave.description}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Carry Forward:</span>
                        <span className={leave.carryForwardAllowed ? 'text-green-600' : 'text-red-600'}>
                          {leave.carryForwardAllowed ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Advance Notice:</span>
                        <span>{leave.advanceNotice} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Requires Approval:</span>
                        <span className={leave.requiresApproval ? 'text-orange-600' : 'text-green-600'}>
                          {leave.requiresApproval ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default MonthlyLeaveCalculator;