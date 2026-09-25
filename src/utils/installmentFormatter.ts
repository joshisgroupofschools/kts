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
