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
type Receipt = {
  reference: string | null;
  method: string;
  payer: string | null;
  paid_to: string;
};

/** Mask all but the last four digits, the way a payment app shows a payer. */
function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const local = phone.replace(/^\+91/, '').replace(/\D/g, '');
  return local.length >= 4 ? `••••• ${local.slice(-5)}` : null;
}

type WebhookPayment = {
  bank_reference?: string | number;
  payment_group?: string;
  payment_method?: { upi?: { upi_id?: string } };
};

function extractReceipt(raw: unknown, phone: string | null): Receipt {
  const payload = (raw || {}) as { data?: { payment?: WebhookPayment } };
  const payment: WebhookPayment = payload?.data?.payment ?? {};
  const upiId = payment?.payment_method?.upi?.upi_id ?? null;
  const group = String(payment?.payment_group || 'upi').toUpperCase();

  return {
    // Cashfree calls the UTR bank_reference; it is what a customer can look up
    // in their own bank or UPI app statement.
    reference: payment?.bank_reference ? String(payment.bank_reference) : null,
    method: upiId ? `${group} · ${upiId}` : group,
    payer: maskPhone(phone),
    paid_to: 'KBS Harvesters',
  };
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const paymentId = url.searchParams.get('payment_id');
    if (!paymentId) return badRequest(res, 'payment_id is required');

    const supabase = serviceClient();
    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, cf_order_id, cf_payment_id, customer_phone, status, amount, amount_paid, paid_at, raw_webhook')
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

    // The driver shows this screen to the customer as proof, so a settled payment
    // carries the same details a UPI app would display. Only these few fields are
    // lifted out of raw_webhook - never the payload itself, which holds far more.
    const receipt =
      status === 'paid' ? extractReceipt(payment.raw_webhook, payment.customer_phone) : null;

    return res.status(200).json({
      payment_id: payment.id,
      status,
      amount: Number(payment.amount),
      amount_paid: Number(payment.amount_paid),
      paid_at: payment.paid_at,
      cf_payment_id: status === 'paid' ? payment.cf_payment_id : null,
      receipt,
    });
  } catch (error) {
    return serverError(res, error);
  }
}
