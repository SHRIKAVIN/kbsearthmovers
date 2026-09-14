import React, { useState, useRef } from 'react';
import { Clock, Tag } from 'lucide-react';
import { hourlyRateOptions, calculateRentalCost, type HourlyRate } from '../../lib/rateChart';
import Amount from '../Amount';

/**
 * Usage time and rate, matching the KBS Harvester Rental Calculator.
 *
 * Hours and minutes are separate fields with a colon between them, as in the
 * calculator, because a driver thinks "four and a half hours" - not "4.30" - and
 * typing a decimal that secretly means base-60 is where mistakes get made. The
 * H.MM value the database has always stored is composed from these on save.
 *
 * The total is computed with the calculator's own rate chart so the two tools can
 * never quote a customer different figures for the same job.
 */
const TimeAndRate: React.FC<{
  hours: number | '';
  minutes: number | '';
  rate: HourlyRate;
  onHours: (value: number | '') => void;
  onMinutes: (value: number | '') => void;
  onRate: (rate: HourlyRate) => void;
  /**
   * Drivers see one agreed rate rather than choosing one at the roadside - the same
   * split the calculator makes between its admin and regular views. Tapping the rate
   * five times reveals the full set, for the occasional job priced differently,
   * without putting that choice in front of them on every entry.
   */
  rateLocked?: boolean;
  error?: string;
}> = ({ hours, minutes, rate, onHours, onMinutes, onRate, rateLocked = false, error }) => {
  const [unlocked, setUnlocked] = useState(false);
  const taps = useRef({ count: 0, last: 0 });

  const handleRateTap = () => {
    if (!rateLocked || unlocked) return;
    const now = Date.now();
    // Taps have to be deliberate: a pause restarts the count, so stray taps over a
    // long form-fill never add up to an unlock.
    taps.current.count = now - taps.current.last > 1500 ? 1 : taps.current.count + 1;
    taps.current.last = now;
    if (taps.current.count >= 5) setUnlocked(true);
  };

  // Picking a rate collapses the list again, so the form returns to showing one
  // agreed rate - now the chosen one - rather than leaving the full set on screen
  // for the rest of the entry.
  const chooseRate = (option: HourlyRate) => {
    onRate(option);
    if (rateLocked) {
      taps.current = { count: 0, last: 0 };
      setUnlocked(false);
    }
  };

  const showPicker = !rateLocked || unlocked;
  const total = calculateRentalCost(rate, Number(hours) || 0, Number(minutes) || 0).totalCost;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="rounded-xl bg-gray-100 p-2">
            <Clock className="h-5 w-5 text-gray-600" />
          </span>
          <span className="text-[17px] font-bold text-rig-ink">Usage time</span>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="rig-label mb-2 block text-center" htmlFor="job-hours">
              Hours
            </label>
            <input
              id="job-hours"
              data-testid="hours-driven"
              type="number"
              min="0"
              max="999"
              inputMode="numeric"
              value={hours}
              onChange={(e) =>
                onHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
              }
              className="rig-amount block w-full rounded-2xl border-0 bg-gray-100 px-4 py-4 text-center text-2xl font-bold text-rig-ink transition focus:outline-none focus:ring-2 focus:ring-rig-accent"
              placeholder="0"
            />
          </div>

          <div className="pb-4 text-2xl font-bold text-gray-400">:</div>

          <div className="flex-1">
            <label className="rig-label mb-2 block text-center" htmlFor="job-minutes">
              Minutes
            </label>
            <input
              id="job-minutes"
              data-testid="minutes-driven"
              type="number"
              min="0"
              max="59"
              inputMode="numeric"
              value={minutes}
              onChange={(e) =>
                onMinutes(
                  e.target.value === ''
                    ? ''
                    : Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                )
              }
              className="rig-amount block w-full rounded-2xl border-0 bg-gray-100 px-4 py-4 text-center text-2xl font-bold text-rig-ink transition focus:outline-none focus:ring-2 focus:ring-rig-accent"
              placeholder="0"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-[13px] font-medium text-rose-600">{error}</p>}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="rounded-xl bg-gray-100 p-2">
            <Tag className="h-5 w-5 text-gray-600" />
          </span>
          <span className="text-[17px] font-bold text-rig-ink">Rate per hour</span>
        </div>

        {showPicker ? (
          /* Tappable chips rather than a dropdown: every rate is visible at once and
             each is a full-size target for a hand in a field. */
          <div className="grid grid-cols-3 gap-2">
            {hourlyRateOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => chooseRate(option)}
                aria-pressed={rate === option}
                className={`rig-amount rounded-xl py-3.5 text-[16px] font-bold transition ${
                  rate === option
                    ? 'bg-rig-ink text-white'
                    : 'bg-gray-100 text-gray-600 active:scale-[0.97]'
                }`}
              >
                ₹{option.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        ) : (
          /* Fixed rate, shown the way the calculator shows it to a regular user. */
          <div>
            <button
              type="button"
              onClick={handleRateTap}
              aria-label={`Rate ${rate} rupees per hour`}
              className="rig-amount w-full rounded-2xl bg-gray-100 px-5 py-4 text-left text-2xl font-bold text-rig-ink"
            >
              ₹{rate.toLocaleString('en-IN')}
            </button>
            <p className="rig-label mt-2 px-1">Per hour</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-4">
        <div>
          <p className="rig-label">Job total</p>
          <p className="mt-0.5 text-[12px] text-amber-700">
            {Number(hours) || 0}h {Number(minutes) || 0}m at ₹{rate.toLocaleString('en-IN')}/hr
          </p>
        </div>
        <Amount value={total} size="lg" tone="accent" />
      </div>
    </div>
  );
};

export default TimeAndRate;
