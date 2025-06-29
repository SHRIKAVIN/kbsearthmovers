import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, X, Check, Trash2, Settings, User, Clock, Edit, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';

const NotificationPanel: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearNotification,
    clearAllNotifications,
    requestPermission,
    isPermissionGranted
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    setExpandedNotification(expandedNotification === id ? null : id);
  };

  const handleSettingsClick = async () => {
    if (!isPermissionGranted && !isRequestingPermission) {
      setIsRequestingPermission(true);
      try {
        const granted = await requestPermission();
        if (granted) {
          // Show a test notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Notifications Enabled', {
              body: 'You will now receive push notifications for new work entries.',
              icon: '/Logo for KBS Earthmovers - Bold Industrial Design.png',
              tag: 'test-notification'
            });
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      } finally {
        setIsRequestingPermission(false);
      }
    }
    setShowSettings(!showSettings);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <Plus className="h-3 w-3" />;
      case 'updated': return <Edit className="h-3 w-3" />;
      case 'deleted': return <Minus className="h-3 w-3" />;
      default: return <Bell className="h-3 w-3" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-green-600 bg-green-100';
      case 'updated': return 'text-blue-600 bg-blue-100';
      case 'deleted': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
      >
        <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-pulse text-[10px] sm:text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[85vh] sm:max-h-[32rem] overflow-hidden">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={handleSettingsClick}
                  disabled={isRequestingPermission}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                  title="Notification Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Push Notifications</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isPermissionGranted 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isPermissionGranted ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                {!isPermissionGranted ? (
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        setIsRequestingPermission(true);
                        try {
                          const granted = await requestPermission();
                          if (granted) {
                            // Show a test notification
                            if ('Notification' in window && Notification.permission === 'granted') {
                              new Notification('Notifications Enabled', {
                                body: 'You will now receive push notifications for new work entries.',
                                icon: '/Logo for KBS Earthmovers - Bold Industrial Design.png',
                                tag: 'test-notification'
                              });
                            }
                          }
                        } catch (error) {
                          console.error('Error requesting notification permission:', error);
                        } finally {
                          setIsRequestingPermission(false);
                        }
                      }}
                      disabled={isRequestingPermission}
                      className="w-full text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-3 py-2 rounded transition-colors font-medium disabled:cursor-not-allowed"
                    >
                      {isRequestingPermission ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          Requesting...
                        </div>
                      ) : (
                        'Enable Push Notifications'
                      )}
                    </button>
                    <p className="text-xs text-gray-600">
                      Click to enable instant notifications for new work entries
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                    ✓ Push notifications are enabled. You'll receive alerts for new entries.
                  </div>
                )}
              </div>
            )}

            {/* Clear All Button */}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="mt-2 text-xs text-red-600 hover:text-red-800 flex items-center"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-64 sm:max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center mb-1">
                          <span className="mr-2 text-sm">{getNotificationIcon(notification.type)}</span>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        
                        {/* Performer Info */}
                        {notification.details && (
                          <div className="flex items-center mb-2">
                            <div className={`p-1 rounded-full mr-2 ${getActionColor(notification.details.action)}`}>
                              {getActionIcon(notification.details.action)}
                            </div>
                            <div className="flex items-center text-xs text-gray-600 flex-wrap">
                              <User className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="font-medium truncate max-w-20 sm:max-w-none">{notification.details.performer}</span>
                              <span className="mx-1">•</span>
                              <span className={`px-1 py-0.5 rounded text-xs flex-shrink-0 ${
                                notification.details.performerType === 'admin' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {notification.details.performerType}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {/* Expanded Details */}
                        {expandedNotification === notification.id && notification.details?.entryData && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {notification.details.entryData.rentalPerson && (
                                <div className="truncate"><strong>Client:</strong> {notification.details.entryData.rentalPerson}</div>
                              )}
                              {notification.details.entryData.machineType && (
                                <div><strong>Machine:</strong> {notification.details.entryData.machineType}</div>
                              )}
                              {notification.details.entryData.driver && (
                                <div className="truncate"><strong>Driver:</strong> {notification.details.entryData.driver}</div>
                              )}
                              {notification.details.entryData.hours && (
                                <div><strong>Hours:</strong> {notification.details.entryData.hours}</div>
                              )}
                              {notification.details.entryData.totalAmount && (
                                <div><strong>Amount:</strong> ₹{notification.details.entryData.totalAmount}</div>
                              )}
                              {notification.details.entryData.date && (
                                <div><strong>Date:</strong> {notification.details.entryData.date}</div>
                              )}
                            </div>
                            {notification.details.entryData.changes && notification.details.entryData.changes.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <strong>Changes:</strong>
                                <ul className="mt-1 space-y-1">
                                  {notification.details.entryData.changes.map((change: string, index: number) => (
                                    <li key={index} className="text-xs text-gray-600 truncate">• {change}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(notification.timestamp, 'MMM dd, HH:mm')}
                          </p>
                          {notification.details && (
                            <span className="text-xs text-gray-500 hidden sm:block">
                              {expandedNotification === notification.id ? 'Tap to collapse' : 'Tap for details'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center space-y-1 ml-1">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove notification"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;