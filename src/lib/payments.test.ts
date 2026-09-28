import { describe, it, expect } from 'vitest';
import { orderedUpiApps, isValidIndianMobile, whatsappBillLink, formatRupees } from './payments';

describe('orderedUpiApps', () => {
  it('leads with the generic chooser, which works on every phone', () => {
    const apps = orderedUpiApps({
      default: 'upi://pay?x=1',
      gpay: 'gpay://x',
      phonepe: 'phonepe://x',
      paytm: 'paytm://x',
      web: 'https://cashfree.com/x',
    });
    expect(apps[0].key).toBe('default');
    expect(apps[0].primary).toBe(true);
    expect(apps.filter((a) => a.primary)).toHaveLength(1);
  });

  it('promotes a named app when Cashfree sends no generic chooser', () => {
    // Otherwise the customer would see only small secondary buttons and no clear action.
    const apps = orderedUpiApps({ gpay: 'gpay://x', phonepe: 'phonepe://x' });
    expect(apps[0].key).toBe('gpay');
    expect(apps[0].primary).toBe(true);
  });

  it('omits apps Cashfree did not return', () => {
    const apps = orderedUpiApps({ default: 'upi://x', paytm: 'paytm://x' });
    expect(apps.map((a) => a.key)).toEqual(['default', 'paytm']);
  });

  it('returns nothing when there are no links at all', () => {
    expect(orderedUpiApps({})).toEqual([]);
    expect(orderedUpiApps({ web: 'https://x' })).toEqual([]); // web is a separate fallback
  });
});

describe('isValidIndianMobile', () => {
  it('accepts the forms a driver actually types', () => {
    for (const value of ['9486532856', '+919486532856', '09486532856', '94865 32856']) {
      expect(isValidIndianMobile(value), value).toBe(true);
    }
  });

  it('rejects junk', () => {
    for (const value of ['', '12345', '1234567890', '5486532856', 'abcdefghij']) {
      expect(isValidIndianMobile(value), value).toBe(false);
    }
  });
});

describe('whatsappBillLink', () => {
  const base = {
    phone: '+919486532856',
    customerName: 'Ramasamy',
    date: '14/09/2026',
    machineType: 'Harvester',
    total: 5000,
    received: 1000,
    advance: 1000,
  };

  it('addresses the number with a country code', () => {
    expect(whatsappBillLink(base)).toContain('wa.me/919486532856');
    expect(whatsappBillLink({ ...base, phone: '9486532856' })).toContain('wa.me/919486532856');
  });

  it('states the balance the admin panel would show (total - received - advance)', () => {
    const text = decodeURIComponent(whatsappBillLink(base));
    expect(text).toContain('Balance due: Rs.3,000');
  });

  it('says thank you instead of chasing when nothing is owed', () => {
    const text = decodeURIComponent(whatsappBillLink({ ...base, received: 4000 }));
    expect(text).toContain('Fully paid');
    expect(text).not.toContain('Pay here');
  });
});

describe('formatRupees', () => {
  it('uses Indian digit grouping, matching the admin panel', () => {
    expect(formatRupees(1234567)).toBe('Rs.12,34,567');
    expect(formatRupees(0)).toBe('Rs.0');
  });
});
