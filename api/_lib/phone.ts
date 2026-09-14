/**
 * Indian mobile numbers reach us in every shape the field produces: as typed by a
 * driver (9486532856), pasted from a contact card (+91 94865 32856), dialled with a
 * trunk prefix (09486532856), or returned by Cashfree (+919486532856).
 *
 * Every one of those must reduce to the SAME string, because that string is the key
 * the dues lookup joins on. A mismatch here doesn't throw - it silently returns
 * "you owe nothing" to a customer who owes money, which is the worst failure mode
 * in this whole system. Hence the dedicated module and the tests beside it.
 */

const E164_IN = /^\+91[6-9]\d{9}$/;

/**
 * Normalize to E.164 (+91XXXXXXXXXX). Returns null if this cannot be a valid
 * Indian mobile number - callers must treat null as a validation failure rather
 * than falling back to the raw input.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Strip everything that isn't a digit or a leading +.
  let digits = String(input).replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) digits = digits.slice(1);

  // Peel prefixes in order rather than as exclusive branches, because they stack:
  // 0 (domestic trunk), 00 (international), and 091... all occur in real contact lists.
  // Safe to strip every leading zero - an Indian mobile always starts 6-9.
  digits = digits.replace(/^0+/, '');

  // 91 country code, once the zeros are gone.
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);

  if (digits.length !== 10) return null;

  const candidate = `+91${digits}`;
  return E164_IN.test(candidate) ? candidate : null;
}

/** The bare 10 digits, for wa.me links and display. */
export function localDigits(e164: string): string {
  return e164.replace(/^\+91/, '');
}

/** 98765 43210 - for showing a number back to a human. */
export function formatPhoneForDisplay(e164: string): string {
  const local = localDigits(e164);
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : local;
}

/** Cashfree's customer_phone field wants the 10-digit form for Indian numbers. */
export function toCashfreePhone(e164: string): string {
  return localDigits(e164);
}
