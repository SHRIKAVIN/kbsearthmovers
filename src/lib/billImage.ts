/**
 * Render the KBS rental bill as a PNG in the browser.
 *
 * Drawn directly on a canvas rather than via html2canvas: that package is only a
 * transitive dependency of jspdf here, and a document customers receive should not
 * rest on something we do not declare. Hand-drawing also renders identically on every
 * device, which screenshotting the DOM does not.
 */

import {
  addHoursToTime,
  formatRupeeAmount,
  hmmToDecimalHours,
  invoiceNumberFor,
  rupeesInWords,
  to12Hour,
} from './billFormat';

export type BillData = {
  entryId?: string;
  customerName: string;
  phone: string;
  address?: string;
  date: string;
  time?: string;
  machineType: string;
  hours: number;
  total: number;
  advance: number;
  received: number;
};

const W = 1000;
const H = 1560;
const PAD = 44;

const C = {
  ink: '#1A1A1A',
  body: '#333333',
  muted: '#6B7280',
  line: '#D7DAE0',
  orange: '#F26522',
  dark: '#212121',
  wash: '#F0F1F3',
  white: '#FFFFFF',
  amber: '#FBC02D',
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

/** Draw text with letter spacing, which canvas has no native support for. */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
) {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
  return cursor - x;
}

