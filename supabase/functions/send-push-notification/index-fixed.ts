// Supabase Edge Function for sending push notifications
// This function sends web push notifications using native Deno Web Crypto API

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

// Helper function to convert base64url to Uint8Array
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Generate VAPID JWT token
async function generateVAPIDToken(endpoint: string): Promise<string> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error('VAPID keys not configured');
  }

  const privateKey = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  
  // Import VAPID private key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKey,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );

  // Create JWT header and payload
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const payload = {
    aud,
    exp,
    sub: VAPID_SUBJECT,
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    key,
    encoder.encode(unsignedToken)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signatureBase64}`;
}

// Send push notification
async function sendWebPush(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<Response> {
  const payloadString = JSON.stringify(payload);
  
  // Generate VAPID token
  const vapidToken = await generateVAPIDToken(subscription.endpoint);

  // Send the push notification
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `vapid t=${vapidToken}, k=${VAPID_PUBLIC_KEY}`,
      'TTL': '86400',
    },
    body: payloadString,
  });

  return response;
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

    // Send the push notification
    const result = await sendWebPush(subscription, payload);
    
    console.log('Push notification sent:', result.status, result.statusText);

    if (result.ok || result.status === 201) {
      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent', statusCode: result.status }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      const errorText = await result.text();
      console.error('Push service error:', result.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Push service error',
          status: result.status,
          message: errorText
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
