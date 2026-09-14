import QRCode from 'qrcode';

/**
 * Client side of the payment flows. Everything here talks to /api/* rather than to
 * Supabase directly, because payment state is written only by the server after a
 * verified Cashfree webhook - the browser can read status, never set it.
 */

export type CreateQrResponse = {
  payment_id: string;
  order_id: string;
  amount: number;
  max_amount: number;
  entries_count: number;
  qr_payload: string;
};

export type DuesResponse = {
  total_due: number;
  count: number;
  has_dues: boolean;
};

export type PaymentStatus = {
  payment_id: string;
  status: 'created' | 'paid' | 'failed' | 'expired' | 'awaiting_confirmation';
  amount: number;
  amount_paid: number;
  paid_at: string | null;
};

export type CreateLinkResponse = {
  payment_id: string;
  link_id: string;
  link_url: string;
  amount: number;
  entries_count: number;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data as T;
}

export function createQrForEntry(workEntryId: string) {
  return postJson<CreateQrResponse>('/api/payments/create-qr', { work_entry_id: workEntryId });
}

export function createQrForPhone(phone: string, amount?: number) {
  return postJson<CreateQrResponse>('/api/payments/create-qr', { phone, amount });
}

export function fetchDues(phone: string) {
  return postJson<DuesResponse>('/api/payments/dues', { phone });
}

export function sendPaymentLink(params: { work_entry_id?: string; phone?: string; amount?: number }) {
  return postJson<CreateLinkResponse>('/api/payments/create-link', params);
}

export async function fetchPaymentStatus(paymentId: string): Promise<PaymentStatus> {
  const response = await fetch(`/api/payments/status?payment_id=${encodeURIComponent(paymentId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Could not check payment status');
  return data as PaymentStatus;
}

/**
 * Turn whatever Cashfree gave us into something an <img> can show.
 *
 * Depending on how the merchant account is provisioned, qr_payload comes back as a
 * data URI, a bare base64 PNG, or a raw upi:// intent string. Only the last needs
 * rendering, so check for images first.
 */
export async function resolveQrImage(payload: string): Promise<string> {
  if (payload.startsWith('data:image')) return payload;
  if (/^[A-Za-z0-9+/=]+$/.test(payload) && payload.startsWith('iVBOR')) {
    return `data:image/png;base64,${payload}`;
  }
  return QRCode.toDataURL(payload, {
    width: 640,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

/**
 * True when the payload can be handed to the phone's own UPI app.
 *
 * This matters on the /pay page: the customer is holding the device that scanned the
 * vehicle sticker, so they cannot scan a QR rendered on their own screen. A upi://
 * deep link opens GPay/PhonePe directly instead.
 */
export function upiIntentLink(payload: string): string | null {
  return payload.startsWith('upi://') ? payload : null;
}

/** Indian mobile, as typed into a form. Server-side normalizePhone is the real gate. */
export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, '').replace(/^(0+|91)/, ''));
}

export function formatRupees(amount: number): string {
  return `Rs.${Number(amount).toLocaleString('en-IN')}`;
}

/** Pre-filled WhatsApp bill. No API, no approval - the sender taps send. */
export function whatsappBillLink(params: {
  phone: string;
  customerName: string;
  date: string;
  machineType: string;
  hours?: number;
  total: number;
  received: number;
  advance: number;
  payUrl?: string;
}): string {
  const balance = params.total - params.received - params.advance;
  const lines = [
    `*KBS Earthmovers & Harvesters*`,
    ``,
    `Bill for ${params.customerName}`,
    `Date: ${params.date}`,
    `Machine: ${params.machineType}`,
  ];
  if (params.hours) lines.push(`Hours: ${params.hours}`);
  lines.push(
    ``,
    `Total: ${formatRupees(params.total)}`,
    `Advance: ${formatRupees(params.advance)}`,
    `Received: ${formatRupees(params.received)}`,
    `*Balance due: ${formatRupees(balance)}*`
  );
  if (balance > 0) {
    lines.push(``, params.payUrl ? `Pay here: ${params.payUrl}` : `Scan the QR on our harvester to pay.`);
  } else {
    lines.push(``, `Fully paid. Thank you!`);
  }
  lines.push(``, `- KBS Earthmovers & Harvesters`);

  const digits = params.phone.replace(/\D/g, '').replace(/^0+/, '');
  const withCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCode}?text=${encodeURIComponent(lines.join('\n'))}`;
}
