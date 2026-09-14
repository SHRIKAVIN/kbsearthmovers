import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, AlertCircle, X, Loader2, Smartphone, Send, ExternalLink } from 'lucide-react';
import {
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
  /** The customer is holding this device, so show a "pay on this phone" button. */
  selfService?: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

const PaymentQRModal: React.FC<Props> = ({
  workEntryId,
  phone,
  amount,
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

  const { triggerSuccessHaptic, triggerErrorHaptic } = useMobileOptimizations();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(Date.now());

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // --- Create the order and render the QR ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = workEntryId
          ? await createQrForEntry(workEntryId)
          : await createQrForPhone(phone!, amount);
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
        triggerErrorHaptic();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workEntryId, phone, amount, triggerErrorHaptic]);

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
          setPhase('paid');
          triggerSuccessHaptic();
          confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
          onPaid?.();
        } else if (status.status === 'failed' || status.status === 'expired') {
          stopPolling();
          setErrorMessage(
            status.status === 'expired'
              ? 'This payment request expired. Please start a new one.'
              : 'The payment did not go through. Please try again.'
          );
          setPhase('error');
          triggerErrorHaptic();
        }
        // 'awaiting_confirmation' means Cashfree has the money but the webhook has not
        // landed yet. Keep polling; the next tick usually flips it to paid.
      } catch {
        // A dropped poll is not a failure - a phone on rural data drops requests all
        // the time. Keep trying until the timeout.
      }
    }, POLL_MS);

    return stopPolling;
  }, [phase, payment, stopPolling, triggerSuccessHaptic, triggerErrorHaptic, onPaid]);

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

  const upiApps = payment?.upi_links ? orderedUpiApps(payment.upi_links) : [];
  const webFallback = payment?.upi_links?.web ?? null;
  const secondsWaiting = Math.floor(elapsed / 1000);

  return (
    <div
      data-testid="payment-qr-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Collect payment"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-professional-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {phase === 'paid' ? 'Payment received' : 'Collect payment'}
            </h2>
            {payment && phase !== 'paid' && (
              <p className="text-sm text-amber-100">
                {payment.entries_count} job{payment.entries_count === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <button
            data-testid="close-payment-modal"
            onClick={onClose}
            className="rounded-full p-1 text-white/90 transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {phase === 'loading' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
              <p className="mt-4 text-gray-600">Creating payment...</p>
            </div>
          )}

          {phase === 'error' && (
            <div data-testid="payment-error" className="flex flex-col items-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="mt-4 font-medium text-red-700">{errorMessage}</p>
              <button
                onClick={onClose}
                className="mt-6 rounded-lg bg-gray-800 px-6 py-2.5 font-semibold text-white transition hover:bg-gray-900"
              >
                Close
              </button>
            </div>
          )}

          {phase === 'paid' && payment && (
            <div data-testid="payment-success" className="flex flex-col items-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 animate-professional-bounce-in" />
              <p className="mt-4 text-3xl font-bold text-gray-900">{formatRupees(payment.amount)}</p>
              <p className="mt-1 text-green-700">Paid successfully</p>
              <p className="mt-4 text-xs text-gray-500">
                The balance has been updated. A confirmation has been sent to the owner.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white transition hover:from-green-700 hover:to-emerald-700"
              >
                Done
              </button>
            </div>
          )}

          {(phase === 'awaiting' || phase === 'timeout') && payment && (
            <div className="flex flex-col items-center">
              <p className="text-4xl font-bold text-gray-900">{formatRupees(payment.amount)}</p>

              {/* White card behind the QR: needed for contrast when a phone camera is
                  pointed at a screen in direct sunlight. */}
              {qrImage && phase === 'awaiting' && (
                <div className="mt-5 rounded-xl border-4 border-gray-900 bg-white p-3">
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
                    <p className="mt-4 text-center text-sm font-medium text-gray-700">
                      Scan with GPay, PhonePe, Paytm or any UPI app
                    </p>
                  )}
                  <div
                    data-testid="payment-waiting"
                    className="mt-3 flex items-center gap-2 text-sm text-amber-700"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for payment{secondsWaiting > 5 ? ` (${secondsWaiting}s)` : ''}...
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
                                className="flex items-center justify-center rounded-lg border-2 border-gray-300 px-2 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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
                          className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-gray-600 hover:text-gray-900"
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
                  <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
                  <p className="mt-3 font-medium text-gray-800">No payment received yet.</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Send the customer a payment link instead - they can pay later and it
                    works over WhatsApp and SMS.
                  </p>
                </div>
              )}

              {linkSent ? (
                <p
                  data-testid="link-sent-confirmation"
                  className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-800"
                >
                  Payment link sent over WhatsApp and SMS.
                </p>
              ) : (
                <button
                  data-testid="send-link-instead"
                  onClick={handleSendLink}
                  disabled={sendingLink}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-600 px-6 py-3 font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
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
