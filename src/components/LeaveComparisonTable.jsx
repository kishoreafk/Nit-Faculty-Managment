import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const LeaveComparisonTable = () => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const fetchComparisonData = async () => {
    try {
      const response = await fetch('/api/monthly-leave-calculation/compare-entitlements');
      const data = await response.json();
      if (data.success) {
        setComparisonData(data.data);
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!comparisonData) {
    return (
      <Card className="p-6">
        <p className="text-gray-500">Unable to load comparison data</p>
      </Card>
    );
  }

  const { comparison, facultyTypes, leaveTypes } = comparisonData;

  const getFacultyTypeLabel = (facultyType) => {
    const labels = {
      teaching: 'Teaching Faculty',
      non_teaching: 'Non-Teaching Staff',
      contract: 'Contract Faculty',
      visiting: 'Visiting Faculty'
    };
    return labels[facultyType] || facultyType;
  };

  const getLeaveTypeLabel = (leaveType) => {
    const labels = {
      casual: 'Casual Leave',
      special_casual: 'Special Casual Leave',
      earned: 'Earned Leave',
      rh: 'Restricted Holiday',
      hpl: 'Half Pay Leave',
      hapl: 'Hospital Attendance Leave',
      medical: 'Medical Leave',
      maternity: 'Maternity Leave',
      study: 'Study Leave'
    };
    return labels[leaveType] || leaveType;
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-6">Leave Entitlements Comparison</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left p-4 font-semibold">Leave Type</th>
              {facultyTypes.map(facultyType => (
                <th key={facultyType} className="text-center p-4 font-semibold min-w-[150px]">
                  {getFacultyTypeLabel(facultyType)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaveTypes.map(leaveType => (
              <tr key={leaveType} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium">
                  {getLeaveTypeLabel(leaveType)}
                </td>
                {facultyTypes.map(facultyType => {
                  const entitlement = comparison[leaveType][facultyType];
                  return (
                    <td key={facultyType} className="p-4 text-center">
                      {entitlement ? (
                        <div className="space-y-2">
                          <div className="text-lg font-bold text-blue-600">
                            {entitlement.maxDays} days
                          </div>
                          <div className="flex flex-wrap justify-center gap-1">
                            {entitlement.carryForward && (
                              <Badge variant="secondary" className="text-xs">
                                Carry Forward
                              </Badge>
                            )}
                            {entitlement.requiresApproval && (
                              <Badge variant="outline" className="text-xs">
                                Approval Required
                              </Badge>
                            )}
                            {entitlement.advanceNotice > 0 && (
                              <Badge variant="default" className="text-xs">
                                {entitlement.advanceNotice}d notice
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not Applicable</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Legend:</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Carry Forward</Badge>
            <span>Can carry unused leave to next year</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Approval Required</Badge>
            <span>Needs supervisor approval</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">Notice</Badge>
            <span>Advance notice required (days)</span>
          </div>
        </div>
      </div>

      {/* Special Notes */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">Special Notes:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Earned Leave requires minimum 6 months of service</li>
          <li>• Medical Leave requires medical certificate</li>
          <li>• Maternity Leave is applicable only for female employees</li>
          <li>• Study Leave duration varies: Teaching (365 days), Non-Teaching (180 days)</li>
          <li>• Hospital Attendance Leave: 2 HAPL = 1 ML (Non-Teaching only)</li>
        </ul>
      </div>
    </Card>
  );
};

export default LeaveComparisonTable;