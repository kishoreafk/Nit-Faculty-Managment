import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, TrendingUp, AlertCircle } from 'lucide-react';

const EnhancedLeaveCalculator = () => {
  const [facultyType, setFacultyType] = useState('teaching');
  const [joiningDate, setJoiningDate] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [leaveBalance, setLeaveBalance] = useState({});
  const [previousYearBalance, setPreviousYearBalance] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const facultyTypes = [
    { value: 'teaching', label: 'Teaching Faculty' },
    { value: 'non_teaching', label: 'Non-Teaching Staff' },
    { value: 'contract', label: 'Contract Faculty' },
    { value: 'visiting', label: 'Visiting Faculty' }
  ];

  const calculateLeaveBalance = async () => {
    if (!joiningDate) {
      setError('Please select joining date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/leave/calculate-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facultyType,
          joiningDate,
          currentYear,
          previousYearBalance
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate leave balance');
      }

      const data = await response.json();
      setLeaveBalance(data.balance || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPreviousYearBalance = (leaveType, balance) => {
    setPreviousYearBalance(prev => ({
      ...prev,
      [leaveType]: { balance: parseFloat(balance) || 0 }
    }));
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      earned: 'bg-green-100 text-green-800',
      casual: 'bg-blue-100 text-blue-800',
      special_casual: 'bg-purple-100 text-purple-800',
      medical: 'bg-red-100 text-red-800',
      maternity: 'bg-pink-100 text-pink-800',
      study: 'bg-yellow-100 text-yellow-800',
      rh: 'bg-orange-100 text-orange-800',
      hpl: 'bg-gray-100 text-gray-800',
      hapl: 'bg-indigo-100 text-indigo-800'
    };
    return colors[leaveType] || 'bg-gray-100 text-gray-800';
  };

  const formatLeaveTypeName = (leaveType) => {
    const names = {
      earned: 'Earned Leave (EL)',
      casual: 'Casual Leave (CL)',
      special_casual: 'Special Casual Leave',
      medical: 'Medical Leave (ML)',
      maternity: 'Maternity Leave',
      study: 'Study Leave',
      rh: 'Restricted Holiday (RH)',
      hpl: 'Half Pay Leave (HPL)',
      hapl: 'Hospital Attendance Leave (HAPL)'
    };
    return names[leaveType] || leaveType;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Enhanced Leave Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Faculty Type</label>
              <Select value={facultyType} onValueChange={setFacultyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {facultyTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Joining Date</label>
              <Input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Current Year</label>
              <Input
                type="number"
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                min="2020"
                max="2030"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <Button 
            onClick={calculateLeaveBalance} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Calculating...' : 'Calculate Leave Balance'}
          </Button>
        </CardContent>
      </Card>

      {/* Previous Year Balance Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Previous Year Unused Leave (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['earned', 'casual', 'medical'].map(leaveType => (
              <div key={leaveType}>
                <label className="block text-sm font-medium mb-2">
                  {formatLeaveTypeName(leaveType)}
                </label>
                <Input
                  type="number"
                  placeholder="Unused days"
                  min="0"
                  onChange={(e) => addPreviousYearBalance(leaveType, e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leave Balance Display */}
      {Object.keys(leaveBalance).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Leave Balance for {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(leaveBalance).map(([leaveType, balance]) => (
                <Card key={leaveType} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getLeaveTypeColor(leaveType)}>
                        {formatLeaveTypeName(leaveType)}
                      </Badge>
                      {balance.canCarryForward && (
                        <Badge variant="outline" className="text-xs">
                          Carry Forward
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Allocated:</span>
                        <span className="font-medium">{balance.allocated} days</span>
                      </div>
                      
                      {balance.carryForward > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Carry Forward:</span>
                          <span className="font-medium">+{balance.carryForward} days</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span>Total Available:</span>
                        <span className="font-bold text-blue-600">{balance.totalAllocated} days</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Used:</span>
                        <span className="font-medium">{balance.used} days</span>
                      </div>
                      
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>Balance:</span>
                        <span className="font-bold text-green-600">{balance.balance} days</span>
                      </div>
                      
                      {balance.serviceMonths !== undefined && (
                        <div className="text-xs text-gray-500 mt-2">
                          Service: {balance.serviceMonths} months
                          {!balance.eligibleFromJoining && (
                            <span className="text-orange-500 ml-1">(Not eligible yet)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Allocated:</span>
                  <div className="font-bold text-blue-600">
                    {Object.values(leaveBalance).reduce((sum, b) => sum + b.totalAllocated, 0)} days
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Total Used:</span>
                  <div className="font-bold text-red-600">
                    {Object.values(leaveBalance).reduce((sum, b) => sum + b.used, 0)} days
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Total Balance:</span>
                  <div className="font-bold text-green-600">
                    {Object.values(leaveBalance).reduce((sum, b) => sum + b.balance, 0)} days
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Carry Forward:</span>
                  <div className="font-bold text-purple-600">
                    {Object.values(leaveBalance).reduce((sum, b) => sum + (b.carryForward || 0), 0)} days
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedLeaveCalculator;