-- Create notification_subscriptions table
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  subscription_json TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their own subscription
CREATE POLICY "Allow users to insert their own subscription"
  ON public.notification_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update their own subscription
CREATE POLICY "Allow users to update their own subscription"
  ON public.notification_subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete their own subscription
CREATE POLICY "Allow users to delete their own subscription"
  ON public.notification_subscriptions
  FOR DELETE
  USING (true);

-- Allow anyone to read subscriptions (needed for broadcasting)
CREATE POLICY "Allow users to read subscriptions"
  ON public.notification_subscriptions
  FOR SELECT
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id 
  ON public.notification_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_created_at 
  ON public.notification_subscriptions(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_subscriptions_updated_at 
  BEFORE UPDATE ON public.notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.notification_subscriptions IS 'Stores push notification subscriptions for users';
COMMENT ON COLUMN public.notification_subscriptions.user_id IS 'Unique identifier for the user (can be admin username or driver ID)';
COMMENT ON COLUMN public.notification_subscriptions.subscription_json IS 'JSON string containing the push subscription object';
