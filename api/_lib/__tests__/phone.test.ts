import { describe, it, expect } from 'vitest';
import { normalizePhone, localDigits, formatPhoneForDisplay, toCashfreePhone } from '../phone.js';

describe('normalizePhone', () => {
  it('reduces every shape a real number arrives in to one string', () => {
    // This is the whole point of the module: the driver types one form, the contact
    // card holds another, Cashfree returns a third, and the dues lookup joins on the
    // result. If these ever diverge, a customer who owes money is told they owe none.
    const expected = '+919486532856';
    const inputs = [
      '9486532856',
      '+919486532856',
      '919486532856',
      '09486532856',
      '0919486532856',
      '91 94865 32856',
      '+91 94865-32856',
      '  9486532856  ',
      '(+91) 9486 532 856',
      '0091 9486532856',
    ];
    for (const input of inputs) {
      expect(normalizePhone(input), `failed for: ${input}`).toBe(expected);
    }
  });

  it('rejects anything that cannot be an Indian mobile', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('94865328561234')).toBeNull();
    expect(normalizePhone('abcdefghij')).toBeNull();
    // Indian mobiles start 6-9; landline/invalid prefixes must not pass.
    expect(normalizePhone('1234567890')).toBeNull();
    expect(normalizePhone('5486532856')).toBeNull();
    expect(normalizePhone('0486532856')).toBeNull();
  });

  it('accepts every valid Indian mobile prefix', () => {
    for (const prefix of ['6', '7', '8', '9']) {
      expect(normalizePhone(`${prefix}486532856`)).toBe(`+91${prefix}486532856`);
    }
  });

  it('is idempotent, so re-normalising stored values is safe', () => {
    const once = normalizePhone('9486532856')!;
    expect(normalizePhone(once)).toBe(once);
    expect(normalizePhone(normalizePhone(once)!)).toBe(once);
  });
});

describe('presentation helpers', () => {
  it('strips the country code for wa.me links and Cashfree', () => {
    expect(localDigits('+919486532856')).toBe('9486532856');
    expect(toCashfreePhone('+919486532856')).toBe('9486532856');
  });

  it('formats for humans', () => {
    expect(formatPhoneForDisplay('+919486532856')).toBe('94865 32856');
  });
});
