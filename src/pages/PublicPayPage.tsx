import React, { useState, useEffect } from 'react';
import { Phone, Loader2, AlertCircle, CheckCircle, IndianRupee, ArrowLeft } from 'lucide-react';
import PaymentQRModal from '../components/PaymentQRModal';
import { fetchDues, isValidIndianMobile, formatRupees, type DuesResponse } from '../lib/payments';
import { formatHoursMinutes, hmmToDecimalHours, to12Hour } from '../lib/billFormat';

/**
 * The page behind the QR sticker on the harvester.
 *
 * Designed for the worst case it will actually meet: a cheap Android phone, patchy
 * rural data, bright sunlight, and someone who has never used the app. So: no navbar,
 * no branding chrome beyond the name, one decision per screen, and large targets.
 */

type Step = 'phone' | 'dues' | 'nothing-due';

const PublicPayPage: React.FC = () => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [dues, setDues] = useState<DuesResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Pay - KBS Earthmovers & Harvesters';
  }, []);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isValidIndianMobile(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchDues(phone);
      setDues(result);
      setAmount(String(result.total_due));
      setStep(result.has_dues ? 'dues' : 'nothing-due');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not check your dues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const numericAmount = Number(amount);
  const amountIsValid =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    !!dues &&
    numericAmount <= dues.total_due;

  const reset = () => {
    setStep('phone');
    setDues(null);
    setAmount('');
    setError('');
    setPaidAmount(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <img
            src="/Logo for KBS Earthmovers - Bold Industrial Design.png"
            alt="KBS Earthmovers & Harvesters"
            className="mx-auto h-20 w-20 rounded-full bg-white p-2 shadow-lg"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            KBS Earthmovers & Harvesters
          </h1>
          <p className="mt-1 text-gray-600">Pay your harvester bill</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {paidAmount !== null ? (
            <div data-testid="public-pay-success" className="py-6 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <p className="mt-4 text-3xl font-bold text-gray-900">{formatRupees(paidAmount)}</p>
              <p className="mt-2 font-medium text-green-700">Payment successful</p>
              <p className="mt-4 text-sm text-gray-600">
                Thank you. Your balance has been updated. Please take a screenshot of this
                screen as your receipt.
              </p>
              <button
                onClick={reset}
                className="mt-6 w-full rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          ) : step === 'phone' ? (
            <form data-testid="public-pay-phone-form" onSubmit={handleLookup}>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                <Phone className="mr-1 inline h-4 w-4" />
                Your mobile number
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-600">
                  +91
                </span>
                <input
                  data-testid="public-pay-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoFocus
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-r-lg border border-gray-300 px-4 py-3.5 text-lg text-gray-900 focus:border-transparent focus:ring-2 focus:ring-amber-500"
                  placeholder="9486532856"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Use the number you gave the driver.
              </p>

              {error && (
                <p
                  data-testid="public-pay-error"
                  className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <button
                data-testid="public-pay-lookup"
                type="submit"
                disabled={loading || phone.length !== 10}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-lg font-semibold text-white transition hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {loading ? 'Checking...' : 'Check my bill'}
              </button>
            </form>
          ) : step === 'nothing-due' ? (
            <div data-testid="public-pay-nothing-due" className="py-6 text-center">
              <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
              <p className="mt-4 text-lg font-semibold text-gray-900">Nothing pending</p>
              <p className="mt-2 text-sm text-gray-600">
                There are no unpaid bills for this number. If you think this is wrong,
                please contact us on 94865 32856.
              </p>
              <button
                onClick={reset}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Try another number
              </button>
            </div>
          ) : (
            <div data-testid="public-pay-dues">
              {/* Amount and job count only - no names, no dates. A guessed phone number
                  must not reveal someone's job history. */}
              <div className="rounded-xl bg-amber-50 p-5 text-center">
                <p className="text-sm text-amber-800">You owe</p>
                <p data-testid="public-pay-total" className="mt-1 text-4xl font-bold text-gray-900">
                  {formatRupees(dues!.total_due)}
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  across {dues!.count} job{dues!.count === 1 ? '' : 's'}
                </p>
              </div>

              {/* Nobody should be asked to pay a figure they cannot check. Each job
                  shows when it was, the machine, the hours and the rate behind it. */}
              {dues!.jobs?.length > 0 && (
                <div data-testid="public-pay-jobs" className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    What this is for
                  </p>
                  {dues!.jobs.map((job, index) => {
                    const decimalHours = hmmToDecimalHours(job.hours);
                    const rate = decimalHours > 0 ? Math.round(job.total / decimalHours) : 0;
                    return (
                      <div
                        key={`${job.date}-${index}`}
                        className="rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">
                              {new Date(job.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {job.time ? ` · ${to12Hour(job.time)}` : ''}
                            </p>
                            <p className="mt-0.5 text-sm text-gray-600">
                              {job.machine_type} · {formatHoursMinutes(job.hours)}
                              {rate > 0 ? ` · ${formatRupees(rate)}/hr` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold text-gray-900">{formatRupees(job.balance)}</p>
                            {job.balance !== job.total && (
                              <p className="text-xs text-gray-500">
                                of {formatRupees(job.total)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <label className="mb-2 mt-6 block text-sm font-medium text-gray-700">
                Amount to pay now
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-600">
                  <IndianRupee className="h-4 w-4" />
                </span>
                <input
                  data-testid="public-pay-amount"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max={dues!.total_due}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-r-lg border border-gray-300 px-4 py-3.5 text-lg text-gray-900 focus:border-transparent focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                You can pay part of it now. The oldest bills are cleared first.
              </p>

              {!amountIsValid && amount !== '' && (
                <p className="mt-2 text-sm text-red-600">
                  Enter an amount between Rs.1 and {formatRupees(dues!.total_due)}.
                </p>
              )}

              <button
                data-testid="public-pay-submit"
                onClick={() => setShowPaymentModal(true)}
                disabled={!amountIsValid}
                className="mt-5 w-full rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-lg font-semibold text-white transition hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500"
              >
                Pay {amountIsValid ? formatRupees(numericAmount) : ''}
              </button>

              <button
                onClick={reset}
                className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Use a different number
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Payments are processed securely by Cashfree.
        </p>
      </div>

      {showPaymentModal && dues && (
        <PaymentQRModal
          phone={phone}
          amount={numericAmount}
          selfService
          onClose={() => setShowPaymentModal(false)}
          onPaid={() => {
            setPaidAmount(numericAmount);
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
};

export default PublicPayPage;
