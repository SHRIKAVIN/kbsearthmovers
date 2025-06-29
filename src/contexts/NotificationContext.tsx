import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  details?: {
    action: string;
    performer: string;
    performerType: 'driver' | 'admin';
    entryData?: any;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
  requestPermission: () => Promise<boolean>;
  isPermissionGranted: boolean;
  permissionState: 'default' | 'granted' | 'denied';
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    // Check if browser supports notifications and update permission status
    const updatePermissionStatus = () => {
      if ('Notification' in window) {
        const permission = Notification.permission;
        setPermissionState(permission);
        setIsPermissionGranted(permission === 'granted');
        console.log('Notification permission status:', permission);
      } else {
        console.log('Notifications not supported in this browser');
        setPermissionState('denied');
        setIsPermissionGranted(false);
      }
    };
    
    updatePermissionStatus();
    
    // Listen for permission changes (if supported)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((permission) => {
        permission.addEventListener('change', updatePermissionStatus);
        return () => permission.removeEventListener('change', updatePermissionStatus);
      }).catch((error) => {
        console.log('Permissions API not supported or failed:', error);
      });
    }

    // Load notifications from localStorage
    const savedNotifications = localStorage.getItem('kbs-notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }

    // Set up real-time subscription for INSERT operations
    const insertSubscription = supabase
      .channel('work_entries_insert')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'work_entries' },
        (payload) => {
          console.log('New work entry detected:', payload);
          const newEntry = payload.new;
          
          const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
            title: 'New Work Entry Created',
            message: `${newEntry.driver_name} submitted a new ${newEntry.machine_type} entry for ${newEntry.rental_person_name}`,
            type: 'info',
            details: {
              action: 'created',
              performer: newEntry.driver_name,
              performerType: newEntry.entry_type || 'driver',
              entryData: {
                rentalPerson: newEntry.rental_person_name,
                machineType: newEntry.machine_type,
                hours: newEntry.hours_driven,
                totalAmount: newEntry.total_amount,
                date: newEntry.date,
                time: newEntry.time
              }
            }
          };
          
          addNotification(notification);
        }
      )
      .subscribe((status) => {
        console.log('Insert subscription status:', status);
      });

    // Set up real-time subscription for UPDATE operations
    const updateSubscription = supabase
      .channel('work_entries_update')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'work_entries' },
        (payload) => {
          console.log('Work entry updated:', payload);
          const updatedEntry = payload.new;
          const oldEntry = payload.old;
          
          const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
            title: 'Work Entry Updated',
            message: `Entry for ${updatedEntry.rental_person_name} has been updated by admin`,
            type: 'info',
            details: {
              action: 'updated',
              performer: 'Admin User',
              performerType: 'admin',
              entryData: {
                rentalPerson: updatedEntry.rental_person_name,
                machineType: updatedEntry.machine_type,
                driver: updatedEntry.driver_name,
                changes: getChanges(oldEntry, updatedEntry)
              }
            }
          };
          
          addNotification(notification);
        }
      )
      .subscribe((status) => {
        console.log('Update subscription status:', status);
      });

    // Set up real-time subscription for DELETE operations
    const deleteSubscription = supabase
      .channel('work_entries_delete')
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'work_entries' },
        (payload) => {
          console.log('Work entry deleted:', payload);
          const deletedEntry = payload.old;
          
          const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
            title: 'Work Entry Deleted',
            message: `Entry for ${deletedEntry.rental_person_name} has been deleted by admin`,
            type: 'warning',
            details: {
              action: 'deleted',
              performer: 'Admin User',
              performerType: 'admin',
              entryData: {
                rentalPerson: deletedEntry.rental_person_name,
                machineType: deletedEntry.machine_type,
                driver: deletedEntry.driver_name,
                date: deletedEntry.date
              }
            }
          };
          
          addNotification(notification);
        }
      )
      .subscribe((status) => {
        console.log('Delete subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from all notifications');
      insertSubscription.unsubscribe();
      updateSubscription.unsubscribe();
      deleteSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Save notifications to localStorage
    localStorage.setItem('kbs-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const getChanges = (oldEntry: any, newEntry: any) => {
    const changes: string[] = [];
    
    if (oldEntry.hours_driven !== newEntry.hours_driven) {
      changes.push(`Hours: ${oldEntry.hours_driven} → ${newEntry.hours_driven}`);
    }
    if (oldEntry.total_amount !== newEntry.total_amount) {
      changes.push(`Total: ₹${oldEntry.total_amount} → ₹${newEntry.total_amount}`);
    }
    if (oldEntry.amount_received !== newEntry.amount_received) {
      changes.push(`Received: ₹${oldEntry.amount_received} → ₹${newEntry.amount_received}`);
    }
    if (oldEntry.advance_amount !== newEntry.advance_amount) {
      changes.push(`Advance: ₹${oldEntry.advance_amount} → ₹${newEntry.advance_amount}`);
    }
    
    return changes;
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    console.log('Adding notification:', notification);
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only last 50 notifications
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/Logo for KBS Earthmovers - Bold Industrial Design.png',
          badge: '/Logo for KBS Earthmovers - Bold Industrial Design.png',
          tag: newNotification.id,
          requireInteraction: false,
          silent: false
        });

        // Auto-close browser notification after 5 seconds
        setTimeout(() => {
          browserNotification.close();
        }, 5000);

        // Handle notification click
        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
        };
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const requestPermission = async (): Promise<boolean> => {
    console.log('Requesting notification permission...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      throw new Error('This browser does not support notifications');
    }

    // Check current permission status
    const currentPermission = Notification.permission;
    console.log('Current permission status:', currentPermission);

    if (currentPermission === 'granted') {
      setIsPermissionGranted(true);
      setPermissionState('granted');
      return true;
    }

    if (currentPermission === 'denied') {
      console.error('Notification permission was previously denied');
      setPermissionState('denied');
      throw new Error('Notification permission was denied. Please enable it in your browser settings.');
    }

    try {
      console.log('Requesting permission from user...');
      
      // Request permission - this should trigger the browser's permission dialog
      const permission = await new Promise<NotificationPermission>((resolve) => {
        // Use the callback version as fallback for older browsers
        if (typeof Notification.requestPermission === 'function') {
          const result = Notification.requestPermission();
          if (result && typeof result.then === 'function') {
            // Promise-based
            result.then(resolve);
          } else {
            // Callback-based (older browsers)
            Notification.requestPermission(resolve);
          }
        } else {
          resolve('denied');
        }
      });

      console.log('Permission result:', permission);
      
      const granted = permission === 'granted';
      setIsPermissionGranted(granted);
      setPermissionState(permission);
      
      if (granted) {
        console.log('Notification permission granted successfully');
        
        // Show a test notification immediately
        try {
          const testNotification = new Notification('Notifications Enabled! 🎉', {
            body: 'You will now receive push notifications for new work entries.',
            icon: '/Logo for KBS Earthmovers - Bold Industrial Design.png',
            tag: 'test-notification',
            requireInteraction: false
          });

          setTimeout(() => {
            testNotification.close();
          }, 4000);

          testNotification.onclick = () => {
            window.focus();
            testNotification.close();
          };
        } catch (testError) {
          console.error('Error showing test notification:', testError);
        }
        
        return true;
      } else {
        console.log('Notification permission denied by user');
        throw new Error('Notification permission was denied. Please try again or enable it in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setPermissionState('denied');
      throw new Error('Failed to request notification permission. Please try again or check your browser settings.');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      clearNotification,
      clearAllNotifications,
      unreadCount,
      requestPermission,
      isPermissionGranted,
      permissionState
    }}>
      {children}
    </NotificationContext.Provider>
  );
};