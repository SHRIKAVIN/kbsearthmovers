/*
  # Fix Row Level Security policies for work_entries table

  1. Security Updates
    - Drop existing policies that might be conflicting
    - Create new comprehensive policies for work_entries table
    - Allow anonymous users to insert driver entries
    - Allow authenticated users full CRUD access
    - Ensure policies are properly configured for the application workflow

  2. Changes Made
    - Remove old policies to avoid conflicts
    - Add policy for anonymous INSERT operations (driver entries)
    - Add policies for authenticated users (admin operations)
    - Ensure RLS is enabled on the table
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public insert for work entries" ON work_entries;
DROP POLICY IF EXISTS "Allow authenticated read for work entries" ON work_entries;
DROP POLICY IF EXISTS "Allow authenticated update for work entries" ON work_entries;
DROP POLICY IF EXISTS "Allow authenticated delete for work entries" ON work_entries;

-- Ensure RLS is enabled
ALTER TABLE work_entries ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous users to insert driver entries
CREATE POLICY "Allow anonymous insert for driver entries"
  ON work_entries
  FOR INSERT
  TO anon
  WITH CHECK (entry_type = 'driver');

-- Policy for authenticated users to read all entries
CREATE POLICY "Allow authenticated read for work entries"
  ON work_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for authenticated users to insert any entries (admin entries)
CREATE POLICY "Allow authenticated insert for work entries"
  ON work_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for authenticated users to update entries
CREATE POLICY "Allow authenticated update for work entries"
  ON work_entries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users to delete entries
CREATE POLICY "Allow authenticated delete for work entries"
  ON work_entries
  FOR DELETE
  TO authenticated
  USING (true);