/**
 * Render the KBS rental bill / payment receipt as a PNG in the browser.
 *
 * Drawn directly on a canvas rather than via html2canvas: that package is only a
 * transitive dependency of jspdf here, and a document customers receive should not
 * rest on something we do not declare. Hand-drawing also renders identically on every
 * device, which screenshotting the DOM does not.
 */

import {
  addHoursToTime,
  formatRupeeAmount,
  invoiceNumberFor,
  rupeesInWords,
  to12Hour,
} from './billFormat';

export type BillData = {
  entryId?: string;
  customerName: string;
  phone: string;
  date: string;
  time?: string;
  machineType: string;
  hours: number;
  total: number;
  advance: number;
  received: number;
};

/** A bill chases money; a receipt confirms it. Same template, different story. */
export type BillVariant = 'bill' | 'receipt';

const BUSINESS = {
  address: '2/559, North Street, Pathur, Koradacheri, Thiruvarur',
  phones: '99439 15281, 94865 32856',
  email: 'skmbhaskaran@gmail.com',
};

const W = 900;
const H = 1180;
const PAD = 38;

const C = {
  ink: '#1A1A1A',
  body: '#3A3A3A',
  muted: '#6B7280',
  line: '#D8DBE0',
  orange: '#F26522',
  dark: '#232323',
  head: '#E8EAED',
  wash: '#F2F3F5',
  highlight: '#FBE0C8',
  white: '#FFFFFF',
};

const MACHINE_IMAGES: Record<string, string> = {
  Harvester: '/harvester.png',
  JCB: '/jcb.png',
  Tractor: '/tractor.png',
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // a missing asset must never block a bill
    img.src = src;
  });
}

