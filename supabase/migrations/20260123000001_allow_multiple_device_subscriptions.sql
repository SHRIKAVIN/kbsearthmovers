-- Allow multiple device subscriptions per user
-- Drop the UNIQUE constraint on user_id to allow same user on multiple devices

-- First, drop the old UNIQUE constraint
ALTER TABLE public.notification_subscriptions 
  DROP CONSTRAINT IF EXISTS notification_subscriptions_user_id_key;

-- Create a unique index on user_id + endpoint using expression
-- This ensures the same device can't subscribe twice, but different devices can
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_subscriptions_user_endpoint 
  ON public.notification_subscriptions(user_id, ((subscription_json::jsonb->>'endpoint')));

-- Add an index on endpoint for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_endpoint 
  ON public.notification_subscriptions(((subscription_json::jsonb->>'endpoint')));

-- Update comment
COMMENT ON TABLE public.notification_subscriptions IS 'Stores push notification subscriptions for users. Multiple devices per user are supported.';
