import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import DriverEntryPage from './pages/DriverEntryPage';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import ContactPage from './pages/ContactPage';

function App() {
  const [adminUser, setAdminUser] = useState<string | null>(null);

  // Load admin session from localStorage on app start
  useEffect(() => {
    const savedAdminUser = localStorage.getItem('kbs_admin_user');
    if (savedAdminUser) {
      setAdminUser(savedAdminUser);
    }
  }, []);

  const handleAdminLogin = (username: string) => {
    setAdminUser(username);
    localStorage.setItem('kbs_admin_user', username);
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('kbs_admin_user');
  };

  return (
    <ThemeProvider>
      <NotificationProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/driver-entry" element={<DriverEntryPage />} />
              <Route 
                path="/admin-login" 
                element={
                  adminUser ? 
                    <Navigate to="/admin" replace /> : 
                    <AdminLogin onLogin={handleAdminLogin} />
                } 
              />
              <Route 
                path="/admin" 
                element={
                  adminUser ? 
                    <AdminPanel adminUser={adminUser} onLogout={handleAdminLogout} /> : 
                    <Navigate to="/admin-login" replace />
                } 
              />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;