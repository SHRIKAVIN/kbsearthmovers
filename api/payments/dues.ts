import { normalizePhone } from '../_lib/phone.js';
import { outstandingForPhone, sumBalances } from '../_lib/supabase.js';
import { badRequest, headerValue, methodNotAllowed, readJsonBody, serverError, type Req, type Res } from '../_lib/http.js';
import { createLookupLimiter } from '../_lib/rate-limit.js';

/**
 * There is no OTP on this endpoint - a deliberate call that keeps the roadside flow to
 * two taps. The mitigation is that the response carries no identity: a rupee figure and
 * a job count, no name, no dates, no job details. The limiter below is the second layer,
 * and it counts distinct numbers rather than requests so that a customer retrying their
 * own number is never blocked. See rate-limit.ts for why that distinction matters.
 *
 * It is per-instance and resets on cold start, so treat it as friction, not a guarantee.
 * If dues lookups ever need to be genuinely private, add the SMS OTP step.
 */
const limiter = createLookupLimiter({
  windowMs: 60_000,
  maxDistinctPhones: 20,
});

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  try {
    const body = await readJsonBody<{ phone?: string }>(req);
    const phone = normalizePhone(body.phone);
    if (!phone) return badRequest(res, 'Enter a valid 10-digit mobile number.');

    const source =
      headerValue(req.headers, 'x-forwarded-for')?.split(',')[0]?.trim() ||
      headerValue(req.headers, 'x-real-ip') ||
      'unknown';

    if (!limiter.check(source, phone).allowed) {
      return res.status(429).json({
        error: 'Too many different numbers checked from here. Please wait a minute.',
      });
    }

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
