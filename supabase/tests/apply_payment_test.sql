/*
  Verification for apply_payment(): FIFO allocation, partial payments, idempotency.

  Run in the Supabase SQL editor (or `psql -f`) AFTER applying
  20260914000000_add_payments.sql. The whole thing runs inside a transaction that
  ROLLS BACK at the end, so it is safe against production data.

  Every check RAISEs EXCEPTION on failure, so "Success. No rows returned" == all passed.
*/

BEGIN;

DO $$
DECLARE
  v_phone     text := '+919000000001';
  v_entry_old uuid;
  v_entry_mid uuid;
  v_entry_new uuid;
  v_order     text := 'test_order_fifo';
  v_result    jsonb;
  v_received  numeric;
  v_alloc     integer;
BEGIN
  -- Three unpaid jobs for one customer: Rs.4500 / Rs.3800 / Rs.4000 = Rs.12300.
  INSERT INTO work_entries
    (rental_person_name, customer_phone, driver_name, machine_type, hours_driven,
     total_amount, amount_received, advance_amount, date, time, entry_type, owner)
  VALUES
    ('TEST Ramasamy', v_phone, 'Sakthi / Manoj', 'Harvester', 3.00,
     4500, 0, 0, '2026-08-28', '09:00', 'driver', 'Rohini')
  RETURNING id INTO v_entry_old;

  INSERT INTO work_entries
    (rental_person_name, customer_phone, driver_name, machine_type, hours_driven,
     total_amount, amount_received, advance_amount, date, time, entry_type, owner)
  VALUES
    ('TEST Ramasamy', v_phone, 'Sakthi / Manoj', 'Harvester', 2.30,
     3800, 0, 0, '2026-09-02', '10:00', 'driver', 'Rohini')
  RETURNING id INTO v_entry_mid;

  INSERT INTO work_entries
    (rental_person_name, customer_phone, driver_name, machine_type, hours_driven,
     total_amount, amount_received, advance_amount, date, time, entry_type, owner)
  VALUES
    ('TEST Ramasamy', v_phone, 'Sakthi / Manoj', 'Harvester', 2.00,
     4000, 0, 0, '2026-09-14', '11:00', 'driver', 'Rohini')
  RETURNING id INTO v_entry_new;

  -- ---------------------------------------------------------------------
  -- outstanding_for_phone returns all three, oldest first
  -- ---------------------------------------------------------------------
  IF (SELECT count(*) FROM outstanding_for_phone(v_phone)) <> 3 THEN
    RAISE EXCEPTION 'FAIL: expected 3 outstanding entries';
  END IF;

  IF (SELECT sum(balance) FROM outstanding_for_phone(v_phone)) <> 12300 THEN
    RAISE EXCEPTION 'FAIL: expected total outstanding of 12300';
  END IF;

  IF (SELECT id FROM outstanding_for_phone(v_phone) LIMIT 1) <> v_entry_old THEN
    RAISE EXCEPTION 'FAIL: oldest entry must sort first';
  END IF;

  -- ---------------------------------------------------------------------
  -- A Rs.5000 partial payment must settle oldest-first
  -- ---------------------------------------------------------------------
  INSERT INTO payments (cf_order_id, customer_phone, amount, kind, source, target_entry_ids)
  VALUES (v_order, v_phone, 5000, 'upi_qr', 'vehicle_qr',
          ARRAY[v_entry_old, v_entry_mid, v_entry_new]);

  v_result := apply_payment(v_order, 'cf_pay_1', 5000, '{"test": true}'::jsonb);

  IF NOT (v_result->>'ok')::boolean THEN
    RAISE EXCEPTION 'FAIL: apply_payment returned not-ok: %', v_result;
  END IF;

  IF (v_result->>'allocated')::numeric <> 5000 THEN
    RAISE EXCEPTION 'FAIL: expected 5000 allocated, got %', v_result->>'allocated';
  END IF;

  -- Oldest fully settled...
  SELECT amount_received INTO v_received FROM work_entries WHERE id = v_entry_old;
  IF v_received <> 4500 THEN
    RAISE EXCEPTION 'FAIL: oldest entry should be fully paid (4500), got %', v_received;
  END IF;

  -- ...the next part-paid with the remaining 500...
  SELECT amount_received INTO v_received FROM work_entries WHERE id = v_entry_mid;
  IF v_received <> 500 THEN
    RAISE EXCEPTION 'FAIL: middle entry should have 500, got %', v_received;
  END IF;

  -- ...and the newest untouched.
  SELECT amount_received INTO v_received FROM work_entries WHERE id = v_entry_new;
  IF v_received <> 0 THEN
    RAISE EXCEPTION 'FAIL: newest entry should be untouched, got %', v_received;
  END IF;

  IF (SELECT count(*) FROM payment_allocations WHERE payment_id =
        (SELECT id FROM payments WHERE cf_order_id = v_order)) <> 2 THEN
    RAISE EXCEPTION 'FAIL: expected exactly 2 allocation rows';
  END IF;

  -- ---------------------------------------------------------------------
  -- Idempotency: Cashfree retries. The second delivery must change nothing.
  -- ---------------------------------------------------------------------
  SELECT count(*) INTO v_alloc FROM payment_allocations;

  v_result := apply_payment(v_order, 'cf_pay_1', 5000, '{"test": true}'::jsonb);

  IF NOT (v_result->>'duplicate')::boolean THEN
    RAISE EXCEPTION 'FAIL: replayed webhook was not flagged as duplicate: %', v_result;
  END IF;

  SELECT amount_received INTO v_received FROM work_entries WHERE id = v_entry_old;
  IF v_received <> 4500 THEN
    RAISE EXCEPTION 'FAIL: replay double-credited the oldest entry (%)', v_received;
  END IF;

  SELECT amount_received INTO v_received FROM work_entries WHERE id = v_entry_mid;
  IF v_received <> 500 THEN
    RAISE EXCEPTION 'FAIL: replay double-credited the middle entry (%)', v_received;
  END IF;

  IF (SELECT count(*) FROM payment_allocations) <> v_alloc THEN
    RAISE EXCEPTION 'FAIL: replay created extra allocation rows';
  END IF;

  -- ---------------------------------------------------------------------
  -- Remaining balance is now 12300 - 5000 = 7300
  -- ---------------------------------------------------------------------
  IF (SELECT coalesce(sum(balance), 0) FROM outstanding_for_phone(v_phone)) <> 7300 THEN
    RAISE EXCEPTION 'FAIL: expected 7300 still outstanding';
  END IF;

  -- ---------------------------------------------------------------------
  -- An unknown order must be refused, not silently swallowed
  -- ---------------------------------------------------------------------
  v_result := apply_payment('no_such_order', 'x', 100, '{}'::jsonb);
  IF (v_result->>'ok')::boolean OR v_result->>'reason' <> 'unknown_order' THEN
    RAISE EXCEPTION 'FAIL: unknown order should be rejected, got %', v_result;
  END IF;

  -- ---------------------------------------------------------------------
  -- Overpayment is recorded but reported as unallocated for manual review
  -- ---------------------------------------------------------------------
  INSERT INTO payments (cf_order_id, customer_phone, amount, kind, source, target_entry_ids)
  VALUES ('test_order_over', v_phone, 9999, 'upi_qr', 'vehicle_qr', ARRAY[v_entry_new]);

  v_result := apply_payment('test_order_over', 'cf_pay_2', 9999, '{}'::jsonb);
  IF (v_result->>'allocated')::numeric <> 4000 THEN
    RAISE EXCEPTION 'FAIL: should allocate only the 4000 owed, got %', v_result->>'allocated';
  END IF;
  IF (v_result->>'unallocated')::numeric <> 5999 THEN
    RAISE EXCEPTION 'FAIL: should report 5999 unallocated, got %', v_result->>'unallocated';
  END IF;

  -- ---------------------------------------------------------------------
  -- A payment link settles under an order id Cashfree generated, so the only
  -- thing we recognise is our own link id. Matching must work on either key.
  -- ---------------------------------------------------------------------
  INSERT INTO work_entries
    (rental_person_name, customer_phone, driver_name, machine_type, hours_driven,
     total_amount, amount_received, advance_amount, date, time, entry_type, owner)
  VALUES
    ('TEST Link Customer', '+919000000002', 'Sakthi / Manoj', 'Harvester', 1.00,
     2000, 0, 0, '2026-09-01', '08:00', 'driver', 'Rohini')
  RETURNING id INTO v_entry_old;

  INSERT INTO payments (cf_order_id, cf_link_id, customer_phone, amount, kind, source, target_entry_ids)
  VALUES ('kbslink_abc', 'kbslink_abc', '+919000000002', 2000, 'payment_link', 'reminder',
          ARRAY[v_entry_old]);

  -- Settle by link id, which is all a link webhook gives us.
  v_result := apply_payment('kbslink_abc', 'cf_pay_3', 2000, '{}'::jsonb);
  IF NOT (v_result->>'ok')::boolean THEN
    RAISE EXCEPTION 'FAIL: link payment did not settle by link id: %', v_result;
  END IF;

  SELECT amount_received INTO v_received FROM work_entries WHERE id = v_entry_old;
  IF v_received <> 2000 THEN
    RAISE EXCEPTION 'FAIL: link payment should have credited 2000, got %', v_received;
  END IF;

  RAISE NOTICE 'All apply_payment checks passed.';
END $$;

ROLLBACK;
