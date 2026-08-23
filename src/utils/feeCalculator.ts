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
  academicYearStartYear: number = new Date().getFullYear()
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
  asOfDate: string = new Date().toISOString().split('T')[0]
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
      totalPaid: 0,
      totalDue: 0,
      dueTillDate: 0,
      expectedTillDate: 0,
      nextDueDate: null,
      hasUncommittedFee: true,
    };
  }

  // School Fee (Non-spot / main head)
  const schoolFeeStructures = studentStructures.filter(
    (s) => !s.isSpotFee && s.headName.toLowerCase().includes('school')
  );
  const otherFeeStructures = studentStructures.filter(
    (s) => s.isSpotFee || !s.headName.toLowerCase().includes('school')
  );

  const actualFees = schoolFeeStructures.reduce((sum, s) => sum + s.actualFee, 0);
  const committedFees = schoolFeeStructures.reduce((sum, s) => sum + s.committedFee, 0);
  const concession = schoolFeeStructures.reduce((sum, s) => sum + s.concession, 0);
  const otherFees = otherFeeStructures.reduce((sum, s) => sum + s.committedFee, 0);

  const totalPayable = committedFees + otherFees;

  // If student is inactive: whatever paid shows, unpaid future dues disappear
  let totalDue = Math.max(0, totalPayable - totalPaid);
  if (!isActive) {
    totalDue = 0;
  }

  // Calculate Expected Till Date
  const expectedTillDate = studentInstallments
    .filter((inst) => inst.dueDate <= asOfDate)
    .reduce((sum, inst) => sum + inst.amount, 0);

  // Calculate Due Till Date
  // Due till date is the sum of unpaid balance for all installments due on or before today
  let dueTillDate = studentInstallments
    .filter((inst) => inst.dueDate <= asOfDate)
    .reduce((sum, inst) => sum + inst.balanceAmount, 0);

  if (!isActive) {
    dueTillDate = 0;
  }

  // Find next upcoming due date (first installment with balance > 0 and dueDate >= asOfDate)
  const upcomingInst = studentInstallments
    .filter((inst) => inst.balanceAmount > 0 && inst.dueDate >= asOfDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const nextDueDate = upcomingInst ? upcomingInst.dueDate : null;

  return {
    actualFees,
    committedFees,
    concession,
    otherFees,
    totalPayable,
    totalPaid,
    totalDue,
    dueTillDate,
    expectedTillDate,
    nextDueDate,
    hasUncommittedFee: false,
  };
}

export function computeStudentFinancialSummary(
  student: Student,
  structures: StudentFeeStructure[],
  installments: Installment[],
  transactions: PaymentTransaction[],
  tolerance: ToleranceConfig,
  asOfDate: string = new Date().toISOString().split('T')[0]
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
    daysRemainingOnPermission: statusResult.daysRemainingOnPermission,
    isPermissionExpired: statusResult.isPermissionExpired,
    hasUncommittedFee: fin.hasUncommittedFee,
    installments: studentInstallments,
    structures: studentStructures,
    transactions: studentTransactions,
  };
}

