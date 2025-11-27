import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LeaveManagement from './pages/LeaveManagement';
import AdminApprovals from './pages/AdminApprovals';
import ProductRequests from './pages/ProductRequests';
import AdminProductReview from './pages/AdminProductReview';
import AdminLogs from './pages/AdminLogs';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminPendingItems from './pages/AdminPendingItems';
import AdminLeaveReview from './pages/AdminLeaveReview';
import AdminLeaveLog from './pages/AdminLeaveLog';
import AdminProductLog from './pages/AdminProductLog';
import Vaultify from './pages/Vaultify';
import TimetableFiles from './pages/TimetableFiles';
import AdminTimetableAssignment from './pages/AdminTimetableAssignment';
import AdminLeaveBalance from './pages/AdminLeaveBalance';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/leave" element={<ProtectedRoute><Layout><LeaveManagement /></Layout></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Layout><ProductRequests /></Layout></ProtectedRoute>} />
        <Route path="/admin/approvals" element={<ProtectedRoute><Layout><AdminApprovals /></Layout></ProtectedRoute>} />
        <Route path="/admin/product-reviews" element={<ProtectedRoute><Layout><AdminProductReview /></Layout></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute><Layout><AdminLogs /></Layout></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><Layout><AdminUsers /></Layout></ProtectedRoute>} />
        <Route path="/admin/users/create" element={<ProtectedRoute><Layout><AdminCreateUser /></Layout></ProtectedRoute>} />
        <Route path="/admin/users/:id" element={<ProtectedRoute><Layout><AdminUserDetail /></Layout></ProtectedRoute>} />
        <Route path="/admin/pending" element={<ProtectedRoute><Layout><AdminPendingItems /></Layout></ProtectedRoute>} />
        <Route path="/admin/leave-review" element={<ProtectedRoute><Layout><AdminLeaveReview /></Layout></ProtectedRoute>} />
        <Route path="/admin/leave-log" element={<ProtectedRoute><Layout><AdminLeaveLog /></Layout></ProtectedRoute>} />
        <Route path="/admin/product-log" element={<ProtectedRoute><Layout><AdminProductLog /></Layout></ProtectedRoute>} />
        <Route path="/vaultify" element={<ProtectedRoute><Layout><Vaultify /></Layout></ProtectedRoute>} />
        <Route path="/timetables" element={<ProtectedRoute><Layout><TimetableFiles /></Layout></ProtectedRoute>} />
        <Route path="/admin/timetables" element={<ProtectedRoute><Layout><AdminTimetableAssignment /></Layout></ProtectedRoute>} />
        <Route path="/admin/leave-balance" element={<ProtectedRoute><Layout><AdminLeaveBalance /></Layout></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default App;
