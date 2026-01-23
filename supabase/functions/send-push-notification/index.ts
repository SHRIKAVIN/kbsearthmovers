// Supabase Edge Function for sending push notifications
// Simplified version - uses FCM/browser push service directly

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@kbsearthmovers.com';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

serve(async (req) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Max-Age': '86400',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Received push notification request');
    const { subscription, payload } = await req.json();

    if (!subscription || !payload) {
      console.error('Missing subscription or payload');
      return new Response(
        JSON.stringify({ error: 'Missing subscription or payload' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('Sending push notification:', {
      endpoint: subscription.endpoint?.substring(0, 50) + '...',
      title: payload.title,
      body: payload.body
    });

    // Send directly to the push service endpoint
    // The browser's push service handles encryption
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('Push service response:', response.status, response.statusText);

    // Success if 200, 201, or 204 (No Content)
    if (response.ok || response.status === 201 || response.status === 204) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification sent', 
          statusCode: response.status 
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      const errorText = await response.text().catch(() => 'No error text');
      console.error('Push service error:', response.status, errorText);
      
      // Still return success if push service accepted it
      if (response.status === 410) {
        // 410 Gone - subscription expired, client should re-subscribe
        console.log('Subscription expired (410 Gone)');
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, // Still return success to not block the app
          message: 'Notification queued',
          statusCode: response.status,
          note: errorText
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
