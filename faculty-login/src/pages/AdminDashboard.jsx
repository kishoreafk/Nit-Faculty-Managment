import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { adminAPI } from '../api/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { faculty } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    department: '',
    employeeId: '',
    designation: '',
    role: 'faculty'
  });

  useEffect(() => {
    if (faculty?.role === 'admin') {
      fetchUsers();
    }
  }, [faculty]);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId, approved) => {
    try {
      await adminAPI.approveUser(userId, approved);
      toast.success(`User ${approved ? 'approved' : 'declined'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.addUser(newUser);
      toast.success('User added successfully');
      setShowAddUser(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        department: '',
        employeeId: '',
        designation: '',
        role: 'faculty'
      });
      fetchUsers();
    } catch (error) {
      toast.error('Failed to add user');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      try {
        await adminAPI.removeUser(userId);
        toast.success('User removed successfully');
        fetchUsers();
      } catch (error) {
        toast.error('Failed to remove user');
      }
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password:');
    if (newPassword) {
      try {
        await adminAPI.resetPassword(userId, newPassword);
        toast.success('Password reset successfully');
      } catch (error) {
        toast.error('Failed to reset password');
      }
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await adminAPI.getUserDetails(userId);
      setUserDetails(response.data);
      setShowUserDetails(true);
    } catch (error) {
      toast.error('Failed to fetch user details');
    }
  };

  if (faculty?.role !== 'admin') {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600">Admin access required</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users and system settings</p>
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <UsersIcon className="w-5 h-5 mr-2" />
              Users Management
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewUser(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {!user.is_approved && (
                        <>
                          <button
                            onClick={() => handleApproveUser(user.id, true)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleApproveUser(user.id, false)}
                            className="text-red-600 hover:text-red-900"
                            title="Decline"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Reset Password"
                      >
                        <KeyIcon className="w-4 h-4" />
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Remove User"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New User</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Department"
                    value={newUser.department}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Employee ID"
                    value={newUser.employeeId}
                    onChange={(e) => setNewUser({...newUser, employeeId: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Designation"
                  value={newUser.designation}
                  onChange={(e) => setNewUser({...newUser, designation: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetails && userDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {userDetails.user.firstName} {userDetails.user.lastName} - Details
                </h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Leave Requests</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userDetails.leaves.map((leave) => (
                      <div key={leave.id} className="p-2 border rounded text-sm">
                        <div className="font-medium">{leave.leaveType}</div>
                        <div className="text-gray-600">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                        <div className={`text-xs ${leave.status === 'Approved' ? 'text-green-600' : leave.status === 'Rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {leave.status}
                        </div>
                        {leave.proofFile && (
                          <a href={`http://localhost:5000${leave.proofFile}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">
                            View Proof
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Product Requests</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userDetails.products.map((product) => (
                      <div key={product.id} className="p-2 border rounded text-sm">
                        <div className="font-medium">{product.productName}</div>
                        <div className="text-gray-600">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </div>
                        <div className={`text-xs ${(product.status === 'Approved' || product.status === 'approved') ? 'text-green-600' : (product.status === 'Rejected' || product.status === 'rejected') ? 'text-red-600' : 'text-yellow-600'}`}>
                          {product.status}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Priority: {product.priority} | Quantity: {product.quantity}
                        </div>
                        {product.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            Description: {product.description}
                          </div>
                        )}
                        {product.decision_note && (
                          <div className="text-xs text-red-600 mt-1">
                            Note: {product.decision_note}
                          </div>
                        )}
                        <div className="flex space-x-2 mt-1">
                          {product.product_image_url && (
                            <a href={`http://localhost:5000${product.product_image_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">
                              Product Image
                            </a>
                          )}
                          {product.bill_image_url && (
                            <a href={`http://localhost:5000${product.bill_image_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">
                              Bill/Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
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

export default AdminDashboard;