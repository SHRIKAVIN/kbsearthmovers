import type { WorkEntry } from './supabase';

/**
 * How a job stands, named the way a driver would say it out loud.
 *
 * Balance is total - received - advance, matching the admin panel's own arithmetic
 * so the two screens can never disagree about who owes what.
 */

export type JobStatus = 'paid' | 'partial' | 'unpaid';

export type JobMoney = {
  status: JobStatus;
  balance: number;
  collected: number;
};

export function jobMoney(entry: Pick<WorkEntry, 'total_amount' | 'amount_received' | 'advance_amount'>): JobMoney {
  const total = Number(entry.total_amount) || 0;
  const received = Number(entry.amount_received) || 0;
  const advance = Number(entry.advance_amount) || 0;
  const collected = received + advance;
  const balance = total - collected;

  return {
    balance,
    collected,
    status: balance <= 0 ? 'paid' : collected > 0 ? 'partial' : 'unpaid',
  };
}

export const STATUS_LABEL: Record<JobStatus, string> = {
  paid: 'Paid',
  partial: 'Part paid',
  unpaid: 'Unpaid',
};

/** Chip styling per status. Green reads as settled, amber as owing. */
export const STATUS_STYLE: Record<JobStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  unpaid: 'bg-rose-50 text-rose-700',
};

export const STATUS_DOT: Record<JobStatus, string> = {
  paid: 'bg-emerald-500',
  partial: 'bg-amber-500',
  unpaid: 'bg-rose-500',
};

/** tel: link for the tap-to-call action on a job. */
export function telLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}
