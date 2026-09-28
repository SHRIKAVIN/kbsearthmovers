import { describe, it, expect } from 'vitest';
import {
  rateChart,
  hourlyRateOptions,
  calculateRentalCost,
  toHoursMinutesValue,
  fromHoursMinutesValue,
  type HourlyRate,
} from './rateChart';

describe('rate chart parity with the KBS calculator', () => {
  it('carries every rate the calculator offers', () => {
    expect(hourlyRateOptions).toEqual([2300, 2400, 2500, 2600, 2700]);
  });

  it('matches minutes * rate / 60 to the paisa, for all 300 entries', () => {
    // The chart is copied data. If someone hand-edits a row here it would silently
    // disagree with the calculator on the same job; this catches that.
    for (const rate of hourlyRateOptions) {
      for (let m = 1; m <= 60; m++) {
        const charted = rateChart[rate][m as keyof (typeof rateChart)[HourlyRate]];
        expect(charted, `rate ${rate}, minute ${m}`).toBeCloseTo((rate * m) / 60, 1);
      }
    }
  });

  it('reproduces values lifted straight from the calculator table', () => {
    expect(rateChart[2300][1]).toBe(38.33);
    expect(rateChart[2300][60]).toBe(2300);
    expect(rateChart[2500][30]).toBe(1250);
    expect(rateChart[2700][45]).toBe(2025);
    expect(rateChart[2400][15]).toBe(600);
  });
});

describe('calculateRentalCost', () => {
  it('is whole hours at the full rate plus the charted minutes', () => {
    // 4h 30m at 2500 = 10000 + 1250
    expect(calculateRentalCost(2500, 4, 30).totalCost).toBe(11250);
    // 2h 15m at 2400 = 4800 + 600
    expect(calculateRentalCost(2400, 2, 15).totalCost).toBe(5400);
  });

  it('handles whole hours with no minutes', () => {
    expect(calculateRentalCost(2700, 3, 0).totalCost).toBe(8100);
  });

  it('handles minutes with no hours', () => {
    expect(calculateRentalCost(2300, 0, 30).totalCost).toBe(1150);
  });

  it('treats 60 minutes as the full hourly rate, as the chart does', () => {
    expect(calculateRentalCost(2600, 0, 60).totalCost).toBe(2600);
  });

  it('is zero for a job with no time on it', () => {
    expect(calculateRentalCost(2500, 0, 0).totalCost).toBe(0);
  });
});

describe('H.MM composition', () => {
  it('composes the base-60 value work_entries has always stored', () => {
    // 4h 30m must be 4.30, NOT 4.5 - every existing row and export reads it this way.
    expect(toHoursMinutesValue(4, 30)).toBe(4.3);
    expect(toHoursMinutesValue(2, 5)).toBe(2.05);
    expect(toHoursMinutesValue(3, 0)).toBe(3);
    expect(toHoursMinutesValue(0, 45)).toBe(0.45);
  });

  it('clamps minutes into the hour rather than producing 4.75', () => {
    expect(toHoursMinutesValue(4, 75)).toBe(4.59);
    expect(toHoursMinutesValue(-1, -5)).toBe(0);
  });

  it('round-trips', () => {
    for (const [h, m] of [[4, 30], [2, 5], [0, 45], [7, 59], [3, 0]]) {
      expect(fromHoursMinutesValue(toHoursMinutesValue(h, m))).toEqual({
        hours: h,
        minutes: m,
      });
    }
  });
});

describe('driver rate', () => {
  it('is fixed at 2600', async () => {
    const { DRIVER_RATE } = await import('./rateChart');
    expect(DRIVER_RATE).toBe(2600);
  });

  it('produces the same total the calculator would for that rate', () => {
    // 4h 30m at 2600 = 10400 + 1300
    expect(calculateRentalCost(2600, 4, 30).totalCost).toBe(11700);
    expect(calculateRentalCost(2600, 1, 5).totalCost).toBe(2600 + 216.67);
  });
});
