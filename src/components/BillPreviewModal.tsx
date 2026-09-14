import React, { useState, useEffect } from 'react';
import { X, Loader2, Share2, Download, AlertCircle } from 'lucide-react';
import { renderBillImage, type BillData } from '../lib/billImage';
import { shareBillImage } from '../lib/payments';

/**
 * Show the bill before it goes anywhere.
 *
 * Sending a customer a bill is not undoable, and the amounts on it are the ones that
 * get disputed later, so it is worth one look first.
 */

type Props = {
  bill: BillData;
  caption: string;
  onClose: () => void;
  onSent?: (outcome: 'shared' | 'downloaded') => void;
};

const BillPreviewModal: React.FC<Props> = ({ bill, caption, onClose, onSent }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    renderBillImage(bill)
      .then((result) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(result);
        setBlob(result);
        setImageUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not create the bill image.');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Rendering depends on the bill's values, not its object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bill.entryId, bill.customerName, bill.phone, bill.date, bill.time,
    bill.machineType, bill.hours, bill.total, bill.advance, bill.received,
  ]);

  const handleShare = async () => {
    if (!blob) return;
    setSending(true);
    try {
      const outcome = await shareBillImage({
        blob,
        customerName: bill.customerName,
        phone: bill.phone,
        caption,
      });
      if (outcome !== 'cancelled') onSent?.(outcome);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not share the bill.');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `KBS-bill-${bill.customerName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      data-testid="bill-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Bill preview"
    >
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bill preview</h2>
            <p className="text-xs text-gray-500">{bill.customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
          {error ? (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="mt-3 font-medium text-red-700">{error}</p>
            </div>
          ) : imageUrl ? (
            <img
              data-testid="bill-preview-image"
              src={imageUrl}
              alt={`Bill for ${bill.customerName}`}
              className="mx-auto w-full rounded-lg border border-gray-300 bg-white shadow-sm"
            />
          ) : (
            <div className="flex flex-col items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <p className="mt-3 text-sm text-gray-600">Preparing the bill...</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={handleDownload}
            disabled={!imageUrl}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Save
          </button>
          <button
            data-testid="bill-share-button"
            onClick={handleShare}
            disabled={!blob || sending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {sending ? 'Sending...' : 'Send on WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillPreviewModal;
