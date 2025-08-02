import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  CubeIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { productAPI } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const ProductRequest = () => {
  const { faculty } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    priority: 'medium',
    reason: '',
  });
  const [productImage, setProductImage] = useState(null);
  const [billImage, setBillImage] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = faculty?.role === 'admin' 
        ? await productAPI.getAllProductRequests()
        : await productAPI.getMyProductRequests();
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching product requests:', error);
      toast.error('Failed to fetch product requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('product_name', formData.productName);
      formDataToSend.append('purchase_date', new Date().toISOString().split('T')[0]);
      
      if (productImage) {
        formDataToSend.append('productImage', productImage);
      }
      if (billImage) {
        formDataToSend.append('billImage', billImage);
      }
      
      await productAPI.applyProductRequest(formDataToSend);
      toast.success('Product request submitted successfully');
      setShowForm(false);
      setFormData({ productName: '', quantity: '', priority: 'medium', reason: '' });
      setProductImage(null);
      setBillImage(null);
      fetchRequests();
    } catch (error) {
      console.error('Error applying product request:', error);
      toast.error('Failed to submit product request');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDelete = async (requestId) => {
    if (window.confirm('Are you sure you want to delete this product request?')) {
      try {
        await productAPI.deleteProductRequest(requestId);
        toast.success('Product request deleted successfully');
        fetchRequests();
      } catch (error) {
        console.error('Error deleting product request:', error);
        toast.error('Failed to delete product request');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner message="Loading product requests..." />
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
            <h1 className="text-3xl font-bold text-gray-900">Product Requests</h1>
            <p className="text-gray-600">{faculty?.role === 'admin' ? 'Manage product requests' : 'Manage your product requests'}</p>
          </div>
          {faculty?.role !== 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Request
            </button>
          )}
        </div>

        {/* Product Request Form - Only for Faculty */}
        {showForm && faculty?.role !== 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">New Product Request</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    min="1"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide a reason for your request"
                />
              </div>
              
              {/* File Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Image (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setProductImage(e.target.files[0])}
                    accept="image/*,.pdf"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {productImage && (
                    <p className="text-sm text-gray-600 mt-1">{productImage.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bill/Receipt Image (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setBillImage(e.target.files[0])}
                    accept="image/*,.pdf"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {billImage && (
                    <p className="text-sm text-gray-600 mt-1">{billImage.name}</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Product Requests List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{faculty?.role === 'admin' ? 'Product Requests' : 'My Product Requests'}</h2>
          </div>
          <div className="p-6">
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No product requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{request.productName}</h3>
                        {faculty?.role === 'admin' && (
                          <p className="text-sm text-gray-600 font-medium">
                            Requested by: {request.faculty_name} ({request.employeeId})
                          </p>
                        )}
                        <p className="text-sm text-gray-600">{request.description || request.reason}</p>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                          <span>Quantity: {request.quantity}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(request.priority)}`}>
                            {request.priority} priority
                          </span>
                        </div>
                        <div className="flex items-center mt-2 space-x-4 text-sm">
                          {request.product_image_url ? (
                            <a 
                              href={`http://localhost:5000${request.product_image_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Product Image
                            </a>
                          ) : (
                            <span className="text-gray-500">No product image</span>
                          )}
                          {request.bill_image_url ? (
                            <a 
                              href={`http://localhost:5000${request.bill_image_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Bill/Receipt
                            </a>
                          ) : (
                            <span className="text-gray-500">No bill/receipt</span>
                          )}
                        </div>
                        {request.decision_note && (
                          <p className="text-sm text-red-600 mt-1">
                            <strong>Admin Note:</strong> {request.decision_note}
                          </p>
                        )}
                        <div className="flex items-center mt-2 space-x-4 text-sm">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details
                          </button>
                        </div>
                        {faculty?.role === 'admin' && (request.status === 'Pending' || request.status === 'pending') && (
                          <div className="flex space-x-2 mt-2">
                            <button
                              onClick={async () => {
                                try {
                                  await productAPI.reviewProductRequest(request.id, { status: 'Approved' });
                                  toast.success('Product request approved');
                                  fetchRequests();
                                } catch (error) {
                                  console.error('Approve error:', error);
                                  toast.error('Failed to approve request');
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setRejectionReason('');
                              }}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {faculty?.role === 'admin' && (
                          <>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                            {(request.status === 'Approved' || request.status === 'approved') && <CheckCircleIcon className="w-4 h-4 text-green-600" />}
                            {(request.status === 'Rejected' || request.status === 'rejected') && <XCircleIcon className="w-4 h-4 text-red-600" />}
                            {(request.status === 'Pending' || request.status === 'pending') && <ClockIcon className="w-4 h-4 text-yellow-600" />}
                          </>
                        )}
                        {faculty?.role !== 'admin' && (request.status === 'Pending' || request.status === 'pending') && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rejection Modal */}
        {selectedRequest && !showDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Product Request</h3>
              <p className="text-sm text-gray-600 mb-4">Product: {selectedRequest.productName}</p>
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
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!rejectionReason.trim()) {
                      toast.error('Please provide a rejection reason');
                      return;
                    }
                    try {
                      await productAPI.reviewProductRequest(selectedRequest.id, { 
                        status: 'Rejected', 
                        decision_note: rejectionReason 
                      });
                      toast.success('Product request rejected');
                      setSelectedRequest(null);
                      fetchRequests();
                    } catch (error) {
                      console.error('Reject error:', error);
                      toast.error('Failed to reject request');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedRequest && showDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Product Request Details</h3>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Product Information</h4>
                  <p className="text-sm text-gray-600">Name: {selectedRequest.productName}</p>
                  <p className="text-sm text-gray-600">Description: {selectedRequest.description || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Priority: {selectedRequest.priority}</p>
                </div>
                
                {faculty?.role === 'admin' && (
                  <div>
                    <h4 className="font-medium text-gray-900">Faculty Information</h4>
                    <p className="text-sm text-gray-600">Name: {selectedRequest.faculty_name}</p>
                    <p className="text-sm text-gray-600">Employee ID: {selectedRequest.employeeId}</p>
                    <p className="text-sm text-gray-600">Department: {selectedRequest.department}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900">Status Information</h4>
                  <p className="text-sm text-gray-600">Status: <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedRequest.status)}`}>{selectedRequest.status}</span></p>
                  <p className="text-sm text-gray-600">Requested: {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  {selectedRequest.approvedAt && (
                    <p className="text-sm text-gray-600">Reviewed: {new Date(selectedRequest.approvedAt).toLocaleString()}</p>
                  )}
                  {selectedRequest.reviewer_name && (
                    <p className="text-sm text-gray-600">Reviewed by: {selectedRequest.reviewer_name}</p>
                  )}
                </div>
                
                {selectedRequest.decision_note && (
                  <div>
                    <h4 className="font-medium text-gray-900">Admin Note</h4>
                    <p className="text-sm text-red-600">{selectedRequest.decision_note}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Attached Files</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Product Image</p>
                      {selectedRequest.product_image_url ? (
                        <a 
                          href={`http://localhost:5000${selectedRequest.product_image_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={`http://localhost:5000${selectedRequest.product_image_url}`}
                            alt="Product"
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                          <span className="text-gray-500 text-sm">No product image attached</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Bill/Receipt</p>
                      {selectedRequest.bill_image_url ? (
                        <a 
                          href={`http://localhost:5000${selectedRequest.bill_image_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={`http://localhost:5000${selectedRequest.bill_image_url}`}
                            alt="Bill"
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                          <span className="text-gray-500 text-sm">No bill/receipt attached</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductRequest; 