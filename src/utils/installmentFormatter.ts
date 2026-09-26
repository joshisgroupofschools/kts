import { formatDateOnly, getKolkataToday, parseDateOnly } from './dateUtils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function normalizeFeeHead(headName = ''): string {
  const value = headName.toLowerCase();
  if (/(school|tuition|academic)/.test(value)) return 'School Fees';
  if (/(transport|bus|van)/.test(value)) return 'Transport';
  if (/(old|previous|arrear|carryover)/.test(value)) return 'Old Fees';
  if (/(book|stationery)/.test(value)) return 'Books';
  if (/(dress|uniform)/.test(value)) return 'Uniform';
  return headName.trim() || 'Fees';
}

const ACADEMIC_MONTH_ORDER = new Map<number, number>([
  [6, 1],
  [7, 2],
  [8, 3],
  [9, 4],
  [10, 5],
  [11, 6],
  [12, 7],
  [1, 8],
  [2, 9],
  [3, 10],
  [4, 11],
]);

export function getOfficialInstallmentOrder(item: {
  headName?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
}): number {
  const head = normalizeFeeHead(item.headName || '');
  const parsed = parseDateOnly(item.dueDate);
  const month = parsed?.month || 0;
  const monthOrder = ACADEMIC_MONTH_ORDER.get(month) || 99;
  const installmentNumber = Number(item.installmentNumber || 0);

  if (head === 'Books') return 0;
  if (head === 'Transport') return monthOrder * 10 + 2;
  if (head === 'School Fees') return monthOrder * 10 + 1;
  if (head === 'Old Fees') return 1000 + installmentNumber;
  return monthOrder * 10 + 9;
}

export function compareOfficialInstallmentOrder(a: {
  headName?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
}, b: {
  headName?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
}): number {
  const orderDiff = getOfficialInstallmentOrder(a) - getOfficialInstallmentOrder(b);
  if (orderDiff) return orderDiff;
  const dateDiff = String(a.dueDate || '').localeCompare(String(b.dueDate || ''));
  if (dateDiff) return dateDiff;
  return Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0);
}

export function getInstallmentDisplayName(
  headName: string,
  installmentNumber: number,
  totalInstallments?: number,
  dueDate?: string,
): string {
  const parsed = parseDateOnly(dueDate);
  const month = parsed ? MONTHS[parsed.month - 1] : '';
  const sequence = totalInstallments ? `${installmentNumber}/${totalInstallments}` : String(installmentNumber);
  return `${normalizeFeeHead(headName)}${month ? ` – ${month}` : ''} Instalment ${sequence}`;
}

export function formatWhatsAppReminderMessage(
  student: { name: string; className: string },
  summary: { installments?: any[] },
  schoolProfile: { schoolName?: string },
  asOfDate: string = getKolkataToday(),
): { message: string; totalSum: number; hasDue: boolean } {
  const schoolName = (schoolProfile?.schoolName || 'Kakatiya School, Boduppal')
    .replace(/Kakatiya School\s+Boduppal/i, 'Kakatiya School, Boduppal');
  const studentClass = student.className.startsWith('Class') ? student.className : `Class ${student.className}`;
  const dueInstallments = (summary.installments || [])
    .filter((item) => Number(item.balanceAmount) > 0 && item.status !== 'paid' && item.dueDate <= asOfDate)
    .sort(compareOfficialInstallmentOrder);

  if (!dueInstallments.length) return { message: '', totalSum: 0, hasDue: false };

  const totalSum = dueInstallments.reduce((sum, item) => sum + Number(item.balanceAmount || 0), 0);
  const lines = dueInstallments.map((item) =>
    `- *${getInstallmentDisplayName(item.headName, item.installmentNumber, item.totalInstallments, item.dueDate)}:* ₹${Number(item.balanceAmount).toLocaleString('en-IN')}`
  );
  const message = `Dear Parent, reminder from *${schoolName}* regarding fee payment for *${student.name.toUpperCase()} (${studentClass})*.

Your *total due till ${formatDateOnly(asOfDate)} is ₹${totalSum.toLocaleString('en-IN')}*, towards:

${lines.join('\n')}

Kindly clear the pending fees. *Thank you.*`;
  return { message, totalSum, hasDue: true };
}

export function normalizePhoneNumber(phone?: string): string {
  const cleaned = (phone || '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) return `91${cleaned}`;
  if (/^91[6-9]\d{9}$/.test(cleaned)) return cleaned;
  return '';
}
