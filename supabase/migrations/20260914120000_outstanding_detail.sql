/*
  # Give the dues lookup enough detail for a customer to check the bill

  The public /pay page showed only "You owe Rs.1,500 across 2 jobs". Asking someone
  to pay a figure they cannot check invites exactly the dispute the payment flow is
  meant to avoid, so outstanding_for_phone now returns the per-job detail: hours
  worked and the original amount, alongside the date, machine and balance it already
  returned.

  The return type changes, so the function is dropped and recreated rather than
  replaced. Callers only widen - create-qr still uses id and balance.

  NOTE ON PRIVACY: this makes the lookup more revealing. Before, guessing a phone
  number yielded a rupee figure; now it yields that customer's job history. The
  lookup has no OTP by deliberate choice, and that choice is worth revisiting now
  that there is more behind it.
*/

DROP FUNCTION IF EXISTS outstanding_for_phone(text);

CREATE FUNCTION outstanding_for_phone(p_phone text)
RETURNS TABLE (
  id uuid,
  entry_date date,
  entry_time text,
  machine_type text,
  hours_driven numeric,
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
         total_amount,
         (total_amount - amount_received - advance_amount) AS balance
    FROM work_entries
   WHERE customer_phone = p_phone
     AND (total_amount - amount_received - advance_amount) > 0
   ORDER BY date ASC, time ASC NULLS FIRST, created_at ASC;
$$;

REVOKE ALL ON FUNCTION outstanding_for_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION outstanding_for_phone(text) TO service_role;
