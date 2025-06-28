import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (username: string) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const ADMIN_PASSWORD = 'kbs2025';
  const adminUsers = [
    'BHASKARAN K',
    'SHRINIVAS B', 
    'SHRIKAVIN B'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate loading for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if username is selected and password matches
    if (!credentials.username.trim()) {
      setError('Please select your username');
      setIsLoading(false);
      return;
    }

    if (!adminUsers.includes(credentials.username.trim())) {
      setError('Invalid username. Please select from the dropdown.');
      setIsLoading(false);
      return;
    }

    if (credentials.password !== ADMIN_PASSWORD) {
      setError('Invalid password. Please check your password and try again.');
      setIsLoading(false);
      return;
    }

    // Login successful - use the selected username
    onLogin(credentials.username.trim());
    navigate('/admin');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-amber-50 to-orange-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="text-center">
          <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
            <Lock className="h-12 w-12 text-amber-600 mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h2>
          <p className="text-gray-600">KBS EARTHMOVERS & HARVESTER</p>
          <p className="text-sm text-gray-500 mt-1">Access the admin dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white shadow-xl rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Dropdown */}
            <div className="animate-slide-in-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Select Admin User *
              </label>
              <select
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                required
              >
                <option value="">Select admin user</option>
                {adminUsers.map((user, index) => (
                  <option key={index} value={user}>{user}</option>
                ))}
              </select>
            </div>

            {/* Password Field */}
            <div className="animate-slide-in-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="inline h-4 w-4 mr-1" />
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 pr-12"
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-shake">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In to Admin Panel'
              )}
            </button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;