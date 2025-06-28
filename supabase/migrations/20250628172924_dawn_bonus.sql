/*
  # Fix RLS policies for anonymous user access

  This migration updates the Row Level Security policies for the work_entries table
  to allow anonymous users to perform all necessary operations (SELECT, INSERT, UPDATE, DELETE).
  
  ## Changes
  1. Add policy for anonymous users to read all work entries
  2. Add policy for anonymous users to insert any type of entry
  3. Add policy for anonymous users to update work entries
  4. Add policy for anonymous users to delete work entries
  
  ## Security Note
  This allows full anonymous access to the work_entries table. In a production environment,
  you should implement proper authentication and more restrictive policies.
*/

-- Allow anonymous users to read all work entries
CREATE POLICY "Allow anonymous read for work entries"
  ON work_entries
  FOR SELECT
  TO anon
  USING (true);

-- Update the existing anonymous insert policy to allow all entry types
DROP POLICY IF EXISTS "Enable anonymous insert for driver entries" ON work_entries;

CREATE POLICY "Allow anonymous insert for all entries"
  ON work_entries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update work entries
CREATE POLICY "Allow anonymous update for work entries"
  ON work_entries
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to delete work entries
CREATE POLICY "Allow anonymous delete for work entries"
  ON work_entries
  FOR DELETE
  TO anon
  USING (true);