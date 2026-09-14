import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, Loader2 } from 'lucide-react';

/**
 * Printable "Scan to Pay" sheet for the harvester.
 *
 * The QR encodes a plain static URL, so it never expires and the same laminated
 * sticker keeps working forever - the amount is decided on the page, not baked into
 * the code.
 */
const QrStickerPage: React.FC = () => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const payUrl = `${window.location.origin}/pay`;

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

      <div className="no-print mx-auto mb-6 max-w-md px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">Payment QR sticker</h1>
        <p className="mt-1 text-sm text-gray-600">
          Print this, laminate it, and fix it where customers can reach it on the harvester.
        </p>
        <button
          onClick={() => window.print()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 font-semibold text-white transition hover:from-amber-700 hover:to-orange-700"
        >
          <Printer className="h-5 w-5" />
          Print sticker
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
