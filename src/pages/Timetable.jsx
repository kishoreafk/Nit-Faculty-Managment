import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  ArrowUpTrayIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { courseAPI } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Timetable = () => {
  useAuth(); // Hook required for context
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const response = await courseAPI.getMyTimetable();
      setTimetable(response.data);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast.error('Failed to fetch timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('timetable', file);

    setUploading(true);
    try {
      await courseAPI.uploadTimetable(formData);
      toast.success('Timetable uploaded successfully');
      fetchTimetable();
    } catch (error) {
      console.error('Error uploading timetable:', error);
      toast.error('Failed to upload timetable');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!window.confirm('Are you sure you want to delete this timetable? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await courseAPI.deleteTimetable();
      toast.success('Timetable deleted successfully');
      setTimetable(null);
    } catch (error) {
      console.error('Error deleting timetable:', error);
      toast.error('Failed to delete timetable');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner message="Loading timetable..." />
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
            <h1 className="text-3xl font-bold text-gray-900">Timetable</h1>
            <p className="text-gray-600">Manage your course timetable</p>
          </div>
          <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Timetable'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Timetable Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">My Timetable</h2>
          </div>
          <div className="p-6">
            {!timetable ? (
              <div className="text-center py-8">
                <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No timetable uploaded yet</p>
                <p className="text-sm text-gray-400">
                  Upload your timetable file to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Current Timetable</h3>
                        <p className="text-sm text-gray-600">
                          Uploaded on {new Date(timetable.uploadedAt || timetable.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(timetable.fileUrl || timetable.filePath, '_blank')}
                        className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                        Download
                      </button>
                      <button
                        onClick={handleDeleteTimetable}
                        disabled={deleting}
                        className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Instructions */}
        <div className="bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Upload Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG</li>
            <li>• Maximum file size: 10MB</li>
            <li>• Make sure your timetable is clearly formatted</li>
            <li>• Include all course details and time slots</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Timetable; 