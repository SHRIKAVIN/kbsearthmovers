import { verifyWebhookSignature } from '../_lib/cashfree.js';
import { serviceClient } from '../_lib/supabase.js';
import { headerValue, methodNotAllowed, readRawBody, type Req, type Res } from '../_lib/http.js';

/**
 * Cashfree signs the exact bytes it sent. Vercel's default JSON body parser consumes
 * the stream and hands us a parsed object, and re-serialising that object changes key
 * order, whitespace and decimal formatting (4500.00 -> 4500), so the HMAC will never
 * match. Turning the parser off is mandatory, not an optimisation.
 */
export const config = { api: { bodyParser: false } };

/** Cashfree's payload shape varies by event type, so we probe it defensively. */
type WebhookPayload = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Collect every id in the payload that might be ours, most specific first.
 *
 * A UPI QR settles under the order id we generated, so `order_id` is ours. A payment
 * link settles under an order id *Cashfree* generated, and the only thing we recognise
 * is our own `link_id` - which turns up in a different place depending on the event.
 * Trying each candidate in turn is more robust than guessing which shape arrived.
 */
function extractOrderIdCandidates(payload: WebhookPayload): string[] {
  const candidates = [
    payload?.data?.link?.link_id,
    payload?.data?.order?.order_tags?.link_id,
    payload?.data?.order?.order_id,
    payload?.data?.order_id,
    payload?.order?.order_id,
  ];
  return Array.from(
    new Set(candidates.filter((id): id is string => typeof id === 'string' && id.length > 0))
  );
}

function extractPaymentId(payload: WebhookPayload): string | null {
  const id = payload?.data?.payment?.cf_payment_id ?? payload?.data?.cf_payment_id ?? null;
  return id ? String(id) : null;
}

function extractAmount(payload: WebhookPayload): number | null {
  const raw =
    payload?.data?.payment?.payment_amount ??
    payload?.data?.link?.link_amount_paid ??
    payload?.data?.order?.order_amount ??
    null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function isSuccess(payload: WebhookPayload, type: string): boolean {
  if (type.includes('PAYMENT_SUCCESS')) return true;
  const status =
    payload?.data?.payment?.payment_status ?? payload?.data?.link?.link_status ?? '';
  return status === 'SUCCESS' || status === 'PAID';
}

function isFailure(type: string, payload: WebhookPayload): boolean {
  if (type.includes('PAYMENT_FAILED')) return true;
  return payload?.data?.payment?.payment_status === 'FAILED';
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: 'Could not read request body' });
  }

  // Verify before touching anything. No valid signature means no database write, ever.
  const verification = verifyWebhookSignature(
    headerValue(req.headers, 'x-webhook-signature'),
    headerValue(req.headers, 'x-webhook-timestamp'),
    rawBody
  );

  if (!verification.ok) {
    console.warn('[cashfree-webhook] rejected:', verification.reason);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Malformed JSON' });
  }

  const eventType: string = payload?.type || payload?.event || 'UNKNOWN';
  const candidates = extractOrderIdCandidates(payload);

  // From here on we answer 200 for anything we understand but cannot act on, so
  // Cashfree stops retrying. Only genuine server faults get a 5xx.
  if (!candidates.length) {
    console.warn('[cashfree-webhook] no order id in', eventType);
    return res.status(200).json({ received: true, ignored: 'no order id' });
  }

  const supabase = serviceClient();

  try {
    if (isFailure(eventType, payload)) {
      await supabase
        .from('payments')
        .update({ status: 'failed', raw_webhook: payload })
        .or(candidates.map((id) => `cf_order_id.eq.${id},cf_link_id.eq.${id}`).join(','))
        .eq('status', 'created');
      return res.status(200).json({ received: true, status: 'failed' });
    }

    if (!isSuccess(payload, eventType)) {
      return res.status(200).json({ received: true, ignored: eventType });
    }

    const amount = extractAmount(payload);
    if (!amount) {
      console.warn('[cashfree-webhook] success event with no amount:', eventType, candidates.join('|'));
      return res.status(200).json({ received: true, ignored: 'no amount' });
    }

    // Everything that matters - idempotency, FIFO allocation across entries, and the
    // amount_received increments - happens atomically inside this one call.
    let result: WebhookPayload | null = null;
    let orderId = candidates[0];

    for (const candidate of candidates) {
      const { data, error } = await supabase.rpc('apply_payment', {
        p_cf_order_id: candidate,
        p_cf_payment_id: extractPaymentId(payload),
        p_amount: amount,
        p_raw: payload,
      });

      if (error) {
        console.error('[cashfree-webhook] apply_payment failed:', error.message);
        return res.status(500).json({ error: 'Could not settle payment' });
      }

      result = data as WebhookPayload;
      orderId = candidate;
      // Anything but "we have never heard of this id" means this was our payment.
      if (result?.ok || result?.reason !== 'unknown_order') break;
    }

    if (!result?.ok) {
      console.warn('[cashfree-webhook] not settled:', result?.reason, candidates.join('|'));
      return res.status(200).json({ received: true, ignored: result?.reason });
    }

    if (result.duplicate) {
      // Cashfree retried an event we already settled. Nothing changed, and crucially
      // no second Teams alert goes out.
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Settlement is deliberately silent - no Teams card when a payment lands. The
    // record is the payments row and the updated balance in the admin panel, so this
    // log line is the only trace of which order settled if one ever needs chasing.
    console.info('[cashfree-webhook] settled', orderId, 'allocated', result.allocated);

    return res.status(200).json({
      received: true,
      settled: true,
      allocated: result.allocated,
    });
  } catch (error: unknown) {
    console.error('[cashfree-webhook] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
