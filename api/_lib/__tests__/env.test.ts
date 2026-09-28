import { describe, it, expect, afterEach } from 'vitest';
import { withProtectionBypass, normalizeEnv, toErrorMessage } from '../env.js';

const BYPASS = 'VERCEL_AUTOMATION_BYPASS_SECRET';

describe('withProtectionBypass', () => {
  afterEach(() => {
    delete process.env[BYPASS];
  });

  it('leaves the URL alone when no secret is set (production)', () => {
    const url = 'https://kbsearthmovers.vercel.app/api/webhooks/cashfree';
    expect(withProtectionBypass(url)).toBe(url);
  });

  it('appends the secret so Cashfree can reach a protected preview', () => {
    process.env[BYPASS] = 'abc123';
    expect(withProtectionBypass('https://preview.vercel.app/api/webhooks/cashfree')).toBe(
      'https://preview.vercel.app/api/webhooks/cashfree?x-vercel-protection-bypass=abc123'
    );
  });

  it('uses & when the URL already has a query string', () => {
    process.env[BYPASS] = 'abc123';
    expect(withProtectionBypass('https://preview.vercel.app/hook?a=1')).toBe(
      'https://preview.vercel.app/hook?a=1&x-vercel-protection-bypass=abc123'
    );
  });

  it('url-encodes a secret containing reserved characters', () => {
    process.env[BYPASS] = 'a+b/c=d';
    expect(withProtectionBypass('https://x.dev/hook')).toContain(
      'x-vercel-protection-bypass=a%2Bb%2Fc%3Dd'
    );
  });
});

describe('normalizeEnv', () => {
  it('strips the quotes and whitespace a dashboard paste often carries', () => {
    expect(normalizeEnv('  "secret"  ')).toBe('secret');
    expect(normalizeEnv("'secret'")).toBe('secret');
    expect(normalizeEnv(undefined)).toBe('');
  });
});

describe('toErrorMessage', () => {
  it('narrows unknown catch values', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
    expect(toErrorMessage('boom')).toBe('boom');
    expect(toErrorMessage({ weird: true })).toBe('Unknown error');
  });
});
