import { describe, it, expect } from 'vitest';
import { createLookupLimiter } from '../rate-limit.js';

const opts = { windowMs: 60_000, maxDistinctPhones: 20 };

describe('createLookupLimiter', () => {
  it('never blocks a customer retrying their own number', () => {
    // The exact case the old per-request limiter broke: someone at the harvester
    // mistypes, loses signal, taps twice. They must always get through.
    const limiter = createLookupLimiter(opts);
    for (let i = 0; i < 200; i++) {
      expect(limiter.check('1.2.3.4', '+919000000001').allowed, `attempt ${i}`).toBe(true);
    }
  });

  it('lets many different customers share one carrier NAT address', () => {
    const limiter = createLookupLimiter(opts);
    for (let i = 0; i < 20; i++) {
      const phone = `+9190000000${String(i).padStart(2, '0')}`;
      expect(limiter.check('1.2.3.4', phone).allowed, phone).toBe(true);
    }
  });

  it('blocks a scan of many distinct numbers from one source', () => {
    const limiter = createLookupLimiter(opts);
    for (let i = 0; i < 20; i++) {
      limiter.check('9.9.9.9', `+9190000001${String(i).padStart(2, '0')}`);
    }
    expect(limiter.check('9.9.9.9', '+919999999999').allowed).toBe(false);
  });

  it('still serves an already-seen number to a blocked scanner', () => {
    // Punishing the scan must not strand a real customer who happens to share the IP
    // and already got through once.
    const limiter = createLookupLimiter(opts);
    limiter.check('9.9.9.9', '+919000000001');
    for (let i = 0; i < 30; i++) {
      limiter.check('9.9.9.9', `+9190000002${String(i).padStart(2, '0')}`);
    }
    expect(limiter.check('9.9.9.9', '+919000000001').allowed).toBe(true);
  });

  it('forgets numbers once the window passes', () => {
    const limiter = createLookupLimiter(opts);
    const start = 1_000_000;
    for (let i = 0; i < 20; i++) {
      limiter.check('1.2.3.4', `+9190000003${String(i).padStart(2, '0')}`, start);
    }
    expect(limiter.check('1.2.3.4', '+919111111111', start).allowed).toBe(false);
    expect(limiter.check('1.2.3.4', '+919111111111', start + 60_001).allowed).toBe(true);
  });

  it('keeps sources independent', () => {
    const limiter = createLookupLimiter(opts);
    for (let i = 0; i < 25; i++) {
      limiter.check('1.1.1.1', `+9190000004${String(i).padStart(2, '0')}`);
    }
    expect(limiter.check('2.2.2.2', '+919000000499').allowed).toBe(true);
  });
});
