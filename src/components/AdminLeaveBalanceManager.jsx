import React, { useState, useEffect } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/api';
import toast from 'react-hot-toast';

const AdminLeaveBalanceManager = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [filteredFacultyList, setFilteredFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBalance, setEditingBalance] = useState(null);
  const [editValues, setEditValues] = useState({ allocated: 0, used: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  useEffect(() => {
    fetchFacultyBalances();
  }, []);

  const fetchFacultyBalances = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/faculty-balances');
      if (response.data.success) {
        setFacultyList(response.data.data);
        setFilteredFacultyList(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching faculty balances:', error);
      toast.error('Failed to load faculty balances');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term) {
      setFilteredFacultyList(facultyList);
    } else {
      const filtered = facultyList.filter(faculty => 
        `${faculty.firstName} ${faculty.lastName}`.toLowerCase().includes(term.toLowerCase()) ||
        faculty.employeeId.toLowerCase().includes(term.toLowerCase()) ||
        faculty.department.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredFacultyList(filtered);
    }
  };

  const startEditing = (facultyId, leaveTypeId, balance) => {
    setEditingBalance(`${facultyId}-${leaveTypeId}`);
    setEditValues({
      allocated: balance.allocated || 0,
      used: balance.used || 0
    });
  };

  const cancelEditing = () => {
    setEditingBalance(null);
    setEditValues({ allocated: 0, used: 0 });
  };

  const saveBalance = async (facultyId, leaveTypeId) => {
    try {
      await api.put(`/admin/faculty/${facultyId}/balance/${leaveTypeId}`, editValues);
      toast.success('Leave balance updated successfully');
      setEditingBalance(null);
      fetchFacultyBalances();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update leave balance');
    }
  };

  const syncWithConfig = async () => {
    try {
      setLoading(true);
      const response = await api.post('/admin/sync-leave-config');
      if (response.data.success) {
        toast.success('Leave balances synced with system configuration');
        fetchFacultyBalances();
      } else {
        toast.error(response.data.message || 'Failed to sync leave configuration');
      }
    } catch (error) {
      console.error('Error syncing with config:', error);
      toast.error('Failed to sync with system configuration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Faculty Leave Balances</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search faculty..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
          <button
            onClick={syncWithConfig}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Sync with Config
          </button>
          <button
            onClick={fetchFacultyBalances}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-medium text-gray-900">Faculty List</h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredFacultyList.map((faculty) => (
              <li 
                key={faculty.id} 
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  selectedFaculty?.id === faculty.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedFaculty(faculty)}
              >
                <div className="text-sm font-medium text-gray-900">
                  {faculty.firstName} {faculty.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {faculty.employeeId} • {faculty.department}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          {selectedFaculty ? (
            <div className="bg-white shadow sm:rounded-md">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedFaculty.firstName} {selectedFaculty.lastName} - Leave Balances
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedFaculty.employeeId} • {selectedFaculty.department} • {selectedFaculty.facultyType}
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selectedFaculty.balances).map(([leaveTypeId, balance]) => {
                    const isEditing = editingBalance === `${selectedFaculty.id}-${leaveTypeId}`;
                    
                    return (
                      <div key={leaveTypeId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {leaveTypeId.replace('_', ' ')}
                          </h4>
                          {!isEditing && (
                            <button
                              onClick={() => startEditing(selectedFaculty.id, leaveTypeId, balance)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Allocated</label>
                              <input
                                type="number"
                                value={editValues.allocated}
                                onChange={(e) => setEditValues(prev => ({
                                  ...prev,
                                  allocated: parseInt(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-2 border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Used</label>
                              <input
                                type="number"
                                value={editValues.used}
                                onChange={(e) => setEditValues(prev => ({
                                  ...prev,
                                  used: parseInt(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-2 border rounded text-sm"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => saveBalance(selectedFaculty.id, leaveTypeId)}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                <CheckIcon className="h-3 w-3 inline mr-1" />
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                              >
                                <XMarkIcon className="h-3 w-3 inline mr-1" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Allocated:</span>
                              <span className="font-medium">{balance.allocated || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Used:</span>
                              <span className="font-medium text-red-600">{balance.used || 0}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-gray-600 font-medium">Available:</span>
                              <span className="font-bold text-green-600 text-lg">{balance.balance || 0}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow sm:rounded-md p-8 text-center">
              <p className="text-gray-500">Select a faculty member to view their leave balances</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AdminLeaveBalanceManager;