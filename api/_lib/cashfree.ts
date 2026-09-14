import crypto from 'node:crypto';
import { normalizeEnv, requireEnv, optionalEnv, publicBaseUrl, withProtectionBypass } from './env.js';
import { toCashfreePhone } from './phone.js';

const API_VERSION = optionalEnv('CASHFREE_API_VERSION') || '2026-01-01';

export function cashfreeBaseUrl(): string {
  const env = (normalizeEnv(process.env.CASHFREE_ENV) || 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export function isProduction(): boolean {
  return (normalizeEnv(process.env.CASHFREE_ENV) || 'sandbox').toLowerCase() === 'production';
}

async function cashfreeFetch<T = unknown>(
  path: string,
  init: { method: string; body?: unknown; idempotencyKey?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-version': API_VERSION,
    'x-client-id': requireEnv('CASHFREE_CLIENT_ID'),
    'x-client-secret': requireEnv('CASHFREE_CLIENT_SECRET'),
  };
  if (init.idempotencyKey) headers['x-idempotency-key'] = init.idempotencyKey;

  const response = await fetch(`${cashfreeBaseUrl()}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await response.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Cashfree ${path} returned non-JSON (${response.status}): ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    const message = parsed?.message || parsed?.error_description || text.slice(0, 300);
    throw new Error(`Cashfree ${path} failed (${response.status}): ${message}`);
  }
  return parsed as T;
}

// ---------------------------------------------------------------------------
// Orders + dynamic UPI QR (the in-person driver flow)
// ---------------------------------------------------------------------------

export type CreateOrderArgs = {
  orderId: string;
  amount: number;
  phone: string; // E.164
  customerName?: string;
  /** Echoed back to us on the webhook - our correlation key. */
  tags: Record<string, string>;
  note?: string;
};

export async function createOrder(args: CreateOrderArgs): Promise<{ paymentSessionId: string }> {
  const body = {
    order_id: args.orderId,
    order_amount: Number(args.amount.toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: `kbs_${toCashfreePhone(args.phone)}`,
      customer_phone: toCashfreePhone(args.phone),
      ...(args.customerName ? { customer_name: args.customerName } : {}),
    },
    order_meta: {
      notify_url: withProtectionBypass(`${publicBaseUrl()}/api/webhooks/cashfree`),
      return_url: `${publicBaseUrl()}/pay?order_id=${encodeURIComponent(args.orderId)}`,
    },
    order_tags: args.tags,
    ...(args.note ? { order_note: args.note } : {}),
  };

  const result = await cashfreeFetch<{ payment_session_id: string }>('/orders', {
    method: 'POST',
    body,
    idempotencyKey: args.orderId,
  });

  if (!result.payment_session_id) {
    throw new Error('Cashfree did not return a payment_session_id');
  }
  return { paymentSessionId: result.payment_session_id };
}

/** Cashfree has shipped the QR under a few shapes over time; accept all of them. */
type CashfreeSessionResponse = {
  cf_payment_id?: string | number;
  qrcode?: string;
  data?: { payload?: { qrcode?: string; qr_code?: string }; url?: string };
};

type CashfreeLinkResponse = {
  link_id?: string;
  link_url: string;
  link_qrcode?: string | null;
};

export type UpiQr = {
  cfPaymentId: string | null;
  /** Either a upi:// intent string or a base64/data-URI PNG, depending on account config. */
  qrPayload: string;
};

export async function createUpiQrSession(paymentSessionId: string): Promise<UpiQr> {
  const result = await cashfreeFetch<CashfreeSessionResponse>('/orders/sessions', {
    method: 'POST',
    body: {
      payment_session_id: paymentSessionId,
      payment_method: { upi: { channel: 'qrcode' } },
    },
  });

  // Cashfree has shipped this under a few shapes; accept all of them rather than
  // breaking the moment an account is provisioned slightly differently.
  const payload =
    result?.data?.payload?.qrcode ??
    result?.data?.payload?.qr_code ??
    result?.data?.url ??
    result?.qrcode ??
    null;

  if (!payload) {
    throw new Error(
      `Cashfree UPI QR session returned no QR payload: ${JSON.stringify(result).slice(0, 300)}`
    );
  }

  return {
    cfPaymentId: result?.cf_payment_id ? String(result.cf_payment_id) : null,
    qrPayload: String(payload),
  };
}

// ---------------------------------------------------------------------------
// Payment links (pay-later + reminders)
//
// Cashfree sends the WhatsApp/SMS itself and, with link_auto_reminders, keeps
// nudging the customer without us running anything. That is the entire reason
// this project needs no WhatsApp vendor.
// ---------------------------------------------------------------------------

export type CreateLinkArgs = {
  linkId: string;
  amount: number;
  phone: string;
  customerName?: string;
  purpose: string;
  notes?: Record<string, string>;
  expiryDays?: number;
};

export type CashfreeLink = {
  linkId: string;
  linkUrl: string;
  linkQrCode: string | null;
};

export async function createPaymentLink(args: CreateLinkArgs): Promise<CashfreeLink> {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + (args.expiryDays ?? 30));

  const result = await cashfreeFetch<CashfreeLinkResponse>('/links', {
    method: 'POST',
    idempotencyKey: args.linkId,
    body: {
      link_id: args.linkId,
      link_amount: Number(args.amount.toFixed(2)),
      link_currency: 'INR',
      link_purpose: args.purpose.slice(0, 500),
      customer_details: {
        customer_phone: toCashfreePhone(args.phone),
        ...(args.customerName ? { customer_name: args.customerName } : {}),
      },
      link_notify: { send_sms: true, send_whatsapp: true, send_email: false },
      link_auto_reminders: true,
      link_partial_payments: true,
      link_expiry_time: expiry.toISOString(),
      link_meta: {
        notify_url: withProtectionBypass(`${publicBaseUrl()}/api/webhooks/cashfree`),
        return_url: `${publicBaseUrl()}/pay`,
      },
      ...(args.notes ? { link_notes: args.notes } : {}),
    },
  });

  return {
    linkId: result.link_id || args.linkId,
    linkUrl: result.link_url,
    linkQrCode: result.link_qrcode || null,
  };
}

export async function fetchPaymentLink(linkId: string): Promise<Record<string, unknown>> {
  return cashfreeFetch(`/links/${encodeURIComponent(linkId)}`, { method: 'GET' });
}

export async function fetchOrder(orderId: string): Promise<Record<string, unknown>> {
  return cashfreeFetch(`/orders/${encodeURIComponent(orderId)}`, { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/** Reject webhooks older than this to blunt replay attempts. */
const MAX_WEBHOOK_AGE_SECONDS = 300;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Cashfree signs base64(HMAC-SHA256(timestamp + rawBody, secret)).
 *
 * `rawBody` must be the exact bytes received - see readRawBody() for why.
 */
export function verifyWebhookSignature(
  signature: string | undefined,
  timestamp: string | undefined,
  rawBody: string,
  secret?: string
): VerifyResult {
  if (!signature) return { ok: false, reason: 'missing x-webhook-signature' };
  if (!timestamp) return { ok: false, reason: 'missing x-webhook-timestamp' };

  const key = secret || optionalEnv('CASHFREE_WEBHOOK_SECRET') || optionalEnv('CASHFREE_CLIENT_SECRET');
  if (!key) return { ok: false, reason: 'no webhook secret configured' };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'malformed timestamp' };

  // Cashfree sends seconds; tolerate milliseconds just in case.
  const tsSeconds = ts > 1e12 ? Math.floor(ts / 1000) : ts;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - tsSeconds);
  if (ageSeconds > MAX_WEBHOOK_AGE_SECONDS) {
    return { ok: false, reason: `timestamp too old (${ageSeconds}s)` };
  }

  const expected = crypto
    .createHmac('sha256', key)
    .update(timestamp + rawBody)
    .digest('base64');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return { ok: false, reason: 'signature mismatch' };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'signature mismatch' };

  return { ok: true };
}
