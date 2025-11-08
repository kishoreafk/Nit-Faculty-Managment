import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaveFormAPI } from '../api/api';
import { 
  EyeIcon, 
  XMarkIcon, 
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  TrashIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const LeaveApplicationsList = () => {
  const { faculty } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchApplications = async () => {
    try {
      const endpoint = faculty?.role === 'admin' 
        ? '/api/leave-forms/all-applications' 
        : '/api/leave-forms/my-applications';
        
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    // Listen for refresh events
    const handleRefresh = () => {
      fetchApplications();
    };
    
    window.addEventListener('refreshLeaveStats', handleRefresh);
    return () => window.removeEventListener('refreshLeaveStats', handleRefresh);
  }, []);

  const handleReview = async (applicationId, status, rejectionReason = '') => {
    try {
      const response = await fetch(`/api/leave-forms/review/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, rejectionReason })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchApplications();
        toast.success(`Application ${status.toLowerCase()} successfully!`);
        // Refresh stats
        console.log('📤 Dispatching refresh events from LeaveApplicationsList');
        window.dispatchEvent(new CustomEvent('refreshAdminStats'));
        window.dispatchEvent(new CustomEvent('refreshLeaveStats'));
      } else {
        toast.error('Error updating application: ' + result.message);
      }
    } catch {
      toast.error('Error updating application');
    }
  };

  const handleDelete = async (applicationId) => {
    if (!window.confirm('Delete this leave application? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/leave-forms/delete/${applicationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchApplications();
        toast.success('Application deleted successfully');
        // Refresh stats
        window.dispatchEvent(new CustomEvent('refreshAdminStats'));
        window.dispatchEvent(new CustomEvent('refreshLeaveStats'));
      } else {
        toast.error(result.message || 'Failed to delete application');
      }
    } catch (error) {
      console.error('Delete application error:', error);
      toast.error('Failed to delete application');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'Rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const calculateDuration = (formData) => {
    const startDate = formData.leave_start || formData.leave_start_date;
    const endDate = formData.leave_end || formData.leave_end_date;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return days;
    }
    
    return formData.no_of_days_leave || formData.no_of_leave_days || 'N/A';
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'text-green-700 bg-green-100 border-green-200';
      case 'Rejected': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    }
  };

  const getStatusGradient = (status) => {
    switch (status) {
      case 'Approved': return 'from-green-50 to-green-100';
      case 'Rejected': return 'from-red-50 to-red-100';
      default: return 'from-yellow-50 to-yellow-100';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-4">Loading applications...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {faculty?.role === 'admin' ? 'All Leave Applications' : 'My Leave Applications'}
              </h2>
              <p className="text-blue-100 text-sm">
                {applications.length} application{applications.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-blue-200" />
            <span className="text-blue-100 text-sm font-medium">Enhanced Interface</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <DocumentTextIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Found</h3>
            <p className="text-gray-500">You haven't submitted any leave applications yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const duration = calculateDuration(app.form_data);
              const startDate = app.form_data.leave_start || app.form_data.leave_start_date;
              const endDate = app.form_data.leave_end || app.form_data.leave_end_date;
              
              return (
                <div key={app.id} className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:shadow-lg bg-gradient-to-r ${getStatusGradient(app.status)}`}>
                  <div className="bg-white/80 backdrop-blur-sm p-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`p-3 rounded-xl ${getStatusColor(app.status)} border`}>
                            {getStatusIcon(app.status)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {faculty?.role === 'admin' ? `${app.firstName} ${app.lastName}` : app.leave_category}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                            <BuildingOfficeIcon className="h-4 w-4" />
                            <span>{app.form_name}</span>
                            <span>•</span>
                            <span className="font-medium">{app.leave_category}</span>
                          </div>
                          {faculty?.role === 'admin' && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <UserIcon className="h-4 w-4" />
                              <span>{app.department} • {app.employeeId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                        <div className="text-xs text-gray-500 text-right">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>Applied {formatDate(app.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Leave Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {startDate && (
                        <div className="bg-white/60 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-1">
                            <CalendarIcon className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium text-gray-700">Start Date</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{formatDate(startDate)}</p>
                        </div>
                      )}
                      {endDate && (
                        <div className="bg-white/60 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-1">
                            <CalendarIcon className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-medium text-gray-700">End Date</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{formatDate(endDate)}</p>
                        </div>
                      )}
                      <div className="bg-white/60 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <ClockIcon className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-gray-700">Duration</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {duration} {duration === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                    </div>

                    {/* Reason Preview */}
                    {app.form_data.reason && (
                      <div className="bg-white/60 rounded-lg p-3 border border-gray-200 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <DocumentTextIcon className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-medium text-gray-700">Reason</span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {app.form_data.reason}
                        </p>
                      </div>
                    )}

                    {/* Admin Reason */}
                    {(app.rejection_reason && app.status === 'Rejected') && (
                      <div className="mb-4 p-4 border-l-4 rounded-r-lg bg-red-50 border-red-400">
                        <div className="flex items-center space-x-2 mb-2">
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                          <span className="text-sm font-bold text-red-700">
                            Admin Rejection Reason
                          </span>
                        </div>
                        <p className="text-sm text-red-600">
                          {app.rejection_reason}
                        </p>
                      </div>
                    )}
                    
                    {/* Admin Approval Note */}
                    {app.status === 'Approved' && (
                      <div className="mb-4 p-4 border-l-4 rounded-r-lg bg-green-50 border-green-400">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-bold text-green-700">
                            Application Approved
                          </span>
                        </div>
                        <p className="text-sm text-green-600">
                          Your leave application has been approved by the admin.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setShowDetailsModal(true);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span>View Details</span>
                      </button>

                      {/* Delete own pending application */}
                      {faculty?.role !== 'admin' && app.status === 'Pending' && (
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      )}
                      
                      {/* Admin Actions */}
                      {faculty?.role === 'admin' && app.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => {
                              handleReview(app.id, 'Approved', '');
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason (required):');
                              if (reason?.trim()) {
                                handleReview(app.id, 'Rejected', reason);
                              } else {
                                toast.error('Rejection reason is required');
                              }
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            <XCircleIcon className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Enhanced Details Modal */}
      {selectedApp && showDetailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Leave Application Details</h3>
                    <p className="text-indigo-100 text-sm">
                      {selectedApp.leave_category} • {selectedApp.form_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedApp(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Application Info */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className={`p-2 rounded-lg ${getStatusColor(selectedApp.status)}`}>
                          {getStatusIcon(selectedApp.status)}
                        </div>
                        <h4 className="font-bold text-blue-900">Application Status</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-800">Current Status:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedApp.status)}`}>
                            {selectedApp.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-blue-800">Form Type:</span>
                          <span className="text-sm text-blue-700 font-medium">{selectedApp.form_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-blue-800">Category:</span>
                          <span className="text-sm text-blue-700 font-medium">{selectedApp.leave_category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-blue-800">Applied:</span>
                          <span className="text-sm text-blue-700">{formatDate(selectedApp.created_at)}</span>
                        </div>
                        {selectedApp.approved_at && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-blue-800">Reviewed:</span>
                            <span className="text-sm text-blue-700">{formatDate(selectedApp.approved_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {faculty?.role === 'admin' && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                        <div className="flex items-center space-x-2 mb-4">
                          <UserIcon className="h-5 w-5 text-green-600" />
                          <h4 className="font-bold text-green-900">Faculty Information</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-green-800">Name:</span>
                            <span className="text-sm text-green-700 font-medium">{selectedApp.firstName} {selectedApp.lastName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-green-800">Employee ID:</span>
                            <span className="text-sm text-green-700">{selectedApp.employeeId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-green-800">Department:</span>
                            <span className="text-sm text-green-700">{selectedApp.department}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedApp.rejection_reason && (
                      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <XCircleIcon className="h-5 w-5 text-red-600" />
                          <h4 className="font-bold text-red-900">Rejection Details</h4>
                        </div>
                        <p className="text-sm text-red-800 leading-relaxed">{selectedApp.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Middle & Right Columns - Form Data */}
                  <div className="lg:col-span-2">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                        <h4 className="font-bold text-gray-900">Complete Leave Details</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedApp.form_data).map(([key, value]) => {
                          if (!value || key === 'signature') return null;
                          
                          let displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          let displayValue = value;
                          
                          // Handle object values (like adjustment_duties)
                          if (typeof value === 'object' && value !== null) {
                            if (Array.isArray(value) && value.length > 0) {
                              displayValue = (
                                <div className="space-y-2">
                                  {value.map((item, index) => {
                                    if (typeof item === 'object') {
                                      return (
                                        <div key={index} className="bg-white/60 rounded-lg p-3 border border-gray-300">
                                          <div className="text-xs font-medium text-gray-600 mb-1">Entry {index + 1}</div>
                                          {Object.entries(item).map(([k, v]) => (
                                            <div key={k} className="text-xs text-gray-700">
                                              <span className="font-medium">{k.replace(/_/g, ' ')}:</span> {v}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return <div key={index} className="text-sm">{item}</div>;
                                  })}
                                </div>
                              );
                            } else {
                              displayValue = JSON.stringify(value);
                            }
                          }
                          
                          // Format dates
                          if (key.includes('date') && typeof displayValue === 'string' && displayValue.includes('-')) {
                            const date = new Date(displayValue);
                            if (!isNaN(date.getTime())) {
                              displayValue = formatDate(displayValue);
                            }
                          }
                          
                          const isLongContent = typeof displayValue === 'string' && displayValue.length > 50;
                          
                          return (
                            <div key={key} className={`bg-white/60 rounded-lg p-4 border border-gray-300 ${isLongContent ? 'md:col-span-2' : ''}`}>
                              <div className="flex items-center space-x-2 mb-2">
                                <CalendarIcon className="h-4 w-4 text-indigo-600" />
                                <span className="text-sm font-bold text-gray-800">{displayKey}</span>
                              </div>
                              <div className="text-sm text-gray-700 leading-relaxed">
                                {typeof displayValue === 'object' ? displayValue : String(displayValue)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                {faculty?.role === 'admin' && selectedApp.status === 'Pending' && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <SparklesIcon className="h-5 w-5 text-indigo-600" />
                        <span>Administrative Actions</span>
                      </h4>
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => {
                            const reason = prompt('Enter approval reason (optional):');
                            handleReview(selectedApp.id, 'Approved', reason || '');
                            setShowDetailsModal(false);
                            setSelectedApp(null);
                          }}
                          className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                          <span>Approve Application</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Enter rejection reason (required):');
                            if (reason?.trim()) {
                              handleReview(selectedApp.id, 'Rejected', reason);
                              setShowDetailsModal(false);
                              setSelectedApp(null);
                            } else {
                              toast.error('Rejection reason is required');
                            }
                          }}
                          className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-lg"
                        >
                          <XCircleIcon className="h-5 w-5" />
                          <span>Reject Application</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default LeaveApplicationsList;