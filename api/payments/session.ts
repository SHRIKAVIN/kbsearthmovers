import { fetchOrder } from '../_lib/cashfree.js';
import { serviceClient } from '../_lib/supabase.js';
import { badRequest, methodNotAllowed, serverError, type Req, type Res } from '../_lib/http.js';

/**
 * Hand the checkout page the Cashfree session for a payment.
 *
 * The session is fetched from Cashfree each time rather than stored, so a QR printed
 * or shown minutes earlier still works: whatever session the order currently has is
 * the one the customer gets.
 *
 * Only the session id and amount are returned. The session is useless without the
 * order behind it, and knowing one lets a customer pay us - not take anything.
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
      .select('id, cf_order_id, amount, status')
      .eq('id', paymentId)
      .single();

    if (error || !payment) return res.status(404).json({ error: 'Payment not found' });

    if (payment.status === 'paid') {
      return res.status(200).json({
        payment_id: payment.id,
        status: 'paid',
        amount: Number(payment.amount),
        payment_session_id: null,
      });
    }

    const order = await fetchOrder(payment.cf_order_id);
    const sessionId = (order as { payment_session_id?: string })?.payment_session_id ?? null;

    if (!sessionId) {
      return res.status(409).json({ error: 'This payment can no longer be completed.' });
    }

    return res.status(200).json({
      payment_id: payment.id,
      status: payment.status,
      amount: Number(payment.amount),
      payment_session_id: sessionId,
    });
  } catch (error) {
    return serverError(res, error);
  }
}
