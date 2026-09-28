/*
  # Cashfree payments: customer phone, payments ledger, FIFO allocation

  1. Schema Updates
    - Add `customer_phone` to `work_entries` (E.164, e.g. +919486532856). Nullable because
      existing rows predate it. This is the key both payment flows look customers up by.
    - Add `broker` to `work_entries` with IF NOT EXISTS. This column already exists in
      production and is written by the app, but was added by hand in the Supabase dashboard
      and never captured in a migration. Adding it here makes migrations reproduce production.

  2. New Tables
    - `payments` - one row per collection attempt (UPI QR or payment link)
    - `payment_allocations` - which rupee of a payment settled which work entry
    - `reminder_log` - what reminder went out for which entry, to avoid re-spamming

  3. Functions
    - `apply_payment(...)` - atomically credits a successful payment across the targeted
      entries, oldest first. Idempotent: a duplicate webhook delivery is a no-op.

  4. Security
    - RLS is enabled on all three new tables with NO policies, so the `anon` role (whose key
      ships in the browser bundle) can neither read nor write them. Only the service-role key
      used by the Vercel functions in api/ can touch payment state.
*/

-- ---------------------------------------------------------------------------
-- work_entries additions
-- ---------------------------------------------------------------------------

ALTER TABLE work_entries ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE work_entries ADD COLUMN IF NOT EXISTS broker text;

CREATE INDEX IF NOT EXISTS idx_work_entries_customer_phone
  ON work_entries (customer_phone);

-- Hot path for the dues lookup: "what does this phone still owe?"
CREATE INDEX IF NOT EXISTS idx_work_entries_phone_outstanding
  ON work_entries (customer_phone, date)
  WHERE customer_phone IS NOT NULL;

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Our generated order id. This is the correlation key that comes back on the webhook.
  cf_order_id text NOT NULL UNIQUE,
  cf_payment_id text,
  cf_link_id text,

  customer_phone text NOT NULL,

  amount numeric NOT NULL CHECK (amount > 0),
  amount_paid numeric NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),

  kind text NOT NULL CHECK (kind IN ('upi_qr', 'payment_link')),
  source text NOT NULL CHECK (source IN ('driver', 'vehicle_qr', 'reminder')),
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'failed', 'expired')),

  -- Snapshot of the entries this payment is meant to settle, taken at creation time so a
  -- later entry cannot silently absorb money the customer thought they were paying elsewhere.
  target_entry_ids uuid[] NOT NULL,

  qr_payload text,
  link_url text,

  raw_webhook jsonb,
  paid_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_phone ON payments (customer_phone);
CREATE INDEX IF NOT EXISTS idx_payments_cf_link_id ON payments (cf_link_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);

-- ---------------------------------------------------------------------------
-- payment_allocations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  work_entry_id uuid NOT NULL REFERENCES work_entries (id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (payment_id, work_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_work_entry
  ON payment_allocations (work_entry_id);

-- ---------------------------------------------------------------------------
-- reminder_log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_entry_id uuid NOT NULL REFERENCES work_entries (id) ON DELETE CASCADE,
  cf_link_id text,
  link_url text,
  channel text NOT NULL DEFAULT 'cashfree_link',
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_entry_sent
  ON reminder_log (work_entry_id, sent_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses update_updated_at_column() from the initial migration)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS: locked shut. No policies means anon gets nothing; service_role bypasses RLS.
-- ---------------------------------------------------------------------------

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON payments FROM anon, authenticated;
REVOKE ALL ON payment_allocations FROM anon, authenticated;
REVOKE ALL ON reminder_log FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- apply_payment: credit a successful payment across its targeted entries.
--
-- Runs entirely inside one transaction with row locks, which buys us two things
-- that are painful to get right in application code:
--
--   * Idempotency - Cashfree retries webhooks on timeouts, so the same success
--     event can arrive twice. The early return on status='paid' makes the second
--     delivery a no-op instead of double-crediting the customer.
--   * Atomicity - amount_received, payment_allocations and payments.status all
--     move together or not at all.
--
-- Allocation is oldest-entry-first, so a partial payment settles the oldest jobs
-- fully and leaves the newest outstanding.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_payment(
  p_cf_order_id text,
  p_cf_payment_id text,
  p_amount numeric,
  p_raw jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_entry record;
  v_remaining numeric;
  v_credit numeric;
  v_allocated numeric := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  -- Match on either key. A UPI QR settles under the order id we generated, but a
  -- payment link settles under an order id Cashfree generates internally, so for
  -- links the only thing we recognise is our own link id.
  SELECT * INTO v_payment
    FROM payments
    WHERE cf_order_id = p_cf_order_id
       OR cf_link_id = p_cf_order_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_order');
  END IF;

  -- Duplicate delivery of an event we have already settled.
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'payment_id', v_payment.id,
      'allocated', 0
    );
  END IF;

  v_remaining := p_amount;

  FOR v_entry IN
    SELECT id,
           (total_amount - amount_received - advance_amount) AS balance
      FROM work_entries
     WHERE id = ANY (v_payment.target_entry_ids)
       AND (total_amount - amount_received - advance_amount) > 0
     ORDER BY date ASC, time ASC NULLS FIRST, created_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_credit := LEAST(v_remaining, v_entry.balance);

    UPDATE work_entries
       SET amount_received = amount_received + v_credit
     WHERE id = v_entry.id;

    INSERT INTO payment_allocations (payment_id, work_entry_id, amount)
    VALUES (v_payment.id, v_entry.id, v_credit)
    ON CONFLICT (payment_id, work_entry_id)
    DO UPDATE SET amount = payment_allocations.amount + EXCLUDED.amount;

    v_remaining := v_remaining - v_credit;
    v_allocated := v_allocated + v_credit;
  END LOOP;

  UPDATE payments
     SET status        = 'paid',
         cf_payment_id = COALESCE(p_cf_payment_id, cf_payment_id),
         amount_paid   = p_amount,
         raw_webhook   = p_raw,
         paid_at       = now()
   WHERE id = v_payment.id;

  -- v_remaining > 0 means the customer paid more than they owed on the targeted
  -- entries (e.g. an entry was edited down after the QR was generated). The money
  -- is still recorded on the payments row; it just has nowhere to be allocated.
  RETURN jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'payment_id', v_payment.id,
    'customer_phone', v_payment.customer_phone,
    'allocated', v_allocated,
    'unallocated', v_remaining
  );
END;
$$;

-- Only the service-role key (used by api/) may settle payments.
REVOKE ALL ON FUNCTION apply_payment(text, text, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_payment(text, text, numeric, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- outstanding_for_phone: what a customer still owes, oldest first.
-- Used by both the dues lookup and the QR/link creation path so the two can
-- never disagree about the amount.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION outstanding_for_phone(p_phone text)
RETURNS TABLE (
  id uuid,
  entry_date date,
  machine_type text,
  balance numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id,
         date AS entry_date,
         machine_type,
         (total_amount - amount_received - advance_amount) AS balance
    FROM work_entries
   WHERE customer_phone = p_phone
     AND (total_amount - amount_received - advance_amount) > 0
   ORDER BY date ASC, time ASC NULLS FIRST, created_at ASC;
$$;

REVOKE ALL ON FUNCTION outstanding_for_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION outstanding_for_phone(text) TO service_role;
