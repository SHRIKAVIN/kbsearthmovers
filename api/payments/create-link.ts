import crypto from 'node:crypto';
import { createPaymentLink } from '../_lib/cashfree.js';
import { normalizePhone } from '../_lib/phone.js';
import { serviceClient, outstandingForPhone, sumBalances } from '../_lib/supabase.js';
import { badRequest, methodNotAllowed, readJsonBody, serverError, type Req, type Res } from '../_lib/http.js';

function makeLinkId(): string {
  return `kbslink_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Create a Cashfree payment link and let Cashfree deliver it over WhatsApp + SMS.
 *
 * Used by the "send link instead" fallback when a customer cannot scan a QR, and by
 * the nightly reminder cron. Cashfree's link_auto_reminders then keeps nudging the
 * customer on its own, which is why this project needs no WhatsApp vendor.
 */
export async function createLinkForPhone(params: {
  phone: string;
  source: 'driver' | 'vehicle_qr' | 'reminder';
  workEntryIds?: string[];
  amount?: number;
  customerName?: string;
}) {
  const supabase = serviceClient();

  let targetEntryIds = params.workEntryIds || [];
  let maxAmount: number;

  if (targetEntryIds.length) {
    const { data, error } = await supabase
      .from('work_entries')
      .select('id, total_amount, amount_received, advance_amount')
      .in('id', targetEntryIds);
    if (error) throw new Error(error.message);
    maxAmount = (data || []).reduce(
      (total, e) =>
        total + (Number(e.total_amount) - Number(e.amount_received) - Number(e.advance_amount)),
      0
    );
  } else {
    const entries = await outstandingForPhone(params.phone);
    targetEntryIds = entries.map((e) => e.id);
    maxAmount = sumBalances(entries);
  }

  maxAmount = Math.round(maxAmount * 100) / 100;
  if (maxAmount <= 0) throw new Error('Nothing outstanding for this customer.');

  const amount = params.amount && params.amount > 0 ? Math.min(params.amount, maxAmount) : maxAmount;
  const linkId = makeLinkId();

  const { data: payment, error: insertError } = await supabase
    .from('payments')
    .insert({
      cf_order_id: linkId, // links settle under this id; keeps one correlation key
      cf_link_id: linkId,
      customer_phone: params.phone,
      amount,
      kind: 'payment_link',
      source: params.source,
      status: 'created',
      target_entry_ids: targetEntryIds,
    })
    .select('id')
    .single();

  if (insertError || !payment) throw new Error(`Could not record payment: ${insertError?.message}`);

  const link = await createPaymentLink({
    linkId,
    amount,
    phone: params.phone,
    customerName: params.customerName,
    purpose: `KBS Harvester dues - ${targetEntryIds.length} job(s)`,
    notes: { payment_id: payment.id, source: params.source },
  });

  await supabase.from('payments').update({ link_url: link.linkUrl }).eq('id', payment.id);

  return {
    payment_id: payment.id,
    link_id: link.linkId,
    link_url: link.linkUrl,
    link_qrcode: link.linkQrCode,
    amount,
    entries_count: targetEntryIds.length,
    target_entry_ids: targetEntryIds,
  };
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  try {
    const body = await readJsonBody<{
      phone?: string;
      work_entry_id?: string;
      work_entry_ids?: string[];
      amount?: number;
    }>(req);

    const supabase = serviceClient();
    const entryIds = body.work_entry_ids || (body.work_entry_id ? [body.work_entry_id] : []);

    let phone = normalizePhone(body.phone);
    let customerName: string | undefined;

    if (!phone && entryIds.length) {
      const { data } = await supabase
        .from('work_entries')
        .select('customer_phone, rental_person_name')
        .eq('id', entryIds[0])
        .single();
      phone = normalizePhone(data?.customer_phone);
      customerName = data?.rental_person_name;
    }

    if (!phone) return badRequest(res, 'A valid customer mobile number is required.');

    const result = await createLinkForPhone({
      phone,
      source: entryIds.length ? 'driver' : 'vehicle_qr',
      workEntryIds: entryIds.length ? entryIds : undefined,
      amount: body.amount,
      customerName,
    });

    return res.status(200).json(result);
  } catch (error) {
    return serverError(res, error);
  }
}
