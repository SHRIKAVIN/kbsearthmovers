import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { AlertCircle, X, Loader2, Smartphone, Send, ExternalLink, Check, ShieldCheck } from 'lucide-react';
import {
  type PaymentStatus,
  createQrForEntry,
  createQrForPhone,
  fetchPaymentStatus,
  resolveQrImage,
  sendPaymentLink,
  orderedUpiApps,
  formatRupees,
  type CreateQrResponse,
} from '../lib/payments';
import { useMobileOptimizations } from '../hooks/useMobileOptimizations';
import Amount from './Amount';

/** How long to keep the QR on screen before treating it as abandoned. */
const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 3000;

type Phase = 'loading' | 'awaiting' | 'paid' | 'error' | 'timeout';

type Props = {
  /** Driver flow: settle one specific job. */
  workEntryId?: string;
  /** Vehicle-QR flow: settle everything this number owes. */
  phone?: string;
  amount?: number;
  /** Which jobs this payment should settle. Omitted means everything outstanding. */
  workEntryIds?: string[];
  /** The customer is holding this device, so show a "pay on this phone" button. */
  selfService?: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

const Detail: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-start justify-between gap-3 text-[13px]">
    <span className="shrink-0 text-gray-500">{label}</span>
    <span className={`text-right font-semibold text-gray-200 ${mono ? 'rig-amount text-[12px]' : ''}`}>
      {value}
    </span>
  </div>
);

