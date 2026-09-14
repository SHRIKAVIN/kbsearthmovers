import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Check, Loader2, QrCode, Clock4, AlertCircle } from 'lucide-react';
import { supabase, type WorkEntry } from '../../lib/supabase';
import { isValidIndianMobile } from '../../lib/payments';
import { useMobileOptimizations } from '../../hooks/useMobileOptimizations';
import type { Driver } from '../../lib/driverAuth';
import Amount from '../Amount';

type FormValues = Omit<WorkEntry, 'id' | 'created_at' | 'updated_at'> & { broker?: string };

type Props = {
  driver: Driver;
  /** Set once this entry's payment has settled, so the card stops asking for money. */
  settledEntryId?: string | null;
  onSaved: (entry: { id: string; balance: number }) => void;
  onCollect: (entry: { id: string; balance: number }) => void;
  onReset?: () => void;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rig-card p-4">
    <div className="rig-section">
      <span className="rig-section-bar" />
      <h2 className="rig-label !text-rig-ink">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Err: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="mt-1.5 text-[13px] font-medium text-rose-600">{msg}</p> : null;

const JobForm: React.FC<Props> = ({ driver, settledEntryId, onSaved, onCollect, onReset }) => {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState('');
  const [saved, setSaved] = useState<{ id: string; balance: number } | null>(null);
  const { triggerSuccessHaptic, triggerErrorHaptic } = useMobileOptimizations();

  const defaults: Partial<FormValues> = {
    rental_person_name: '',
    customer_phone: '',
    machine_type: 'Harvester',
    hours_driven: undefined,
    total_amount: undefined,
    advance_amount: undefined,
    amount_received: undefined,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    entry_type: 'driver',
    owner: 'Rohini',
    broker: '',
  };

  const { register, handleSubmit, reset, watch, formState: { errors } } =
    useForm<FormValues>({ defaultValues: defaults as FormValues });

  const w = watch();
  // The live readout: what the customer still owes, updating as the driver types.
  // This is the number the whole conversation in the field is about.
  const balance =
    (Number(w.total_amount) || 0) - (Number(w.advance_amount) || 0) - (Number(w.amount_received) || 0);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    setFailed('');

    try {
      const digits = String(data.customer_phone || '').replace(/\D/g, '').replace(/^(0+|91)/, '');
      const { data: row, error } = await supabase
        .from('work_entries')
        .insert([{
          ...data,
          customer_phone: `+91${digits.slice(-10)}`,
          driver_name: driver.name,
          driver_code: driver.code,
          hours_driven: data.hours_driven || 0,
          total_amount: data.total_amount || 0,
          advance_amount: data.advance_amount || 0,
          amount_received: data.amount_received || 0,
          entry_type: 'driver',
          broker: data.broker || '',
        }])
        .select('id, total_amount, amount_received, advance_amount')
        .single();

      if (error) throw error;

      const settled = {
        id: row.id,
        balance:
          Number(row.total_amount) - Number(row.amount_received) - Number(row.advance_amount),
      };
      setSaved(settled);
      onSaved(settled);
      triggerSuccessHaptic();
      reset(defaults as FormValues);
    } catch (error: unknown) {
      setFailed(error instanceof Error ? error.message : 'Could not save the job.');
      triggerErrorHaptic();
    } finally {
      setSaving(false);
    }
  };

  // The payment for this job has landed, so the card closes the loop rather than
  // still offering to collect what has already been collected.
  const settled = saved !== null && settledEntryId === saved.id;

  const startAnother = () => {
    setSaved(null);
    onReset?.();
  };

  if (saved) {
    if (settled) {
      return (
        <div className="rig-card p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-6 w-6 text-white" strokeWidth={3.5} />
            </div>
          </div>
          <p className="mt-4 text-lg font-bold text-rig-ink">Payment received</p>
          <p className="mt-4 rig-label">Collected</p>
          <Amount value={saved.balance} size="xl" tone="positive" className="mt-1" />
          <p className="mt-3 text-[14px] text-gray-500">
            Nothing left to collect on this job.
          </p>
          <button onClick={startAnother} className="rig-btn-primary mt-6">
            Record another job
          </button>
        </div>
      );
    }

    return (
      <div className="rig-card p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-7 w-7 text-emerald-600" strokeWidth={3} />
        </div>
        <p className="mt-4 text-lg font-bold text-rig-ink">Job saved</p>

        {saved.balance > 0 ? (
          <>
            <p className="mt-4 rig-label">Customer owes</p>
            <Amount value={saved.balance} size="xl" tone="accent" className="mt-1" />
            <p className="mt-5 text-[15px] text-gray-600">Is the customer paying now?</p>
            <div className="mt-4 space-y-2.5">
              <button onClick={() => onCollect(saved)} className="rig-btn-primary">
                <QrCode className="h-5 w-5" />
                Collect payment
              </button>
              <button onClick={startAnother} className="rig-btn-ghost">
                <Clock4 className="h-5 w-5" />
                They'll pay later
              </button>
            </div>
            <p className="mt-3 text-[13px] text-gray-500">
              Pay later keeps it unpaid. A payment link goes out on WhatsApp if it stays that way.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-[15px] text-gray-600">Nothing left to collect.</p>
            <button onClick={startAnother} className="rig-btn-ghost mt-5">
              Record another job
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-28">
      <Section title="Customer">
        <div>
          <label className="rig-label mb-2 block">Name</label>
          <input
            data-testid="rental-person-name"
            className="rig-field"
            placeholder="Who hired the machine"
            {...register('rental_person_name', { required: 'Enter the customer name' })}
          />
          <Err msg={errors.rental_person_name?.message} />
        </div>

        <div>
          <label className="rig-label mb-2 block">Mobile</label>
          <div className="flex">
            <span className="flex items-center rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-50 px-3.5 text-[15px] font-semibold text-gray-500">
              +91
            </span>
            <input
              data-testid="customer-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="rig-field !rounded-l-none"
              placeholder="9486532856"
              {...register('customer_phone', {
                required: 'Enter the mobile number',
                validate: (v) => isValidIndianMobile(String(v ?? '')) || 'That is not a 10-digit mobile number',
              })}
            />
          </div>
          <Err msg={errors.customer_phone?.message as string | undefined} />
          {!errors.customer_phone && (
            <p className="mt-1.5 text-[13px] text-gray-500">Needed to collect payment and send the bill.</p>
          )}
        </div>
      </Section>

      <Section title="Work">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rig-label mb-2 block">Date</label>
            <input type="date" className="rig-field" {...register('date', { required: true })} />
          </div>
          <div>
            <label className="rig-label mb-2 block">Start time</label>
            <input type="time" className="rig-field" {...register('time', { required: true })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rig-label mb-2 block">Hours (h.mm)</label>
            <input
              data-testid="hours-driven"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="rig-field rig-amount"
              placeholder="4.30"
              {...register('hours_driven', {
                required: 'Enter the hours worked',
                // Hours drive the rate printed on every bill, so a zero here would put
                // a meaningless figure on a document the customer keeps.
                validate: (v) => Number(v) > 0 || 'Hours must be more than zero',
              })}
            />
            <Err msg={errors.hours_driven?.message as string | undefined} />
            {!errors.hours_driven && (
              <p className="mt-1.5 text-[13px] text-gray-500">4.30 means 4h 30m</p>
            )}
          </div>
          <div>
            <label className="rig-label mb-2 block">Owner</label>
            <select className="rig-field" {...register('owner', { required: true })}>
              <option value="Rohini">Rohini</option>
              <option value="Laxmi">Laxmi</option>
            </select>
          </div>
        </div>

        <div>
          <label className="rig-label mb-2 block">Broker (if any)</label>
          <input className="rig-field" placeholder="Leave blank if none" {...register('broker')} />
        </div>

        <input type="hidden" {...register('machine_type')} value="Harvester" />
      </Section>

      <Section title="Money">
        {[
          ['total_amount', 'Total amount'],
          ['advance_amount', 'Advance taken'],
          ['amount_received', 'Received now'],
        ].map(([field, label]) => (
          <div key={field}>
            <label className="rig-label mb-2 block">{label}</label>
            <div className="flex">
              <span className="flex items-center rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-50 px-3.5 text-[15px] font-semibold text-gray-500">
                ₹
              </span>
              <input
                data-testid={field.replace('_', '-')}
                type="number"
                min="0"
                inputMode="numeric"
                className="rig-field rig-amount !rounded-l-none"
                placeholder="0"
                {...register(field as keyof FormValues, { min: 0 })}
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-xl bg-rig-ink px-4 py-3.5">
          <span className="rig-label !text-gray-400">Balance due</span>
          <Amount value={Math.max(balance, 0)} size="lg" tone="onDark" />
        </div>
      </Section>

      {failed && (
        <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {failed}
        </p>
      )}

      {/* Sticky so the driver never hunts for it after scrolling a long form. */}
      <div className="rig-safe-bottom fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 px-4 pt-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <button type="submit" disabled={saving} data-testid="submit-entry-button" className="rig-btn-primary">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {saving ? 'Saving...' : 'Save job'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default JobForm;
