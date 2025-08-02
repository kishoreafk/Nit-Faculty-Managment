import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  UserIcon,
  CalendarIcon,
  ClockIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon as ClockIconSolid,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../api/api';

const Dashboard = () => {
  const { faculty } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const activityResponse = await dashboardAPI.getActivity();
      setRecentActivity(formatActivity(activityResponse.data));
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatActivity = (data) => {
    const activities = [];
    
    if (faculty?.role === 'admin') {
      data.recentLeaves?.forEach(leave => {
        activities.push({
          id: `leave-${leave.id}`,
          title: 'Leave Request',
          description: `${leave.facultyName} requested ${leave.leaveType}`,
          time: new Date(leave.createdAt).toLocaleDateString(),
          icon: CalendarIcon,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50'
        });
      });
      
      data.recentProducts?.forEach(product => {
        activities.push({
          id: `product-${product.id}`,
          title: 'Product Request',
          description: `${product.facultyName} requested ${product.product_name}`,
          time: new Date(product.requested_at).toLocaleDateString(),
          icon: DocumentTextIcon,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50'
        });
      });
    } else {
      data.recentLeaves?.forEach(leave => {
        activities.push({
          id: `leave-${leave.id}`,
          title: `Leave Request ${leave.status}`,
          description: `${leave.leaveType} - ${leave.status}`,
          time: new Date(leave.createdAt).toLocaleDateString(),
          icon: leave.status === 'Approved' ? CheckCircleIcon : leave.status === 'Rejected' ? ExclamationTriangleIcon : ClockIcon,
          color: leave.status === 'Approved' ? 'text-green-500' : leave.status === 'Rejected' ? 'text-red-500' : 'text-yellow-500',
          bgColor: leave.status === 'Approved' ? 'bg-green-50' : leave.status === 'Rejected' ? 'bg-red-50' : 'bg-yellow-50'
        });
      });
      
      data.recentProducts?.forEach(product => {
        activities.push({
          id: `product-${product.id}`,
          title: `Product Request ${product.status}`,
          description: `${product.product_name} - ${product.status}`,
          time: new Date(product.requested_at).toLocaleDateString(),
          icon: DocumentTextIcon,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50'
        });
      });
      
      data.recentFiles?.forEach(file => {
        activities.push({
          id: `file-${file.id}`,
          title: 'File Uploaded',
          description: file.originalName || file.fileName,
          time: new Date(file.createdAt).toLocaleDateString(),
          icon: InformationCircleIcon,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50'
        });
      });
    }
    
    return activities.slice(0, 5);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }



  const QuickAction = ({ title, description, icon, color, onClick }) => {
    const IconComponent = icon;
    return (
      <button
        onClick={onClick}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md transition-shadow hover:scale-105"
      >
        <div className={`p-3 rounded-lg ${color} w-fit mb-4`}>
          <IconComponent className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </button>
    );
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {faculty?.firstName || 'Faculty'}!
              </h1>
              <p className="text-blue-100">
                Here's what's happening with your account today.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>



        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {faculty?.firstName} {faculty?.lastName}
                </h2>
                <p className="text-gray-600">{faculty?.department}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{faculty?.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{faculty?.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{faculty?.department}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <AcademicCapIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">Employee ID: {faculty?.employeeId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            className="lg:col-span-2"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faculty?.role === 'admin' ? (
                // Admin Quick Actions
                <>
                  <QuickAction
                    title="Manage Users"
                    description="Add, remove, and approve faculty members"
                    icon={UsersIcon}
                    color="bg-blue-500"
                    onClick={() => navigate('/admin')}
                  />
                  <QuickAction
                    title="Leave Requests"
                    description="Review and approve leave requests"
                    icon={CalendarIcon}
                    color="bg-green-500"
                    onClick={() => navigate('/leave-management')}
                  />
                  <QuickAction
                    title="Product Requests"
                    description="Review and approve product requests"
                    icon={DocumentTextIcon}
                    color="bg-purple-500"
                    onClick={() => navigate('/product-request')}
                  />
                  <QuickAction
                    title="Assign Timetables"
                    description="Assign timetables to faculty members"
                    icon={ClockIconSolid}
                    color="bg-orange-500"
                    onClick={() => navigate('/timetable')}
                  />
                </>
              ) : (
                // Faculty Quick Actions
                <>
                  <QuickAction
                    title="Apply Leave"
                    description="Request time off for personal or medical reasons"
                    icon={CalendarIcon}
                    color="bg-blue-500"
                    onClick={() => navigate('/leave-management')}
                  />
                  <QuickAction
                    title="Product Request"
                    description="Request office supplies or equipment"
                    icon={DocumentTextIcon}
                    color="bg-green-500"
                    onClick={() => navigate('/product-request')}
                  />
                  <QuickAction
                    title="Upload Files"
                    description="Share documents and files securely"
                    icon={DocumentTextIcon}
                    color="bg-purple-500"
                    onClick={() => navigate('/vaultify')}
                  />
                  <QuickAction
                    title="View Timetable"
                    description="Check your class schedule and timings"
                    icon={ClockIconSolid}
                    color="bg-orange-500"
                    onClick={() => navigate('/timetable')}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <div key={activity.id} className={`flex items-center space-x-4 p-4 ${activity.bgColor} rounded-lg`}>
                    <IconComponent className={`h-5 w-5 ${activity.color}`} />
                    <div>
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                    <span className="text-xs text-gray-500 ml-auto">{activity.time}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard; 