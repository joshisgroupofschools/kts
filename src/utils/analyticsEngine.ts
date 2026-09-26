import { AnalyticsSummary, FeeHeadDefinition, Installment, PaymentTransaction, Student, StudentFeeStructure, ToleranceConfig } from '../types';
import { computeStudentFinancials } from './feeCalculator';
import { computeStudentStatus } from './statusResolver';
import { getKolkataToday } from './dateUtils';

type OutstandingCategory = 'BOOKS' | 'TRANSPORT' | 'SCHOOL' | 'OLD';

export const MONTH_WISE_OUTSTANDING_ORDER: Array<{
  key: string;
  rowLabel: string;
  category: OutstandingCategory;
  installmentNumber?: number;
}> = [
  { key: 'BOOKS', rowLabel: 'BOOKS DUE', category: 'BOOKS' },
  { key: 'TRANSPORT_1', rowLabel: 'TRANSPORT - JUNE INSTALMENT 1/10', category: 'TRANSPORT', installmentNumber: 1 },
  { key: 'SCHOOL_1', rowLabel: 'SCHOOL FEES - JULY INSTALMENT 1/7', category: 'SCHOOL', installmentNumber: 1 },
  { key: 'TRANSPORT_2', rowLabel: 'TRANSPORT - JULY INSTALMENT 2/10', category: 'TRANSPORT', installmentNumber: 2 },
  { key: 'SCHOOL_2', rowLabel: 'SCHOOL FEES - AUGUST INSTALMENT 2/7', category: 'SCHOOL', installmentNumber: 2 },
  { key: 'TRANSPORT_3', rowLabel: 'TRANSPORT - AUGUST INSTALMENT 3/10', category: 'TRANSPORT', installmentNumber: 3 },
  { key: 'SCHOOL_3', rowLabel: 'SCHOOL FEES - SEPTEMBER INSTALMENT 3/7', category: 'SCHOOL', installmentNumber: 3 },
  { key: 'TRANSPORT_4', rowLabel: 'TRANSPORT - SEPTEMBER INSTALMENT 4/10', category: 'TRANSPORT', installmentNumber: 4 },
  { key: 'OLD_1', rowLabel: 'OLD FEES - SEPTEMBER INSTALMENT 1/7', category: 'OLD', installmentNumber: 1 },
  { key: 'SCHOOL_4', rowLabel: 'SCHOOL FEES - OCTOBER INSTALMENT 4/7', category: 'SCHOOL', installmentNumber: 4 },
  { key: 'TRANSPORT_5', rowLabel: 'TRANSPORT - OCTOBER INSTALMENT 5/10', category: 'TRANSPORT', installmentNumber: 5 },
  { key: 'OLD_2', rowLabel: 'OLD FEES - OCTOBER INSTALMENT 2/7', category: 'OLD', installmentNumber: 2 },
  { key: 'SCHOOL_5', rowLabel: 'SCHOOL FEES - NOVEMBER INSTALMENT 5/7', category: 'SCHOOL', installmentNumber: 5 },
  { key: 'TRANSPORT_6', rowLabel: 'TRANSPORT - NOVEMBER INSTALMENT 6/10', category: 'TRANSPORT', installmentNumber: 6 },
  { key: 'OLD_3', rowLabel: 'OLD FEES - NOVEMBER INSTALMENT 3/7', category: 'OLD', installmentNumber: 3 },
  { key: 'SCHOOL_6', rowLabel: 'SCHOOL FEES - DECEMBER INSTALMENT 6/7', category: 'SCHOOL', installmentNumber: 6 },
  { key: 'TRANSPORT_7', rowLabel: 'TRANSPORT - DECEMBER INSTALMENT 7/10', category: 'TRANSPORT', installmentNumber: 7 },
  { key: 'OLD_4', rowLabel: 'OLD FEES - DECEMBER INSTALMENT 4/7', category: 'OLD', installmentNumber: 4 },
  { key: 'SCHOOL_7', rowLabel: 'SCHOOL FEES - JANUARY INSTALMENT 7/7', category: 'SCHOOL', installmentNumber: 7 },
  { key: 'TRANSPORT_8', rowLabel: 'TRANSPORT - JANUARY INSTALMENT 8/10', category: 'TRANSPORT', installmentNumber: 8 },
  { key: 'OLD_5', rowLabel: 'OLD FEES - JANUARY INSTALMENT 5/7', category: 'OLD', installmentNumber: 5 },
  { key: 'TRANSPORT_9', rowLabel: 'TRANSPORT - FEBRUARY INSTALMENT 9/10', category: 'TRANSPORT', installmentNumber: 9 },
  { key: 'OLD_6', rowLabel: 'OLD FEES - FEBRUARY INSTALMENT 6/7', category: 'OLD', installmentNumber: 6 },
  { key: 'TRANSPORT_10', rowLabel: 'TRANSPORT - MARCH INSTALMENT 10/10', category: 'TRANSPORT', installmentNumber: 10 },
  { key: 'OLD_7', rowLabel: 'OLD FEES - MARCH INSTALMENT 7/7', category: 'OLD', installmentNumber: 7 },
];

