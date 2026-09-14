import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Phone, QrCode, RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { supabase, type WorkEntry } from '../../lib/supabase';
import { jobMoney, STATUS_LABEL, STATUS_STYLE, STATUS_DOT, telLink, type JobStatus } from '../../lib/jobStatus';
import { formatHoursMinutes, to12Hour } from '../../lib/billFormat';
import type { Driver } from '../../lib/driverAuth';
import Amount from '../Amount';

type Filter = 'all' | 'unpaid' | 'paid';

const JobList: React.FC<{
  driver: Driver;
  refreshKey: number;
  onCollect: (entry: { id: string; balance: number }) => void;
}> = ({ driver, refreshKey, onCollect }) => {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('work_entries')
        .select('*')
        .eq('driver_code', driver.code)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (queryError) throw queryError;
      setEntries((data || []) as WorkEntry[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load your jobs.');
    } finally {
      setLoading(false);
    }
  }, [driver.code]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Same realtime channel style the admin panel uses, so a payment settling shows up
  // on the driver's phone without them pulling to refresh.
  useEffect(() => {
    const channel = supabase
      .channel(`driver_${driver.code}_entries`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_entries' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver.code, load]);

  const visible = entries.filter((entry) => {
    if (filter === 'all') return true;
    const { status } = jobMoney(entry);
    return filter === 'paid' ? status === 'paid' : status !== 'paid';
  });

  const outstanding = entries.reduce((sum, entry) => sum + Math.max(jobMoney(entry).balance, 0), 0);

  return (
    <div className="space-y-4 pb-8">
      {/* What the driver is owed across every job, the headline number for this view. */}
      <div className="rounded-2xl bg-rig-ink p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="rig-label !text-gray-400">Still to collect</p>
            <Amount value={outstanding} size="xl" tone="onDark" className="mt-1" />
          </div>
          <button
            onClick={load}
            className="rounded-xl border border-rig-line p-2.5 text-gray-400 transition hover:text-white"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="mt-2 text-[13px] text-gray-500">
          {entries.length} job{entries.length === 1 ? '' : 's'} recorded
        </p>
      </div>

      <div className="flex gap-2">
        {(['all', 'unpaid', 'paid'] as Filter[]).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold capitalize transition ${
              filter === option
                ? 'bg-rig-ink text-white'
                : 'border-2 border-gray-200 bg-white text-gray-600'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {loading && entries.length === 0 && (
        <div className="rig-card p-10 text-center text-gray-500">Loading your jobs...</div>
      )}

      {!loading && visible.length === 0 && (
        <div className="rig-card p-10 text-center">
          <Inbox className="mx-auto h-9 w-9 text-gray-300" />
          <p className="mt-3 font-semibold text-rig-ink">
            {entries.length === 0 ? 'No jobs yet' : `Nothing ${filter} here`}
          </p>
          <p className="mt-1 text-[14px] text-gray-500">
            {entries.length === 0
              ? 'Jobs you record will show up here with their payment status.'
              : 'Try a different filter.'}
          </p>
        </div>
      )}

      {visible.map((entry) => {
        const { status, balance, collected } = jobMoney(entry);
        const tel = telLink(entry.customer_phone);
        return (
          <article key={entry.id} className="rig-card overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="truncate text-[17px] font-bold text-rig-ink">
                  {entry.rental_person_name}
                </h3>
                <p className="mt-0.5 text-[13px] text-gray-500">
                  {format(parseISO(entry.date), 'dd MMM yyyy')}
                  {entry.time ? ` · ${to12Hour(entry.time)}` : ''}
                  {entry.hours_driven ? ` · ${formatHoursMinutes(entry.hours_driven)}` : ''}
                </p>
              </div>
              <span className={`rig-chip shrink-0 ${STATUS_STYLE[status as JobStatus]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status as JobStatus]}`} />
                {STATUS_LABEL[status as JobStatus]}
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

            <div className="flex gap-2 p-3">
              {tel && (
                <a
                  href={tel}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-[15px] font-semibold text-rig-ink transition active:scale-[0.985]"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
              {balance > 0 && (
                <button
                  onClick={() => onCollect({ id: entry.id!, balance })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rig-accent py-3 text-[15px] font-semibold text-white transition active:scale-[0.985]"
                >
                  <QrCode className="h-4 w-4" />
                  Collect
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default JobList;
