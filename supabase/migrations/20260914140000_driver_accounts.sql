/*
  # Per-driver attribution

  Sakthi and Manoj shared one dropdown value, so an entry recorded who the machine
  was worked by but not who typed it in. The driver app gives each of them their own
  login and their own view, which needs entries tagged with the driver who created
  them.

  driver_code is nullable: rows created before the driver app existed have no
  attribution, and inventing one would be worse than leaving it blank. Those rows
  stay visible in the admin panel and simply do not appear in either driver's
  personal list.
*/

ALTER TABLE work_entries ADD COLUMN IF NOT EXISTS driver_code text;

CREATE INDEX IF NOT EXISTS idx_work_entries_driver_code
  ON work_entries (driver_code, date DESC)
  WHERE driver_code IS NOT NULL;
