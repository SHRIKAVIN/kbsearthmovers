import QRCode from 'qrcode';

/**
 * Client side of the payment flows. Everything here talks to /api/* rather than to
 * Supabase directly, because payment state is written only by the server after a
 * verified Cashfree webhook - the browser can read status, never set it.
 */

/** Deep links that open a UPI app on the device the customer is already holding. */
export type UpiAppLinks = {
  default?: string;
  gpay?: string;
  phonepe?: string;
  paytm?: string;
  bhim?: string;
  web?: string;
};

export type CreateQrResponse = {
  payment_id: string;
  order_id: string;
  amount: number;
  max_amount: number;
  entries_count: number;
  /** Present for the driver flow (channel 'qrcode'). */
  qr_payload: string | null;
  /** Present for the self-service flow (channel 'link'). */
  upi_links: UpiAppLinks | null;
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
 * Order the UPI apps for display on the customer's own phone.
 *
 * `default` opens the system UPI chooser and works for everyone, so it leads. The
 * named apps follow for people who would rather tap a logo they recognise, and `web`
 * is the last resort for a desktop browser where no UPI app exists.
 */
export function orderedUpiApps(
  links: UpiAppLinks
): Array<{ key: keyof UpiAppLinks; label: string; url: string; primary: boolean }> {
  const catalogue: Array<{ key: keyof UpiAppLinks; label: string; primary: boolean }> = [
    { key: 'default', label: 'Pay by UPI', primary: true },
    { key: 'gpay', label: 'Google Pay', primary: false },
    { key: 'phonepe', label: 'PhonePe', primary: false },
    { key: 'paytm', label: 'Paytm', primary: false },
  ];

  const apps = catalogue
    .filter((app) => !!links[app.key])
    .map((app) => ({ ...app, url: links[app.key] as string }));

  // If there is no generic chooser, promote the first named app so there is always
  // exactly one obvious button.
  if (apps.length && !apps.some((app) => app.primary)) apps[0].primary = true;
  return apps;
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
