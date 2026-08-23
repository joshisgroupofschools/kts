import { AnalyticsSummary, Installment, PaymentTransaction, Student, StudentFeeStructure, ToleranceConfig } from '../types';
import { computeStudentFinancials } from './feeCalculator';
import { computeStudentStatus } from './statusResolver';

export function computeSystemAnalytics(
  students: Student[],
  feeStructures: StudentFeeStructure[],
  installments: Installment[],
  payments: PaymentTransaction[],
  tolerance: ToleranceConfig,
  currentDateString: string = new Date().toISOString().split('T')[0]
): AnalyticsSummary {
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
      isSpotFee: boolean;
    }
  >();

  // 1. Process fee structures for active students
  feeStructures.forEach((s) => {
    if (!activeStudentIdSet.has(s.studentId)) return;
    const name = s.headName.trim() || 'Miscellaneous Fee';
    if (!headStatsMap.has(name)) {
      headStatsMap.set(name, {
        headName: name,
        totalCommitted: 0,
        totalExpectedTillDate: 0,
        totalCollected: 0,
        totalDueTillDate: 0,
        totalBalanceDue: 0,
        studentIds: new Set(),
        isSpotFee: !!s.isSpotFee,
      });
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
    const name = parentStruct?.headName?.trim() || inst.headName?.trim() || 'Miscellaneous Fee';

    if (!headStatsMap.has(name)) {
      headStatsMap.set(name, {
        headName: name,
        totalCommitted: 0,
        totalExpectedTillDate: 0,
        totalCollected: 0,
        totalDueTillDate: 0,
        totalBalanceDue: 0,
        studentIds: new Set(),
        isSpotFee: !!parentStruct?.isSpotFee,
      });
    }

    const stat = headStatsMap.get(name)!;
    stat.studentIds.add(inst.studentId);
    stat.totalBalanceDue += inst.balanceAmount;

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
        const allocHead = alloc.headName || '';
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
          headStatsMap.set(headKey, {
            headName: headKey,
            totalCommitted: alloc.allocatedAmount,
            totalExpectedTillDate: alloc.allocatedAmount,
            totalCollected: 0,
            totalDueTillDate: 0,
            totalBalanceDue: 0,
            studentIds: new Set([txn.studentId]),
            isSpotFee: allocLower.includes('book') || allocLower.includes('dress') || allocLower.includes('uniform'),
          });
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
        headStatsMap.set(headKey, {
          headName: headKey,
          totalCommitted: txn.amount,
          totalExpectedTillDate: txn.amount,
          totalCollected: 0,
          totalDueTillDate: 0,
          totalBalanceDue: 0,
          studentIds: new Set([txn.studentId]),
          isSpotFee: remLower.includes('book') || remLower.includes('dress') || remLower.includes('uniform'),
        });
      }
      const stat = headStatsMap.get(headKey)!;
      stat.totalCollected += txn.amount;
    }
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
  };
}
