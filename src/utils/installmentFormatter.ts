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
    .sort((a, b) => {
      const dateOrder = String(a.dueDate).localeCompare(String(b.dueDate));
      if (dateOrder) return dateOrder;
      const rank = (head: string) => ['School Fees', 'Transport', 'Old Fees'].indexOf(normalizeFeeHead(head));
      const aRank = rank(a.headName);
      const bRank = rank(b.headName);
      return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank);
    });

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
