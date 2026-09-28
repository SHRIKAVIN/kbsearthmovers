/*
  # Store the hourly rate a job was charged at

  The driver app now computes the total from hours, minutes and a chosen rate, using
  the same rate chart as the KBS Harvester Rental Calculator. Storing the rate that
  was applied means:

    - the bill prints the real rate (Rs.2,500/hr) instead of one reverse-engineered
      from total / hours, which produced odd figures like Rs.2,483/hr;
    - a later rate change does not silently rewrite the history of old jobs.

  Nullable: entries recorded before this have no rate on file, and the bill falls back
  to deriving one, as it did before.
*/

ALTER TABLE work_entries ADD COLUMN IF NOT EXISTS hourly_rate numeric;

-- The dues lookup returns it too, so /pay can show the rate the customer was
-- actually charged rather than one reverse-engineered from total / hours.
DROP FUNCTION IF EXISTS outstanding_for_phone(text);

CREATE FUNCTION outstanding_for_phone(p_phone text)
RETURNS TABLE (
  id uuid,
  entry_date date,
  entry_time text,
  machine_type text,
  hours_driven numeric,
  hourly_rate numeric,
  total_amount numeric,
  balance numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id,
         date AS entry_date,
         time AS entry_time,
         machine_type,
         hours_driven,
         hourly_rate,
         total_amount,
         (total_amount - amount_received - advance_amount) AS balance
    FROM work_entries
   WHERE customer_phone = p_phone
     AND (total_amount - amount_received - advance_amount) > 0
   ORDER BY date ASC, time ASC NULLS FIRST, created_at ASC;
$$;

REVOKE ALL ON FUNCTION outstanding_for_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION outstanding_for_phone(text) TO service_role;
