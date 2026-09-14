/**
 * Render a bill as a PNG in the browser.
 *
 * Drawn directly on a canvas rather than via html2canvas: html2canvas is only a
 * transitive dependency of jspdf here, and a bill that customers receive should not
 * depend on a package we do not declare. Hand-drawing also renders identically on
 * every device, which screenshotting the DOM does not.
 */

export type BillData = {
  customerName: string;
  phone: string;
  date: string;
  machineType: string;
  hours?: number | string;
  total: number;
  advance: number;
  received: number;
  driverName?: string;
  billNumber?: string;
};

const W = 900;
const PAD = 56;

const COLORS = {
  ink: '#111827',
  muted: '#6B7280',
  line: '#E5E7EB',
  brand: '#D97706',
  brandDark: '#B45309',
  paid: '#059669',
  due: '#DC2626',
  wash: '#FFFBEB',
};

function rupees(amount: number): string {
  return `Rs. ${Number(amount).toLocaleString('en-IN')}`;
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // a missing logo must not block the bill
    img.src = '/Logo for KBS Earthmovers - Bold Industrial Design.png';
  });
}

export async function renderBillImage(bill: BillData): Promise<Blob> {
  const balance = bill.total - bill.received - bill.advance;
  const isPaid = balance <= 0;
  const logo = await loadLogo();

  // Rows are measured before drawing so the canvas is exactly tall enough.
  const rows: Array<[string, string, boolean]> = [
    ['Total Amount', rupees(bill.total), false],
    ['Advance Paid', rupees(bill.advance), false],
    ['Amount Received', rupees(bill.received), false],
  ];

  const height = 300 + 46 * 4 + rows.length * 52 + 250;

  // Draw at 2x so the image stays sharp when WhatsApp scales it up.
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the bill image on this device.');
  ctx.scale(scale, scale);

  const font = (size: number, weight = '400') =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  // --- background ---
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, height);

  // --- header band ---
  const headerH = 150;
  const gradient = ctx.createLinearGradient(0, 0, W, headerH);
  gradient.addColorStop(0, COLORS.brand);
  gradient.addColorStop(1, COLORS.brandDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, headerH);

  if (logo) {
    const size = 78;
    ctx.save();
    ctx.beginPath();
    ctx.arc(PAD + size / 2, headerH / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.clip();
    ctx.drawImage(logo, PAD + 5, headerH / 2 - size / 2 + 5, size - 10, size - 10);
    ctx.restore();
  }

  const textX = logo ? PAD + 100 : PAD;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(30, '700');
  ctx.fillText('KBS Earthmovers & Harvesters', textX, headerH / 2 - 6);
  ctx.font = font(17);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('Harvester rental services', textX, headerH / 2 + 24);

  let y = headerH + 52;

  // --- title + bill number ---
  ctx.fillStyle = COLORS.ink;
  ctx.font = font(25, '700');
  ctx.fillText(isPaid ? 'PAYMENT RECEIPT' : 'BILL', PAD, y);

  if (bill.billNumber) {
    ctx.font = font(15);
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.fillText(`#${bill.billNumber}`, W - PAD, y);
    ctx.textAlign = 'left';
  }

  y += 34;
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();

  // --- detail lines ---
  y += 42;
  const detail = (label: string, value: string) => {
    ctx.font = font(16);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(label, PAD, y);
    ctx.font = font(17, '600');
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'right';
    ctx.fillText(value, W - PAD, y);
    ctx.textAlign = 'left';
    y += 46;
  };

  detail('Customer', bill.customerName);
  detail('Mobile', bill.phone.replace(/^\+91/, ''));
  detail('Date', bill.date);
  detail('Machine', bill.machineType + (bill.hours ? `  ·  ${bill.hours} hrs` : ''));

  // --- amounts ---
  y += 10;
  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 44;

  for (const [label, value] of rows) {
    ctx.font = font(17);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(label, PAD, y);
    ctx.font = font(18, '600');
    ctx.textAlign = 'right';
    ctx.fillText(value, W - PAD, y);
    ctx.textAlign = 'left';
    y += 52;
  }

  // --- balance, the line that matters ---
  y += 6;
  const boxH = 92;
  ctx.fillStyle = isPaid ? '#ECFDF5' : COLORS.wash;
  ctx.fillRect(PAD, y, W - PAD * 2, boxH);
  ctx.strokeStyle = isPaid ? COLORS.paid : COLORS.brand;
  ctx.lineWidth = 2;
  ctx.strokeRect(PAD, y, W - PAD * 2, boxH);

  ctx.font = font(20, '700');
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(isPaid ? 'FULLY PAID' : 'BALANCE DUE', PAD + 26, y + boxH / 2 + 8);
  ctx.font = font(32, '700');
  ctx.fillStyle = isPaid ? COLORS.paid : COLORS.due;
  ctx.textAlign = 'right';
  ctx.fillText(isPaid ? rupees(0) : rupees(balance), W - PAD - 26, y + boxH / 2 + 11);
  ctx.textAlign = 'left';

  y += boxH + 56;

  // --- footer ---
  ctx.font = font(16);
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'center';
  if (!isPaid) {
    ctx.fillText('Scan the QR on our harvester to pay by UPI', W / 2, y);
    y += 30;
  } else {
    ctx.fillText('Thank you for your business.', W / 2, y);
    y += 30;
  }
  ctx.fillText('Contact: 94865 32856  ·  99439 15881', W / 2, y);
  ctx.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the bill image.'))),
      'image/png'
    );
  });
}
