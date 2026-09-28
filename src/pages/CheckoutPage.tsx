import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { formatRupees } from '../lib/payments';

/**
 * Where a customer lands to pay.
 *
 * Reached by scanning the driver's QR, or opened directly on /pay. It loads
 * Cashfree's browser SDK and hands it the session for this payment.
 *
 * This route exists instead of pointing the QR straight at Cashfree because the
 * session can be regenerated: the QR carries our payment id, and the session is
 * looked up when the page opens, so a code shown minutes ago still works.
 */

const SDK_SRC = 'https://sdk.cashfree.com/js/v3/cashfree.js';

type Phase = 'loading' | 'ready' | 'opening' | 'paid' | 'error';

type CashfreeSdk = (opts: { mode: string }) => {
  checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: CashfreeSdk;
  }
}

function loadSdk(): Promise<CashfreeSdk> {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    const script = existing ?? document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () =>
      window.Cashfree
        ? resolve(window.Cashfree)
        : reject(new Error('Payment library loaded but did not start.'));
    script.onerror = () => reject(new Error('Could not load the payment library.'));
    if (!existing) document.head.appendChild(script);
  });
}

const CheckoutPage: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState('');
  const session = useRef<string | null>(null);
  const started = useRef(false);

  const paymentId = new URLSearchParams(window.location.search).get('p');

  useEffect(() => {
    document.title = 'Pay · KBS Harvesters';
  }, []);

  useEffect(() => {
    if (!paymentId) {
      setError('This payment link is incomplete.');
      setPhase('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/payments/session?payment_id=${encodeURIComponent(paymentId)}`
        );
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) throw new Error(data?.error || 'Could not open this payment.');

        setAmount(Number(data.amount) || 0);

        if (data.status === 'paid') {
          setPhase('paid');
          return;
        }

        session.current = data.payment_session_id;
        await loadSdk();
        if (cancelled) return;
        setPhase('ready');
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not open this payment.');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const openCheckout = useCallback(async () => {
    if (!session.current || !window.Cashfree || started.current) return;
    started.current = true;
    setPhase('opening');
    try {
      const cashfree = window.Cashfree({
        mode: import.meta.env.VITE_CASHFREE_MODE || 'production',
      });
      await cashfree.checkout({ paymentSessionId: session.current, redirectTarget: '_self' });
    } catch (err: unknown) {
      started.current = false;
      setError(err instanceof Error ? err.message : 'Could not open the payment page.');
      setPhase('error');
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center">
          <img
            src="/Logo for KBS Earthmovers - Bold Industrial Design.png"
            alt=""
            className="mx-auto h-16 w-16 rounded-full bg-white p-1.5 shadow"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
          <h1 className="mt-4 text-xl font-bold text-gray-900">KBS Earthmovers &amp; Harvesters</h1>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-xl">
          {phase === 'loading' && (
            <div className="py-10">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-600" />
              <p className="mt-4 text-gray-600">Opening your payment…</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="py-8">
              <AlertCircle className="mx-auto h-11 w-11 text-red-500" />
              <p className="mt-4 font-medium text-red-700">{error}</p>
              <p className="mt-2 text-sm text-gray-600">
                Please ask the driver to show the code again, or call 99439 15281.
              </p>
            </div>
          )}

          {phase === 'paid' && (
            <div className="py-8">
              <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
              <p className="mt-4 text-lg font-semibold text-gray-900">Already paid</p>
              <p className="mt-1 text-sm text-gray-600">
                This bill has been settled. Nothing more to pay.
              </p>
            </div>
          )}

          {(phase === 'ready' || phase === 'opening') && (
            <>
              <p className="text-sm text-gray-500">Amount to pay</p>
              <p className="mt-1 text-4xl font-bold text-gray-900">{formatRupees(amount)}</p>

              <button
                onClick={openCheckout}
                disabled={phase === 'opening'}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-lg font-semibold text-white transition hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500"
              >
                {phase === 'opening' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null}
                {phase === 'opening' ? 'Opening…' : 'Pay by UPI'}
              </button>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                Processed securely by Cashfree
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
