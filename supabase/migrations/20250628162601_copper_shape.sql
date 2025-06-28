/*
  # Create work entries table for KBS Earthmover Rental Management

  1. New Tables
    - `work_entries`
      - `id` (uuid, primary key)
      - `rental_person_name` (text) - Name of the person renting the equipment
      - `driver_name` (text) - Name of the equipment operator/driver
      - `machine_type` (text) - Type of machine (JCB, Tractor, Harvester)
      - `hours_driven` (numeric) - Number of hours the machine was operated
      - `total_amount` (numeric) - Total amount for the rental
      - `amount_received` (numeric) - Amount actually received
      - `advance_amount` (numeric) - Advance payment amount
      - `date` (date) - Date of the work
      - `created_at` (timestamp) - When the entry was created

  2. Security
    - Enable RLS on `work_entries` table
    - Add policies for public insert (driver entry form)
    - Add policies for authenticated read/update/delete (admin panel)

  3. Indexes
    - Add indexes for efficient querying by date, machine type, and driver
*/

CREATE TABLE IF NOT EXISTS work_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_person_name text NOT NULL,
  driver_name text NOT NULL,
  machine_type text NOT NULL CHECK (machine_type IN ('JCB', 'Tractor', 'Harvester')),
  hours_driven numeric NOT NULL CHECK (hours_driven >= 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  amount_received numeric NOT NULL CHECK (amount_received >= 0),
  advance_amount numeric NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE work_entries ENABLE ROW LEVEL SECURITY;

-- Allow public insert for driver entry form (no auth required)
CREATE POLICY "Allow public insert for work entries"
  ON work_entries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to read all entries (admin panel)
CREATE POLICY "Allow authenticated read for work entries"
  ON work_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update entries (admin panel)
CREATE POLICY "Allow authenticated update for work entries"
  ON work_entries
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete entries (admin panel)
CREATE POLICY "Allow authenticated delete for work entries"
  ON work_entries
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_work_entries_date ON work_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_work_entries_machine_type ON work_entries (machine_type);
CREATE INDEX IF NOT EXISTS idx_work_entries_driver_name ON work_entries (driver_name);
CREATE INDEX IF NOT EXISTS idx_work_entries_created_at ON work_entries (created_at DESC);

-- Create a composite index for filtering
CREATE INDEX IF NOT EXISTS idx_work_entries_filters ON work_entries (date, machine_type, driver_name);