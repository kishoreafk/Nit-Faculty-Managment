import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

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
  reviewLeave: (leaveId, data) => api.put(`/leave/review/${leaveId}`, data),
  updateLeaveRequest: (leaveId, data) => api.put(`/leave/${leaveId}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteLeaveRequest: (leaveId) => api.delete(`/leave/${leaveId}`),
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
  approveUser: (userId, approved) => api.put(`/admin/users/${userId}/approve`, { approved }),
  addUser: (data) => api.post('/admin/users', data),
  removeUser: (userId) => api.delete(`/admin/users/${userId}`),
  resetPassword: (userId, newPassword) => api.put(`/admin/users/${userId}/reset-password`, { newPassword }),
  getLogs: () => api.get('/admin/logs'),

};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
};

export default api; 