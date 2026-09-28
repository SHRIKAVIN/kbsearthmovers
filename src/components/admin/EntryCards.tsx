import React from 'react';
import { format, parseISO } from 'date-fns';
import { Edit2, Trash2, MessageCircle, Phone } from 'lucide-react';
import type { WorkEntry } from '../../lib/supabase';
import { jobMoney, STATUS_LABEL, STATUS_STYLE, STATUS_DOT, telLink } from '../../lib/jobStatus';
import { formatHoursMinutes, to12Hour } from '../../lib/billFormat';
import Amount from '../Amount';

/**
 * The work-entry table, as cards, for phones.
 *
 * A seven-column financial table inside a horizontal scroller is the standard way
 * mobile tables fail: the balance - the only figure anyone opens this screen for -
 * sits off the right edge. Each row becomes a card instead, with the balance as a
 * readout and the actions reachable by thumb. The table still renders on desktop,
 * where it is the right shape.
 */
const EntryCards: React.FC<{
  entries: WorkEntry[];
  onEdit: (entry: WorkEntry) => void;
  onDelete: (id: string) => void;
  onBill: (entry: WorkEntry) => void;
}> = ({ entries, onEdit, onDelete, onBill }) => (
  <div className="space-y-3 p-3">
    {entries.map((entry) => {
      const { status, balance, collected } = jobMoney(entry);
      const tel = telLink(entry.customer_phone);

      return (
        <article key={entry.id} className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-bold text-rig-ink">
                {entry.rental_person_name}
              </h3>
              <p className="mt-0.5 text-[12px] text-gray-500">
                {format(parseISO(entry.date), 'dd MMM yyyy')}
                {entry.time ? ` · ${to12Hour(entry.time)}` : ''}
                {entry.hours_driven ? ` · ${formatHoursMinutes(entry.hours_driven)}` : ''}
              </p>
              <p className="mt-1 text-[12px] text-gray-400">
                {entry.owner}
                {entry.broker ? ` · ${entry.broker}` : ''}
                {entry.driver_name ? ` · ${entry.driver_name}` : ''}
              </p>
            </div>
            <span className={`rig-chip shrink-0 ${STATUS_STYLE[status]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
              {STATUS_LABEL[status]}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px border-y border-gray-100 bg-gray-100">
            {([
              { label: 'Total', value: entry.total_amount, tone: 'ink' },
              { label: 'Collected', value: collected, tone: 'positive' },
              {
                label: 'Balance',
                value: Math.max(balance, 0),
                tone: balance > 0 ? 'accent' : 'muted',
              },
            ] as const).map((cell) => (
              <div key={cell.label} className="bg-white px-3 py-2.5">
                <p className="rig-label !text-[10px]">{cell.label}</p>
                <Amount value={cell.value} size="md" tone={cell.tone} className="mt-0.5" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-2.5">
            {tel && (
              <a
                href={tel}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 py-2.5 text-[14px] font-semibold text-rig-ink"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            )}
            {entry.customer_phone && (
              <button
                onClick={() => onBill(entry)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 py-2.5 text-[14px] font-semibold text-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Bill
              </button>
            )}
            <button
              onClick={() => onEdit(entry)}
              className="rounded-xl border-2 border-gray-200 p-2.5 text-amber-600"
              aria-label={`Edit ${entry.rental_person_name}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(entry.id!)}
              className="rounded-xl border-2 border-gray-200 p-2.5 text-rose-600"
              aria-label={`Delete ${entry.rental_person_name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </article>
      );
    })}
  </div>
);

export default EntryCards;
