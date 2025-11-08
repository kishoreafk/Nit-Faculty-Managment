import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  console.log('AuthProvider: Initializing');
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: useEffect running');
    
    const initializeAuth = () => {
      try {
        // Check if user is logged in on app start
        const token = localStorage.getItem('token');
        const savedFaculty = localStorage.getItem('faculty');
        
        console.log('AuthProvider: Checking localStorage', { token: !!token, savedFaculty: !!savedFaculty });
        
        if (token && savedFaculty) {
          console.log('AuthProvider: Found saved data, setting faculty');
          const facultyData = JSON.parse(savedFaculty);
          setFaculty(facultyData);
        } else {
          console.log('AuthProvider: No saved data found');
        }
      } catch (error) {
        console.error('AuthProvider: Error parsing saved data', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('faculty');
      } finally {
        setLoading(false);
        console.log('AuthProvider: Loading set to false');
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    console.log('AuthContext: Starting login process', { email: encodeURIComponent(email) });
    const response = await authAPI.login({ email, password });
    console.log('AuthContext: Login API response received');
    const { token, faculty: facultyData } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('faculty', JSON.stringify(facultyData));
    setFaculty(facultyData);
    console.log('AuthContext: Login successful, faculty set', facultyData);
    
    return { success: true };
  };

  const signup = async (userData) => {
    console.log('AuthContext: Starting signup process', userData);
    const response = await authAPI.signup(userData);
    console.log('AuthContext: Signup API response', response.data);
    const { token, faculty: facultyData } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('faculty', JSON.stringify(facultyData));
    setFaculty(facultyData);
    console.log('AuthContext: Signup successful, faculty set', facultyData);
    
    return { success: true };
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('faculty');
    setFaculty(null);
  };

  const updateFaculty = (updatedFaculty) => {
    setFaculty(updatedFaculty);
    localStorage.setItem('faculty', JSON.stringify(updatedFaculty));
  };

  const value = {
    faculty,
    loading,
    login,
    signup,
    logout,
    updateFaculty,
    isAuthenticated: !!faculty,
    isAdmin: faculty?.role === 'admin',
    isHOD: faculty?.designation === 'HOD',
  };

  console.log('AuthProvider: Rendering with value', { faculty: !!faculty, loading, isAuthenticated: !!faculty });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 