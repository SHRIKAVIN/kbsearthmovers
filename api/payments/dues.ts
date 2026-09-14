import { normalizePhone } from '../_lib/phone.js';
import { outstandingForPhone, sumBalances } from '../_lib/supabase.js';
import { badRequest, headerValue, methodNotAllowed, readJsonBody, serverError, type Req, type Res } from '../_lib/http.js';

/**
 * Best-effort throttle on dues lookups.
 *
 * There is no OTP on this endpoint (a deliberate call - it keeps the roadside flow to
 * two taps), so the mitigation against someone enumerating phone numbers is that the
 * response carries no identity: just a rupee figure and a job count. No name, no dates,
 * no job details. This limiter raises the cost of bulk scanning on top of that.
 *
 * It is per-instance and resets on cold start, so treat it as friction, not a guarantee.
 * If dues lookups ever need to be genuinely private, add the SMS OTP step.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) hits.clear(); // crude guard against unbounded growth
  return recent.length > MAX_PER_WINDOW;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  try {
    const ip =
      headerValue(req.headers, 'x-forwarded-for')?.split(',')[0]?.trim() ||
      headerValue(req.headers, 'x-real-ip') ||
      'unknown';

    if (rateLimited(ip)) {
      return res.status(429).json({ error: 'Too many lookups. Please wait a minute and try again.' });
    }

    const body = await readJsonBody<{ phone?: string }>(req);
    const phone = normalizePhone(body.phone);
    if (!phone) return badRequest(res, 'Enter a valid 10-digit mobile number.');

    const entries = await outstandingForPhone(phone);
    const totalDue = Math.round(sumBalances(entries) * 100) / 100;

    // Amount and count only. Adding names or dates here would turn a guessed phone
    // number into a customer's job history.
    return res.status(200).json({
      total_due: totalDue,
      count: entries.length,
      has_dues: totalDue > 0,
    });
  } catch (error) {
    return serverError(res, error);
  }
}
