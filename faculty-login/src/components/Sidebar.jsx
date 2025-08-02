import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HomeIcon,
  CalendarIcon,
  DocumentTextIcon,
  FolderIcon,
  ClockIcon,
  BookOpenIcon,
  ChartBarIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const { faculty, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = faculty?.role === 'admin' ? [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Admin Panel', href: '/admin', icon: UserIcon },
    { name: 'Leave Management', href: '/leave-management', icon: CalendarIcon },
    { name: 'Product Request', href: '/product-request', icon: DocumentTextIcon },
    { name: 'Timetable', href: '/timetable', icon: ClockIcon },
    { name: 'Logs', href: '/logs', icon: ChartBarIcon },
  ] : [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Leave Management', href: '/leave-management', icon: CalendarIcon },
    { name: 'Product Request', href: '/product-request', icon: DocumentTextIcon },
    { name: 'Vaultify', href: '/vaultify', icon: FolderIcon },
    { name: 'Timetable', href: '/timetable', icon: ClockIcon },
    { name: 'Course Plan', href: '/course-plan', icon: BookOpenIcon },

  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const isActive = (href) => location.pathname === href;

  const NavItem = ({ item }) => (
    <Link
      to={item.href}
      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive(item.href)
          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <item.icon
        className={`mr-3 h-5 w-5 flex-shrink-0 ${
          isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
        }`}
      />
      {item.name}
    </Link>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white shadow-lg border border-gray-200"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          ) : (
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpenIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Faculty Portal</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {faculty?.firstName} {faculty?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{faculty?.department}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop backdrop */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white shadow-xl border-r border-gray-200" />
    </>
  );
};

export default Sidebar; 