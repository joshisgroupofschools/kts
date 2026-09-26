import { AnalyticsSummary, FeeHeadDefinition, Installment, PaymentTransaction, Student, StudentFeeStructure, ToleranceConfig } from '../types';
import { computeStudentFinancials } from './feeCalculator';
import { computeStudentStatus, hasOverdueBeyondToleranceMonth } from './statusResolver';
import { getKolkataToday } from './dateUtils';

export const MONTH_WISE_OUTSTANDING_ORDER: Array<{
  key: string;
  rowLabel: string;
  monthNumber: number;
}> = [
  { key: 'JUNE', rowLabel: 'JUNE', monthNumber: 6 },
  { key: 'JULY', rowLabel: 'JULY', monthNumber: 7 },
  { key: 'AUGUST', rowLabel: 'AUGUST', monthNumber: 8 },
  { key: 'SEPTEMBER', rowLabel: 'SEPTEMBER', monthNumber: 9 },
  { key: 'OCTOBER', rowLabel: 'OCTOBER', monthNumber: 10 },
  { key: 'NOVEMBER', rowLabel: 'NOVEMBER', monthNumber: 11 },
  { key: 'DECEMBER', rowLabel: 'DECEMBER', monthNumber: 12 },
  { key: 'JANUARY', rowLabel: 'JANUARY', monthNumber: 1 },
  { key: 'FEBRUARY', rowLabel: 'FEBRUARY', monthNumber: 2 },
  { key: 'MARCH', rowLabel: 'MARCH', monthNumber: 3 },
];

const getNextMonthTenth = (dateString: string): string => {
  const [yearText, monthText] = dateString.split('-');
  const nextMonthTenth = new Date(Date.UTC(Number(yearText), Number(monthText), 10));
  return nextMonthTenth.toISOString().slice(0, 10);
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
  const activeStudentIdSet = new Set(activeStudentsList.map((s) => s.id));
  const structureMap = new Map<string, StudentFeeStructure>();
  feeStructures.forEach((s) => structureMap.set(s.id, s));

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

    const studentInstallments = installments.filter((inst) => inst.studentId === student.id);
    const statusRes = computeStudentStatus(
      student,
      {
        ...fin,
        hasOverdueBeyondToleranceMonth: hasOverdueBeyondToleranceMonth(studentInstallments, tolerance, currentDateString),
      },
      tolerance,
      currentDateString
    );

    if (student.isActive) {
      // Pure School Fee Baseline (Standard Class Fee rate without other fees)
      totalActualRevenue += (fin.actualFees > 0 ? fin.actualFees : fin.committedFees);
      // Pure Committed School Fee
      totalCommittedRevenue += (fin.committedFees > 0 ? fin.committedFees : (fin.totalPayable - fin.otherFees));
      totalExpectedTillDate += fin.expectedTillDate;
      totalOverdueDeficitTillDate += fin.dueTillDate;
      totalOverallDue += installments
        .filter((inst) => {
          if (inst.studentId !== student.id || inst.balanceAmount <= 0) return false;
          const headName = normalizeHeadName(structureMap.get(inst.feeStructureId)?.headName || inst.headName).toLowerCase();
          return !headName.includes('book') && !headName.includes('dress') && !headName.includes('uniform') && !headName.includes('stationery') && !headName.includes('kit');
        })
        .reduce((sum, inst) => sum + inst.balanceAmount, 0);
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
  const allActiveTransactions = payments.filter((p) => !p.isCancelled && activeStudentIdSet.has(p.studentId));
  const totalCollectedTillDate = allActiveTransactions.reduce((sum, p) => sum + p.amount, 0);
  const totalCashCollected = allActiveTransactions
    .filter((p) => p.paymentMode === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalUpiCollected = allActiveTransactions
    .filter((p) => p.paymentMode === 'UPI')
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate Today's Collections
  const todayStart = currentDateString;
  const todayTransactions = allActiveTransactions.filter(
    (p) => p.date && p.date.startsWith(todayStart)
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

  // Smart Daily Recovery Run-Rate Target: collect current backlog by the 10th
  // of the next month, using active non-old-fee dues only.
  const nextDueDate = getNextMonthTenth(currentDateString);
  const currentDate = new Date(`${currentDateString}T00:00:00Z`);
  const deadlineDate = new Date(`${nextDueDate}T00:00:00Z`);
  const collectionDeadline = deadlineDate.toISOString().slice(0, 10);
  const daysRemainingInCycle = Math.max(1, Math.ceil((deadlineDate.getTime() - currentDate.getTime()) / 86400000));

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

  // June-to-March month buckets for active-student outstanding follow-up.
  const orderedRowIndex = new Map(MONTH_WISE_OUTSTANDING_ORDER.map((row, index) => [row.monthNumber, index]));
  const studentRowBalances = new Map<string, Map<number, number>>();

  installments.forEach((installment) => {
    if (!activeStudentIdSet.has(installment.studentId) || installment.balanceAmount <= 0) return;
    const monthNumber = Number(installment.dueDate.slice(5, 7));
    const rowIndex = orderedRowIndex.get(monthNumber);
    if (rowIndex === undefined) return;
    const balances = studentRowBalances.get(installment.studentId) || new Map<number, number>();
    balances.set(rowIndex, (balances.get(rowIndex) || 0) + installment.balanceAmount);
    studentRowBalances.set(installment.studentId, balances);
  });

  const monthRows = MONTH_WISE_OUTSTANDING_ORDER.map((definition, rowIndex) => {
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
  const monthWiseOutstandingAnalysis = [
    ...monthRows,
    monthRows.reduce((total, row) => ({
      key: 'TOTAL', rowLabel: 'TOTAL',
      totalAmountToReceive: total.totalAmountToReceive + row.totalAmountToReceive,
      outstandingStudentsCount: total.outstandingStudentsCount + row.outstandingStudentsCount,
      exclusiveStudentsCount: total.exclusiveStudentsCount + row.exclusiveStudentsCount,
      exclusiveStudentsAmount: total.exclusiveStudentsAmount + row.exclusiveStudentsAmount,
      previousDueStudentsCount: total.previousDueStudentsCount + row.previousDueStudentsCount,
      previousDueStudentsAmount: total.previousDueStudentsAmount + row.previousDueStudentsAmount,
    }), {
      key: 'TOTAL', rowLabel: 'TOTAL', totalAmountToReceive: 0, outstandingStudentsCount: 0,
      exclusiveStudentsCount: 0, exclusiveStudentsAmount: 0, previousDueStudentsCount: 0,
      previousDueStudentsAmount: 0,
    }),
  ];

  return {
    totalStudents: activeStudentsList.length,
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
      nextDueDate,
      collectionDeadline,
    },
    categoryCounts,
    actionTierCounts,
    headWiseBifurcation,
    monthWiseOutstandingAnalysis,
  };
}
