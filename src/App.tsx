import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import DriverEntryPage from './pages/DriverEntryPage';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import ContactPage from './pages/ContactPage';
import WeatherPage from './pages/WeatherPage';

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
    <BrowserRouter>
      <div data-testid="app-container" className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/driver-entry" element={<DriverEntryPage />} />
          <Route path="/weather" element={<WeatherPage />} />
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
  );
}

export default App;