import { dateOnlyToUtcDate, formatDateOnly, getKolkataToday } from './dateUtils';

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
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return formatDateOnly(dateString.slice(0, 10), 'short');
  }
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
 * Calculates the next multiple of 5 calendar date according to the 5-day cycle:
 * If today is 21st or 22nd -> issues till 25th.
 * If today is 23rd, 24th, 25th, 26th, 27th -> issues till 30th.
 * If today is 28th-31st -> issues till 5th of next month.
 */
export function getNextMultipleOfFiveDate(baseDateInput?: string | Date): string {
  const d = typeof baseDateInput === 'string'
    ? dateOnlyToUtcDate(baseDateInput)
    : baseDateInput || dateOnlyToUtcDate(getKolkataToday());
  if (!d || isNaN(d.getTime())) return getKolkataToday();

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  let targetDay: number;
  let targetMonth = month;
  let targetYear = year;

  if (day <= 2) {
    targetDay = 5;
  } else if (day <= 7) {
    targetDay = 10;
  } else if (day <= 12) {
    targetDay = 15;
  } else if (day <= 17) {
    targetDay = 20;
  } else if (day <= 22) {
    targetDay = 25;
  } else if (day <= 27) {
    targetDay = 30;
  } else {
    // 28th to 31st -> 5th of next month
    targetDay = 5;
    targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear = year + 1;
    }
  }

  // Cap targetDay at the maximum days in target month if targetDay is 30 but month is February
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  if (targetDay > daysInTargetMonth) {
    targetDay = daysInTargetMonth;
  }

  const targetDate = new Date(Date.UTC(targetYear, targetMonth, targetDay));
  const y = targetDate.getUTCFullYear();
  const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(targetDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}
