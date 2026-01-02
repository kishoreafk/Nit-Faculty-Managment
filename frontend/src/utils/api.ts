import axios from 'axios';

// Use an environment variable so it works in Dev and Prod
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
