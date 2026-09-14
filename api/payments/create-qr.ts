import crypto from 'node:crypto';
import { createOrder, createUpiQrSession } from '../_lib/cashfree.js';
import { normalizePhone } from '../_lib/phone.js';
import { serviceClient, outstandingForPhone, sumBalances } from '../_lib/supabase.js';
import { badRequest, methodNotAllowed, readJsonBody, serverError, type Req, type Res } from '../_lib/http.js';

/** Cashfree allows [a-zA-Z0-9_-], max 50 chars. */
function makeOrderId(): string {
  return `kbs_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Create a dynamic UPI QR for an exact amount.
 *
 * Two callers:
 *   - the driver's "Collect Payment Now" button   -> { work_entry_id }
 *   - the public /pay page behind the vehicle QR  -> { phone, amount? }
 *
 * In both cases the amount is recomputed here from the database. A client-supplied
 * amount is only ever honoured as a cap for partial payment, never as the source of
 * truth - otherwise anyone could POST { amount: 1 } and clear a bill.
 */
export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  try {
    const body = await readJsonBody<{
      work_entry_id?: string;
      phone?: string;
      amount?: number;
      source?: string;
    }>(req);

    const source = body.work_entry_id ? 'driver' : 'vehicle_qr';
    const supabase = serviceClient();

    let phone: string | null = null;
    let customerName: string | undefined;
    let targetEntryIds: string[] = [];
    let maxAmount = 0;

    if (body.work_entry_id) {
      // --- Driver flow: one specific job, just saved. ---
      const { data: entry, error } = await supabase
        .from('work_entries')
        .select('id, rental_person_name, customer_phone, total_amount, amount_received, advance_amount')
        .eq('id', body.work_entry_id)
        .single();

      if (error || !entry) return badRequest(res, 'Work entry not found');

      phone = normalizePhone(entry.customer_phone);
      if (!phone) {
        return badRequest(res, 'This entry has no valid customer mobile number saved.');
      }

      customerName = entry.rental_person_name;
      maxAmount = round2(
        Number(entry.total_amount) - Number(entry.amount_received) - Number(entry.advance_amount)
      );
      targetEntryIds = [entry.id];
    } else {
      // --- Vehicle QR flow: everything this phone owes, oldest first. ---
      phone = normalizePhone(body.phone);
      if (!phone) return badRequest(res, 'Enter a valid 10-digit mobile number.');

      const entries = await outstandingForPhone(phone);
      if (!entries.length) return badRequest(res, 'Nothing outstanding for this number.');

      maxAmount = round2(sumBalances(entries));
      targetEntryIds = entries.map((entry) => entry.id);
    }

    if (maxAmount <= 0) {
      return badRequest(res, 'Nothing outstanding to pay.', { amount: 0 });
    }

    // Partial payments are allowed, but only downward.
    let amount = maxAmount;
    if (typeof body.amount === 'number' && Number.isFinite(body.amount)) {
      const requested = round2(body.amount);
      if (requested <= 0) return badRequest(res, 'Amount must be greater than zero.');
      if (requested > maxAmount) {
        return badRequest(res, 'Amount is more than the outstanding balance.', { maxAmount });
      }
      amount = requested;
    }

    const orderId = makeOrderId();

    // Insert BEFORE calling Cashfree so a webhook that races back always finds a row.
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        cf_order_id: orderId,
        customer_phone: phone,
        amount,
        kind: 'upi_qr',
        source,
        status: 'created',
        target_entry_ids: targetEntryIds,
      })
      .select('id')
      .single();

    if (insertError || !payment) {
      throw new Error(`Could not record payment: ${insertError?.message}`);
    }

    const { paymentSessionId } = await createOrder({
      orderId,
      amount,
      phone,
      customerName,
      tags: {
        payment_id: payment.id,
        source,
        // order_tags values must be strings; this is only a hint for the dashboard.
        entries: String(targetEntryIds.length),
      },
      note: `KBS Harvester - ${targetEntryIds.length} job(s)`,
    });

    const qr = await createUpiQrSession(paymentSessionId);

    await supabase
      .from('payments')
      .update({ qr_payload: qr.qrPayload, cf_payment_id: qr.cfPaymentId })
      .eq('id', payment.id);

    return res.status(200).json({
      payment_id: payment.id,
      order_id: orderId,
      amount,
      max_amount: maxAmount,
      entries_count: targetEntryIds.length,
      qr_payload: qr.qrPayload,
    });
  } catch (error) {
    return serverError(res, error);
  }
}
