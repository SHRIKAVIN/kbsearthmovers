# Environment Variables Example

Copy this to your `.env` file and fill in the values.

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Push Notifications (VAPID Keys)
# Generate using: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key

# Note: The VAPID private key should ONLY be set in Supabase Edge Function secrets
# Never commit the private key to version control
# Set it using: supabase secrets set VAPID_PRIVATE_KEY="your_private_key"
```

## How to Generate VAPID Keys

1. Install web-push globally:
   ```bash
   npm install -g web-push
   ```

2. Generate keys:
   ```bash
   web-push generate-vapid-keys
   ```

3. Copy the public key to your `.env` file as `VITE_VAPID_PUBLIC_KEY`
4. Set the private key in Supabase secrets (see NOTIFICATION_SETUP.md)
