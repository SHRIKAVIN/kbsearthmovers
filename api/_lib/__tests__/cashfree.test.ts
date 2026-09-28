import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '../cashfree.js';

const SECRET = 'test_secret_key';

function sign(timestamp: string, body: string, secret = SECRET): string {
  return crypto.createHmac('sha256', secret).update(timestamp + body).digest('base64');
}

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: { order: { order_id: 'kbs_abc' }, payment: { payment_amount: 4500.0 } },
  });

  let now: string;

  beforeEach(() => {
    now = String(Math.floor(Date.now() / 1000));
    process.env.CASHFREE_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CASHFREE_WEBHOOK_SECRET;
  });

  it('accepts a correctly signed payload', () => {
    expect(verifyWebhookSignature(sign(now, body), now, body)).toEqual({ ok: true });
  });

  it('rejects a tampered body', () => {
    // The attack this defends against: keep a valid signature, swap the amount.
    const signature = sign(now, body);
    const tampered = body.replace('4500', '1');
    const result = verifyWebhookSignature(signature, now, tampered);
    expect(result.ok).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    const result = verifyWebhookSignature(sign(now, body, 'wrong_secret'), now, body);
    expect(result).toEqual({ ok: false, reason: 'signature mismatch' });
  });

  it('rejects a replayed webhook', () => {
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const result = verifyWebhookSignature(sign(old, body), old, body);
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toMatch(/too old/);
  });

  it('rejects missing headers rather than defaulting to trust', () => {
    expect(verifyWebhookSignature(undefined, now, body).ok).toBe(false);
    expect(verifyWebhookSignature(sign(now, body), undefined, body).ok).toBe(false);
    expect(verifyWebhookSignature('', now, body).ok).toBe(false);
  });

  it('rejects a malformed timestamp', () => {
    expect(verifyWebhookSignature(sign('abc', body), 'abc', body)).toEqual({
      ok: false,
      reason: 'malformed timestamp',
    });
  });

  it('refuses to verify when no secret is configured', () => {
    delete process.env.CASHFREE_WEBHOOK_SECRET;
    delete process.env.CASHFREE_CLIENT_SECRET;
    const result = verifyWebhookSignature(sign(now, body), now, body);
    expect(result).toEqual({ ok: false, reason: 'no webhook secret configured' });
  });

  it('is sensitive to decimal formatting, which is why raw bytes matter', () => {
    // JSON.parse -> JSON.stringify turns 4500.00 into 4500 and breaks the HMAC.
    // This test documents why the handler disables Vercel's body parser.
    const rawFromCashfree = '{"amount":4500.00}';
    const reserialised = JSON.stringify(JSON.parse(rawFromCashfree));
    expect(reserialised).not.toBe(rawFromCashfree);
    const signature = sign(now, rawFromCashfree);
    expect(verifyWebhookSignature(signature, now, rawFromCashfree)).toEqual({ ok: true });
    expect(verifyWebhookSignature(signature, now, reserialised).ok).toBe(false);
  });
});
