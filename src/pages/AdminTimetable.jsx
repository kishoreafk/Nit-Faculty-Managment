import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { adminAPI } from '../api/api';
import toast from 'react-hot-toast';

const AdminTimetable = () => {
  const { faculty } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setLoading] = useState(true);

  useEffect(() => {
    if (faculty?.role === 'admin') {
      fetchUsers();
    }
  }, [faculty]);

  useEffect(() => {
    const filtered = users.filter(user => 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers();
      const approvedFaculty = response.data.filter(user => user.role === 'faculty' && user.is_approved);
      setUsers(approvedFaculty);
      setFilteredUsers(approvedFaculty);
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTimetable = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await adminAPI.assignTimetable(selectedUser.id, formData);
      toast.success('Timetable assigned successfully');
      setSelectedUser(null);
      e.target.reset();
    } catch {
      toast.error('Failed to assign timetable');
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timetable Management</h1>
          <p className="text-gray-600">Assign timetables to faculty members</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Faculty List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
                <UserIcon className="w-5 h-5 mr-2" />
                Available Faculty
              </h2>
              <input
                type="text"
                placeholder="Search faculty by name, ID, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="p-6">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {user.department} • {user.employeeId}
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No faculty found matching your search
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timetable Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                Assign Timetable
              </h2>
            </div>
            <div className="p-6">
              {selectedUser ? (
                <div>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-900">
                      Selected: {selectedUser.firstName} {selectedUser.lastName}
                    </div>
                    <div className="text-sm text-blue-700">
                      {selectedUser.department} • {selectedUser.employeeId}
                    </div>
                  </div>
                  
                  <form onSubmit={handleAssignTimetable} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timetable File
                      </label>
                      <input
                        type="file"
                        name="timetable"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Semester
                      </label>
                      <select
                        name="semester"
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Semester</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="3">Semester 3</option>
                        <option value="4">Semester 4</option>
                        <option value="5">Semester 5</option>
                        <option value="6">Semester 6</option>
                        <option value="7">Semester 7</option>
                        <option value="8">Semester 8</option>
                      </select>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Assign Timetable
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a faculty member to assign timetable</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminTimetable;