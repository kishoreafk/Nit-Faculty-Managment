import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import DynamicLeaveForm from '../components/DynamicLeaveForm';
import LeaveApplicationsList from '../components/LeaveApplicationsList';

import EnhancedLeaveCalculator from '../components/EnhancedLeaveCalculator';
import EnhancedLeaveApplicationForm from '../components/EnhancedLeaveApplicationForm';
import { 
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { leaveAPI, leaveFormAPI } from '../api/api';
import toast from 'react-hot-toast';

const LeaveManagement = () => {
  const { faculty } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allLeaves, setAllLeaves] = useState([]);

  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonData, setReasonData] = useState({ leaveId: null, status: null, reason: '' });

  // Add state for real-time statistics
  const [leaveStats, setLeaveStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);


  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    // Listen for refresh events
    const handleRefresh = () => {
      fetchLeaves();
      if (showAdminPanel) {
        fetchAllLeaves();
      }
    };
    
    window.addEventListener('refreshLeaveStats', handleRefresh);
    
    // Set up periodic refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchLeaves();
      if (showAdminPanel) {
        fetchAllLeaves();
      }
    }, 30000);
    
    return () => {
      window.removeEventListener('refreshLeaveStats', handleRefresh);
      clearInterval(interval);
    };
  }, [showAdminPanel]);

  const updateLeaveStats = (leavesData) => {
    const stats = {
      total: leavesData.length,
      pending: leavesData.filter(leave => leave.status === 'Pending').length,
      approved: leavesData.filter(leave => leave.status === 'Approved').length,
      rejected: leavesData.filter(leave => leave.status === 'Rejected').length
    };
    setLeaveStats(stats);
  };

  const fetchLeaves = async () => {
    try {
      setStatsLoading(true);
      const response = faculty?.role === 'admin' 
        ? await leaveFormAPI.getAllApplications()
        : await leaveFormAPI.getMyApplications();
      
      // Extract applications from the response
      const leavesData = Array.isArray(response?.data?.applications) ? response.data.applications : [];
      console.log('📊 Fetched leave applications:', leavesData);
      
      setLeaves(leavesData);
      updateLeaveStats(leavesData);
    } catch (error) {
      console.error('Failed to fetch leave applications:', error);
      toast.error('Failed to fetch leave requests');
      setLeaves([]);
      updateLeaveStats([]);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const response = await leaveFormAPI.getAllApplications();
      const allLeavesData = Array.isArray(response?.data?.applications) ? response.data.applications : [];
      setAllLeaves(allLeavesData);
    } catch {
      toast.error('Failed to fetch all leave requests');
      setAllLeaves([]);
    }
  };







  const handleDeleteLeave = async (leaveId) => {
    if (window.confirm('Are you sure you want to delete this leave request?')) {
      try {
        await leaveAPI.deleteLeaveRequest(leaveId);
        toast.success('Leave request deleted successfully');
        fetchLeaves();
      } catch (error) {
        console.error('Error deleting leave request:', error);
        toast.error('Failed to delete leave request');
      }
    }
  };

  const handleReviewLeave = async (leaveId, status, reason = '') => {
    try {
      await leaveAPI.reviewLeave(leaveId, status, reason);
      toast.success(`Leave request ${status.toLowerCase()} successfully`);
      setSelectedLeave(null);
      setRejectionReason('');
      setShowReasonModal(false);
      setReasonData({ leaveId: null, status: null, reason: '' });
      
      // Update the leaves state immediately for real-time count updates
      const updatedLeaves = leaves.map(leave => 
        leave.id === leaveId 
          ? { ...leave, status, rejectionReason: reason, approvedAt: new Date().toISOString() }
          : leave
      );
      setLeaves(updatedLeaves);
      updateLeaveStats(updatedLeaves);
      
      // Force refresh of all data
      await fetchLeaves();
      if (showAdminPanel) {
        await fetchAllLeaves();
      }
      
      // Trigger refresh of both admin dashboard and leave management stats
      window.dispatchEvent(new CustomEvent('refreshAdminStats'));
      window.dispatchEvent(new CustomEvent('refreshLeaveStats'));
    } catch {
      toast.error('Error updating application');
    }
  };

  const openReasonModal = (leaveId, status) => {
    setReasonData({ leaveId, status, reason: '' });
    setShowReasonModal(true);
  };

  const submitReasonAndReview = () => {
    if (reasonData.status === 'Rejected' && !reasonData.reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    handleReviewLeave(reasonData.leaveId, reasonData.status, reasonData.reason);
  };

  const handleConfigurableFormSubmit = async (formData) => {
    try {
      // Submit the leave application using the existing API
      const response = await leaveFormAPI.submitApplication(formData);
      
      if (response.data.success) {
        // Refresh the leave applications list
        await fetchLeaves();
        
        // Trigger refresh events
        window.dispatchEvent(new CustomEvent('refreshAdminStats'));
        window.dispatchEvent(new CustomEvent('refreshLeaveStats'));
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting configurable form:', error);
      throw error;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'Rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'Pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600">{faculty?.role === 'admin' ? 'Manage faculty leave requests' : 'Manage your leave requests and applications'}</p>
          </div>
          <div className="flex space-x-3">
            {faculty?.role !== 'admin' && (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Apply Leave</span>
                </button>
              </>
            )}

            {(faculty?.designation === 'HOD' || faculty?.designation === 'Admin' || faculty?.role === 'admin') && (
              <button
                onClick={() => {
                  setShowAdminPanel(!showAdminPanel);
                  if (!showAdminPanel) {
                    fetchAllLeaves();
                  }
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                {showAdminPanel ? 'Hide Admin Panel' : 'Admin Panel'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {faculty?.role === 'admin' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                    ) : (
                      leaveStats.total
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                    ) : (
                      leaveStats.pending
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                    ) : (
                      leaveStats.approved
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500">
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                    ) : (
                      leaveStats.rejected
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-500">
                  <XCircleIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                    ) : (
                      leaveStats.total
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.isArray(leaves) ? leaves.filter(leave => {
                      const createdDate = new Date(leave.created_at || leave.createdAt);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return createdDate >= thirtyDaysAgo;
                    }).length : 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Leave Application Form */}
        {showForm && (
          <EnhancedLeaveApplicationForm 
            onClose={() => setShowForm(false)}
            onSubmit={handleConfigurableFormSubmit}
          />
        )}

        {/* Faculty Leave Requests List - Hidden */}
        {false && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">My Leave Requests</h2>
            <div className="space-y-4">
              {Array.isArray(leaves) && leaves.length > 0 ? leaves.map((leave) => (
                <div key={leave.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(leave.status)}
                        <div>
                          <h3 className="font-medium text-gray-900">{leave.leaveType}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{leave.reason}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Applied: {new Date(leave.createdAt).toLocaleDateString()}</span>
                        {leave.approvedAt && (
                          <span>Reviewed: {new Date(leave.approvedAt).toLocaleDateString()}</span>
                        )}
                        {leave.proofFile && (
                          <a
                            href={`http://localhost:5000${leave.proofFile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Proof
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedLeaveDetails(leave);
                          setShowDetailsModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
                      >
                        View Details
                      </button>
                      {leave.status === 'Pending' && (
                        <button
                          onClick={() => handleDeleteLeave(leave.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {leave.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Rejection Reason:</span> {leave.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No leave requests found</p>
                </div>
              )}
            </div>
          </div>
        )}



        {/* New Leave Applications List */}
        <LeaveApplicationsList />

        {/* Admin Panel */}
        {showAdminPanel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Admin Panel - All Leave Requests</h2>
            <div className="space-y-4">
              {Array.isArray(allLeaves) && allLeaves.map((leave) => (
                <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(leave.status)}
                        <div>
                          <h3 className="font-medium text-gray-900">{leave.leaveType}</h3>
                          <p className="text-sm text-gray-600">
                            {leave.firstName} {leave.lastName} ({leave.employeeId})
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                          <div className="mt-2 flex items-center space-x-4">
                            {leave.proofFile ? (
                              <a
                                href={`http://localhost:5000${leave.proofFile}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                              >
                                <DocumentIcon className="h-4 w-4 mr-1" />
                                View Proof
                              </a>
                            ) : (
                              <span className="inline-flex items-center text-sm text-gray-500">
                                <DocumentIcon className="h-4 w-4 mr-1" />
                                No proof attached
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setSelectedLeaveDetails(leave);
                                setShowDetailsModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                      {leave.status === 'Pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openReasonModal(leave.id, 'Approved')}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReasonModal(leave.id, 'Rejected')}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reason Modal */}
        {showReasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {reasonData.status === 'Approved' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason {reasonData.status === 'Approved' ? '(Optional)' : '(Required)'}
                  </label>
                  <textarea
                    value={reasonData.reason}
                    onChange={(e) => setReasonData({...reasonData, reason: e.target.value})}
                    placeholder={`Enter reason for ${reasonData.status === 'Approved' ? 'approval' : 'rejection'}...`}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={reasonData.status === 'Rejected'}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowReasonModal(false);
                      setReasonData({ leaveId: null, status: null, reason: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReasonAndReview}
                    disabled={reasonData.status === 'Rejected' && !reasonData.reason.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {reasonData.status === 'Approved' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Leave Details Modal */}
        {selectedLeaveDetails && showDetailsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Complete Leave Request Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLeaveDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Leave Information */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Leave Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-blue-800">Type:</span>
                        <span className="text-sm text-blue-700">{selectedLeaveDetails.leaveType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-blue-800">Start Date:</span>
                        <span className="text-sm text-blue-700">{new Date(selectedLeaveDetails.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-blue-800">End Date:</span>
                        <span className="text-sm text-blue-700">{new Date(selectedLeaveDetails.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-blue-800">Duration:</span>
                        <span className="text-sm text-blue-700">
                          {Math.ceil((new Date(selectedLeaveDetails.endDate) - new Date(selectedLeaveDetails.startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Faculty Information */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3">Faculty Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-green-800">Name:</span>
                        <span className="text-sm text-green-700">{selectedLeaveDetails.firstName} {selectedLeaveDetails.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-green-800">Employee ID:</span>
                        <span className="text-sm text-green-700">{selectedLeaveDetails.employeeId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-green-800">Department:</span>
                        <span className="text-sm text-green-700">{selectedLeaveDetails.department}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {(selectedLeaveDetails.alternativeArrangement || selectedLeaveDetails.contactDuringLeave) && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-3">Additional Information</h4>
                      <div className="space-y-2">
                        {selectedLeaveDetails.alternativeArrangement && (
                          <div>
                            <span className="text-sm font-medium text-purple-800 block">Alternative Arrangement:</span>
                            <span className="text-sm text-purple-700">{selectedLeaveDetails.alternativeArrangement}</span>
                          </div>
                        )}
                        {selectedLeaveDetails.contactDuringLeave && (
                          <div>
                            <span className="text-sm font-medium text-purple-800 block">Contact During Leave:</span>
                            <span className="text-sm text-purple-700">{selectedLeaveDetails.contactDuringLeave}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Status Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      {getStatusIcon(selectedLeaveDetails.status)}
                      <span className="ml-2">Status Information</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-800">Current Status:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLeaveDetails.status)}`}>
                          {selectedLeaveDetails.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-800">Applied On:</span>
                        <span className="text-sm text-gray-700">{new Date(selectedLeaveDetails.createdAt).toLocaleDateString()}</span>
                      </div>
                      {selectedLeaveDetails.approvedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-800">Reviewed On:</span>
                          <span className="text-sm text-gray-700">{new Date(selectedLeaveDetails.approvedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedLeaveDetails.approvedByFirstName && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-800">Reviewed By:</span>
                          <span className="text-sm text-gray-700">{selectedLeaveDetails.approvedByFirstName} {selectedLeaveDetails.approvedByLastName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-3">Reason for Leave</h4>
                    <p className="text-sm text-yellow-800 leading-relaxed">{selectedLeaveDetails.reason}</p>
                  </div>

                  {/* Admin Notes */}
                  {selectedLeaveDetails.rejectionReason && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-3">Admin Note</h4>
                      <p className="text-sm text-red-800 leading-relaxed">{selectedLeaveDetails.rejectionReason}</p>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
                      <DocumentIcon className="h-5 w-5 mr-2" />
                      Attached Documents
                    </h4>
                    {selectedLeaveDetails.proofFile ? (
                      <div className="space-y-2">
                        <p className="text-sm text-indigo-800">Proof Document: {selectedLeaveDetails.proofFileName || 'Document'}</p>
                        <a
                          href={`http://localhost:5000${selectedLeaveDetails.proofFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <DocumentIcon className="h-4 w-4 mr-1" />
                          View Document
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-indigo-700">No documents attached</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Admin */}
              {(faculty?.designation === 'HOD' || faculty?.designation === 'Admin' || faculty?.role === 'admin') && selectedLeaveDetails.status === 'Pending' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        openReasonModal(selectedLeaveDetails.id, 'Approved');
                        setShowDetailsModal(false);
                        setSelectedLeaveDetails(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve Leave
                    </button>
                    <button
                      onClick={() => {
                        openReasonModal(selectedLeaveDetails.id, 'Rejected');
                        setShowDetailsModal(false);
                        setSelectedLeaveDetails(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject Leave
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


      </div>
    </Layout>
  );
};

export default LeaveManagement; 