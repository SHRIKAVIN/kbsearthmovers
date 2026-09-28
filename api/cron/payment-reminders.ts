import { createLinkForPhone } from '../payments/create-link.js';
import { normalizePhone } from '../_lib/phone.js';
import { serviceClient } from '../_lib/supabase.js';
import { sendTeamsCard, formatRupees } from '../_lib/teams.js';
import { normalizeEnv, toErrorMessage } from '../_lib/env.js';
import { headerValue, isVercelCron, methodNotAllowed, serverError, type Req, type Res } from '../_lib/http.js';

/** Don't chase someone the same day the job was done. */
const MIN_AGE_DAYS = 3;
/** Cashfree's own auto-reminders nudge in between, so one new link a week is plenty. */
const COOLDOWN_DAYS = 7;
/** Cap per run so one bad day cannot fire hundreds of messages. */
const MAX_PER_RUN = 25;

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, 'GET, POST');

  // Either a genuine Vercel Cron invocation, or a caller holding CRON_SECRET.
  const secret = normalizeEnv(process.env.CRON_SECRET);
  const provided =
    headerValue(req.headers, 'authorization')?.replace(/^Bearer\s+/i, '') ||
    new URL(req.url || '', 'http://localhost').searchParams.get('secret') ||
    '';

  if (!isVercelCron(req) && (!secret || provided !== secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = serviceClient();

    const { data: candidates, error } = await supabase
      .from('work_entries')
      .select('id, rental_person_name, customer_phone, total_amount, amount_received, advance_amount, date')
      .not('customer_phone', 'is', null)
      .lte('date', daysAgo(MIN_AGE_DAYS))
      .order('date', { ascending: true })
      .limit(500);

    if (error) throw new Error(error.message);

    // Outstanding balance is a computed expression, so filter it here rather than
    // trying to express it as a PostgREST filter.
    const outstanding = (candidates || []).filter(
      (e) => Number(e.total_amount) - Number(e.amount_received) - Number(e.advance_amount) > 0
    );

    // Skip anyone already chased inside the cooldown.
    const { data: recent } = await supabase
      .from('reminder_log')
      .select('work_entry_id')
      .gte('sent_at', new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString());

    const recentlyReminded = new Set((recent || []).map((r) => r.work_entry_id));

    // One link per customer covering everything they owe, not one per job - three
    // separate WhatsApps for three jobs would read as spam.
    const byPhone = new Map<string, { entries: typeof outstanding; name: string; total: number }>();

    for (const entry of outstanding) {
      if (recentlyReminded.has(entry.id)) continue;
      const phone = normalizePhone(entry.customer_phone);
      if (!phone) continue;

      const balance =
        Number(entry.total_amount) - Number(entry.amount_received) - Number(entry.advance_amount);
      const bucket = byPhone.get(phone) || {
        entries: [] as typeof outstanding,
        name: entry.rental_person_name,
        total: 0,
      };
      bucket.entries.push(entry);
      bucket.total += balance;
      byPhone.set(phone, bucket);
    }

    const sent: Array<{ phone: string; amount: number; entries: number }> = [];
    const failed: Array<{ phone: string; reason: string }> = [];

    for (const [phone, bucket] of Array.from(byPhone.entries()).slice(0, MAX_PER_RUN)) {
      try {
        const link = await createLinkForPhone({
          phone,
          source: 'reminder',
          workEntryIds: bucket.entries.map((e) => e.id),
          customerName: bucket.name,
        });

        await supabase.from('reminder_log').insert(
          bucket.entries.map((e) => ({
            work_entry_id: e.id,
            cf_link_id: link.link_id,
            link_url: link.link_url,
            channel: 'cashfree_link',
          }))
        );

        sent.push({ phone, amount: link.amount, entries: bucket.entries.length });
      } catch (err: unknown) {
        failed.push({ phone, reason: toErrorMessage(err) });
      }
    }

    const totalChased = sent.reduce((total, s) => total + s.amount, 0);

    if (sent.length || failed.length) {
      await sendTeamsCard({
        title: `Payment reminders sent - ${sent.length}`,
        summary: `${sent.length} payment reminders sent`,
        subtitle: 'Daily reminder sweep',
        success: failed.length === 0,
        facts: [
          { name: 'Reminders sent', value: String(sent.length) },
          { name: 'Total chased', value: formatRupees(totalChased) },
          { name: 'Failed', value: String(failed.length) },
          { name: 'Time', value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        ],
      }).catch(() => undefined);
    }

    return res.status(200).json({
      success: true,
      candidates: outstanding.length,
      customers: byPhone.size,
      sent: sent.length,
      failed,
      total_chased: totalChased,
    });
  } catch (error) {
    return serverError(res, error);
  }
}
