/*
  # Create broker entries table for KBS Earthmover Rental Management

  1. New Tables
    - `broker_entries`
      - `id` (uuid, primary key)
      - `broker_name` (text) - Name of the broker
      - `total_hours` (numeric) - Total hours worked through this broker
      - `total_amount` (numeric) - Total amount for the broker
      - `amount_received` (numeric) - Amount actually received from broker
      - `date` (date) - Date of the broker entry
      - `time` (text) - Time of the broker entry
      - `created_at` (timestamp) - When the entry was created
      - `updated_at` (timestamp) - When the entry was last updated

  2. Security
    - Enable RLS on `broker_entries` table
    - Add policies for anonymous read/insert/update/delete operations
    - Add policies for authenticated users (admin operations)

  3. Indexes
    - Add indexes for efficient querying by date, broker name
*/

CREATE TABLE IF NOT EXISTS broker_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_name text NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_received numeric NOT NULL DEFAULT 0 CHECK (amount_received >= 0),
  date date NOT NULL,
  time text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE broker_entries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read all broker entries
CREATE POLICY "Allow anonymous read for broker entries"
  ON broker_entries
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert broker entries
CREATE POLICY "Allow anonymous insert for broker entries"
  ON broker_entries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update broker entries
CREATE POLICY "Allow anonymous update for broker entries"
  ON broker_entries
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to delete broker entries
CREATE POLICY "Allow anonymous delete for broker entries"
  ON broker_entries
  FOR DELETE
  TO anon
  USING (true);

-- Allow authenticated users to read all broker entries
CREATE POLICY "Allow authenticated read for broker entries"
  ON broker_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert broker entries
CREATE POLICY "Allow authenticated insert for broker entries"
  ON broker_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update broker entries
CREATE POLICY "Allow authenticated update for broker entries"
  ON broker_entries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete broker entries
CREATE POLICY "Allow authenticated delete for broker entries"
  ON broker_entries
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_broker_entries_date ON broker_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_broker_entries_broker_name ON broker_entries (broker_name);
CREATE INDEX IF NOT EXISTS idx_broker_entries_created_at ON broker_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_entries_updated_at ON broker_entries (updated_at DESC);

-- Create a composite index for filtering
CREATE INDEX IF NOT EXISTS idx_broker_entries_filters ON broker_entries (date, broker_name);

-- Create function to update updated_at timestamp for broker entries
CREATE OR REPLACE FUNCTION update_broker_entries_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_broker_entries_updated_at
  BEFORE UPDATE ON broker_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_broker_entries_updated_at_column();