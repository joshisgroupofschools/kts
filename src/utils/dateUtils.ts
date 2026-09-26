const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getKolkataToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function parseDateOnly(value?: string): { year: number; month: number; day: number } | null {
  const match = value?.slice(0, 10).match(DATE_ONLY_RE);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function formatDateOnly(value?: string, monthStyle: 'numeric' | 'short' | 'long' = 'numeric'): string {
  const parsed = parseDateOnly(value);
  if (!parsed) return value || '-';
  if (monthStyle === 'numeric') {
    return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`;
  }
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', day: '2-digit', month: monthStyle, year: 'numeric',
  }).format(date);
}

export function dateOnlyToUtcDate(value: string): Date | null {
  const parsed = parseDateOnly(value);
  return parsed ? new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)) : null;
}