export async function renderBillImage(bill: BillData): Promise<Blob> {
  const [logo, machineImg] = await Promise.all([
    loadImage('/Logo for KBS Earthmovers - Bold Industrial Design.png'),
    loadImage(MACHINE_IMAGES[bill.machineType] || MACHINE_IMAGES.Harvester),
  ]);

  const scale = 2; // keeps it sharp when WhatsApp scales it
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
  const decimalHours = hmmToDecimalHours(bill.hours);
  const rate = decimalHours > 0 ? Math.round(bill.total / decimalHours) : 0;

  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, H);

  // ─── Header ────────────────────────────────────────────────────────────────
  const headerH = 286;

  // Dark angled panel on the right, with the machine photo behind it.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W, headerH);
  ctx.lineTo(660, headerH);
  ctx.lineTo(716, 0);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = C.dark;
  ctx.fillRect(640, 0, W - 640, headerH);
  if (machineImg) {
    ctx.globalAlpha = 0.38;
    const ih = headerH;
    const iw = (machineImg.width / machineImg.height) * ih;
    ctx.drawImage(machineImg, 700, 0, iw, ih);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  ctx.fillStyle = C.white;
  ctx.font = font(13, '700');
  let hy = 58;
  for (const word of ['MOVE', 'BUILD', 'HARVEST', 'GROW']) {
    tracked(ctx, word, 906, hy, 1.4);
    hy += 20;
  }
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(906, hy + 4);
  ctx.lineTo(946, hy + 4);
  ctx.stroke();
  hy += 34;
  ctx.font = font(12, '600');
  for (const word of ['TOGETHER', 'FOR A BETTER', 'TOMORROW']) {
    tracked(ctx, word, 906, hy, 0.8);
    hy += 18;
  }

  if (logo) {
    const size = 152;
    ctx.drawImage(logo, PAD, 32, size, size * (logo.height / logo.width));
  }

  const tx = 226;
  ctx.fillStyle = C.ink;
  ctx.font = font(56, '800');
  ctx.fillText('KBS', tx, 96);
  ctx.fillStyle = C.orange;
  ctx.font = font(56, '800');
  ctx.fillText('HARVESTERS', tx, 152);
  ctx.fillStyle = C.ink;
  ctx.font = font(17, '600');
  tracked(ctx, 'EARTHMOVERS AND HARVESTER', tx, 178, 3.4);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx, 192);
  ctx.lineTo(660, 192);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = font(12.5);
  tracked(ctx, 'RELIABLE MACHINES FOR A PRODUCTIVE TOMORROW', tx, 210, 1.5);

  // Contact lines
  const contacts = [
    'Pudukottai - Karaikudi Road, Pudukottai, Tamil Nadu',
    '99439 15281, 94865 32856',
    'kbsharvesters@gmail.com',
  ];
  let cy = 236;
  ctx.font = font(14);
  for (const line of contacts) {
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.arc(tx + 7, cy - 5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.body;
    ctx.fillText(line, tx + 24, cy);
    cy += 24;
  }

  // Thin vertical rule between logo and text, as on the reference
  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(tx - 22, 40);
  ctx.lineTo(tx - 22, 262);
  ctx.stroke();

  // ─── Title + invoice meta ──────────────────────────────────────────────────
  let y = headerH + 62;
  ctx.fillStyle = C.ink;
  ctx.font = font(46, '800');
  const rentalW = ctx.measureText('RENTAL ').width;
  ctx.fillText('RENTAL', PAD, y);
  ctx.fillStyle = C.orange;
  ctx.fillText('BILL', PAD + rentalW, y);
  ctx.fillStyle = C.muted;
  ctx.font = font(12.5, '500');
  tracked(ctx, 'MACHINE RENTAL SERVICES', PAD + 2, y + 24, 4.2);

  // Meta table, right aligned. Rental Type lives here - it is part of the
  // identity of the bill, not a line item.
  const metaX = 686;
  const metaW = W - PAD - metaX;
  const metaRows: Array<[string, string]> = [
    ['INVOICE NO.', invoiceNumberFor(bill.entryId, bill.date)],
    ['DATE', bill.date],
    ['PLACE', 'Pudukottai'],
    ['RENTAL TYPE', bill.machineType],
  ];
  let my = headerH + 34;
  for (const [label, value] of metaRows) {
    ctx.fillStyle = C.muted;
    ctx.font = font(12.5, '600');
    tracked(ctx, label, metaX, my + 18, 0.8);
    ctx.fillStyle = C.ink;
    ctx.font = font(17, '700');
    ctx.textAlign = 'left';
    ctx.fillText(value, metaX + 140, my + 18);
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(metaX, my + 30);
    ctx.lineTo(metaX + metaW, my + 30);
    ctx.stroke();
    my += 36;
  }

  // ─── BILL TO ───────────────────────────────────────────────────────────────
  y = headerH + 150;
  const tabW = 168;
  const tabH = 34;
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(PAD + tabW, y);
  ctx.lineTo(PAD + tabW + 18, y + tabH / 2);
  ctx.lineTo(PAD + tabW, y + tabH);
  ctx.lineTo(PAD, y + tabH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.font = font(16, '700');
  tracked(ctx, 'BILL TO', PAD + 22, y + 23, 1.6);

  const boxY = y + tabH;
  const boxW = 500;
  const boxH = 168;
  ctx.fillStyle = C.wash;
  ctx.fillRect(PAD, boxY, boxW, boxH);

  const fields: Array<[string, string]> = [
    ['Name', bill.customerName],
    ['Address', bill.address || ''],
    ['', ''],
    ['Phone', bill.phone.replace(/^\+91/, '')],
  ];
  let fy = boxY + 42;
  for (const [label, value] of fields) {
    if (label) {
      ctx.fillStyle = C.body;
      ctx.font = font(15.5);
      ctx.fillText(label, PAD + 26, fy);
      ctx.fillText(':', PAD + 132, fy);
    }
    ctx.strokeStyle = '#B9BDC6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD + 148, fy + 6);
    ctx.lineTo(PAD + boxW - 26, fy + 6);
    ctx.stroke();
    if (value) {
      ctx.fillStyle = C.ink;
      ctx.font = font(16, '600');
      ctx.fillText(value, PAD + 154, fy);
    }
    fy += 38;
  }

  // Rental-type card, where the reference showed three service icons. One card
  // that actually reflects this bill is more use than three generic ones.
  const cardX = PAD + boxW + 20;
  const cardW = W - PAD - cardX;
  ctx.fillStyle = C.wash;
  ctx.fillRect(cardX, boxY, cardW, boxH);
  if (machineImg) {
    const ih = 96;
    const iw = Math.min((machineImg.width / machineImg.height) * ih, cardW - 60);
    ctx.drawImage(machineImg, cardX + (cardW - iw) / 2, boxY + 18, iw, ih);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = C.orange;
  ctx.font = font(20, '800');
  ctx.fillText(bill.machineType.toUpperCase(), cardX + cardW / 2, boxY + 140);
  ctx.fillStyle = C.muted;
  ctx.font = font(12);
  ctx.fillText('RENTAL TYPE', cardX + cardW / 2, boxY + 158);
  ctx.textAlign = 'left';

  // ─── Line items ────────────────────────────────────────────────────────────
  y = boxY + boxH + 30;
  const cols = [
    { label: 'S.No', w: 62, align: 'center' as const },
    { label: 'Date', w: 148, align: 'center' as const },
    { label: 'From Time', w: 140, align: 'center' as const },
    { label: 'To Time', w: 140, align: 'center' as const },
    { label: 'Hours / Qty', w: 146, align: 'center' as const },
    { label: 'Rate (₹)', w: 150, align: 'center' as const },
    { label: 'Amount (₹)', w: 126, align: 'center' as const },
  ];
  const tableW = cols.reduce((sum, c) => sum + c.w, 0);
  const rowH = 44;
  const bodyRows = 6;

  ctx.fillStyle = C.dark;
  ctx.fillRect(PAD, y, tableW, rowH);
  ctx.fillStyle = C.white;
  ctx.font = font(15, '700');
  ctx.textAlign = 'center';
  let cx = PAD;
  for (const col of cols) {
    ctx.fillText(col.label, cx + col.w / 2, y + 29);
    cx += col.w;
  }

  const dataRow = [
    '1',
    bill.date,
    bill.time ? to12Hour(bill.time) : '',
    bill.time ? addHoursToTime(bill.time, bill.hours) : '',
    String(bill.hours),
    rate ? formatRupeeAmount(rate) : '',
    formatRupeeAmount(bill.total),
  ];

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  for (let r = 0; r < bodyRows; r++) {
    const ry = y + rowH + r * rowH;
    ctx.strokeRect(PAD, ry, tableW, rowH);
    cx = PAD;
    for (let i = 0; i < cols.length; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, ry);
      ctx.lineTo(cx, ry + rowH);
      ctx.stroke();
      if (r === 0 && dataRow[i]) {
        ctx.fillStyle = C.ink;
        ctx.font = font(15.5, i === 6 ? '700' : '400');
        ctx.fillText(dataRow[i], cx + cols[i].w / 2, ry + 29);
      }
      cx += cols[i].w;
    }
  }
  ctx.textAlign = 'left';

  // ─── Remarks + totals ──────────────────────────────────────────────────────
  y = y + rowH + bodyRows * rowH + 26;
  const totalsX = 606;
  const totalsW = W - PAD - totalsX;
  const remarksW = totalsX - PAD - 22;
  const totalsRowH = 42;
  const blockH = totalsRowH * 4;

  ctx.fillStyle = C.wash;
  ctx.fillRect(PAD, y, remarksW, blockH);
  ctx.fillStyle = C.orange;
  ctx.fillRect(PAD, y + 14, 5, 24);
  ctx.fillStyle = C.ink;
  ctx.font = font(20, '700');
  ctx.fillText('Remarks', PAD + 18, y + 33);

  const totals: Array<[string, string, boolean]> = [
    ['Total Hours', String(bill.hours), false],
    ['Total Amount', `₹ ${formatRupeeAmount(bill.total)}`, false],
    ['Advance Paid', `₹ ${formatRupeeAmount(bill.advance)}`, false],
    [
      balance > 0 ? 'Balance Amount' : 'Fully Paid',
      `₹ ${formatRupeeAmount(Math.max(balance, 0))}`,
      true,
    ],
  ];
  let ty = y;
  for (const [label, value, highlight] of totals) {
    if (highlight) {
      ctx.fillStyle = C.orange;
      ctx.fillRect(totalsX, ty, totalsW * 0.52, totalsRowH);
      ctx.fillStyle = C.amber;
      ctx.fillRect(totalsX + totalsW * 0.52, ty, totalsW * 0.48, totalsRowH);
    }
    ctx.strokeStyle = C.line;
    ctx.strokeRect(totalsX, ty, totalsW, totalsRowH);
    ctx.beginPath();
    ctx.moveTo(totalsX + totalsW * 0.52, ty);
    ctx.lineTo(totalsX + totalsW * 0.52, ty + totalsRowH);
    ctx.stroke();

    ctx.fillStyle = highlight ? C.white : C.ink;
    ctx.font = font(16, '700');
    ctx.fillText(label, totalsX + 16, ty + 27);
    ctx.fillStyle = C.ink;
    ctx.font = font(16, '700');
    ctx.textAlign = 'right';
    ctx.fillText(value, totalsX + totalsW - 16, ty + 27);
    ctx.textAlign = 'left';
    ty += totalsRowH;
  }

  // ─── Amount in words ───────────────────────────────────────────────────────
  y += blockH + 18;
  ctx.fillStyle = C.wash;
  ctx.fillRect(PAD, y, W - PAD * 2, 42);
  ctx.fillStyle = C.ink;
  ctx.font = font(15.5, '700');
  ctx.fillText('Amount in Words  :', PAD + 16, y + 27);
  ctx.font = font(15.5);
  ctx.fillText(rupeesInWords(Math.max(balance, 0)), PAD + 186, y + 27);

  // ─── Terms + signature ─────────────────────────────────────────────────────
  y += 70;
  ctx.fillStyle = C.orange;
  ctx.fillRect(PAD, y - 17, 5, 24);
  ctx.fillStyle = C.ink;
  ctx.font = font(19, '700');
  ctx.fillText('Terms & Conditions', PAD + 18, y);

  const terms = [
    'This bill is for machine rental services only.',
    'Fuel, operator and other charges as per agreement.',
    'Any damage caused by client will be charged separately.',
    'Payment to be made on or before the due date.',
    'Subject to Pudukottai jurisdiction only.',
  ];
  let termY = y + 32;
  ctx.font = font(14);
  ctx.fillStyle = C.body;
  terms.forEach((term, i) => {
    ctx.fillText(`${i + 1}.`, PAD + 20, termY);
    ctx.fillText(term, PAD + 44, termY);
    termY += 26;
  });

  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(600, y - 18);
  ctx.lineTo(600, termY - 10);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.font = `italic 700 30px Georgia, "Times New Roman", serif`;
  ctx.fillText('Thank you', 800, y + 14);
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(700, y + 26);
  ctx.lineTo(900, y + 26);
  ctx.stroke();
  ctx.font = font(15);
  ctx.fillStyle = C.body;
  ctx.fillText('For KBS HARVESTERS', 800, y + 52);
  ctx.font = font(13);
  ctx.fillStyle = C.muted;
  ctx.fillText('Authorised Signatory', 800, y + 108);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(712, y + 92);
  ctx.lineTo(888, y + 92);
  ctx.stroke();
  ctx.textAlign = 'left';

  // ─── Footer ────────────────────────────────────────────────────────────────
  const footH = 72;
  const footY = H - footH;
  ctx.fillStyle = C.dark;
  ctx.fillRect(0, footY, W, footH);
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.moveTo(736, footY);
  ctx.lineTo(W, footY);
  ctx.lineTo(W, H);
  ctx.lineTo(700, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.white;
  ctx.font = font(13, '600');
  const marks = ['QUALITY MACHINES', 'TRUSTED SERVICE', 'GROWING TOGETHER'];
  let fx = PAD;
  marks.forEach((mark, i) => {
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.arc(fx + 8, footY + footH / 2 - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    const width = tracked(ctx, mark, fx + 26, footY + footH / 2, 1.2);
    fx += width + 60;
    if (i < marks.length - 1) {
      ctx.strokeStyle = '#555555';
      ctx.beginPath();
      ctx.moveTo(fx - 30, footY + 22);
      ctx.lineTo(fx - 30, footY + footH - 22);
      ctx.stroke();
    }
  });

  ctx.fillStyle = C.white;
  ctx.font = font(12.5, '700');
  let sy = footY + 24;
  for (const line of ['A STRONGER', 'TOMORROW', 'TOGETHER']) {
    tracked(ctx, line, 790, sy, 1.4);
    sy += 16;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the bill image.'))),
      'image/png'
    );
  });
}
