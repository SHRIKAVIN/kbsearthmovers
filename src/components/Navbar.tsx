import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const navigation = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Weather', path: '/weather' },
    { name: 'Driver Entry', path: '/driver-entry' },
    { name: 'Admin Login', path: '/admin-login' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      ref={navRef}
      data-testid="navbar"
      className="bg-white shadow-lg sticky top-0 z-50 backdrop-blur-md bg-white/95"
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top), 0px)',
        scrollBehavior: 'auto'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          
          {/* Logo + Text */}
          <Link
            data-testid="navbar-logo"
            to="/"
            className="flex items-center space-x-2 group"
          >
            <div className="transform group-hover:scale-110 transition-transform duration-300">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-1.5 sm:p-2 rounded-lg shadow-sm">
                <img
                  src="/Logo for KBS Earthmovers - Bold Industrial Design.png"
                  alt="KBS Earthmovers Logo"
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              <span className="text-amber-600">KBS</span> HARVESTERS
            </div>
          </Link>

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
              className="inline-flex items-center justify-center p-3 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 group"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              <div className="relative w-6 h-5 flex flex-col justify-between">
                {/* Top line */}
                <span
                  className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out ${
                    isOpen ? 'rotate-45 translate-y-2' : 'rotate-0 translate-y-0'
                  }`}
                />
                {/* Middle line */}
                <span
                  className={`block h-0.5 w-6 bg-current transition-all duration-300 ease-in-out ${
                    isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                  }`}
                />
                {/* Bottom line */}
                <span
                  className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out ${
                    isOpen ? '-rotate-45 -translate-y-2' : 'rotate-0 translate-y-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            data-testid="mobile-menu"
            className={`transform transition-all duration-300 ease-in-out ${
              isOpen ? 'translate-y-0' : '-translate-y-4'
            }`}
          >
            <div className="px-3 pt-2 pb-3 space-y-2 bg-white border-t border-gray-200 shadow-lg">
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  data-testid={`mobile-nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 transform hover:translate-x-2 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  style={{
                    transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                  }}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
