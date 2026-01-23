#!/bin/bash

# KBS Harvesters - Notification System Deployment Script
# This script deploys the push notification Edge Function to Supabase

echo "🚀 KBS Harvesters - Notification Deployment"
echo "=========================================="
echo ""

# VAPID Keys
VAPID_PUBLIC="BISA11WMFJPbEAYz1jfudKuopsKGzHXrx6ssuIGxBD6Q85196tl8F2wSZ3B5bqINzBXwv4g6IZ6gCNbglpA8A5o"
VAPID_PRIVATE="fp_lA9zhX4SRoSjAYq2yzZZS98q67CUpQnV8SbW5ecg"
VAPID_SUBJECT="mailto:admin@kbsearthmovers.com"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN not set"
    echo ""
    echo "To set it up:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Create a new access token"
    echo "3. Run: export SUPABASE_ACCESS_TOKEN=your_token_here"
    echo "4. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Access token found"
echo ""

# Get project reference
echo "📋 Please enter your Supabase project reference:"
echo "   (Find it in your Supabase dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF)"
read -p "Project Ref: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required"
    exit 1
fi

echo ""
echo "🔗 Linking project..."
supabase link --project-ref "$PROJECT_REF"

if [ $? -ne 0 ]; then
    echo "❌ Failed to link project"
    exit 1
fi

echo "✅ Project linked"
echo ""

# Set secrets
echo "🔐 Setting VAPID secrets..."
supabase secrets set VAPID_PUBLIC_KEY="$VAPID_PUBLIC"
supabase secrets set VAPID_PRIVATE_KEY="$VAPID_PRIVATE"
supabase secrets set VAPID_SUBJECT="$VAPID_SUBJECT"

if [ $? -ne 0 ]; then
    echo "❌ Failed to set secrets"
    exit 1
fi

echo "✅ Secrets configured"
echo ""

# Deploy Edge Function
echo "📦 Deploying Edge Function..."
supabase functions deploy send-push-notification

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Make sure you added VITE_VAPID_PUBLIC_KEY to your .env file"
echo "2. Run the SQL migration in Supabase dashboard (SQL Editor)"
echo "3. Build and deploy your app: npm run build"
echo "4. Test notifications in the admin panel"
echo ""
