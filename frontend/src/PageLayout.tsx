import React from 'react';
import { useLocation, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { motion as fmMotion } from 'framer-motion';
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
import RateMapping from './pages/RateMapping';
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
  return (
    <>
      <fmMotion.div
        className={isLanding ? landingClass : (darkMode ? 'min-h-screen bg-gray-950 transition-colors duration-500' : 'min-h-screen bg-white transition-colors duration-500')}
        animate={{ backgroundColor: isLanding ? landingBg : (darkMode ? '#09090b' : '#fff') }}
        transition={{ duration: 0.5 }}
      >
        {/* Session expired modal */}
        {sessionExpiredModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-40" />
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 z-60 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Session expired</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{sessionExpiredModal.message || 'Your session has expired. You will be redirected to the login page.'}</p>
              <div className="flex gap-3 justify-end">
                <button className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700" onClick={() => {
                  setSessionExpiredModal({ open: false });
                }}>Dismiss</button>
                <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}>Go to Login</button>
              </div>
            </div>
          </div>
        )}
        {/* Only show header/sidebar if not on landing page */}
        {isAuthed && !isLanding && (
          <header className={darkMode ? "sticky top-0 z-10 bg-gray-950 border-b border-gray-800" : "sticky top-0 z-10 bg-white border-b border-gray-200"}>
            <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
              {/* Logo and Hamburger for mobile */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold">S</span>
                </div>
                <h1 className={darkMode ? "text-lg sm:text-xl font-semibold text-gray-100" : "text-lg sm:text-xl font-semibold text-gray-900"}>Spice Express</h1>
              </div>
              {/* Emoji menu bar, now visible on all screen sizes, with dark mode toggle */}
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  className={darkMode ? "w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-200 hover:bg-gray-700" : "w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <span className="sr-only">Open menu</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <NavLink to="/profile">
                  <button className={darkMode ? "w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-200 hover:bg-gray-700" : "w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"}>
                    👤
                  </button>
                </NavLink>
                {/* Dark mode toggle */}
                <button
                  className={darkMode ? "w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-yellow-300 hover:bg-gray-700 transition-colors" : "w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-yellow-500 hover:bg-gray-200 transition-colors"}
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
                    {darkMode ? '🌙' : '☀️'}
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
                  className="relative w-64 max-w-full h-full bg-white shadow-xl z-50 mobile-sidebar-panel"
                  initial={{ x: -320 }}
                  animate={{ x: sidebarOpen ? 0 : -320 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{ position: 'relative' }}
                >
                  <Sidebar />
                  <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation menu"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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
              <Route path="/rates" element={<PrivateRoute roles={["admin"]}><RateMapping /></PrivateRoute>} />
              <Route path="/invoices" element={<PrivateRoute roles={["admin","user"]}><Invoices /></PrivateRoute>} />
              <Route path="/invoices/:invoiceId" element={<PrivateRoute roles={["admin","user"]}><InvoiceDetailsPage /></PrivateRoute>} />
              <Route path="/lrs" element={<PrivateRoute roles={["admin","user"]}><LRsPage /></PrivateRoute>} />
              <Route path="/lrs/:lrId" element={<PrivateRoute roles={["admin","user"]}><LRDetailsPage /></PrivateRoute>} />
              <Route path="/create-lr" element={<PrivateRoute roles={["admin"]}><CreateLR /></PrivateRoute>} />
              <Route path="/edit-lr/:lrId" element={<PrivateRoute roles={["admin"]}><CreateLR editMode={true} /></PrivateRoute>} />
              <Route path="/mis" element={<PrivateRoute roles={["admin"]}><MIS /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
      </fmMotion.div>
    </>
  );
};

export default PageLayout;