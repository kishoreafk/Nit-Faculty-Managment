import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import MonthlyLeaveCalculator from '../components/MonthlyLeaveCalculator';
import LeaveCalculator from '../components/LeaveCalculator';
import LeaveApplicationsList from '../components/LeaveApplicationsList';
import LeaveBalanceDisplay from '../components/LeaveBalanceDisplay';
import LeaveComparisonTable from '../components/LeaveComparisonTable';

const EnhancedLeaveManagement = () => {
  const [activeTab, setActiveTab] = useState('monthly-calculator');

  const tabs = [
    { id: 'monthly-calculator', label: 'Monthly Calculator', icon: '📊' },
    { id: 'leave-calculator', label: 'Leave Calculator', icon: '🧮' },
    { id: 'leave-balance', label: 'Leave Balance', icon: '💰' },
    { id: 'comparison', label: 'Comparison', icon: '📋' },
    { id: 'applications', label: 'Applications', icon: '📝' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'monthly-calculator':
        return <MonthlyLeaveCalculator />;
      case 'leave-calculator':
        return <LeaveCalculator />;
      case 'leave-balance':
        return <LeaveBalanceDisplay />;
      case 'comparison':
        return <LeaveComparisonTable />;
      case 'applications':
        return <LeaveApplicationsList />;
      default:
        return <MonthlyLeaveCalculator />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Leave Management</h1>
          <p className="text-gray-600">Comprehensive leave calculation and management system</p>
        </div>

        {/* Tab Navigation */}
        <Card className="mb-6">
          <div className="flex flex-wrap border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Tab Content */}
        <div className="tab-content">
          {renderTabContent()}
        </div>

        {/* Quick Stats */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800">Teaching Faculty</h4>
              <p className="text-sm text-blue-600 mt-1">EL: 2.5 days/month (max 30)</p>
              <p className="text-sm text-blue-600">CL: 12 days/year</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800">Non-Teaching Staff</h4>
              <p className="text-sm text-green-600 mt-1">EL: 2.5 days/month (max 30)</p>
              <p className="text-sm text-green-600">CL: 12 days/year</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-800">Contract Faculty</h4>
              <p className="text-sm text-orange-600 mt-1">EL: 1.25 days/month (max 15)</p>
              <p className="text-sm text-orange-600">CL: 8 days/year</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800">Visiting Faculty</h4>
              <p className="text-sm text-purple-600 mt-1">EL: 0.83 days/month (max 10)</p>
              <p className="text-sm text-purple-600">CL: 6 days/year</p>
            </div>
          </div>
        </Card>

        {/* Important Notes */}
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold mb-4">Important Leave Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Earned Leave (EL)</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Minimum 6 months service required</li>
                <li>• Monthly accrual based on faculty type</li>
                <li>• Can carry forward up to 15 days</li>
                <li>• Encashment allowed for teaching faculty</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Casual Leave (CL)</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Annual allocation at year start</li>
                <li>• No carry forward allowed</li>
                <li>• Resets on year end</li>
                <li>• Requires advance notice</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Medical Leave (ML)</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Medical certificate required</li>
                <li>• Maximum days vary by faculty type</li>
                <li>• No carry forward</li>
                <li>• Immediate approval for emergencies</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Special Leaves</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Maternity: 180 days (teaching/non-teaching)</li>
                <li>• Study: 365 days (teaching), 180 days (non-teaching)</li>
                <li>• Half Pay Leave: Non-teaching only</li>
                <li>• Hospital Attendance: 2 HAPL = 1 ML</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedLeaveManagement;