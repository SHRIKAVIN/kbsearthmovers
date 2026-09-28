/**
 * Throttle for the public dues lookup.
 *
 * The threat is someone enumerating phone numbers to find out who owes what. The
 * signal for that is MANY DIFFERENT numbers from one source - not many requests. A
 * customer standing at the harvester will retry their own number several times
 * (mistyped it, lost signal, pressed twice), and that must never be punished.
 *
 * Counting raw requests per IP got this backwards on both sides. It blocked the
 * retrying customer, and - because Indian mobile carriers put huge numbers of
 * subscribers behind carrier-grade NAT - it let a handful of unrelated customers on
 * the same carrier lock each other out. A customer in a field who cannot pay is a
 * far worse outcome than someone learning a rupee figure for a number they already
 * know, which is all this endpoint ever returns.
 */

export type LimiterOptions = {
  windowMs: number;
  /** How many DISTINCT numbers one source may look up per window. */
  maxDistinctPhones: number;
  /** Stop the map growing without bound on a long-lived instance. */
  maxSources?: number;
};

export type LimiterDecision = { allowed: boolean; distinctCount: number };

export function createLookupLimiter(options: LimiterOptions) {
  const { windowMs, maxDistinctPhones, maxSources = 5000 } = options;
  // source -> phone -> last seen (ms)
  const sources = new Map<string, Map<string, number>>();

  return {
    check(source: string, phone: string, now: number = Date.now()): LimiterDecision {
      let phones = sources.get(source);
      if (!phones) {
        if (sources.size >= maxSources) sources.clear();
        phones = new Map<string, number>();
        sources.set(source, phones);
      }

      for (const [seenPhone, at] of phones) {
        if (now - at >= windowMs) phones.delete(seenPhone);
      }

      // A repeat of a number this source already asked about is always fine - that is
      // a customer retrying, not a scan.
      if (phones.has(phone)) {
        phones.set(phone, now);
        return { allowed: true, distinctCount: phones.size };
      }

      if (phones.size >= maxDistinctPhones) {
        return { allowed: false, distinctCount: phones.size };
      }

      phones.set(phone, now);
      return { allowed: true, distinctCount: phones.size };
    },

    /** Testing seam. */
    reset() {
      sources.clear();
    },
  };
}
