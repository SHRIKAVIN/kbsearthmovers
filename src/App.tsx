import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import DriverEntryPage from './pages/DriverEntryPage';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import ContactPage from './pages/ContactPage';
import PublicPayPage from './pages/PublicPayPage';
import QrStickerPage from './pages/QrStickerPage';

/**
 * The customer-facing payment page and the printable sticker are standalone sheets -
 * a customer who scanned a QR on a harvester should see one decision, not the whole
 * marketing site.
 */
const CHROMELESS_ROUTES = ['/pay', '/admin/qr-sticker'];

function Chrome() {
  const { pathname } = useLocation();
  if (CHROMELESS_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}

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
        <Chrome />
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
          {/* Public: reached by scanning the QR sticker on the harvester. */}
          <Route path="/pay" element={<PublicPayPage />} />
          <Route
            path="/admin/qr-sticker"
            element={adminUser ? <QrStickerPage /> : <Navigate to="/admin-login" replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;