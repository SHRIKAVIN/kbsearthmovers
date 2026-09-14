import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import ContactPage from './pages/ContactPage';
import PublicPayPage from './pages/PublicPayPage';
import DriverLogin from './pages/DriverLogin';
import DriverApp from './pages/DriverApp';
import { loadSession, saveSession, clearSession, type Driver } from './lib/driverAuth';
import { useManifest } from './lib/useManifest';
import QrStickerPage from './pages/QrStickerPage';

/**
 * The customer-facing payment page and the printable sticker are standalone sheets -
 * a customer who scanned a QR on a harvester should see one decision, not the whole
 * marketing site.
 */
const CHROMELESS_ROUTES = ['/pay', '/admin/qr-sticker', '/driver', '/driver-entry'];

function Chrome() {
  const { pathname } = useLocation();
  if (CHROMELESS_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}

/**
 * The driver app installs as its own home-screen app, scoped to /driver, so a driver
 * gets a tool rather than the company website with a form inside it.
 */
function DriverRoute() {
  useManifest('/driver-manifest.json');
  const [driver, setDriver] = useState<Driver | null>(() => loadSession());

  if (!driver) {
    return (
      <DriverLogin
        onSignIn={(signedIn) => {
          saveSession(signedIn);
          setDriver(signedIn);
        }}
      />
    );
  }

  return (
    <DriverApp
      driver={driver}
      onSignOut={() => {
        clearSession();
        setDriver(null);
      }}
    />
  );
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
          <Route path="/driver" element={<DriverRoute />} />
          {/* The old public form: kept so existing bookmarks and the installed app
              still land somewhere, now behind the same sign-in. */}
          <Route path="/driver-entry" element={<Navigate to="/driver" replace />} />
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