import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { leaveAPI } from '../api/api';
import toast from 'react-hot-toast';

const LeaveManagement = () => {
  const { faculty } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allLeaves, setAllLeaves] = useState([]);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [proofFile, setProofFile] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = faculty?.role === 'admin' 
        ? await leaveAPI.getAllLeaves()
        : await leaveAPI.getMyLeaves();
      setLeaves(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const response = await leaveAPI.getAllLeaves();
      setAllLeaves(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch all leave requests');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('leaveType', formData.leaveType);
    formDataToSend.append('startDate', formData.startDate);
    formDataToSend.append('endDate', formData.endDate);
    formDataToSend.append('reason', formData.reason);
    
    if (proofFile) {
      formDataToSend.append('proofFile', proofFile);
    }
    
    try {
      await leaveAPI.applyLeave(formDataToSend);
      toast.success('Leave request submitted successfully');
      setShowForm(false);
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: ''
      });
      setProofFile(null);
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
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

  const handleReviewLeave = async (leaveId, status) => {
    try {
      const data = { status };
      if (status === 'Rejected' && rejectionReason) {
        data.rejectionReason = rejectionReason;
      }
      
      await leaveAPI.reviewLeave(leaveId, data);
      toast.success(`Leave request ${status.toLowerCase()} successfully`);
      setSelectedLeave(null);
      setRejectionReason('');
      fetchLeaves();
      if (showAdminPanel) {
        fetchAllLeaves();
      }
    } catch (error) {
      toast.error('Failed to review leave request');
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
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Apply Leave</span>
              </button>
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
                  <p className="text-2xl font-bold text-gray-900">{leaves.length}</p>
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
                    {leaves.filter(leave => leave.status === 'Pending').length}
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
                    {leaves.filter(leave => leave.status === 'Approved').length}
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
                    {leaves.filter(leave => leave.status === 'Rejected').length}
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
                  <p className="text-2xl font-bold text-gray-900">{leaves.length}</p>
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
                    {leaves.filter(leave => {
                      const createdDate = new Date(leave.createdAt);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return createdDate >= thirtyDaysAgo;
                    }).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Application Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Apply for Leave</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select leave type</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Paternity Leave">Paternity Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof Document (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  rows="4"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide a detailed reason for your leave request..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Admin Panel */}
        {showAdminPanel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Admin Panel - All Leave Requests</h2>
            <div className="space-y-4">
              {allLeaves.map((leave) => (
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
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
                            onClick={() => handleReviewLeave(leave.id, 'Approved')}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setSelectedLeave(leave)}
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

        {/* Rejection Modal */}
        {selectedLeave && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Leave Request</h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedLeave.leaveType} - {selectedLeave.firstName} {selectedLeave.lastName}
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      toast.error('Please provide a rejection reason');
                      return;
                    }
                    handleReviewLeave(selectedLeave.id, 'Rejected');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Details Modal */}
        {selectedLeaveDetails && showDetailsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Leave Request Details</h3>
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
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Leave Information</h4>
                  <p className="text-sm text-gray-600">Type: {selectedLeaveDetails.leaveType}</p>
                  <p className="text-sm text-gray-600">
                    Duration: {new Date(selectedLeaveDetails.startDate).toLocaleDateString()} - {new Date(selectedLeaveDetails.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">Reason: {selectedLeaveDetails.reason}</p>
                </div>
                
                {faculty?.role === 'admin' && (
                  <div>
                    <h4 className="font-medium text-gray-900">Faculty Information</h4>
                    <p className="text-sm text-gray-600">Name: {selectedLeaveDetails.firstName} {selectedLeaveDetails.lastName}</p>
                    <p className="text-sm text-gray-600">Employee ID: {selectedLeaveDetails.employeeId}</p>
                    <p className="text-sm text-gray-600">Department: {selectedLeaveDetails.department}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900">Status Information</h4>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedLeaveDetails.status)}`}>
                      {selectedLeaveDetails.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">Applied: {new Date(selectedLeaveDetails.createdAt).toLocaleString()}</p>
                  {selectedLeaveDetails.approvedAt && (
                    <p className="text-sm text-gray-600">Reviewed: {new Date(selectedLeaveDetails.approvedAt).toLocaleString()}</p>
                  )}
                  {selectedLeaveDetails.approvedByFirstName && (
                    <p className="text-sm text-gray-600">
                      Reviewed by: {selectedLeaveDetails.approvedByFirstName} {selectedLeaveDetails.approvedByLastName}
                    </p>
                  )}
                </div>
                
                {selectedLeaveDetails.rejectionReason && (
                  <div>
                    <h4 className="font-medium text-gray-900">Admin Note</h4>
                    <p className="text-sm text-red-600">{selectedLeaveDetails.rejectionReason}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Proof Document</h4>
                  <div className="border border-gray-200 rounded-lg p-4">
                    {selectedLeaveDetails.proofFile ? (
                      <>
                        <p className="text-sm text-gray-600 mb-2">File: {selectedLeaveDetails.proofFileName || 'Proof Document'}</p>
                        <a
                          href={`http://localhost:5000${selectedLeaveDetails.proofFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <DocumentIcon className="h-4 w-4 mr-1" />
                          View Document
                        </a>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No proof document attached</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Requests List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{faculty?.role === 'admin' ? 'Leave Requests' : 'My Leave Requests'}</h2>
          
          {leaves.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaves.map((leave) => (
                <div
                  key={leave.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {faculty?.role === 'admin' && getStatusIcon(leave.status)}
                      <div>
                        <h3 className="font-medium text-gray-900">{leave.leaveType}</h3>
                        {faculty?.role === 'admin' && (
                          <p className="text-sm text-gray-600">
                            {leave.firstName} {leave.lastName} ({leave.employeeId})
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{leave.reason}</p>
                        <div className="mt-2">
                          {leave.proofFile ? (
                            <a
                              href={`http://localhost:5000${leave.proofFile}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                            >
                              <DocumentIcon className="h-4 w-4 mr-1" />
                              View Proof Document
                            </a>
                          ) : (
                            <span className="inline-flex items-center text-sm text-gray-500">
                              <DocumentIcon className="h-4 w-4 mr-1" />
                              No proof document attached
                            </span>
                          )}
                        </div>
                        {leave.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">
                            <strong>Admin Note:</strong> {leave.rejectionReason}
                          </p>
                        )}
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              setSelectedLeaveDetails(leave);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {faculty?.role === 'admin' && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(leave.createdAt).toLocaleDateString()}
                      </span>
                      {leave.status === 'Pending' && (
                        <>
                          {faculty?.role === 'admin' ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleReviewLeave(leave.id, 'Approved')}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setSelectedLeave(leave)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteLeave(leave.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LeaveManagement; 