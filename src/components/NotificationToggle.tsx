import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  isSubscribed,
  requestNotificationPermission 
} from '../lib/notifications';

interface NotificationToggleProps {
  userId: string;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ userId }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
    checkPermissionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    const status = await isSubscribed();
    setSubscribed(status);
  };

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        // Unsubscribe
        const success = await unsubscribeFromPushNotifications(userId);
        if (success) {
          setSubscribed(false);
          console.log('Unsubscribed from notifications');
        }
      } else {
        // Subscribe
        const success = await subscribeToPushNotifications(userId);
        if (success) {
          setSubscribed(true);
          console.log('Subscribed to notifications');
          
          // Show a test notification
          if (Notification.permission === 'granted') {
            new Notification('Notifications Enabled! 🔔', {
              body: `You'll now receive updates about new entries and admin actions.`,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-64x64.png'
            });
          }
        } else {
          // Permission might be denied
          checkPermissionStatus();
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        // Automatically subscribe after permission granted
        handleToggle();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if notifications are not supported
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  // If permission is denied, show a message
  if (permission === 'denied') {
    return (
      <div className="relative">
        <button
          className="p-2 rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed"
          disabled
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          title="Notifications blocked"
        >
          <BellOff className="h-5 w-5" />
        </button>
        {showTooltip && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-50 shadow-xl">
            Notifications are blocked. Please enable them in your browser settings.
          </div>
        )}
      </div>
    );
  }

  // If permission needs to be requested
  if (permission === 'default') {
    return (
      <button
        onClick={handleRequestPermission}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors duration-200 disabled:opacity-50"
      >
        <Bell className="h-5 w-5" />
        <span className="text-sm font-medium">Enable Notifications</span>
      </button>
    );
  }

  // Permission granted - show toggle
  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={loading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${
          subscribed
            ? 'bg-green-100 text-green-600 hover:bg-green-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${loading ? 'opacity-50 cursor-wait' : ''}`}
        title={subscribed ? 'Notifications enabled' : 'Enable notifications'}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
        ) : subscribed ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </button>
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 shadow-xl">
          {subscribed 
            ? 'Click to disable notifications' 
            : 'Click to enable notifications'}
        </div>
      )}
    </div>
  );
};

export default NotificationToggle;
