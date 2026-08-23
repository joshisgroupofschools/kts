/**
 * Convert numerical currency amount to words (Indian numbering system)
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let hundred = num;

  let result = '';
  if (crore > 0) result += inWords(crore) + ' Crore ';
  if (lakh > 0) result += inWords(lakh) + ' Lakh ';
  if (thousand > 0) result += inWords(thousand) + ' Thousand ';
  if (hundred > 0) result += inWords(hundred);

  return result.trim() + ' Rupees Only';
}

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
  return `${symbol}${formatted}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculates the next multiple of 5 calendar date.
 * E.g., if today is the 21st, returns the 25th of the current month.
 * If 25th -> 30th.
 * If 30th/31st -> 5th of next month.
 */
export function getNextMultipleOfFiveDate(baseDateInput?: string | Date): string {
  const d = baseDateInput ? new Date(baseDateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];

  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  // Target next multiple of 5 strictly greater than today
  const nextTargetDay = Math.floor(day / 5) * 5 + 5;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (nextTargetDay <= daysInMonth) {
    const targetDate = new Date(year, month, nextTargetDay);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  } else {
    // Spill over to 5th of next month
    const targetDate = new Date(year, month + 1, 5);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  }
}
