/**
 * Pure formatting helpers for the rental bill. Kept separate from the drawing code so
 * the fiddly arithmetic can be tested without a canvas.
 */

/**
 * hours_driven is stored as H.MM base-60, NOT decimal: 4.30 means 4h30m, which is 4.5
 * decimal hours. Treating it as 4.3 understates every derived rate, so anything that
 * multiplies or divides by hours must convert first.
 */
export function hmmToDecimalHours(hmm: number): number {
  const value = Number(hmm) || 0;
  const wholeHours = Math.floor(value);
  // Round to kill float noise: 4.30 - 4 is 0.29999999999999982.
  const minutes = Math.round((value - wholeHours) * 100);
  return wholeHours + minutes / 60;
}

/** 4.30 -> "4h 30m", for humans. */
export function formatHoursMinutes(hmm: number): string {
  const value = Number(hmm) || 0;
  const wholeHours = Math.floor(value);
  const minutes = Math.round((value - wholeHours) * 100);
  return minutes ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
}

/** "10:00" + 4.30 (H.MM) -> "02:30 PM" */
export function addHoursToTime(startTime: string, hmm: number): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(startTime || '');
  if (!match) return '';

  const totalMinutes =
    Number(match[1]) * 60 + Number(match[2]) + Math.round(hmmToDecimalHours(hmm) * 60);

  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return to12Hour(`${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
}

/** "14:30" -> "02:30 PM" */
export function to12Hour(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (!match) return time || '';
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hours12).padStart(2, '0')}:${match[2]} ${suffix}`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ` ${ONES[ones]}` : '');
}

/**
 * Indian numbering: crore, lakh, thousand, hundred - not the western
 * million/billion grouping. 33750 -> "Thirty Three Thousand Seven Hundred Fifty".
 */
export function numberToWordsIndian(amount: number): string {
  const value = Math.floor(Math.abs(Number(amount) || 0));
  if (value === 0) return 'Zero';

  const parts: string[] = [];
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const hundred = Math.floor((value % 1000) / 100);
  const rest = value % 100;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));

  return parts.join(' ');
}

export function rupeesInWords(amount: number): string {
  return `Rupees ${numberToWordsIndian(amount)} Only`;
}

export function formatRupeeAmount(amount: number): string {
  return Number(amount || 0).toLocaleString('en-IN');
}

/**
 * A stable, short invoice number. Entries have no invoice column, so it is derived
 * from the row id: the same entry always produces the same number, and two entries
 * essentially never collide within one business's volume.
 */
export function invoiceNumberFor(entryId: string | undefined, fallbackDate: string): string {
  if (!entryId) return fallbackDate.replace(/\D/g, '').slice(-6);
  const hex = entryId.replace(/-/g, '').slice(0, 8);
  return String((parseInt(hex, 16) % 9000) + 1000);
}
