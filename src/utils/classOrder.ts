export const STANDARD_CLASS_ORDER: string[] = [
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
];

export const STANDARD_CLASS_ACTUAL_FEES: Record<string, number> = {
  'Nursery': 30000,
  'LKG': 31200,
  'UKG': 32400,
  'Class 1': 34800,
  'Class 2': 36000,
  'Class 3': 37200,
  'Class 4': 38400,
  'Class 5': 39600,
  'Class 6': 42000,
  'Class 7': 43200,
  'Class 8': 44400,
  'Class 9': 45600,
  'Class 10': 48000,
};

/**
 * Normalizes class name strings into standard format (e.g., '1' -> 'Class 1', 'lkg' -> 'LKG', 'X' -> 'Class 10')
 */
export function normalizeClassName(rawClass: string): string {
  const clean = (rawClass || '').trim();
  const lower = clean.toLowerCase();

  if (lower === 'nursery' || lower === 'nur') return 'Nursery';
  if (lower === 'lkg' || lower === 'pp1' || lower === 'l.k.g') return 'LKG';
  if (lower === 'ukg' || lower === 'pp2' || lower === 'u.k.g') return 'UKG';
  if (lower === '1' || lower === 'i' || lower === 'class 1' || lower === 'class-1' || lower === '1st') return 'Class 1';
  if (lower === '2' || lower === 'ii' || lower === 'class 2' || lower === 'class-2' || lower === '2nd') return 'Class 2';
  if (lower === '3' || lower === 'iii' || lower === 'class 3' || lower === 'class-3' || lower === '3rd') return 'Class 3';
  if (lower === '4' || lower === 'iv' || lower === 'class 4' || lower === 'class-4' || lower === '4th') return 'Class 4';
  if (lower === '5' || lower === 'v' || lower === 'class 5' || lower === 'class-5' || lower === '5th') return 'Class 5';
  if (lower === '6' || lower === 'vi' || lower === 'class 6' || lower === 'class-6' || lower === '6th') return 'Class 6';
  if (lower === '7' || lower === 'vii' || lower === 'class 7' || lower === 'class-7' || lower === '7th') return 'Class 7';
  if (lower === '8' || lower === 'viii' || lower === 'class 8' || lower === 'class-8' || lower === '8th') return 'Class 8';
  if (lower === '9' || lower === 'ix' || lower === 'class 9' || lower === 'class-9' || lower === '9th') return 'Class 9';
  if (lower === '10' || lower === 'x' || lower === 'class 10' || lower === 'class-10' || lower === '10th') return 'Class 10';

  return clean;
}

/**
 * Returns the sort index for a class name in the 13-class school hierarchy:
 * Nursery (0), LKG (1), UKG (2), Class 1 (3), ..., Class 10 (12)
 */
export function getClassSortIndex(className: string): number {
  const norm = normalizeClassName(className);
  const idx = STANDARD_CLASS_ORDER.indexOf(norm);
  if (idx !== -1) return idx;

  const match = className.match(/\d+/);
  if (match) return 3 + parseInt(match[0], 10);
  return 999;
}

/**
 * Sorts an array of class name strings in chronological academic order
 */
export function sortClassList(classList: string[]): string[] {
  return [...classList].sort((a, b) => getClassSortIndex(a) - getClassSortIndex(b));
}
