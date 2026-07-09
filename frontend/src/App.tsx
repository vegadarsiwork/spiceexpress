import React, { useState, useEffect } from 'react'
import { Toaster } from './lib/toast'
import { isAuthed as libIsAuthed } from './lib/auth'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import PageLayout from './PageLayout'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionExpiredModal, setSessionExpiredModal] = useState<{ open: boolean; message?: string }>({ open: false });
  const [darkMode, setDarkMode] = useState(() => {
    // Persist dark mode preference in localStorage
    return localStorage.getItem('dark_mode') === 'true';
  });
  
  // Reactive authentication state
  const [isAuthed, setIsAuthed] = useState(() => libIsAuthed());
  
  // Check auth state on mount and when localStorage changes
  useEffect(() => {
    const checkAuthState = () => {
      setIsAuthed(libIsAuthed());
    };
    
    // Check immediately
    checkAuthState();
    
    // Listen for storage changes (login/logout in other tabs)
    window.addEventListener('storage', checkAuthState);
    
    // Listen for custom auth events
    window.addEventListener('authStateChanged', checkAuthState);
    
    return () => {
      window.removeEventListener('storage', checkAuthState);
      window.removeEventListener('authStateChanged', checkAuthState);
    };
  }, []);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark_mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  // Listen for sessionExpired custom event to open modal (fired by api.ts handleUnauthorized)
  useEffect(() => {
    let timer: any = null;
    const handler = (e: any) => {
      const msg = e?.detail?.message || 'Session expired. Please login again.';
      setSessionExpiredModal({ open: true, message: msg });
      // auto-redirect after 5s
      timer = setTimeout(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Trigger auth state change event
        window.dispatchEvent(new CustomEvent('authStateChanged'));
        
        window.location.href = '/login';
      }, 5000);
    };
    window.addEventListener('sessionExpired', handler as EventListener);
    return () => {
      window.removeEventListener('sessionExpired', handler as EventListener);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Main app render
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
      <Routes>
        <Route
          path="*"
          element={
            <PageLayout
              isAuthed={isAuthed}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              sessionExpiredModal={sessionExpiredModal}
              setSessionExpiredModal={setSessionExpiredModal}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
