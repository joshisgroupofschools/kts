import {
  Installment,
  PaymentAllocation,
  PaymentTransaction,
  Student,
  StudentFeeStructure,
  StudentFinancialSummary,
  ToleranceConfig,
} from '../types';
import { computeStudentStatus } from './statusResolver';
import { getKolkataToday } from './dateUtils';

/**
 * Splits an amount evenly across N installments, with any remainder placed on earlier installments.
 * e.g. 25000 in 3 parts -> 8334, 8333, 8333
 * Head Defaults:
 * - School Tuition: 7 Installments (July 10 to January 10) -> startMonthIndex = 6 (July)
 * - Transport / Bus: 10 Installments (June 10 to March 10) -> startMonthIndex = 5 (June)
 * - Old Due Carryover: 7 Installments (September 10 to March 10) -> startMonthIndex = 8 (Sept)
 */
export function generateInstallments(
  feeStructureId: string,
  studentId: string,
  headName: string,
  totalAmount: number,
  installmentsCount?: number,
  startMonthIndex?: number,
  dueDayOfMonth: number = 10,
  academicYearStartYear: number = Number(getKolkataToday().slice(0, 4))
): Installment[] {
  const lowerHead = (headName || '').toLowerCase();
  
  // Intelligent head-based defaults
  let finalCount = installmentsCount;
  let finalStartMonth = startMonthIndex;

  if (lowerHead.includes('transport') || lowerHead.includes('bus')) {
    finalCount = finalCount || 10;
    if (finalStartMonth === undefined) finalStartMonth = 5; // June
  } else if (lowerHead.includes('old') || lowerHead.includes('previous')) {
    finalCount = finalCount || 7;
    if (finalStartMonth === undefined) finalStartMonth = 8; // September
  } else {
    // School Tuition / Default
    finalCount = finalCount || 7;
    if (finalStartMonth === undefined) finalStartMonth = 6; // July
  }

  if (finalCount <= 0 || totalAmount <= 0) return [];

  const baseAmount = Math.floor(totalAmount / finalCount);
  const remainder = totalAmount % finalCount;

  const installments: Installment[] = [];

  for (let i = 0; i < finalCount; i++) {
    // Distribute remainder 1 by 1 into earlier installments
    const amount = baseAmount + (i < remainder ? 1 : 0);

    // Calculate due date (monthly progression)
    const month = (finalStartMonth + i) % 12;
    const yearOffset = Math.floor((finalStartMonth + i) / 12);
    const year = academicYearStartYear + yearOffset;

    // Format YYYY-MM-DD
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(dueDayOfMonth).padStart(2, '0');
    const dueDate = `${year}-${monthStr}-${dayStr}`;

    installments.push({
      id: `inst_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      feeStructureId,
      studentId,
      headName,
      installmentNumber: i + 1,
      totalInstallments: finalCount,
      amount,
      dueDate,
      paidAmount: 0,
      balanceAmount: amount,
      status: 'unpaid',
    });
  }

  return installments;
}

/**
 * Computes Chronological (FIFO) Knock-off Allocation across all unpaid/partial installments.
 * Sorting Rules:
 *  1. Earliest Due Date first.
 *  2. If due dates are equal: Installment with HIGHER balance gets priority.
 */
export function calculateFifoAllocations(
  installments: Installment[],
  paymentAmount: number
): PaymentAllocation[] {
  if (paymentAmount <= 0) return [];

  // Filter only unpaid or partial installments
  const pending = installments
    .filter((inst) => inst.balanceAmount > 0)
    .map((inst) => ({ ...inst }))
    .sort((a, b) => {
      // 1. Sort by Due Date ASC
      const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateDiff !== 0) return dateDiff;

      // 2. Tie-breaker: Highest balance first
      return b.balanceAmount - a.balanceAmount;
    });

  let remainingToAllocate = paymentAmount;
  const allocations: PaymentAllocation[] = [];

  for (const inst of pending) {
    if (remainingToAllocate <= 0) break;

    const allocAmount = Math.min(inst.balanceAmount, remainingToAllocate);
    if (allocAmount > 0) {
      allocations.push({
        installmentId: inst.id,
        headName: inst.headName,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        allocatedAmount: allocAmount,
      });
      remainingToAllocate -= allocAmount;
    }
  }

  return allocations;
}

/**
 * Applies a list of allocations to the student's installments list.
 */
export function applyAllocationsToInstallments(
  installments: Installment[],
  allocations: PaymentAllocation[]
): Installment[] {
  const allocMap = new Map<string, number>();
  allocations.forEach((a) => {
    allocMap.set(a.installmentId, (allocMap.get(a.installmentId) || 0) + a.allocatedAmount);
  });

  return installments.map((inst) => {
    const additionalPaid = allocMap.get(inst.id) || 0;
    if (additionalPaid <= 0) return inst;

    const newPaid = inst.paidAmount + additionalPaid;
    const newBalance = Math.max(0, inst.amount - newPaid);
    const status: Installment['status'] =
      newBalance === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    return {
      ...inst,
      paidAmount: newPaid,
      balanceAmount: newBalance,
      status,
    };
  });
}

/**
 * Reverses a payment's allocations from installments (when voiding/cancelling a receipt).
 */
export function reverseAllocationsFromInstallments(
  installments: Installment[],
  allocations: PaymentAllocation[]
): Installment[] {
  const allocMap = new Map<string, number>();
  allocations.forEach((a) => {
    allocMap.set(a.installmentId, (allocMap.get(a.installmentId) || 0) + a.allocatedAmount);
  });

  return installments.map((inst) => {
    const deductPaid = allocMap.get(inst.id) || 0;
    if (deductPaid <= 0) return inst;

    const newPaid = Math.max(0, inst.paidAmount - deductPaid);
    const newBalance = Math.min(inst.amount, inst.amount - newPaid);
    const status: Installment['status'] =
      newBalance === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    return {
      ...inst,
      paidAmount: newPaid,
      balanceAmount: newBalance,
      status,
    };
  });
}

/**
 * Computes Total Due Till Date vs Overall Due
 */
export function computeStudentFinancials(
  studentId: string,
  isActive: boolean,
  structures: StudentFeeStructure[],
  installments: Installment[],
  transactions: PaymentTransaction[],
  asOfDate: string = getKolkataToday()
) {
  const studentStructures = structures.filter((s) => s.studentId === studentId);
  const studentInstallments = installments.filter((i) => i.studentId === studentId);
  const studentTransactions = transactions.filter(
    (t) => t.studentId === studentId && !t.isCancelled
  );

  // Total Paid from active transactions
  const totalPaid = studentTransactions.reduce((sum, t) => sum + t.amount, 0);

  // If student is uncommitted (no fee structures defined)
  if (studentStructures.length === 0) {
    return {
      actualFees: 0,
      committedFees: 0,
      concession: 0,
      otherFees: 0,
      totalPayable: 0,
      totalPaid: totalPaid,
      totalDue: -totalPaid,
      dueTillDate: 0,
      expectedTillDate: 0,
      nextDueDate: null,
      hasUncommittedFee: true,
    };
  }

  // School Fee (Non-spot / main head)
  const schoolFeeStructures = studentStructures.filter(
    (s) => !s.isSpotFee && (s.headName.toLowerCase().includes('school') || s.headName.toLowerCase().includes('tuition') || s.headName.toLowerCase().includes('academic'))
  );
  
  // Other recurring fees (Transport, Old Due) - strictly excluding spot purchases like Books & Uniform/Dress
  const otherFeeStructures = studentStructures.filter(
    (s) => !s.isSpotFee && !s.headName.toLowerCase().includes('school') && !s.headName.toLowerCase().includes('tuition') && !s.headName.toLowerCase().includes('academic') && !s.headName.toLowerCase().includes('book') && !s.headName.toLowerCase().includes('dress') && !s.headName.toLowerCase().includes('uniform')
  );

  const actualFees = schoolFeeStructures.reduce((sum, s) => sum + s.actualFee, 0);
  const committedFees = schoolFeeStructures.reduce((sum, s) => sum + s.committedFee, 0);
  const concession = schoolFeeStructures.reduce((sum, s) => sum + s.concession, 0);
  const otherFees = otherFeeStructures.reduce((sum, s) => sum + s.committedFee, 0);

  const totalPayable = studentStructures.reduce((sum, s) => sum + s.committedFee, 0);
  const regularPaid = totalPaid;

  // If student is inactive: whatever paid shows, unpaid future dues disappear
  let totalDue = totalPayable - regularPaid;
  if (!isActive) {
    totalDue = 0;
  }

  // Calculate Expected Till Date (from regular scheduled installments)
  const regularInstallments = studentInstallments.filter((inst) => {
    const h = (inst.headName || '').toLowerCase();
    return !h.includes('book') && !h.includes('dress') && !h.includes('uniform') && !h.includes('stationery') && !h.includes('kit');
  });

  const expectedTillDate = regularInstallments
    .filter((inst) => inst.dueDate <= asOfDate)
    .reduce((sum, inst) => sum + inst.amount, 0);

  // Calculate Due Till Date (sum of unpaid balance for regular installments due on or before today)
  let dueTillDate = regularInstallments
    .filter((inst) => inst.dueDate <= asOfDate)
    .reduce((sum, inst) => sum + inst.balanceAmount, 0);

  if (!isActive) {
    dueTillDate = 0;
  }

  // Find next upcoming due date and how much is due on that date
  const unpaidRegularInstallments = regularInstallments.filter((inst) => inst.balanceAmount > 0);
  let nextDueDate: string | null = null;
  let nextInstallmentBalance = 0;

  if (unpaidRegularInstallments.length > 0) {
    const upcoming = unpaidRegularInstallments
      .filter((inst) => inst.dueDate >= asOfDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (upcoming.length > 0) {
      nextDueDate = upcoming[0].dueDate;
    } else {
      const overdue = [...unpaidRegularInstallments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      nextDueDate = overdue[0].dueDate;
    }

    if (nextDueDate) {
      nextInstallmentBalance = unpaidRegularInstallments
        .filter((inst) => inst.dueDate === nextDueDate)
        .reduce((sum, inst) => sum + inst.balanceAmount, 0);
    }
  } else if (studentInstallments.some((inst) => inst.balanceAmount > 0)) {
    const otherUnpaid = studentInstallments.filter((inst) => inst.balanceAmount > 0);
    const upcoming = otherUnpaid
      .filter((inst) => inst.dueDate >= asOfDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (upcoming.length > 0) {
      nextDueDate = upcoming[0].dueDate;
    } else {
      const overdue = [...otherUnpaid].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      nextDueDate = overdue[0].dueDate;
    }

    if (nextDueDate) {
      nextInstallmentBalance = otherUnpaid
        .filter((inst) => inst.dueDate === nextDueDate)
        .reduce((sum, inst) => sum + inst.balanceAmount, 0);
    }
  }

  // If student has an outstanding total due > 0 but nextInstallmentBalance is still 0,
  // ensure the next payment requirement reflects the pending balance
  if (totalDue > 0 && nextInstallmentBalance === 0) {
    nextInstallmentBalance = totalDue;
    if (!nextDueDate) {
      nextDueDate = asOfDate;
    }
  }

  return {
    actualFees,
    committedFees,
    concession,
    otherFees,
    totalPayable,
    totalPaid: regularPaid,
    totalDue,
    dueTillDate,
    expectedTillDate,
    nextDueDate,
    nextInstallmentBalance,
    hasUncommittedFee: false,
  };
}

export function computeStudentFinancialSummary(
  student: Student,
  structures: StudentFeeStructure[],
  installments: Installment[],
  transactions: PaymentTransaction[],
  tolerance: ToleranceConfig,
  asOfDate: string = getKolkataToday()
): StudentFinancialSummary {
  const fin = computeStudentFinancials(
    student.id,
    student.isActive,
    structures,
    installments,
    transactions,
    asOfDate
  );

  const statusResult = computeStudentStatus(
    student,
    {
      dueTillDate: fin.dueTillDate,
      expectedTillDate: fin.expectedTillDate,
      totalPaid: fin.totalPaid,
      hasUncommittedFee: fin.hasUncommittedFee,
    },
    tolerance,
    asOfDate
  );

  const studentInstallments = installments.filter((i) => i.studentId === student.id);
  const studentStructures = structures.filter((s) => s.studentId === student.id);
  const studentTransactions = transactions.filter((t) => t.studentId === student.id);

  return {
    student,
    actualFees: fin.actualFees,
    committedFees: fin.committedFees,
    concession: fin.concession,
    otherFees: fin.otherFees,
    totalPayable: fin.totalPayable,
    totalPaid: fin.totalPaid,
    totalDue: fin.totalDue,
    dueTillDate: fin.dueTillDate,
    expectedTillDate: fin.expectedTillDate,
    statusCategory: statusResult.statusCategory,
    actionTier: statusResult.actionTier,
    nextDueDate: fin.nextDueDate,
    nextInstallmentBalance: fin.nextInstallmentBalance,
    daysRemainingOnPermission: statusResult.daysRemainingOnPermission,
    isPermissionExpired: statusResult.isPermissionExpired,
    hasUncommittedFee: fin.hasUncommittedFee,
    installments: studentInstallments,
    structures: studentStructures,
    transactions: studentTransactions,
  };
}

