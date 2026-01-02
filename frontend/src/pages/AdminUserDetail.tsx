import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

export default function AdminUserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [forceReset, setForceReset] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      await api.put(`/admin/users/${id}/credentials`, {
        password,
        forceReset,
        reason: 'Password reset by admin'
      });
      alert('Password updated successfully');
      setShowPasswordModal(false);
      setPassword('');
    } catch (error) {
      alert('Failed to update password');
    }
  };

  const handlePromote = async () => {
    if (!selectedRole) return;
    try {
      await api.post(`/admin/users/${id}/promote`, { role: selectedRole });
      alert('User role updated');
      setShowRoleModal(false);
      setSelectedRole('');
      fetchUser();
    } catch (error) {
      alert('Failed to update role');
    }
  };

  const handleForceLogout = async () => {
    if (!confirm('Force logout this user?')) return;
    try {
      await api.post(`/admin/users/${id}/force-logout`);
      alert('User logged out successfully');
    } catch (error) {
      alert('Failed to logout user');
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirm('⚠️ PERMANENT DELETE: This will completely remove the user and ALL related data from the database. This action CANNOT be undone. Are you absolutely sure?')) return;
    const reason = prompt('Reason for permanent deletion:');
    try {
      await api.delete(`/admin/users/${id}/permanent`, { data: { reason } });
      alert('User permanently deleted from database');
      window.location.href = '/admin/users';
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to permanently delete user');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">User not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
        <p className="text-gray-600">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Employee ID</label>
                <p className="font-medium">{user.employee_id}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Role</label>
                <p className="font-medium">{user.role_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Department</label>
                <p className="font-medium">{user.department}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Designation</label>
                <p className="font-medium">{user.designation}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Faculty Type</label>
                <p className="font-medium">{user.faculty_type_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Joining Date</label>
                <p className="font-medium">{user.doj}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Leave Balances</h2>
            <div className="space-y-3">
              {user.leave_balances?.map((balance: any) => (
                <div key={balance.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{balance.name}</p>
                    <p className="text-sm text-gray-600">{balance.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">
                      {balance.balance - balance.reserved}
                    </p>
                    <p className="text-xs text-gray-500">
                      Total: {balance.balance} | Reserved: {balance.reserved}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Pending Items</h2>
            
            {user.pending_leave?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Leave Applications</h3>
                {user.pending_leave.map((leave: any) => (
                  <div key={leave.id} className="p-3 bg-yellow-50 rounded mb-2">
                    <p className="font-medium">{leave.leave_type}</p>
                    <p className="text-sm text-gray-600">
                      {leave.start_date} to {leave.end_date} ({leave.total_days} days)
                    </p>
                  </div>
                ))}
              </div>
            )}

            {user.pending_products?.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Product Requests</h3>
                {user.pending_products.map((product: any) => (
                  <div key={product.id} className="p-3 bg-yellow-50 rounded mb-2">
                    <p className="font-medium">{product.item_name}</p>
                    <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
                  </div>
                ))}
              </div>
            )}

            {!user.pending_leave?.length && !user.pending_products?.length && (
              <p className="text-gray-500">No pending items</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Change Password
              </button>
              <button
                onClick={() => setShowRoleModal(true)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Change Role
              </button>
              <button
                onClick={handleForceLogout}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Force Logout
              </button>
              <button
                onClick={handlePermanentDelete}
                className="w-full px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                ⚠️ Permanent Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-semibold mb-4">Change Password</h3>
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded mb-4"
            />
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={forceReset}
                onChange={(e) => setForceReset(e.target.checked)}
                className="mr-2"
              />
              Force password reset on next login
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleChangePassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
              >
                Update
              </button>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-semibold mb-4">Change User Role</h3>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-2 border rounded mb-4"
            >
              <option value="">Select Role</option>
              <option value="FACULTY">Faculty</option>
              <option value="HOD">HOD</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handlePromote}
                disabled={!selectedRole}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Role
              </button>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
