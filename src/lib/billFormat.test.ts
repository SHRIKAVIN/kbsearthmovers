import { describe, it, expect } from 'vitest';
import {
  hmmToDecimalHours, formatHoursMinutes, addHoursToTime, to12Hour,
  numberToWordsIndian, rupeesInWords, invoiceNumberFor,
} from './billFormat';

describe('hmmToDecimalHours', () => {
  it('reads H.MM as base-60, not decimal', () => {
    // The whole point: 4.30 is 4h30m = 4.5 hours, NOT 4.3.
    expect(hmmToDecimalHours(4.3)).toBe(4.5);
    expect(hmmToDecimalHours(2.2)).toBeCloseTo(2 + 20 / 60, 10);
    expect(hmmToDecimalHours(3.15)).toBe(3.25);
    expect(hmmToDecimalHours(7.45)).toBe(7.75);
  });

  it('survives float noise in stored numerics', () => {
    // 4.30 - 4 is 0.29999999999999982 in IEEE754; naive maths gives 4.4999...
    expect(hmmToDecimalHours(4.3)).toBe(4.5);
    expect(hmmToDecimalHours(0)).toBe(0);
    expect(hmmToDecimalHours(5)).toBe(5);
  });
});

describe('formatHoursMinutes', () => {
  it('renders for humans', () => {
    expect(formatHoursMinutes(4.3)).toBe('4h 30m');
    expect(formatHoursMinutes(3.15)).toBe('3h 15m');
    expect(formatHoursMinutes(5)).toBe('5h');
  });
});

describe('addHoursToTime', () => {
  it('derives the To Time the bill needs but the database does not store', () => {
    // Straight from the reference bill: 10:00 AM + 4.30 = 02:30 PM
    expect(addHoursToTime('10:00', 4.3)).toBe('02:30 PM');
    // 03:00 PM + 3.15 = 06:15 PM
    expect(addHoursToTime('15:00', 3.15)).toBe('06:15 PM');
  });

  it('wraps past midnight rather than producing hour 25', () => {
    expect(addHoursToTime('23:00', 2.3)).toBe('01:30 AM');
  });

  it('returns empty for an unusable time instead of guessing', () => {
    expect(addHoursToTime('', 2)).toBe('');
    expect(addHoursToTime('nonsense', 2)).toBe('');
  });
});

describe('to12Hour', () => {
  it('handles noon and midnight, where 12-hour clocks usually break', () => {
    expect(to12Hour('00:00')).toBe('12:00 AM');
    expect(to12Hour('12:00')).toBe('12:00 PM');
    expect(to12Hour('13:05')).toBe('01:05 PM');
    expect(to12Hour('09:30')).toBe('09:30 AM');
  });
});

describe('numberToWordsIndian', () => {
  it('matches the reference bill', () => {
    expect(rupeesInWords(33750)).toBe('Rupees Thirty Three Thousand Seven Hundred Fifty Only');
  });

  it('uses lakh and crore, not million', () => {
    expect(numberToWordsIndian(100000)).toBe('One Lakh');
    expect(numberToWordsIndian(2500000)).toBe('Twenty Five Lakh');
    expect(numberToWordsIndian(10000000)).toBe('One Crore');
    expect(numberToWordsIndian(12345678)).toBe(
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight'
    );
  });

  it('handles the teens and round numbers', () => {
    expect(numberToWordsIndian(0)).toBe('Zero');
    expect(numberToWordsIndian(15)).toBe('Fifteen');
    expect(numberToWordsIndian(100)).toBe('One Hundred');
    expect(numberToWordsIndian(1000)).toBe('One Thousand');
    expect(numberToWordsIndian(21500)).toBe('Twenty One Thousand Five Hundred');
  });
});

describe('invoiceNumberFor', () => {
  it('is stable for the same entry', () => {
    const id = '2d1b0a3a-ff16-40b0-bcad-f343fa7018e9';
    expect(invoiceNumberFor(id, '2026-09-14')).toBe(invoiceNumberFor(id, '2026-09-14'));
  });

  it('is a readable 4-digit number', () => {
    expect(invoiceNumberFor('2d1b0a3a-ff16-40b0-bcad-f343fa7018e9', '2026-09-14')).toMatch(/^\d{4}$/);
  });
});
