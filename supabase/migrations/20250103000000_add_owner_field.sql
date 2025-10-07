/*
  # Add owner field to work_entries and broker_entries tables

  1. Schema Updates
    - Add `owner` field to `work_entries` table with options 'Rohini' or 'Laxmi'
    - Add `owner` field to `broker_entries` table with options 'Rohini' or 'Laxmi'
    - Set default value to 'Rohini' for existing records
    - Add check constraints to ensure only valid owner values

  2. Indexes
    - Add indexes for efficient filtering by owner

  3. Security
    - No changes to RLS policies needed as owner field doesn't affect access control
*/

-- Add owner field to work_entries table
ALTER TABLE work_entries 
ADD COLUMN owner text NOT NULL DEFAULT 'Rohini' 
CHECK (owner IN ('Rohini', 'Laxmi'));

-- Add owner field to broker_entries table  
ALTER TABLE broker_entries 
ADD COLUMN owner text NOT NULL DEFAULT 'Rohini' 
CHECK (owner IN ('Rohini', 'Laxmi'));

-- Create indexes for efficient filtering by owner
CREATE INDEX IF NOT EXISTS idx_work_entries_owner ON work_entries (owner);
CREATE INDEX IF NOT EXISTS idx_broker_entries_owner ON broker_entries (owner);

-- Create composite indexes for owner + date filtering
CREATE INDEX IF NOT EXISTS idx_work_entries_owner_date ON work_entries (owner, date DESC);
CREATE INDEX IF NOT EXISTS idx_broker_entries_owner_date ON broker_entries (owner, date DESC);
