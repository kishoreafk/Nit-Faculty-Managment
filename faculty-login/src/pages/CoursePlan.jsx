import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  DocumentArrowUpIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { courseAPI } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const CoursePlan = () => {
  const { faculty } = useAuth();
  const [coursePlans, setCoursePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    courseName: '',
    courseCode: '',
    semester: '',
    academicYear: '',
    description: '',
    objectives: '',
    syllabus: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchCoursePlans();
  }, []);

  const fetchCoursePlans = async () => {
    try {
      const response = await courseAPI.getMyCoursePlans();
      setCoursePlans(response.data || []);
    } catch (error) {
      console.error('Error fetching course plans:', error);
      toast.error('Failed to fetch course plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Append file if selected
      if (selectedFile) {
        formDataToSend.append('courseMaterial', selectedFile);
      }

      if (editingPlan) {
        await courseAPI.updateCoursePlan(editingPlan.id, formDataToSend);
        toast.success('Course plan updated successfully');
      } else {
        await courseAPI.addCoursePlan(formDataToSend);
        toast.success('Course plan added successfully');
      }
      
      resetForm();
      fetchCoursePlans();
    } catch (error) {
      console.error('Error saving course plan:', error);
      toast.error('Failed to save course plan');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      courseName: plan.courseName || '',
      courseCode: plan.courseCode || '',
      semester: plan.semester || '',
      academicYear: plan.academicYear || '',
      description: plan.description || '',
      objectives: plan.objectives || '',
      syllabus: plan.syllabus || '',
    });
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async (planId) => {
    if (window.confirm('Are you sure you want to delete this course plan?')) {
      try {
        await courseAPI.deleteCoursePlan(planId);
        toast.success('Course plan deleted successfully');
        fetchCoursePlans();
      } catch (error) {
        console.error('Error deleting course plan:', error);
        toast.error('Failed to delete course plan');
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setFormData({
      courseName: '',
      courseCode: '',
      semester: '',
      academicYear: '',
      description: '',
      objectives: '',
      syllabus: '',
    });
    setSelectedFile(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner message="Loading course plans..." />
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
            <h1 className="text-3xl font-bold text-gray-900">Course Plans</h1>
            <p className="text-gray-600">Manage your course plans and syllabi</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Course Plan
          </button>
        </div>

        {/* Course Plan Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPlan ? 'Edit Course Plan' : 'Add New Course Plan'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                  <input
                    type="text"
                    name="courseName"
                    value={formData.courseName}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter course name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                  <input
                    type="text"
                    name="courseCode"
                    value={formData.courseCode}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter course code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select semester</option>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                  <input
                    type="text"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2024-2025"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter course description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Learning Objectives</label>
                <textarea
                  name="objectives"
                  value={formData.objectives}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter learning objectives"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus</label>
                <textarea
                  name="syllabus"
                  value={formData.syllabus}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter detailed syllabus"
                />
              </div>
              
              {/* Course Material Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Material (Optional)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <DocumentArrowUpIcon className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> course material
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, or Images (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                    />
                  </label>
                </div>
                {selectedFile && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <DocumentIcon className="w-4 h-4 mr-2" />
                    <span>{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPlan ? 'Update Plan' : 'Save Plan'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Course Plans List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">My Course Plans</h2>
          </div>
          <div className="p-6">
            {coursePlans.length === 0 ? (
              <div className="text-center py-8">
                <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No course plans found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coursePlans.map((plan) => (
                  <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{plan.courseName}</h3>
                        <p className="text-sm text-gray-600">{plan.courseCode}</p>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                          <span>Semester {plan.semester}</span>
                          <span>{plan.academicYear}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {plan.description}
                        </p>
                        {plan.courseMaterialFile && (
                          <div className="flex items-center mt-2 text-sm text-blue-600">
                            <DocumentIcon className="w-4 h-4 mr-1" />
                            <a 
                              href={`http://localhost:5000${plan.courseMaterialFile}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {plan.courseMaterialFileName || 'Course Material'}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoursePlan; 