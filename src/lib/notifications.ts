import { supabase } from './supabase';

export type NotificationSubscription = {
  id?: string;
  user_id: string;
  subscription_json: string;
  created_at?: string;
  updated_at?: string;
};

// Base64 to Uint8Array conversion for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications');
    return 'denied';
  }

  return await Notification.requestPermission();
}

// Subscribe user to push notifications
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('Service workers are not supported');
      return false;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if Push API is supported
    if (!('PushManager' in window)) {
      console.error('Push notifications are not supported');
      return false;
    }

    // Get VAPID public key from environment
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VAPID public key not found in environment variables');
      return false;
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Save subscription to database
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert([
        {
          user_id: userId,
          subscription_json: JSON.stringify(subscription),
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving subscription:', error);
      return false;
    }

    console.log('Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove subscription from database
    const { error } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing subscription:', error);
      return false;
    }

    console.log('Successfully unsubscribed from push notifications');
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Check if user is subscribed
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

// Send notification (This would typically be done on the server side)
// For client-side, we'll trigger a Supabase function
export async function sendNotification(
  targetUserId: string,
  title: string,
  body: string,
  icon?: string
): Promise<boolean> {
  try {
    // Get the subscription for the target user
    const { data, error } = await supabase
      .from('notification_subscriptions')
      .select('subscription_json')
      .eq('user_id', targetUserId)
      .single();

    if (error || !data) {
      console.error('No subscription found for user:', targetUserId);
      return false;
    }

    // Call Supabase Edge Function to send notification
    // Note: This requires setting up a Supabase Edge Function
    const { error: funcError } = await supabase.functions.invoke('send-push-notification', {
      body: {
        subscription: JSON.parse(data.subscription_json),
        payload: {
          title,
          body,
          icon: icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-64x64.png'
        }
      }
    });

    if (funcError) {
      console.error('Error sending notification:', funcError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

// Broadcast notification to all subscribed users
export async function broadcastNotification(
  title: string,
  body: string,
  icon?: string
): Promise<boolean> {
  try {
    console.log('🔔 Broadcasting notification:', { title, body });
    
    // ALWAYS show local notification first (immediate feedback)
    console.log('📱 Showing local notification...');
    showLocalNotification(title, body, icon);
    
    // Get all subscriptions
    console.log('📡 Fetching push subscriptions from database...');
    const { data, error } = await supabase
      .from('notification_subscriptions')
      .select('*');

    if (error) {
      console.error('❌ Error fetching subscriptions:', error);
      return true; // Still return true since local notification was shown
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No push subscriptions found (local notification already shown)');
      return true;
    }

    console.log(`✅ Found ${data.length} subscription(s), sending push notifications...`);

    // Try to send via Edge Function (background delivery)
    const promises = data.map(async (sub) => {
      try {
        const result = await supabase.functions.invoke('send-push-notification', {
          body: {
            subscription: JSON.parse(sub.subscription_json),
            payload: {
              title,
              body,
              icon: icon || '/icons/icon-192x192.png',
              badge: '/icons/icon-64x64.png',
              data: {
                url: '/',
                timestamp: Date.now()
              }
            }
          }
        });
        
        if (result.error) {
          console.error('❌ Edge function error:', result.error);
        } else {
          console.log('✅ Push notification sent via Edge Function');
        }
        
        return result;
      } catch (err) {
        console.error('❌ Failed to send to subscriber:', err);
        return null;
      }
    });

    await Promise.all(promises);
    console.log('✅ All push notifications processed');
    
    return true;
  } catch (error) {
    console.error('❌ Error broadcasting notification:', error);
    // Local notification already shown at the start
    return true; // Still return true since user saw the notification
  }
}

// Show local notification (fallback if push fails)
export function showLocalNotification(title: string, body: string, icon?: string) {
  console.log('🔔 showLocalNotification called:', { title, body, permission: Notification?.permission });
  
  if (!('Notification' in window)) {
    console.error('❌ This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    console.log('✅ Showing notification...');
    const notification = new Notification(title, {
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-64x64.png',
      tag: 'kbs-notification',
      requireInteraction: false
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    console.log('✅ Notification displayed successfully');
  } else {
    console.warn(`⚠️ Notification permission is: ${Notification.permission}. Please enable notifications.`);
  }
}
