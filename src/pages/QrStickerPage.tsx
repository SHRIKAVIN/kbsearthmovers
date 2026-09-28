import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, Loader2, AlertTriangle, Link2 } from 'lucide-react';

/**
 * Printable "Scan to Pay" sheet for the harvester.
 *
 * The QR MUST encode the production URL, never window.location.origin. This sheet gets
 * laminated onto a machine and stays there for years, so a preview URL baked into it
 * would die the moment that deployment is removed - and nobody would notice until a
 * customer standing in a field could not pay.
 *
 * Preview deployments are also SSO-protected, so a QR pointing at one just shows the
 * scanner a Vercel login page.
 */

const PRODUCTION_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || 'https://kbsearthmovers.vercel.app'
).replace(/\/+$/, '');

const QrStickerPage: React.FC = () => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // Off by default: what you print must always point at production.
  const [testMode, setTestMode] = useState(false);

  const currentOrigin = window.location.origin;
  const isOnProduction = currentOrigin === PRODUCTION_URL;
  const payUrl = `${testMode ? currentOrigin : PRODUCTION_URL}/pay`;

  useEffect(() => {
    QRCode.toDataURL(payUrl, {
      width: 1200,
      margin: 1,
      // High correction: this sticker is going onto a harvester, where it will get
      // dusty, scratched and rained on. H tolerates ~30% damage.
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [payUrl]);

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: A5; margin: 10mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 max-w-md px-4">
        <h1 className="text-center text-xl font-bold text-gray-900">Payment QR sticker</h1>
        <p className="mt-1 text-center text-sm text-gray-600">
          Print this, laminate it, and fix it where customers can reach it on the harvester.
        </p>

        {/* Exactly what the QR points at, in text, so it can be checked before printing. */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700">This QR opens:</p>
              <p className="break-all font-mono text-xs text-gray-900">{payUrl}</p>
            </div>
          </div>
        </div>

        {!isOnProduction && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-xs text-amber-900">
                <p className="font-semibold">You are on a preview deployment.</p>
                <p className="mt-1">
                  The QR still points at production, so it is safe to print. Preview URLs
                  are login-protected and disappear, so one must never end up on a sticker.
                </p>

                <label className="mt-3 flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={testMode}
                    onChange={(event) => setTestMode(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400"
                  />
                  <span>
                    <span className="font-semibold">Point at this preview instead</span> — for
                    scanning during testing only. Do not print while this is ticked.
                  </span>
                </label>

                {testMode && (
                  <p className="mt-2 rounded bg-amber-100 px-2 py-1 font-semibold text-amber-900">
                    Testing only. You will still need to be signed in to Vercel on the
                    phone that scans it.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => window.print()}
          disabled={testMode}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 font-semibold text-white transition hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500"
        >
          <Printer className="h-5 w-5" />
          {testMode ? 'Untick test mode to print' : 'Print sticker'}
        </button>
      </div>

      {/* The sheet itself */}
      <div className="mx-auto max-w-md bg-white p-8 text-center shadow-lg print:max-w-none print:shadow-none">
        <img
          src="/Logo for KBS Earthmovers - Bold Industrial Design.png"
          alt=""
          className="mx-auto h-24 w-24"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-gray-900">
          Scan to Pay
        </h2>
        <p className="mt-1 text-lg font-semibold text-amber-700">
          KBS Earthmovers &amp; Harvesters
        </p>

        <div className="mt-6 inline-block rounded-2xl border-8 border-gray-900 bg-white p-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Payment QR code" className="h-64 w-64" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <div className="mt-6 space-y-1 text-left text-base text-gray-800">
          <p className="text-center font-bold uppercase text-gray-900">How to pay</p>
          <p>1. Scan this code with your phone camera</p>
          <p>2. Enter your mobile number</p>
          <p>3. See your bill and pay by UPI</p>
        </div>

        <p className="mt-6 border-t border-gray-300 pt-4 text-sm text-gray-600">
          Questions? Call 94865 32856 / 99439 15881
        </p>
      </div>
    </div>
  );
};

export default QrStickerPage;
