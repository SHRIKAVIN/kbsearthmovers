# Push Notifications Setup Guide

This guide will help you set up real-time push notifications for the KBS Harvester application.

## Overview

The notification system sends real-time alerts when:
- Drivers submit new work entries
- Admins create, update, or delete entries
- Admins create, update, or delete broker entries

## Prerequisites

1. Node.js installed on your system
2. Supabase project set up
3. Web-push library for generating VAPID keys

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

### Install web-push globally

```bash
npm install -g web-push
```

### Generate VAPID keys

```bash
web-push generate-vapid-keys
```

This will output something like:

```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls

=======================================
```

## Step 2: Configure Environment Variables

### For Local Development (.env file)

Create or update your `.env` file in the root directory:

```env
# Existing Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Add VAPID keys for push notifications
VITE_VAPID_PUBLIC_KEY=your_generated_public_key
```

### For Vercel Deployment

Add these environment variables in your Vercel project settings:

1. Go to your project on Vercel
2. Navigate to Settings → Environment Variables
3. Add:
   - `VITE_VAPID_PUBLIC_KEY` = Your public key

### For Supabase Edge Functions

Set up environment secrets for your Supabase Edge Function:

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets for the Edge Function
supabase secrets set VAPID_PUBLIC_KEY="your_generated_public_key"
supabase secrets set VAPID_PRIVATE_KEY="your_generated_private_key"
supabase secrets set VAPID_SUBJECT="mailto:your-email@example.com"
```

## Step 3: Deploy Supabase Edge Function

Deploy the push notification Edge Function:

```bash
# Navigate to your project directory
cd /path/to/kbsearthmovers

# Deploy the Edge Function
supabase functions deploy send-push-notification
```

## Step 4: Run Database Migration

Apply the notification subscriptions table migration:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in Supabase Dashboard
# Go to SQL Editor and run the migration file:
# supabase/migrations/20260123000000_create_notifications_table.sql
```

## Step 5: Build and Deploy

### For Development

```bash
npm run dev
```

### For Production Build

```bash
npm run build
```

### Deploy to Vercel

```bash
# If not already configured
vercel link

# Deploy
vercel --prod
```

## Step 6: Testing Notifications

### 1. Enable Notifications in Admin Panel

1. Login to the admin panel
2. Click on the bell icon in the top right corner
3. Grant notification permissions when prompted
4. You should see a confirmation notification

### 2. Test Driver Entry Notification

1. Go to the driver entry page
2. Submit a new work entry
3. All subscribed users (including admins) should receive a notification

### 3. Test Admin Actions

1. In the admin panel, create, update, or delete an entry
2. All subscribed users should receive appropriate notifications

## Troubleshooting

### Notifications not appearing

1. **Check browser permissions**: Make sure notifications are allowed in browser settings
2. **Check service worker**: Open DevTools → Application → Service Workers (should show active worker)
3. **Check console**: Look for errors in the browser console
4. **HTTPS required**: Push notifications require HTTPS (works on localhost for dev)

### Service Worker issues

```bash
# Clear service worker cache
# In browser DevTools → Application → Service Workers → Unregister
# Then refresh the page
```

### Edge Function errors

```bash
# Check Edge Function logs
supabase functions logs send-push-notification

# Test Edge Function locally
supabase functions serve send-push-notification
```

## Browser Support

Push notifications are supported in:
- Chrome 50+
- Firefox 44+
- Safari 16+ (macOS 13+)
- Edge 17+
- Opera 37+

**Note**: iOS Safari supports push notifications only in web apps added to home screen.

## Security Considerations

1. **VAPID Keys**: Keep your private key secret. Never commit it to version control.
2. **Environment Variables**: Use proper environment variable management (Vercel, Supabase secrets)
3. **RLS Policies**: The notification_subscriptions table has Row Level Security enabled
4. **HTTPS**: Always use HTTPS in production for security

## Architecture

```
┌─────────────────┐
│  Driver Entry   │──┐
│      Page       │  │
└─────────────────┘  │
                     │
┌─────────────────┐  │  ┌──────────────────┐
│  Admin Panel    │──┼─→│  Supabase DB     │
│                 │  │  │  (work_entries)  │
└─────────────────┘  │  └──────────────────┘
                     │           │
                     ↓           ↓
              ┌─────────────────────────┐
              │  broadcastNotification  │
              │      (client-side)      │
              └─────────────────────────┘
                          │
                          ↓
              ┌─────────────────────────┐
              │   Supabase Edge         │
              │   Function              │
              │   (send-push-           │
              │    notification)        │
              └─────────────────────────┘
                          │
                          ↓
              ┌─────────────────────────┐
              │   Browser Push API      │
              │   (Service Worker)      │
              └─────────────────────────┘
                          │
                          ↓
              ┌─────────────────────────┐
              │   User's Device         │
              │   (Notification)        │
              └─────────────────────────┘
```

## Customization

### Notification Icons

Update notification icons in `/public/icons/` directory:
- `icon-192x192.png` - Notification icon
- `icon-64x64.png` - Badge icon

### Notification Messages

Modify notification messages in:
- `src/pages/AdminPanel.tsx` - Admin action notifications
- `src/pages/DriverEntryPage.tsx` - Driver entry notifications

### Service Worker

Customize service worker behavior in:
- `public/sw-custom.js` - Push notification handling, click actions

## Additional Features

### Future Enhancements

1. **Notification History**: Store notification history in database
2. **Notification Preferences**: Let users choose which notifications to receive
3. **Sound Alerts**: Add custom notification sounds
4. **Action Buttons**: Add quick actions to notifications (e.g., "View Entry")
5. **Scheduled Notifications**: Send reminders for pending tasks

## Support

For issues or questions:
1. Check browser console for errors
2. Review Supabase Edge Function logs
3. Verify environment variables are set correctly
4. Ensure HTTPS is being used in production

## License

This notification system is part of the KBS Harvester application.
