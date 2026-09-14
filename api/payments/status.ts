import { serviceClient } from '../_lib/supabase.js';
import { fetchOrder } from '../_lib/cashfree.js';
import { badRequest, methodNotAllowed, serverError, type Req, type Res } from '../_lib/http.js';

/**
 * Poll target for the waiting QR screen.
 *
 * The browser cannot subscribe to `payments` over Supabase realtime because that table
 * is deliberately invisible to the anon role, so the driver's screen polls this every
 * few seconds instead. It returns the minimum needed to drive the UI - never the
 * customer's other entries or the raw webhook.
 */
export default async function handler(req: Req, res: Res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const paymentId = url.searchParams.get('payment_id');
    if (!paymentId) return badRequest(res, 'payment_id is required');

    const supabase = serviceClient();
    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, cf_order_id, status, amount, amount_paid, paid_at')
      .eq('id', paymentId)
      .single();

    if (error || !payment) return res.status(404).json({ error: 'Payment not found' });

    let status = payment.status;

    // Safety net: if the webhook was lost or delayed, ask Cashfree directly rather
    // than leaving the driver staring at a spinner for a payment that already cleared.
    // This only reads - settlement still happens exclusively through the webhook.
    if (status === 'created') {
      try {
        const order = await fetchOrder(payment.cf_order_id);
        if (order?.order_status === 'PAID') status = 'awaiting_confirmation';
        else if (order?.order_status === 'EXPIRED') status = 'expired';
      } catch {
        // A Cashfree hiccup must not break polling; keep reporting the stored status.
      }
    }

    return res.status(200).json({
      payment_id: payment.id,
      status,
      amount: Number(payment.amount),
      amount_paid: Number(payment.amount_paid),
      paid_at: payment.paid_at,
    });
  } catch (error) {
    return serverError(res, error);
  }
}
