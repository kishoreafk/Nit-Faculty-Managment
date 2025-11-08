import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('faculty');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
};

// Faculty API
export const facultyAPI = {
  getProfile: () => api.get('/faculty/me'),
  updateProfile: (data) => api.put('/faculty/update', data),
};

// Leave API
export const leaveAPI = {
  applyLeave: (data) => api.post('/leave/apply', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getMyLeaves: () => api.get('/leave/mine'),
  getAllLeaves: () => api.get('/leave/all'),
  reviewLeave: (leaveId, status, reason) => api.put(`/leave/review/${leaveId}`, { status, rejectionReason: reason }),
  updateLeaveRequest: (leaveId, data) => api.put(`/leave/${leaveId}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteLeaveRequest: (leaveId) => api.delete(`/leave/${leaveId}`),
  getAvailableForms: () => api.get('/leave/forms/available'),
  generatePDFForm: (leaveId) => api.get(`/leave/${leaveId}/generate-pdf`, {
    responseType: 'blob',
  }),
  viewGeneratedForm: (leaveId) => api.get(`/leave/${leaveId}/view-form`, {
    responseType: 'blob',
  }),
  downloadGeneratedForm: (leaveId) => api.get(`/leave/${leaveId}/download-form`, {
    responseType: 'blob',
  }),
  getFormStructure: (leaveType) => api.get(`/leave/forms/structure?leaveType=${leaveType}`),
  generateDocxForm: (leaveId) => api.get(`/leave/${leaveId}/generate-docx`, {
    responseType: 'blob',
  }),
  scanFormStructure: (filename, staffType = 'Teaching') => api.get(`/leave/forms/scan-structure?filename=${filename}&staffType=${staffType}`),
};

// Leave Form API (new dynamic forms)
export const leaveFormAPI = {
  getTemplates: () => api.get('/leave-forms/templates'),
  getFormFields: (leaveCategory, staffType) => api.get(`/leave-forms/fields?leaveCategory=${encodeURIComponent(leaveCategory)}&staffType=${staffType}`),
  submitApplication: (data) => api.post('/leave-forms/submit', data),
  getMyApplications: () => api.get('/leave-forms/my-applications'),
  getAllApplications: () => api.get('/leave-forms/all-applications'),
  reviewApplication: (applicationId, data) => api.put(`/leave-forms/review/${applicationId}`, data),
  deleteApplication: (applicationId) => api.delete(`/leave-forms/delete/${applicationId}`),
  generatePDFForm: (applicationId) => api.get(`/leave-forms/${applicationId}/generate-pdf`, {
    responseType: 'blob',
  }),
  viewGeneratedForm: (applicationId) => api.get(`/leave-forms/${applicationId}/view-form`, {
    responseType: 'blob',
  }),
  downloadGeneratedForm: (applicationId) => api.get(`/leave-forms/${applicationId}/download-form`, {
    responseType: 'blob',
  }),
};

// Product API
export const productAPI = {
  applyProductRequest: (data) => api.post('/product/apply', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getMyProductRequests: () => api.get('/product/mine'),
  getAllProductRequests: () => api.get('/product/all'),
  reviewProductRequest: (requestId, data) => api.put(`/product/review/${requestId}`, data),
  updateProductRequest: (requestId, data) => api.put(`/product/${requestId}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteProductRequest: (requestId) => api.delete(`/product/${requestId}`),
};

// File API
export const fileAPI = {
  uploadFile: (formData) => api.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getMyFiles: () => api.get('/files/mine'),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  // PDF form helpers
  getAvailablePDFForms: (staffType = 'Teaching') =>
    api.get(`/files/pdf/available-forms?staffType=${staffType}`),
  extractPDFFields: (filePath) =>
    api.post('/files/pdf/extract-fields', { filePath }),
  getPDFFormStructure: (leaveType, staffType = 'Teaching', contractType = 'Regular') =>
    api.get(
      `/files/pdf/form-structure?leaveType=${encodeURIComponent(leaveType)}&staffType=${staffType}&contractType=${contractType}`
    ),
};

// Course API
export const courseAPI = {
  getMyTimetable: () => api.get('/course/timetable/mine'),
  uploadTimetable: (formData) => api.post('/course/timetable/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteTimetable: () => api.delete('/course/timetable/mine'),
  getMyCoursePlans: () => api.get('/course/courseplan/mine'),
  addCoursePlan: (formData) => api.post('/course/courseplan/add', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateCoursePlan: (planId, formData) => api.put(`/course/courseplan/${planId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteCoursePlan: (planId) => api.delete(`/course/courseplan/${planId}`),
};

// Admin API
export const adminAPI = {
  getAllUsers: () => api.get('/admin/users'),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  approveUser: (userId, approved, reason) => api.put(`/admin/users/${userId}/approve`, { approved, reason }),
  addUser: (data) => api.post('/admin/users', data),
  removeUser: (userId) => api.delete(`/admin/users/${userId}`),
  resetPassword: (userId, newPassword) => api.put(`/admin/users/${userId}/reset-password`, { newPassword }),
  getLogs: () => api.get('/admin/logs'),
  assignTimetable: (facultyId, formData) => api.post(`/admin/assign-timetable/${facultyId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  
  // Enhanced Configuration
  getCompleteEnhancedConfig: () => api.get('/enhanced-system-config/complete-enhanced'),
  updateFacultyEntitlement: (facultyType, leaveType, data) => 
    api.put(`/enhanced-system-config/faculty-entitlements/${facultyType}/${leaveType}`, data),
  createCalculationRule: (data) => api.post('/enhanced-system-config/calculation-rules', data),
  updateCalculationRule: (ruleId, data) => api.put(`/enhanced-system-config/calculation-rules/${ruleId}`, data),
  deleteCalculationRule: (ruleId) => api.delete(`/enhanced-system-config/calculation-rules/${ruleId}`),
  calculateAccrual: (data) => api.post('/enhanced-system-config/calculate-accrual', data),
};

// System Configuration API
export const systemConfigAPI = {
  // Faculty Types
  getFacultyTypes: () => api.get('/system-config/faculty-types'),
  createFacultyType: (data) => api.post('/system-config/faculty-types', data),
  updateFacultyType: (typeId, data) => api.put(`/system-config/faculty-types/${typeId}`, data),
  deleteFacultyType: (typeId) => api.delete(`/system-config/faculty-types/${typeId}`),
  
  // Leave Types
  getLeaveTypes: () => api.get('/system-config/leave-types'),
  createLeaveType: (data) => api.post('/system-config/leave-types', data),
  updateLeaveType: (leaveTypeId, data) => api.put(`/system-config/leave-types/${leaveTypeId}`, data),
  deleteLeaveType: (leaveTypeId) => api.delete(`/system-config/leave-types/${leaveTypeId}`),
  
  // Complete Configuration
  getCompleteConfig: () => api.get('/system-config/complete'),
};

// Enhanced Leave Accrual API
export const enhancedAccrualAPI = {
  // Accrual Rules
  getAccrualRules: () => api.get('/enhanced-leave-accrual/accrual-rules'),
  createAccrualRule: (data) => api.post('/enhanced-leave-accrual/accrual-rules', data),
  updateAccrualRule: (ruleId, data) => api.put(`/enhanced-leave-accrual/accrual-rules/${ruleId}`, data),
  deleteAccrualRule: (ruleId) => api.delete(`/enhanced-leave-accrual/accrual-rules/${ruleId}`),
  
  // Calculations
  calculateAccrual: (data) => api.post('/enhanced-leave-accrual/calculate-accrual', data),
  
  // Faculty Entitlements
  getFacultyEntitlements: () => api.get('/enhanced-leave-accrual/faculty-entitlements'),
  updateFacultyEntitlement: (facultyTypeId, leaveTypeId, data) => 
    api.put(`/enhanced-leave-accrual/faculty-entitlements/${facultyTypeId}/${leaveTypeId}`, data),
  
  // Leave Balance Management
  updateLeaveBalances: (data) => api.post('/enhanced-leave-accrual/update-leave-balances', data),
  getFacultyAccrualSummary: (facultyId) => api.get(`/enhanced-leave-accrual/faculty/${facultyId}/accrual-summary`),
  
  // Cleanup unknown faculty records
  cleanupUnknownFaculty: () => api.delete('/enhanced-leave-accrual/cleanup-unknown-faculty'),
};



export default api; 