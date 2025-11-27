import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      const message = error.response?.data?.error;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (message?.includes('deactivated') || message?.includes('removed')) {
        localStorage.setItem('loginError', 'Your account has been deactivated or removed. Please contact admin.');
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
