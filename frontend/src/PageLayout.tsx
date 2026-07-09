import React from 'react';
import { useLocation, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { motion as fmMotion } from 'framer-motion';
import { Menu, Moon, Sun, User, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Tracking from './pages/Tracking';
import Analytics from './pages/Analytics';
import Customers from './pages/Customers';
import CustomerList from './pages/CustomerList';
import AddCustomer from './pages/AddCustomer';
import EditCustomer from './pages/EditCustomer';
import Invoices from './pages/Invoices';
import InvoiceDetailsPage from './pages/InvoiceDetailsPage';
import LRsPage from './pages/LRsPage';
import LRDetailsPage from './pages/LRDetailsPage';
import CreateLR from './pages/CreateLR';
import MIS from './pages/MIS';

import { getUserFromStorage, isAuthed as libIsAuthed } from './lib/auth';
function PrivateRoute({ children, roles }: { children: React.ReactElement, roles?: string[] }) {
  if (!libIsAuthed()) return <Navigate to="/login" replace />;
  const user = getUserFromStorage();
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

const PageLayout = ({ isAuthed, darkMode, setDarkMode, sidebarOpen, setSidebarOpen, sessionExpiredModal, setSessionExpiredModal }: any) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const landingClass = 'min-h-screen bg-white transition-colors duration-500';
  const landingBg = '#fff';
  const appClass = 'min-h-[100dvh] bg-slate-50 text-slate-950 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-100';
  const appBg = darkMode ? '#020617' : '#f8fafc';
  return (
    <>
      <fmMotion.div
        className={isLanding ? landingClass : appClass}
        animate={{ backgroundColor: isLanding ? landingBg : appBg }}
        transition={{ duration: 0.5 }}
      >
        {/* Session expired modal */}
        {sessionExpiredModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-40" />
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 z-60 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Session expired</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{sessionExpiredModal.message || 'Your session has expired. You will be redirected to the login page.'}</p>
              <div className="flex gap-3 justify-end">
                <button className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700" onClick={() => {
                  setSessionExpiredModal({ open: false });
                }}>Dismiss</button>
                <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user');

                  // Trigger auth state change event
                  window.dispatchEvent(new CustomEvent('authStateChanged'));

                  window.location.href = '/login';
                }}>Go to Login</button>
              </div>
            </div>
          </div>
        )}
        {/* Only show header/sidebar if not on landing page */}
        {isAuthed && !isLanding && (
          <header className={darkMode ? "sticky top-0 z-10 bg-slate-950 border-b border-slate-800" : "sticky top-0 z-10 bg-white border-b border-slate-200"}>
            <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
              {/* Logo and Hamburger for mobile */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold">S</span>
                </div>
                <h1 className={darkMode ? "text-lg sm:text-xl font-semibold text-gray-100" : "text-lg sm:text-xl font-semibold text-gray-900"}>Spice Express</h1>
              </div>
              {/* Header actions */}
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  className={darkMode ? "w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-200 hover:bg-slate-800" : "w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <NavLink to="/profile">
                  <button className={darkMode ? "w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-200 hover:bg-slate-800" : "w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"} aria-label="Profile">
                    <User className="h-4 w-4" />
                  </button>
                </NavLink>
                <button
                  className={darkMode ? "w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-amber-300 hover:bg-slate-800 transition-colors" : "w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-amber-500 hover:bg-slate-200 transition-colors"}
                  onClick={() => setDarkMode((d: boolean) => !d)}
                  aria-label="Toggle dark mode"
                >
                  <fmMotion.span
                    key={darkMode ? 'moon' : 'sun'}
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </fmMotion.span>
                </button>
              </div>
            </div>
          </header>
        )}
        <div className="relative">
          {/* Sidebar: hidden on mobile, visible on sm+ */}
          {isAuthed && !isLanding && (
            <>
              {/* Mobile sidebar overlay with framer-motion */}
              <div
                className={sidebarOpen ? "fixed inset-0 z-40 flex sm:hidden" : "hidden"}
                aria-modal="true"
                role="dialog"
              >
                <div
                  className="fixed inset-0 bg-black bg-opacity-30"
                  onClick={() => setSidebarOpen(false)}
                  aria-hidden="true"
                />
                <fmMotion.div
                  className="relative w-64 max-w-full h-full bg-white shadow-xl z-50 mobile-sidebar-panel dark:bg-slate-950"
                  initial={{ x: -320 }}
                  animate={{ x: sidebarOpen ? 0 : -320 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{ position: 'relative' }}
                >
                  <Sidebar />
                  <button
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation menu"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </fmMotion.div>
              </div>
              {/* Desktop sidebar: static, not fixed */}
              <div className="hidden sm:block fixed inset-y-0 left-0 w-64 z-20">
                <Sidebar />
              </div>
            </>
          )}
          {/* Main content: add left margin for sidebar on desktop.
        Only enable an internal scroll container for authenticated app pages; the landing page should use the natural body scroll. */}
          <main className={isAuthed && !isLanding ? "flex-1 overflow-auto sm:ml-64" : "flex-1"}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/tracking" element={<PrivateRoute><Tracking /></PrivateRoute>} />
              {/* Admin-only routes */}
              <Route path="/analytics" element={<PrivateRoute roles={["admin"]}><Analytics /></PrivateRoute>} />
              <Route path="/customers" element={<PrivateRoute roles={["admin"]}><Customers /></PrivateRoute>} />
              <Route path="/admin/customer-list" element={<PrivateRoute roles={["admin"]}><CustomerList /></PrivateRoute>} />
              <Route path="/admin/add-customer" element={<PrivateRoute roles={["admin"]}><AddCustomer /></PrivateRoute>} />
              <Route path="/admin/edit-customer/:id" element={<PrivateRoute roles={["admin"]}><EditCustomer /></PrivateRoute>} />
              <Route path="/invoices" element={<PrivateRoute roles={["admin", "user"]}><Invoices /></PrivateRoute>} />
              <Route path="/invoices/:invoiceId" element={<PrivateRoute roles={["admin", "user"]}><InvoiceDetailsPage /></PrivateRoute>} />
              <Route path="/lrs" element={<PrivateRoute roles={["admin", "user"]}><LRsPage /></PrivateRoute>} />
              <Route path="/lrs/:lrId" element={<PrivateRoute roles={["admin", "user"]}><LRDetailsPage /></PrivateRoute>} />
              <Route path="/create-lr" element={<PrivateRoute roles={["admin"]}><CreateLR /></PrivateRoute>} />
              <Route path="/edit-lr/:lrId" element={<PrivateRoute roles={["admin"]}><CreateLR editMode={true} /></PrivateRoute>} />
              <Route path="/mis" element={<PrivateRoute roles={["admin"]}><MIS /></PrivateRoute>} />
              <Route path="*" element={<div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center"><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">404 - Page Not Found</h1></div>} />
            </Routes>
          </main>
        </div>
      </fmMotion.div>
    </>
  );
};

export default PageLayout;
