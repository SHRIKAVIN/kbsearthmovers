/*
  Remove test payment data after an end-to-end test run.

  Convention: give every test entry a rental_person_name starting with "TEST " and
  the queries below will find it. Nothing here can touch a real entry unless you
  genuinely named a customer "TEST something".

  Run the SELECT block first and read it. Only run the DELETE block once the list
  shows exactly what you expect.
*/

-- ---------------------------------------------------------------------------
-- STEP 1: look before you delete
-- ---------------------------------------------------------------------------

\echo 'Test work entries that will be deleted:'
SELECT id, rental_person_name, customer_phone, date, total_amount, amount_received
  FROM work_entries
 WHERE rental_person_name ILIKE 'TEST %'
 ORDER BY created_at DESC;

\echo 'Payments that will be deleted:'
SELECT p.id, p.cf_order_id, p.customer_phone, p.amount, p.status, p.created_at
  FROM payments p
 WHERE EXISTS (
   SELECT 1 FROM work_entries w
    WHERE w.id = ANY (p.target_entry_ids)
      AND w.rental_person_name ILIKE 'TEST %'
 )
 ORDER BY p.created_at DESC;

-- ---------------------------------------------------------------------------
-- STEP 2: delete. Uncomment and run only after checking the lists above.
--
-- payment_allocations and reminder_log cascade from their parents, so deleting
-- the payments and the entries is enough.
-- ---------------------------------------------------------------------------

-- BEGIN;
--
-- DELETE FROM payments p
--  WHERE EXISTS (
--    SELECT 1 FROM work_entries w
--     WHERE w.id = ANY (p.target_entry_ids)
--       AND w.rental_person_name ILIKE 'TEST %'
--  );
--
-- DELETE FROM work_entries WHERE rental_person_name ILIKE 'TEST %';
--
-- -- Check the counts look right, then COMMIT. Otherwise ROLLBACK.
-- SELECT count(*) AS remaining_test_entries FROM work_entries WHERE rental_person_name ILIKE 'TEST %';
--
-- COMMIT;
