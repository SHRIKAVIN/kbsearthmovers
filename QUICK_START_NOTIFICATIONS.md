# Quick Start Guide - Push Notifications

Get push notifications working in 5 minutes!

## Step 1: Generate VAPID Keys (1 minute)

```bash
# Install web-push if you haven't already
npm install -g web-push

# Generate keys
web-push generate-vapid-keys
```

You'll get output like this:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
Private Key: UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
```

## Step 2: Set Environment Variables (1 minute)

### Local Development

Create/update `.env` file:
```env
VITE_SUPABASE_URL=your_existing_url
VITE_SUPABASE_ANON_KEY=your_existing_key
VITE_VAPID_PUBLIC_KEY=paste_your_public_key_here
```

### Vercel (if deploying)

Add in Vercel dashboard → Settings → Environment Variables:
- `VITE_VAPID_PUBLIC_KEY` = your public key

## Step 3: Setup Supabase (2 minutes)

```bash
# Login to Supabase CLI
supabase login

# Link your project (get project-ref from Supabase dashboard)
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set VAPID_PUBLIC_KEY="your_public_key"
supabase secrets set VAPID_PRIVATE_KEY="your_private_key"
supabase secrets set VAPID_SUBJECT="mailto:your-email@example.com"

# Deploy database migration
supabase db push

# Deploy Edge Function
supabase functions deploy send-push-notification
```

## Step 4: Test Locally (1 minute)

```bash
# Start dev server
npm run dev

# Open browser at http://localhost:5173
# Login as admin
# Click the bell icon 🔔
# Allow notifications when prompted
```

## Step 5: Test Notifications

### Test 1: Driver Entry
1. Go to driver entry page
2. Submit a new entry
3. You should see a notification! 🎉

### Test 2: Admin Action
1. In admin panel, create/edit/delete an entry
2. You should see a notification! 🎉

## That's it! 🚀

Your push notifications are now working!

## Quick Troubleshooting

**Notifications not appearing?**
- Check browser console for errors
- Make sure you clicked "Allow" for notifications
- Check that you're on HTTPS (or localhost for dev)
- Try refreshing the page

**Service worker issues?**
- Open DevTools → Application → Service Workers
- Click "Unregister" and refresh
- Check that service worker is active

**Edge Function errors?**
```bash
# Check logs
supabase functions logs send-push-notification
```

## What's Next?

- Deploy to production (Vercel)
- Customize notification messages
- Add more notification triggers
- Check `NOTIFICATION_SETUP.md` for advanced configuration

## Need Help?

See the detailed guides:
- `NOTIFICATION_SETUP.md` - Complete setup guide
- `NOTIFICATION_IMPLEMENTATION_SUMMARY.md` - Technical details
- Check browser console for error messages
