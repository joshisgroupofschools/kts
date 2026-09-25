/**
 * Standardized Installment Formatter for Kakatiya School Boduppal
 *
 * Rules:
 * 1. School Fees: 7 Installments (July to January)
 *    Format: "SCHOOL FEES - JULY INSTALLMENT 1/7"
 * 2. Transport Fees: 10 Installments (June to March)
 *    Format: "TRANSPORT - JUNE INSTALLMENT 1/10"
 * 3. Old Fees: 7 Installments (September to March)
 *    Format: "OLD FEES - SEPTEMBER INSTALLMENT 1/7"
 */

const SCHOOL_MONTHS = ['JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY'];
const TRANSPORT_MONTHS = ['JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];
const OLD_FEE_MONTHS = ['SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];

export function getInstallmentDisplayName(
  headName: string,
  installmentNumber: number,
  totalInstallments?: number,
  dueDate?: string
): string {
  const norm = (headName || '').toLowerCase();

  // 1. School Fees (7 Installments: July to January)
  if (norm.includes('school') || norm.includes('tuition') || norm.includes('academic')) {
    const total = totalInstallments || 7;
    const month = SCHOOL_MONTHS[installmentNumber - 1] || getMonthFromDate(dueDate) || `INSTALLMENT ${installmentNumber}`;
    return `SCHOOL FEES - ${month} INSTALLMENT ${installmentNumber}/${total}`;
  }

  // 2. Transport Fees (10 Installments: June to March)
  if (norm.includes('transport') || norm.includes('bus') || norm.includes('van')) {
    const total = totalInstallments || 10;
    const month = TRANSPORT_MONTHS[installmentNumber - 1] || getMonthFromDate(dueDate) || `INSTALLMENT ${installmentNumber}`;
    return `TRANSPORT - ${month} INSTALLMENT ${installmentNumber}/${total}`;
  }

  // 3. Old Fees (7 Installments: September to March)
  if (norm.includes('old') || norm.includes('carryover') || norm.includes('previous')) {
    const total = totalInstallments || 7;
    const month = OLD_FEE_MONTHS[installmentNumber - 1] || getMonthFromDate(dueDate) || `INSTALLMENT ${installmentNumber}`;
    return `OLD FEES - ${month} INSTALLMENT ${installmentNumber}/${total}`;
  }

  // Fallback for any other fee head
  const totalStr = totalInstallments ? `/${totalInstallments}` : '';
  const month = getMonthFromDate(dueDate);
  const monthPrefix = month ? ` - ${month}` : '';
  return `${headName.toUpperCase()}${monthPrefix} INSTALLMENT ${installmentNumber}${totalStr}`;
}

function getMonthFromDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthNames = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
      ];
      return monthNames[monthIdx] || null;
    }
  } catch {
    // fallback
  }
  return null;
}

export function formatWhatsAppReminderMessage(
  student: { name: string; className: string },
  summary: { installments?: any[]; dueTillDate?: number },
  schoolProfile: { schoolName?: string },
  asOfDate?: string
): { message: string; totalSum: number; hasDue: boolean } {
  const schoolName = schoolProfile?.schoolName || 'Kakatiya School, Boduppal';
  const studentClass = student.className.startsWith('Class') ? student.className : `Class ${student.className}`;
  const cutoffDate = asOfDate || new Date().toISOString().split('T')[0];
  const [y, m, d] = cutoffDate.split('-');
  const formattedCutoffDate = `${d}/${m}/${y}`;

  // Filter installments: balanceAmount > 0 and dueDate <= cutoffDate
  const overdueInstallments = (summary.installments || []).filter(
    (ins) => ins.balanceAmount > 0 && ins.dueDate <= cutoffDate && ins.status !== 'paid'
  );

  if (overdueInstallments.length === 0) {
    return { message: '', totalSum: 0, hasDue: false };
  }

  // Sort by due date ascending, then head priority:
  // 1. School Fees (school, tuition, academic)
  // 2. Transport (transport, bus, van)
  // 3. Old Fees (old, previous, arrear)
  // 4. Other heads
  const getHeadRank = (headName: string) => {
    const norm = (headName || '').toLowerCase();
    if (norm.includes('school') || norm.includes('tuition') || norm.includes('academic')) return 1;
    if (norm.includes('transport') || norm.includes('bus') || norm.includes('van')) return 2;
    if (norm.includes('old') || norm.includes('carryover') || norm.includes('previous')) return 3;
    return 4;
  };

  const sortedInstallments = [...overdueInstallments].sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return getHeadRank(a.headName) - getHeadRank(b.headName);
  });

  let totalSum = 0;
  const lineItems: string[] = [];

  sortedInstallments.forEach((ins) => {
    totalSum += ins.balanceAmount;
    const displayName = getInstallmentDisplayName(ins.headName, ins.installmentNumber, ins.totalInstallments, ins.dueDate);
    lineItems.push(`- *${displayName}:* ₹${ins.balanceAmount.toLocaleString('en-IN')}`);
  });

  const formattedTotal = totalSum.toLocaleString('en-IN');

  const message = `Dear Parent, reminder from *${schoolName}* regarding fee payment for *${student.name.toUpperCase()} (${studentClass})*.

Your *total due till ${formattedCutoffDate} is ₹${formattedTotal}*, towards:

${lineItems.join('\n')}

Kindly clear the pending fees. *Thank you.*`;

  return { message, totalSum, hasDue: true };
}

export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  return cleaned;
}