/** Canvas has no letter-spacing, and this layout leans on it. */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
): number {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
  return cursor - x;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatPhone(phone: string): string {
  const local = phone.replace(/^\+91/, '').replace(/\D/g, '');
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
}

export function variantFor(bill: BillData): BillVariant {
  return bill.total - bill.received - bill.advance <= 0 ? 'receipt' : 'bill';
}

export async function renderBillImage(bill: BillData, variant?: BillVariant): Promise<Blob> {
  const kind = variant ?? variantFor(bill);
  const [logo, machineImg, stamp] = await Promise.all([
    loadImage('/Logo for KBS Earthmovers - Bold Industrial Design.png'),
    loadImage(MACHINE_IMAGES[bill.machineType] || MACHINE_IMAGES.Harvester),
    loadImage('/signature_stamp.png'),
  ]);

  const scale = 2; // stays sharp when WhatsApp scales it
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the bill image on this device.');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';

  const font = (size: number, weight = '400') =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;

  const balance = bill.total - bill.received - bill.advance;
  const docNo = invoiceNumberFor(bill.entryId, bill.date);

  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, H);

  // ─── Header ────────────────────────────────────────────────────────────────
  if (logo) {
    const size = 128;
    ctx.drawImage(logo, PAD, 26, size, size * (logo.height / logo.width));
  }

  const tx = 196;
  ctx.fillStyle = C.ink;
  ctx.font = font(40, '800');
  const kbsW = ctx.measureText('KBS ').width;
  ctx.fillText('KBS', tx, 74);
  ctx.fillStyle = C.orange;
  ctx.fillText('HARVESTERS', tx + kbsW, 74);

  ctx.fillStyle = C.ink;
  ctx.font = font(15, '500');
  tracked(ctx, 'EARTHMOVERS AND HARVESTER', tx + 2, 98, 3.1);

  const contacts: Array<[string, string]> = [
    ['pin', BUSINESS.address],
    ['phone', BUSINESS.phones],
    ['mail', BUSINESS.email],
  ];
  let cy = 134;
  for (const [icon, line] of contacts) {
    ctx.fillStyle = C.orange;
    if (icon === 'pin') {
      // teardrop
      ctx.beginPath();
      ctx.arc(tx + 7, cy - 7, 6.5, Math.PI, 0);
      ctx.lineTo(tx + 7, cy + 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(tx + 7, cy - 7, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === 'phone') {
      ctx.beginPath();
      ctx.arc(tx + 7, cy - 5, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(tx, cy - 11, 15, 11);
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, cy - 11);
      ctx.lineTo(tx + 7.5, cy - 4);
      ctx.lineTo(tx + 15, cy - 11);
      ctx.stroke();
    }
    ctx.fillStyle = C.body;
    ctx.font = font(14.5);
    ctx.fillText(line, tx + 26, cy);
    cy += 27;
  }

  // Right rail
  const railX = 690;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(railX, 40);
  ctx.lineTo(railX, 176);
  ctx.stroke();

  ctx.fillStyle = C.body;
  ctx.font = font(14, '500');
  let ry = 68;
  for (const word of ['MOVE', 'BUILD', 'GROW', 'TOGETHER']) {
    tracked(ctx, word, railX + 22, ry, 0.9);
    ry += 23;
  }
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(railX + 22, ry - 6);
  ctx.lineTo(railX + 74, ry - 6);
  ctx.stroke();

  // ─── Title pill ────────────────────────────────────────────────────────────
  let y = 212;
  const title = kind === 'receipt' ? 'PAYMENT RECEIPT' : 'RENTAL BILL';
  ctx.font = font(24, '700');
  const pillW = Math.max(ctx.measureText(title).width + 96, 300);
  const pillH = 50;
  const pillX = (W - pillW) / 2;
  ctx.fillStyle = C.dark;
  roundRect(ctx, pillX, y, pillW, pillH, 9);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, y + 33);
  ctx.textAlign = 'left';

  // ─── Meta rows ─────────────────────────────────────────────────────────────
  y += pillH + 40;
  const metaRows: Array<[string, string, boolean]> = [
    [kind === 'receipt' ? 'Receipt No.' : 'Bill No.', docNo, true],
    ['Date', bill.date, false],
    [kind === 'receipt' ? 'Received From' : 'Customer', bill.customerName, false],
    ['Phone', formatPhone(bill.phone), false],
  ];
  for (const [label, value, accent] of metaRows) {
    ctx.fillStyle = C.body;
    ctx.font = font(16);
    ctx.fillText(label, PAD + 12, y);
    ctx.fillText(':', PAD + 168, y);
    ctx.fillStyle = accent ? C.orange : C.ink;
    ctx.font = font(accent ? 19 : 17, '700');
    ctx.fillText(value, PAD + 196, y);
    y += 33;
  }

  // ─── Particulars table ─────────────────────────────────────────────────────
  y += 14;
  const tableX = PAD;
  const tableW = W - PAD * 2;
  const amountW = 232;
  const partW = tableW - amountW;
  const headH = 50;

  // Faded machine watermark behind the table
  const tableTop = y;

  ctx.fillStyle = C.head;
  ctx.fillRect(tableX, y, partW, headH);
  ctx.fillStyle = C.dark;
  ctx.fillRect(tableX + partW, y, amountW, headH);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.font = font(19, '700');
  ctx.fillText('Particulars', tableX + partW / 2, y + 32);
  ctx.fillStyle = C.white;
  ctx.fillText('Amount (₹)', tableX + partW + amountW / 2, y + 32);
  ctx.textAlign = 'left';
  y += headH;

  type Row = { title: string; sub?: string; amount: string };
  const rows: Row[] = [];

  if (kind === 'receipt') {
    rows.push({
      title: 'Payment Received',
      sub: `(Against Bill No. ${docNo})`,
      amount: formatRupeeAmount(bill.received + bill.advance),
    });
  } else {
    const from = bill.time ? to12Hour(bill.time) : '';
    const to = bill.time ? addHoursToTime(bill.time, bill.hours) : '';
    const span = from && to ? `${from} – ${to}` : '';
    rows.push({
      title: `${bill.machineType} Rental`,
      sub: [span, `(${Number(bill.hours).toFixed(2)} Hrs)`].filter(Boolean).join('  '),
      amount: formatRupeeAmount(bill.total),
    });
  }

  const rowH = 62;
  const totalRowH = 56;
  const bodyH = rows.length * rowH + totalRowH;

  // Watermark, clipped to the table body so it never bleeds into the page.
  if (machineImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(tableX, tableTop, tableW, headH + bodyH);
    ctx.clip();
    ctx.globalAlpha = 0.07;
    const ih = headH + bodyH + 30;
    const iw = (machineImg.width / machineImg.height) * ih;
    ctx.drawImage(machineImg, tableX + partW - iw * 0.72, tableTop - 10, iw, ih);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  for (const row of rows) {
    ctx.strokeRect(tableX, y, partW, rowH);
    ctx.strokeRect(tableX + partW, y, amountW, rowH);

    ctx.fillStyle = C.ink;
    ctx.font = font(18, '700');
    ctx.fillText(row.title, tableX + 24, y + (row.sub ? 27 : 38));
    if (row.sub) {
      ctx.fillStyle = C.muted;
      ctx.font = font(14);
      ctx.fillText(row.sub, tableX + 24, y + 48);
    }

    ctx.fillStyle = C.ink;
    ctx.font = font(19, '600');
    ctx.textAlign = 'center';
    ctx.fillText(row.amount, tableX + partW + amountW / 2, y + 38);
    ctx.textAlign = 'left';
    y += rowH;
  }

  // Total / received row
  const totalLabel = kind === 'receipt' ? 'Received Amount' : 'Total Amount';
  const totalValue =
    kind === 'receipt'
      ? `₹ ${formatRupeeAmount(bill.received + bill.advance)}`
      : `₹ ${formatRupeeAmount(bill.total)}`;
  ctx.fillStyle = C.highlight;
  ctx.fillRect(tableX, y, tableW, totalRowH);
  ctx.strokeRect(tableX, y, partW, totalRowH);
  ctx.strokeRect(tableX + partW, y, amountW, totalRowH);
  ctx.fillStyle = C.ink;
  ctx.font = font(20, '700');
  ctx.fillText(totalLabel, tableX + 24, y + 36);
  ctx.textAlign = 'center';
  ctx.font = font(22, '700');
  ctx.fillText(totalValue, tableX + partW + amountW / 2, y + 36);
  ctx.textAlign = 'left';
  y += totalRowH;

  // ─── Advance / balance (bill only) ─────────────────────────────────────────
  if (kind === 'bill') {
    y += 30;
    const lines: Array<[string, string, boolean]> = [
      ['Advance Paid', `₹ ${formatRupeeAmount(bill.advance + bill.received)}`, false],
      ['Balance Amount', `₹ ${formatRupeeAmount(Math.max(balance, 0))}`, true],
    ];
    for (const [label, value, accent] of lines) {
      ctx.fillStyle = C.body;
      ctx.font = font(17);
      ctx.fillText(label, tableX + 12, y);
      ctx.fillText(':', tableX + 190, y);
      ctx.fillStyle = accent ? C.orange : C.ink;
      ctx.font = font(accent ? 21 : 18, '700');
      ctx.fillText(value, tableX + 216, y);
      y += 34;
    }
    y += 4;
  } else {
    y += 26;
  }

  // ─── Amount in words ───────────────────────────────────────────────────────
  const wordsAmount = kind === 'receipt' ? bill.received + bill.advance : Math.max(balance, 0);
  ctx.fillStyle = C.wash;
  ctx.fillRect(tableX, y, tableW, 46);
  ctx.fillStyle = C.ink;
  ctx.font = font(16, '700');
  ctx.fillText('Amount in Words', tableX + 18, y + 29);
  ctx.font = font(16);
  ctx.fillText(':', tableX + 176, y + 29);
  ctx.fillText(rupeesInWords(wordsAmount), tableX + 196, y + 29);
  y += 46;

  // ─── Signature block (stamp only, no handwritten signature) ────────────────
  const footH = 74;
  const footY = H - footH;
  const signCx = W - PAD - 150;
  let signY = y + 52;

  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.font = font(17, '600');
  ctx.fillText('For KBS HARVESTERS', signCx, signY);

  if (stamp) {
    const maxH = Math.min(132, footY - signY - 44);
    if (maxH > 40) {
      // The stamp PNG has no alpha channel - it is ink on a white rectangle. Drawn
      // normally that rectangle shows as a pale box over the bill. 'multiply' keeps
      // the dark ink and lets white drop out, which is how a real stamp sits on paper.
      const ratio = stamp.width / stamp.height;
      const h = maxH;
      const w = h * ratio;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(stamp, signCx - w / 2, signY + 10, w, h);
      ctx.restore();
      signY += h + 10;
    }
  } else {
    // No stamp file present: leave clean space rather than drawing a fake seal.
    signY += 86;
  }

  ctx.fillStyle = C.muted;
  ctx.font = font(14);
  ctx.fillText('Authorised Signatory', signCx, signY + 26);
  ctx.textAlign = 'left';

  // ─── Footer bar ────────────────────────────────────────────────────────────
  ctx.fillStyle = C.dark;
  ctx.fillRect(0, footY, W, footH);
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.moveTo(624, footY);
  ctx.lineTo(W, footY);
  ctx.lineTo(W, H);
  ctx.lineTo(590, H);
  ctx.closePath();
  ctx.fill();

  const marks = ['QUALITY MACHINES', 'TRUSTED SERVICE', 'GROWING TOGETHER'];
  ctx.font = font(12.5, '600');
  let fx = PAD;
  marks.forEach((mark, i) => {
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(fx + 7, footY + footH / 2 - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    const width = tracked(ctx, mark, fx + 24, footY + footH / 2, 1);
    fx += width + 54;
    if (i < marks.length - 1) {
      ctx.strokeStyle = '#5A5A5A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx - 28, footY + 22);
      ctx.lineTo(fx - 28, footY + footH - 22);
      ctx.stroke();
    }
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = C.white;
  ctx.font = font(17, '800');
  ctx.fillText('KBS HARVESTERS', W - PAD, footY + 32);
  ctx.font = font(12, '500');
  ctx.fillText('A STRONGER TOMORROW', W - PAD, footY + 52);
  ctx.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the bill image.'))),
      'image/png'
    );
  });
}
