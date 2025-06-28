/*
  # Fix RLS policy for driver entries

  1. Security Changes
    - Drop existing anonymous insert policy that's not working correctly
    - Create new policy that properly allows anonymous users to insert driver entries
    - Ensure the policy condition matches the entry_type field correctly

  2. Policy Details
    - Allow anonymous (anon) role to INSERT into work_entries table
    - Only when entry_type is 'driver'
    - This enables the driver entry form to work without authentication
*/

-- Drop the existing policy that's not working
DROP POLICY IF EXISTS "Allow anonymous insert for driver entries" ON work_entries;

-- Create a new policy that properly allows anonymous inserts for driver entries
CREATE POLICY "Enable anonymous insert for driver entries"
  ON work_entries
  FOR INSERT
  TO anon
  WITH CHECK (entry_type = 'driver');

-- Ensure RLS is enabled (should already be enabled but just to be safe)
ALTER TABLE work_entries ENABLE ROW LEVEL SECURITY;