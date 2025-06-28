/*
  # Enhanced Work Entries Schema

  1. Schema Updates
    - Add `time` column for precise time tracking
    - Add `entry_type` column to distinguish driver vs admin entries
    - Add `updated_at` column for tracking modifications

  2. Indexes
    - Add performance indexes for new columns
    - Optimize filtering and sorting operations

  3. Triggers
    - Add automatic timestamp update trigger
*/

-- Add new columns to existing work_entries table
DO $$
BEGIN
  -- Add time column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_entries' AND column_name = 'time'
  ) THEN
    ALTER TABLE work_entries ADD COLUMN time text;
  END IF;

  -- Add entry_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_entries' AND column_name = 'entry_type'
  ) THEN
    ALTER TABLE work_entries ADD COLUMN entry_type text NOT NULL DEFAULT 'driver' CHECK (entry_type IN ('driver', 'admin'));
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_entries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE work_entries ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create additional indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_work_entries_entry_type ON work_entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_work_entries_time ON work_entries (time);
CREATE INDEX IF NOT EXISTS idx_work_entries_updated_at ON work_entries (updated_at DESC);

-- Update the existing composite index to include entry_type
DROP INDEX IF EXISTS idx_work_entries_filters;
CREATE INDEX idx_work_entries_filters ON work_entries (date, machine_type, driver_name, entry_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_work_entries_updated_at ON work_entries;
CREATE TRIGGER update_work_entries_updated_at
  BEFORE UPDATE ON work_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing entries to have default values for new columns
UPDATE work_entries 
SET 
  entry_type = 'driver',
  updated_at = created_at
WHERE entry_type IS NULL OR updated_at IS NULL;