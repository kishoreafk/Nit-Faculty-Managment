import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LeaveManagement from './pages/LeaveManagement';
import EnhancedLeaveManagement from './pages/EnhancedLeaveManagement';
import ProductRequest from './pages/ProductRequest';
import Vaultify from './pages/Vaultify';
import Timetable from './pages/Timetable';
import CoursePlan from './pages/CoursePlan';

import LoadingSpinner from './components/LoadingSpinner';
import DebugAPI from './components/DebugAPI';
import TestPage from './pages/TestPage';
import DiagnosticPage from './components/DiagnosticPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogs from './pages/AdminLogs';
import AdminTimetable from './pages/AdminTimetable';
import EnhancedAutoFillForm from './components/EnhancedAutoFillForm';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('ProtectedRoute:', { isAuthenticated, loading });
  
  if (loading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return <LoadingSpinner />;
  }
  
  console.log('ProtectedRoute: Redirecting to login');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('PublicRoute:', { isAuthenticated, loading });
  
  if (loading) {
    console.log('PublicRoute: Showing loading spinner');
    return <LoadingSpinner />;
  }
  
  console.log('PublicRoute: Redirecting to dashboard');
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

// Timetable Route Component
const TimetableRoute = () => {
  const { faculty } = useAuth();
  return faculty?.role === 'admin' ? <AdminTimetable /> : <Timetable />;
};

function App() {
  console.log('App: Rendering App component');
  
  return (
    <Router>
      <div className="App min-h-screen">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/test" element={<TestPage />} />
          <Route path="/diagnostic" element={<DiagnosticPage />} />
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute>
              <AdminLogs />
            </ProtectedRoute>
          } />
          <Route path="/leave-management" element={
            <ProtectedRoute>
              <LeaveManagement />
            </ProtectedRoute>
          } />
          <Route path="/enhanced-leave-management" element={
            <ProtectedRoute>
              <EnhancedLeaveManagement />
            </ProtectedRoute>
          } />
          <Route path="/product-request" element={
            <ProtectedRoute>
              <ProductRequest />
            </ProtectedRoute>
          } />
          <Route path="/vaultify" element={
            <ProtectedRoute>
              <Vaultify />
            </ProtectedRoute>
          } />
          <Route path="/timetable" element={
            <ProtectedRoute>
              <TimetableRoute />
            </ProtectedRoute>
          } />
          <Route path="/course-plan" element={
            <ProtectedRoute>
              <CoursePlan />
            </ProtectedRoute>
          } />
          <Route path="/enhanced-auto-fill" element={
            <ProtectedRoute>
              <EnhancedAutoFillForm />
            </ProtectedRoute>
          } />


          <Route path="/debug" element={<DebugAPI />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
