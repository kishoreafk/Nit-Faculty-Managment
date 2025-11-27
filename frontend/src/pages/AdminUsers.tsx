import { useState, useEffect } from 'react';
import api from '../utils/api';

interface User {
  id: number;
  name: string;
  email: string;
  employee_id: string;
  role_name: string;
  department: string;
  designation: string;
  pending_leave_count: number;
  pending_product_count: number;
  deleted: boolean;
  active: boolean;
  approved: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [page, status, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { query, status, role, page, pageSize: 25 }
      });
      setUsers(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const reason = prompt('Reason for deletion:');
    try {
      await api.delete(`/admin/users/${id}`, { data: { reason } });
      fetchUsers();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/admin/users/${id}/restore`);
      fetchUsers();
    } catch (error) {
      alert('Failed to restore user');
    }
  };

  const handleForceLogout = async (id: number) => {
    if (!confirm('Force logout this user?')) return;
    try {
      await api.post(`/admin/users/${id}/force-logout`);
      alert('User logged out successfully');
    } catch (error) {
      alert('Failed to logout user');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!confirm(`Delete ${selectedUsers.length} users?`)) return;
    const reason = prompt('Reason for bulk deletion:');
    try {
      await api.post('/admin/users/bulk-delete', { ids: selectedUsers, reason });
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      alert('Failed to delete users');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm('⚠️ PERMANENT DELETE: This will completely remove the user and ALL related data from the database. This action CANNOT be undone. Are you absolutely sure?')) return;
    const reason = prompt('Reason for permanent deletion:');
    try {
      await api.delete(`/admin/users/${id}/permanent`, { data: { reason } });
      alert('User permanently deleted from database');
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to permanently delete user');
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!confirm(`⚠️ PERMANENT DELETE: This will completely remove ${selectedUsers.length} users and ALL their related data from the database. This action CANNOT be undone. Are you absolutely sure?`)) return;
    const reason = prompt('Reason for bulk permanent deletion:');
    try {
      await api.post('/admin/users/bulk-permanent-delete', { ids: selectedUsers, reason });
      alert('Users permanently deleted from database');
      setSelectedUsers([]);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to permanently delete users');
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this user registration?')) return;
    try {
      await api.post(`/admin/users/${id}/approve`);
      alert('User approved successfully');
      fetchUsers();
      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to approve user');
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Reject this user registration? This will permanently remove the user.')) return;
    const reason = prompt('Reason for rejection:');
    try {
      await api.post(`/admin/users/${id}/reject`, { reason });
      alert('User registration rejected');
      fetchUsers();
      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reject user');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.length === 0) return;
    if (!confirm(`Approve ${selectedUsers.length} user registrations?`)) return;
    try {
      await api.post('/admin/users/bulk-approve', { ids: selectedUsers });
      alert('Users approved successfully');
      setSelectedUsers([]);
      fetchUsers();
      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to approve users');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
          <button
            onClick={() => window.location.href = '/admin/users/create'}
            className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm sm:text-base whitespace-nowrap"
          >
            + Create User
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or employee ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 border rounded text-sm sm:text-base"
          />
          <button onClick={handleSearch} className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded text-sm sm:text-base whitespace-nowrap">
            Search
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 sm:px-4 py-2 border rounded text-sm sm:text-base">
            <option value="active">Active</option>
            <option value="deleted">Deleted</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
          </select>

          <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 sm:px-4 py-2 border rounded text-sm sm:text-base">
            <option value="">All Roles</option>
            <option value="FACULTY">Faculty</option>
            <option value="ADMIN">Admin</option>
            <option value="HOD">HOD</option>
          </select>

          {selectedUsers.length > 0 && (
            <>
              <button onClick={handleBulkApprove} className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded text-sm sm:text-base whitespace-nowrap">
                Approve Selected ({selectedUsers.length})
              </button>
              <button onClick={handleBulkDelete} className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded text-sm sm:text-base whitespace-nowrap">
                Delete Selected ({selectedUsers.length})
              </button>
              <button onClick={handleBulkPermanentDelete} className="px-3 sm:px-4 py-2 bg-black text-white rounded text-sm sm:text-base whitespace-nowrap">
                Permanent Delete ({selectedUsers.length})
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])}
                        checked={selectedUsers.length === users.length && users.length > 0}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700">Name</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">Email</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700">Role</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden lg:table-cell">Department</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-gray-700 hidden xl:table-cell">Pending</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 ${!user.approved ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 sm:px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500 md:hidden">{user.email}</div>
                          </div>
                          {!user.approved && (
                            <span className="inline-flex px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-bold">
                              PENDING
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-sm hidden md:table-cell">{user.email}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {user.role_name}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-sm hidden lg:table-cell">{user.department}</td>
                      <td className="px-3 sm:px-4 py-3 text-center hidden xl:table-cell">
                        <div className="flex gap-1 justify-center">
                          {user.pending_leave_count > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                              L:{user.pending_leave_count}
                            </span>
                          )}
                          {user.pending_product_count > 0 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                              P:{user.pending_product_count}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-center">
                          {!user.approved ? (
                            <>
                              <button
                                onClick={() => handleApprove(user.id)}
                                className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded text-xs whitespace-nowrap"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(user.id)}
                                className="px-2 sm:px-3 py-1 bg-red-600 text-white rounded text-xs whitespace-nowrap"
                              >
                                Reject
                              </button>
                            </>
                          ) : user.deleted ? (
                            <button
                              onClick={() => handleRestore(user.id)}
                              className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded text-xs whitespace-nowrap"
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => window.location.href = `/admin/users/${user.id}`}
                                className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded text-xs whitespace-nowrap"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleForceLogout(user.id)}
                                className="px-2 sm:px-3 py-1 bg-orange-600 text-white rounded text-xs whitespace-nowrap hidden sm:inline-block"
                              >
                                Logout
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="px-2 sm:px-3 py-1 bg-red-600 text-white rounded text-xs whitespace-nowrap"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(user.id)}
                                className="px-2 sm:px-3 py-1 bg-black text-white rounded text-xs whitespace-nowrap"
                              >
                                Permanent
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-sm text-gray-600">
              Showing {users.length} of {total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 sm:px-4 py-2 border rounded disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <span className="px-3 sm:px-4 py-2 text-sm">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={users.length < 25}
                className="px-3 sm:px-4 py-2 border rounded disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
