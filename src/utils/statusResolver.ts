import { ActionTier, StatusCategory, Student, ToleranceConfig } from '../types';
import { getKolkataToday } from './dateUtils';

export interface StatusComputationResult {
  statusCategory: StatusCategory;
  actionTier: ActionTier;
  daysRemainingOnPermission: number | null;
  isPermissionExpired: boolean;
}

export function computeStudentStatus(
  student: Student,
  financials: {
    dueTillDate: number;
    expectedTillDate: number;
    totalPaid: number;
    hasUncommittedFee: boolean;
  },
  tolerance: ToleranceConfig,
  currentDateString: string = getKolkataToday()
): StatusComputationResult {
  const { dueTillDate, expectedTillDate, totalPaid, hasUncommittedFee } = financials;

  // 1. Resolve 5-Level Status Color
  let statusCategory: StatusCategory = 'STRONG_RED';

  if (!student.isActive) {
    statusCategory = 'STRONG_GREEN'; // Inactive students have 0 active dues
  } else if (hasUncommittedFee) {
    statusCategory = 'STRONG_RED';
  } else if (dueTillDate <= 0) {
    // 0 Due till date
    statusCategory = 'STRONG_GREEN';
  } else {
    // Check if within tolerance
    let isWithinTolerance = false;
    if (tolerance.mode === 'fixed_amount') {
      isWithinTolerance = dueTillDate <= tolerance.value;
    } else {
      // Percentage mode: dueTillDate / expectedTillDate <= tolerance %
      if (expectedTillDate > 0) {
        const percentDue = (dueTillDate / expectedTillDate) * 100;
        isWithinTolerance = percentDue <= tolerance.value;
      }
    }

    if (isWithinTolerance) {
      statusCategory = 'LIGHT_GREEN';
    } else if (totalPaid > 0) {
      statusCategory = 'LIGHT_YELLOW';
    } else {
      // Total Paid is 0 but fee is committed
      statusCategory = 'LIGHT_RED';
    }
  }

  // 2. Check Permission Status
  let daysRemainingOnPermission: number | null = null;
  let isPermissionExpired = false;
  let hasActivePermission = false;

  if (student.permissionExpiresAt) {
    const todayTime = Date.parse(`${currentDateString}T00:00:00Z`);
    const expiryTime = Date.parse(`${student.permissionExpiresAt}T00:00:00Z`);
    const diffDays = Math.ceil((expiryTime - todayTime) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      hasActivePermission = true;
      daysRemainingOnPermission = diffDays;
    } else {
      isPermissionExpired = true;
      daysRemainingOnPermission = diffDays; // negative number of days overdue
    }
  }

  // 3. Resolve Action Tier (Strictly 3 Tiers: ID_CARD, PERMISSION_SLIP, ACTION_REQUIRED)
  let actionTier: ActionTier = 'ACTION_REQUIRED';

  // Rule: If student has paid their due till date or is within tolerance (STRONG_GREEN or LIGHT_GREEN),
  // they are fully cleared to receive their ID CARD.
  if (statusCategory === 'STRONG_GREEN' || statusCategory === 'LIGHT_GREEN') {
    actionTier = 'ID_CARD';
  } else if (isPermissionExpired) {
    // If student had a permission slip and it expired without full clearance, MUST require immediate action
    actionTier = 'ACTION_REQUIRED';
  } else if (student.manualCategoryOverride === 'id_card') {
    actionTier = 'ID_CARD';
  } else if (student.manualCategoryOverride === 'permission' && hasActivePermission) {
    actionTier = 'PERMISSION_SLIP';
  } else if (student.manualCategoryOverride === 'action') {
    actionTier = 'ACTION_REQUIRED';
  } else if (hasActivePermission) {
    actionTier = 'PERMISSION_SLIP';
  } else {
    actionTier = 'ACTION_REQUIRED';
  }

  return {
    statusCategory,
    actionTier,
    daysRemainingOnPermission,
    isPermissionExpired,
  };
}

export function getToleranceDisplayString(
  tolerance?: ToleranceConfig,
  currencySymbol: string = '₹'
): string {
  const symbol = currencySymbol || '₹';
  if (!tolerance) return `${symbol}500`;
  const val = tolerance.value !== undefined ? tolerance.value : 500;
  return `${symbol}${val.toLocaleString('en-IN')}`;
}

export function getStatusCategoryMeta(
  category: StatusCategory,
  tolerance?: ToleranceConfig,
  currencySymbol: string = '₹'
) {
  const tolStr = getToleranceDisplayString(tolerance, currencySymbol);

  switch (category) {
    case 'STRONG_GREEN':
      return {
        label: 'Cleared (0 Due)',
        bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        badgeClass: 'bg-emerald-600 text-white',
        dotClass: 'bg-emerald-500',
        rowHoverClass: 'hover:bg-emerald-50/40',
      };
    case 'LIGHT_GREEN':
      return {
        label: `Due till ${tolStr}`,
        bgClass: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
        badgeClass: 'bg-green-500 text-white',
        dotClass: 'bg-green-400',
        rowHoverClass: 'hover:bg-green-50/30',
      };
    case 'LIGHT_YELLOW':
      return {
        label: `Due more than ${tolStr}`,
        bgClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
        badgeClass: 'bg-amber-500 text-white',
        dotClass: 'bg-amber-400',
        rowHoverClass: 'hover:bg-amber-50/30',
      };
    case 'LIGHT_RED':
      return {
        label: 'Zero Paid',
        bgClass: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800',
        badgeClass: 'bg-rose-500 text-white',
        dotClass: 'bg-rose-400',
        rowHoverClass: 'hover:bg-rose-50/30',
      };
    case 'STRONG_RED':
      return {
        label: 'Fee Uncommitted',
        bgClass: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800',
        badgeClass: 'bg-red-700 text-white',
        dotClass: 'bg-red-600 animate-pulse',
        rowHoverClass: 'hover:bg-red-50/50',
      };
  }
}