const PaymentQRModal: React.FC<Props> = ({
  workEntryId,
  phone,
  amount,
  workEntryIds,
  selfService = false,
  onClose,
  onPaid,
}) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [payment, setPayment] = useState<CreateQrResponse | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [linkSent, setLinkSent] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Kept so the success screen can show real transaction details, not just a tick.
  const [settled, setSettled] = useState<PaymentStatus | null>(null);

  const { triggerSuccessHaptic, triggerErrorHaptic } = useMobileOptimizations();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(Date.now());

  // Creating an order charges nothing, but it does mint a real Cashfree order and a
  // payments row every time. This effect must run exactly once per modal open, so it
  // is guarded by a ref rather than trusting a dependency array to stay stable.
  const createdRef = useRef(false);

  // Callbacks live in refs so the effects below never list them as dependencies.
  // An unstable identity here previously re-ran the create effect on every render.
  const onPaidRef = useRef(onPaid);
  const successHapticRef = useRef(triggerSuccessHaptic);
  const errorHapticRef = useRef(triggerErrorHaptic);
  useEffect(() => {
    onPaidRef.current = onPaid;
    successHapticRef.current = triggerSuccessHaptic;
    errorHapticRef.current = triggerErrorHaptic;
  });

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // --- Create the order and render the QR ---
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const result = workEntryId
          ? await createQrForEntry(workEntryId)
          : await createQrForPhone(phone!, amount, workEntryIds);
        if (cancelled) return;

        setPayment(result);
        // Only the driver flow gets a QR; the self-service flow gets app links.
        setQrImage(result.qr_payload ? await resolveQrImage(result.qr_payload) : null);
        setPhase('awaiting');
        startedAt.current = Date.now();
      } catch (error: unknown) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : 'Could not start the payment.');
        setPhase('error');
        errorHapticRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workEntryId, phone, amount, workEntryIds]);

  // --- Poll for settlement ---
  //
  // Polling rather than Supabase realtime is deliberate: the `payments` table is
  // invisible to the anon role by design, so realtime cannot deliver it to a browser.
  // Someone stares at this screen for well under two minutes, so a 3s poll is fine.
  useEffect(() => {
    if (phase !== 'awaiting' || !payment) return;

    pollRef.current = setInterval(async () => {
      const runningFor = Date.now() - startedAt.current;
      setElapsed(runningFor);

      if (runningFor > TIMEOUT_MS) {
        stopPolling();
        setPhase('timeout');
        return;
      }

      try {
        const status = await fetchPaymentStatus(payment.payment_id);
        if (status.status === 'paid') {
          stopPolling();
          setSettled(status);
          setPhase('paid');
          successHapticRef.current();
          confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
          onPaidRef.current?.();
        } else if (status.status === 'failed' || status.status === 'expired') {
          stopPolling();
          setErrorMessage(
            status.status === 'expired'
              ? 'This payment request expired. Please start a new one.'
              : 'The payment did not go through. Please try again.'
          );
          setPhase('error');
          errorHapticRef.current();
        }
        // 'awaiting_confirmation' means Cashfree has the money but the webhook has not
        // landed yet. Keep polling; the next tick usually flips it to paid.
      } catch {
        // A dropped poll is not a failure - a phone on rural data drops requests all
        // the time. Keep trying until the timeout.
      }
    }, POLL_MS);

    return stopPolling;
  }, [phase, payment, stopPolling]);

  const handleSendLink = async () => {
    setSendingLink(true);
    try {
      const result = await sendPaymentLink({
        work_entry_id: workEntryId,
        phone,
        amount: payment?.amount ?? amount,
      });
      setLinkSent(result.link_url);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send the payment link.');
    } finally {
      setSendingLink(false);
    }
  };

  const paidAtLabel = new Date(settled?.paid_at || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const upiApps = payment?.upi_links ? orderedUpiApps(payment.upi_links) : [];
  const webFallback = payment?.upi_links?.web ?? null;
  const secondsWaiting = Math.floor(elapsed / 1000);

  return (
    <div
      data-testid="payment-qr-modal"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Collect payment"
    >
      {/*
        Collection is a different act from data entry, so it gets a different surface:
        a dark terminal. It also makes the white QR read at arm's length in sunlight,
        which a white card behind a white QR does not.
      */}
      <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-rig-ink shadow-2xl animate-professional-scale-in sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-rig-line px-5 py-4">
          <div>
            <p className="rig-label !text-rig-signal">
              {phase === 'paid' ? 'Received' : 'Collect payment'}
            </p>
            {payment && phase !== 'paid' && (
              <p className="text-[13px] text-gray-500">
                {payment.entries_count} job{payment.entries_count === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <button
            data-testid="close-payment-modal"
            onClick={onClose}
            className="rounded-xl border border-rig-line p-2 text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rig-safe-bottom px-5 pt-6">
          {phase === 'loading' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-rig-accent" />
              <p className="mt-4 text-gray-400">Starting the payment...</p>
            </div>
          )}

          {phase === 'error' && (
            <div data-testid="payment-error" className="flex flex-col items-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-rose-400" />
              <p className="mt-4 font-medium text-rose-200">{errorMessage}</p>
              <button onClick={onClose} className="rig-btn-ghost mt-6 !border-rig-line !bg-transparent !text-white">
                Close
              </button>
            </div>
          )}

          {/* Deliberately shaped like a GPay / PhonePe confirmation. The driver holds
              this up to the customer as proof the money moved, so it carries the same
              details their own UPI app would show - reference number included. */}
          {phase === 'paid' && payment && (
            <div data-testid="payment-success" className="flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 animate-professional-bounce-in">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-8 w-8 text-white" strokeWidth={3.5} />
                </div>
              </div>

              <Amount
                value={settled?.amount_paid || payment.amount}
                size="hero"
                tone="onDark"
                className="mt-5"
              />
              <p className="mt-2 text-[15px] font-semibold text-emerald-400">Payment successful</p>
              <p className="mt-1 text-[12px] text-gray-500">{paidAtLabel}</p>

              <div className="mt-6 w-full space-y-3 rounded-2xl border border-rig-line bg-rig-surface p-4">
                <Detail label="Paid to" value={settled?.receipt?.paid_to || 'KBS Harvesters'} />
                {settled?.receipt?.payer && <Detail label="From" value={settled.receipt.payer} />}
                <Detail label="Payment mode" value={settled?.receipt?.method || 'UPI'} />
                {settled?.receipt?.reference && (
                  <Detail label="UPI Ref. No." value={settled.receipt.reference} mono />
                )}
                {settled?.cf_payment_id && (
                  <Detail label="Transaction ID" value={settled.cf_payment_id} mono />
                )}
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-[12px] text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Show this to the customer as confirmation
              </p>

              <button
                onClick={onClose}
                className="rig-btn mt-5 bg-emerald-600 text-white hover:brightness-110"
              >
                Done
              </button>
            </div>
          )}

          {(phase === 'awaiting' || phase === 'timeout') && payment && (
            <div className="flex flex-col items-center">
              {/* The amount is the whole conversation in the field, so it is the
                  largest thing on the screen. */}
              <Amount value={payment.amount} size="hero" tone="onDark" />

              {qrImage && phase === 'awaiting' && (
                <div className="mt-6 rounded-2xl bg-white p-3.5 shadow-[0_0_60px_-12px_rgba(242,101,34,0.5)]">
                  <img
                    data-testid="payment-qr-image"
                    src={qrImage}
                    alt={`UPI QR code for ${formatRupees(payment.amount)}`}
                    className="h-56 w-56"
                  />
                </div>
              )}

              {phase === 'awaiting' && (
                <>
                  {qrImage && (
                    <p className="mt-5 text-center text-[15px] font-medium text-gray-300">
                      Scan with GPay, PhonePe, Paytm or any UPI app
                    </p>
                  )}
                  {/* A live pulse rather than a spinner: this is a machine waiting for
                      money to arrive, not a page loading. */}
                  <div
                    data-testid="payment-waiting"
                    className="mt-4 flex items-center gap-2.5 rounded-full border border-rig-line px-4 py-2"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rig-signal opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-rig-signal" />
                    </span>
                    <span className="text-[13px] font-medium text-gray-400">
                      Waiting for payment{secondsWaiting > 5 ? ` · ${secondsWaiting}s` : ''}
                    </span>
                  </div>

                  {/* The customer is holding the device that scanned the sticker, so
                      they cannot scan a QR off their own screen - these deep links
                      open their UPI app directly instead. */}
                  {selfService && upiApps.length > 0 && (
                    <div data-testid="upi-app-links" className="mt-5 w-full space-y-2">
                      {upiApps.map((app) =>
                        app.primary ? (
                          <a
                            key={app.key}
                            href={app.url}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-lg font-semibold text-white transition hover:from-amber-700 hover:to-orange-700"
                          >
                            <Smartphone className="h-5 w-5" />
                            {app.label}
                          </a>
                        ) : null
                      )}

                      {upiApps.some((app) => !app.primary) && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {upiApps
                            .filter((app) => !app.primary)
                            .map((app) => (
                              <a
                                key={app.key}
                                href={app.url}
                                className="flex items-center justify-center rounded-xl border-2 border-rig-line px-2 py-3 text-sm font-medium text-gray-300 transition"
                              >
                                {app.label}
                              </a>
                            ))}
                        </div>
                      )}

                      {/* Last resort for a desktop browser with no UPI app installed. */}
                      {webFallback && (
                        <a
                          href={webFallback}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-gray-500 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Pay in browser instead
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}

              {phase === 'timeout' && (
                <div className="mt-6 text-center">
                  <AlertCircle className="mx-auto h-10 w-10 text-rig-signal" />
                  <p className="mt-3 font-medium text-white">No payment received yet.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Send the customer a payment link instead - they can pay later and it
                    works over WhatsApp and SMS.
                  </p>
                </div>
              )}

              {linkSent ? (
                <p
                  data-testid="link-sent-confirmation"
                  className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-300"
                >
                  Payment link sent over WhatsApp and SMS.
                </p>
              ) : (
                <button
                  data-testid="send-link-instead"
                  onClick={handleSendLink}
                  disabled={sendingLink}
                  className="rig-btn mt-5 border-2 border-rig-line text-white disabled:opacity-50"
                >
                  {sendingLink ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {sendingLink ? 'Sending...' : 'Send link instead'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentQRModal;
