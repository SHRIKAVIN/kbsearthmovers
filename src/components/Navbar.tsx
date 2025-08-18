import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Driver Entry', path: '/driver-entry' },
    { name: 'Admin Login', path: '/admin-login' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav data-testid="navbar" className="bg-white shadow-lg sticky top-0 z-50 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link data-testid="navbar-logo" to="/" className="flex items-center space-x-2 group">
              <div className="transform group-hover:scale-110 transition-transform duration-300">
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-2 rounded-lg">
                  <img src="/Logo for KBS Earthmovers - Bold Industrial Design.png" alt="KBS Earthmovers Logo" className="h-10 w-10 object-contain" />
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900">
                <span className="text-amber-600">KBS</span> Harvesters
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  data-testid={`nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              data-testid="mobile-menu-button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div data-testid="mobile-menu" className="md:hidden animate-fade-in-down">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200 shadow-lg">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  data-testid={`mobile-nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;