const classifyOutstandingHead = (headName: string): OutstandingCategory | null => {
  const value = headName.toLowerCase();
  if (value.includes('book') || value.includes('stationery')) return 'BOOKS';
  if (value.includes('transport') || value.includes('bus') || value.includes('van')) return 'TRANSPORT';
  if (value.includes('old') || value.includes('arrear') || value.includes('carryover') || value.includes('previous')) return 'OLD';
  if (value.includes('school') || value.includes('tuition') || value.includes('academic')) return 'SCHOOL';
  return null;
};

export function computeSystemAnalytics(
  students: Student[],
  feeStructures: StudentFeeStructure[],
  installments: Installment[],
  payments: PaymentTransaction[],
  tolerance: ToleranceConfig,
  currentDateString: string = getKolkataToday(),
  configuredFeeHeads: FeeHeadDefinition[] = []
): AnalyticsSummary {
  const normalizeHeadName = (value: unknown): string => {
    const normalized = String(value ?? '').trim();
    return normalized || 'Miscellaneous Fee';
  };
  const activeStudentsList = students.filter((s) => s.isActive);
  const inactiveStudentsList = students.filter((s) => !s.isActive);

  let totalActualRevenue = 0;
  let totalCommittedRevenue = 0;
  let totalExpectedTillDate = 0;
  let totalOverdueDeficitTillDate = 0;
  let totalOverallDue = 0;
  let totalConcessionGiven = 0;
  let concessionStudentsCount = 0;

  const categoryCounts = {
    strongGreen: 0,
    lightGreen: 0,
    lightYellow: 0,
    lightRed: 0,
    strongRed: 0,
  };

  const actionTierCounts = {
    idCardEligible: 0,
    onPermission: 0,
    actionRequired: 0,
  };

  students.forEach((student) => {
    const fin = computeStudentFinancials(
      student.id,
      student.isActive,
      feeStructures,
      installments,
      payments,
      currentDateString
    );

    const statusRes = computeStudentStatus(student, fin, tolerance, currentDateString);

    if (student.isActive) {
      // Pure School Fee Baseline (Standard Class Fee rate without other fees)
      totalActualRevenue += (fin.actualFees > 0 ? fin.actualFees : fin.committedFees);
      // Pure Committed School Fee
      totalCommittedRevenue += (fin.committedFees > 0 ? fin.committedFees : (fin.totalPayable - fin.otherFees));
      totalExpectedTillDate += fin.expectedTillDate;
      totalOverdueDeficitTillDate += fin.dueTillDate;
      totalOverallDue += fin.totalDue;
      if (fin.concession > 0) {
        totalConcessionGiven += fin.concession;
        concessionStudentsCount++;
      }

      // Category counts
      if (statusRes.statusCategory === 'STRONG_GREEN') categoryCounts.strongGreen++;
      else if (statusRes.statusCategory === 'LIGHT_GREEN') categoryCounts.lightGreen++;
      else if (statusRes.statusCategory === 'LIGHT_YELLOW') categoryCounts.lightYellow++;
      else if (statusRes.statusCategory === 'LIGHT_RED') categoryCounts.lightRed++;
      else if (statusRes.statusCategory === 'STRONG_RED') categoryCounts.strongRed++;

      // Action Tier counts
      if (statusRes.actionTier === 'ID_CARD') actionTierCounts.idCardEligible++;
      else if (statusRes.actionTier === 'PERMISSION_SLIP') actionTierCounts.onPermission++;
      else if (statusRes.actionTier === 'ACTION_REQUIRED') actionTierCounts.actionRequired++;
    }
  });

  // Calculate All-Time Valid Collections Breakdown (Cash vs UPI) & Grand Total
  const allActiveTransactions = payments.filter((p) => !p.isCancelled);
  const totalCollectedTillDate = allActiveTransactions.reduce((sum, p) => sum + p.amount, 0);
  const totalCashCollected = allActiveTransactions
    .filter((p) => p.paymentMode === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalUpiCollected = allActiveTransactions
    .filter((p) => p.paymentMode === 'UPI')
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate Today's Collections
  const todayStart = currentDateString;
  const todayTransactions = payments.filter(
    (p) => !p.isCancelled && p.date && p.date.startsWith(todayStart)
  );

  const todayCollection = todayTransactions.reduce((sum, p) => sum + p.amount, 0);
  const todayCash = todayTransactions
    .filter((p) => p.paymentMode === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const todayUpi = todayTransactions
    .filter((p) => p.paymentMode === 'UPI')
    .reduce((sum, p) => sum + p.amount, 0);
  const todayOther = todayCollection - (todayCash + todayUpi);

  // Collection Efficiency Index %
  const collectionEfficiencyPercent =
    totalExpectedTillDate > 0
      ? Math.min(100, Math.round((totalCollectedTillDate / totalExpectedTillDate) * 100))
      : 100;

  // Smart Daily Recovery Run-Rate Target
  // Calculates remaining days in current calendar month
  const todayDateObj = new Date(currentDateString);
  const lastDayOfMonth = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth() + 1, 0).getDate();
  const currentDay = todayDateObj.getDate();
  const daysRemainingInCycle = Math.max(1, lastDayOfMonth - currentDay + 1);

  // Target daily recovery run rate to eliminate backlog
  const backlogGap = totalOverdueDeficitTillDate;
  const targetDailyAmount = Math.ceil(backlogGap / daysRemainingInCycle);

  // Suggested students to follow up per day based on average installment size (~₹4,000)
  const averageDuePerStudent =
    categoryCounts.lightYellow + categoryCounts.lightRed > 0
      ? backlogGap / (categoryCounts.lightYellow + categoryCounts.lightRed)
      : 4000;
  const suggestedStudentsPerDay = Math.max(
    1,
    Math.ceil(targetDailyAmount / (averageDuePerStudent || 4000))
  );

  // -------------------------------------------------------------
  // Fee Head-Wise Due & Collection Bifurcation
  // -------------------------------------------------------------
  const activeStudentIdSet = new Set(activeStudentsList.map((s) => s.id));
  const structureMap = new Map<string, StudentFeeStructure>();
  feeStructures.forEach((s) => structureMap.set(s.id, s));

  const headStatsMap = new Map<
    string,
    {
      headName: string;
      totalCommitted: number;
      totalExpectedTillDate: number;
      totalCollected: number;
      totalDueTillDate: number;
      totalBalanceDue: number;
      studentIds: Set<string>;
      outstandingStudentIds: Set<string>;
      exclusiveStudentIds: Set<string>;
      exclusiveStudentsAmount: number;
      previousHeadDueStudentIds: Set<string>;
      previousHeadDueStudentsAmount: number;
      isSpotFee: boolean;
    }
  >();

  const createEmptyHeadStat = (headName: string, isSpotFee = false) => ({
    headName,
    totalCommitted: 0,
    totalExpectedTillDate: 0,
    totalCollected: 0,
    totalDueTillDate: 0,
    totalBalanceDue: 0,
    studentIds: new Set<string>(),
    outstandingStudentIds: new Set<string>(),
    exclusiveStudentIds: new Set<string>(),
    exclusiveStudentsAmount: 0,
    previousHeadDueStudentIds: new Set<string>(),
    previousHeadDueStudentsAmount: 0,
    isSpotFee,
  });

  // Keep every configured head visible, even when its current values are zero.
  configuredFeeHeads.forEach((head) => {
    const name = normalizeHeadName(head?.headName);
    if (!headStatsMap.has(name)) {
      headStatsMap.set(name, createEmptyHeadStat(name, !!head.isSpotFee));
    }
  });

  // 1. Process fee structures for active students
  feeStructures.forEach((s) => {
    if (!activeStudentIdSet.has(s.studentId)) return;
    const name = normalizeHeadName(s.headName);
    if (!headStatsMap.has(name)) {
      headStatsMap.set(name, createEmptyHeadStat(name, !!s.isSpotFee));
    }
    const stat = headStatsMap.get(name)!;
    stat.totalCommitted += s.committedFee;
    stat.studentIds.add(s.studentId);
    if (s.isSpotFee) stat.isSpotFee = true;
  });

  // 2. Process installments for active students
  installments.forEach((inst) => {
    if (!activeStudentIdSet.has(inst.studentId)) return;
    const parentStruct = inst.feeStructureId ? structureMap.get(inst.feeStructureId) : null;
    const name = normalizeHeadName(parentStruct?.headName || inst.headName);

    if (!headStatsMap.has(name)) {
      headStatsMap.set(name, createEmptyHeadStat(name, !!parentStruct?.isSpotFee));
    }

    const stat = headStatsMap.get(name)!;
    stat.studentIds.add(inst.studentId);
    stat.totalBalanceDue += inst.balanceAmount;
    if (inst.balanceAmount > 0) stat.outstandingStudentIds.add(inst.studentId);

    if (inst.dueDate <= currentDateString) {
      stat.totalExpectedTillDate += inst.amount;
      stat.totalDueTillDate += inst.balanceAmount;
    }
  });

  // 3. Attribute actual transaction collections to corresponding fee heads
  headStatsMap.forEach((stat) => {
    stat.totalCollected = 0;
  });

  allActiveTransactions.forEach((txn) => {
    if (txn.allocations && txn.allocations.length > 0) {
      txn.allocations.forEach((alloc) => {
        const allocHead = String(alloc.headName || '');
        const allocLower = allocHead.toLowerCase();
        
        let matchedKey: string | undefined;
        for (const [key] of headStatsMap.entries()) {
          const keyLower = key.toLowerCase();
          if (
            (allocLower.includes('book') && keyLower.includes('book')) ||
            ((allocLower.includes('dress') || allocLower.includes('uniform')) && (keyLower.includes('dress') || keyLower.includes('uniform'))) ||
            ((allocLower.includes('transport') || allocLower.includes('bus')) && (keyLower.includes('transport') || keyLower.includes('bus'))) ||
            ((allocLower.includes('old') || allocLower.includes('due') || allocLower.includes('arrear')) && (keyLower.includes('old') || keyLower.includes('due') || keyLower.includes('arrear'))) ||
            ((allocLower.includes('school') || allocLower.includes('tuition') || allocLower.includes('academic')) && (keyLower.includes('school') || keyLower.includes('tuition') || keyLower.includes('academic')))
          ) {
            matchedKey = key;
            break;
          }
        }

        const headKey = matchedKey || allocHead || 'School Tuition Fee';
        if (!headStatsMap.has(headKey)) {
          const newStat = createEmptyHeadStat(
            headKey,
            allocLower.includes('book') || allocLower.includes('dress') || allocLower.includes('uniform')
          );
          newStat.totalCommitted = alloc.allocatedAmount;
          newStat.totalExpectedTillDate = alloc.allocatedAmount;
          newStat.studentIds.add(txn.studentId);
          headStatsMap.set(headKey, newStat);
        }

        const stat = headStatsMap.get(headKey)!;
        stat.totalCollected += alloc.allocatedAmount;
      });
    } else {
      const remLower = (txn.remarks || '').toLowerCase();
      let matchedKey: string | undefined;
      for (const [key] of headStatsMap.entries()) {
        const keyLower = key.toLowerCase();
        if (
          (remLower.includes('book') && keyLower.includes('book')) ||
          ((remLower.includes('dress') || remLower.includes('uniform')) && (keyLower.includes('dress') || keyLower.includes('uniform'))) ||
          ((remLower.includes('transport') || remLower.includes('bus')) && (keyLower.includes('transport') || keyLower.includes('bus'))) ||
          ((remLower.includes('old') || remLower.includes('due')) && (keyLower.includes('old') || keyLower.includes('due'))) ||
          ((remLower.includes('school') || remLower.includes('tuition')) && (keyLower.includes('school') || keyLower.includes('tuition')))
        ) {
          matchedKey = key;
          break;
        }
      }

      const defaultSchoolHead = Array.from(headStatsMap.keys()).find((k) => k.toLowerCase().includes('school') || k.toLowerCase().includes('tuition')) || 'School Tuition Fee';
      const headKey = matchedKey || defaultSchoolHead;
      if (!headStatsMap.has(headKey)) {
        const newStat = createEmptyHeadStat(
          headKey,
          remLower.includes('book') || remLower.includes('dress') || remLower.includes('uniform')
        );
        newStat.totalCommitted = txn.amount;
        newStat.totalExpectedTillDate = txn.amount;
        newStat.studentIds.add(txn.studentId);
        headStatsMap.set(headKey, newStat);
      }
      const stat = headStatsMap.get(headKey)!;
      stat.totalCollected += txn.amount;
    }
  });

  // Build outstanding balances per student/head for the requested cohort analysis.
  const headOrder = Array.from(headStatsMap.keys());
  const headOrderIndex = new Map(headOrder.map((name, index) => [name, index]));
  const studentHeadBalances = new Map<string, Map<string, number>>();

  installments.forEach((inst) => {
    if (!activeStudentIdSet.has(inst.studentId) || inst.balanceAmount <= 0) return;
    const parentStruct = inst.feeStructureId ? structureMap.get(inst.feeStructureId) : null;
    const headName = normalizeHeadName(parentStruct?.headName || inst.headName);
    const balances = studentHeadBalances.get(inst.studentId) || new Map<string, number>();
    balances.set(headName, (balances.get(headName) || 0) + inst.balanceAmount);
    studentHeadBalances.set(inst.studentId, balances);
  });

  studentHeadBalances.forEach((balances, studentId) => {
    const outstandingHeads = Array.from(balances.entries()).filter(([, amount]) => amount > 0);
    outstandingHeads.forEach(([headName, amount]) => {
      const stat = headStatsMap.get(headName);
      if (!stat) return;

      if (outstandingHeads.length === 1) {
        stat.exclusiveStudentIds.add(studentId);
        stat.exclusiveStudentsAmount += amount;
      }

      const currentIndex = headOrderIndex.get(headName) ?? Number.MAX_SAFE_INTEGER;
      const hasPreviousHeadDue = outstandingHeads.some(([otherHead]) => {
        const otherIndex = headOrderIndex.get(otherHead) ?? Number.MAX_SAFE_INTEGER;
        return otherHead !== headName && otherIndex < currentIndex;
      });
      if (hasPreviousHeadDue) {
        stat.previousHeadDueStudentIds.add(studentId);
        stat.previousHeadDueStudentsAmount += amount;
      }
    });
  });

  const headWiseBifurcation = Array.from(headStatsMap.values()).map((stat) => {
    const collectionRate =
      stat.totalCommitted > 0
        ? Math.min(100, Math.round((stat.totalCollected / stat.totalCommitted) * 100))
        : stat.totalExpectedTillDate > 0
        ? Math.min(100, Math.round((stat.totalCollected / stat.totalExpectedTillDate) * 100))
        : 100;

    return {
      headName: stat.headName,
      totalCommitted: stat.totalCommitted,
      totalExpectedTillDate: stat.totalExpectedTillDate,
      totalCollected: stat.totalCollected,
      totalDueTillDate: stat.totalDueTillDate,
      totalBalanceDue: stat.totalBalanceDue,
      activeStudentsCount: stat.studentIds.size,
      outstandingStudentsCount: stat.outstandingStudentIds.size,
      exclusiveStudentsCount: stat.exclusiveStudentIds.size,
      exclusiveStudentsAmount: stat.exclusiveStudentsAmount,
      previousHeadDueStudentsCount: stat.previousHeadDueStudentIds.size,
      previousHeadDueStudentsAmount: stat.previousHeadDueStudentsAmount,
      collectionRate,
      isSpotFee: stat.isSpotFee,
    };
  });

  // Sort: Main/School Tuition fee first, then by committed amount descending
  headWiseBifurcation.sort((a, b) => {
    const aIsSchool = a.headName.toLowerCase().includes('school') || a.headName.toLowerCase().includes('tuition');
    const bIsSchool = b.headName.toLowerCase().includes('school') || b.headName.toLowerCase().includes('tuition');
    if (aIsSchool && !bIsSchool) return -1;
    if (!aIsSchool && bIsSchool) return 1;
    return b.totalCommitted - a.totalCommitted;
  });

  // Exact 25-row month/instalment sequence requested for outstanding follow-up.
  const orderedRowIndex = new Map(
    MONTH_WISE_OUTSTANDING_ORDER.map((row, index) => [
      row.category === 'BOOKS' ? 'BOOKS' : `${row.category}_${row.installmentNumber}`,
      index,
    ])
  );
  const studentRowBalances = new Map<string, Map<number, number>>();

  installments.forEach((installment) => {
    if (!activeStudentIdSet.has(installment.studentId) || installment.balanceAmount <= 0) return;
    const category = classifyOutstandingHead(normalizeHeadName(installment.headName));
    if (!category) return;
    const lookupKey = category === 'BOOKS' ? 'BOOKS' : `${category}_${installment.installmentNumber}`;
    const rowIndex = orderedRowIndex.get(lookupKey);
    if (rowIndex === undefined) return;
    const balances = studentRowBalances.get(installment.studentId) || new Map<number, number>();
    balances.set(rowIndex, (balances.get(rowIndex) || 0) + installment.balanceAmount);
    studentRowBalances.set(installment.studentId, balances);
  });

  const monthWiseOutstandingAnalysis = MONTH_WISE_OUTSTANDING_ORDER.map((definition, rowIndex) => {
    let totalAmountToReceive = 0;
    let outstandingStudentsCount = 0;
    let exclusiveStudentsCount = 0;
    let exclusiveStudentsAmount = 0;
    let previousDueStudentsCount = 0;
    let previousDueStudentsAmount = 0;

    studentRowBalances.forEach((balances) => {
      const amount = balances.get(rowIndex) || 0;
      if (amount <= 0) return;
      outstandingStudentsCount++;
      totalAmountToReceive += amount;
      const hasPreviousDue = Array.from(balances.entries()).some(([otherIndex, otherAmount]) => otherIndex < rowIndex && otherAmount > 0);
      if (hasPreviousDue) {
        previousDueStudentsCount++;
        previousDueStudentsAmount += amount;
      } else {
        exclusiveStudentsCount++;
        exclusiveStudentsAmount += amount;
      }
    });

    return {
      key: definition.key,
      rowLabel: definition.rowLabel,
      totalAmountToReceive,
      outstandingStudentsCount,
      exclusiveStudentsCount,
      exclusiveStudentsAmount,
      previousDueStudentsCount,
      previousDueStudentsAmount,
    };
  });

  return {
    totalStudents: students.length,
    activeStudents: activeStudentsList.length,
    inactiveStudents: inactiveStudentsList.length,
    totalActualRevenue,
    totalCommittedRevenue,
    totalExpectedTillDate,
    totalCollectedTillDate,
    totalCashCollected,
    totalUpiCollected,
    totalOverdueDeficitTillDate,
    totalOverallDue,
    collectionEfficiencyPercent,
    todayCollection,
    todayCash,
    todayUpi,
    todayOther,
    totalConcessionGiven,
    concessionStudentsCount,
    totalTransactionsCount: allActiveTransactions.length,
    averageReceiptAmount:
      allActiveTransactions.length > 0
        ? Math.round(totalCollectedTillDate / allActiveTransactions.length)
        : 0,
    dailyTargetRunRate: {
      targetDailyAmount,
      daysRemainingInCycle,
      suggestedStudentsPerDay,
      backlogGap,
    },
    categoryCounts,
    actionTierCounts,
    headWiseBifurcation,
    monthWiseOutstandingAnalysis,
  };
}
