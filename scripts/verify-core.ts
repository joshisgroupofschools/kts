import assert from 'node:assert/strict';
import { countWorkingDaysExcludingSundays, getCollectionDeadlineTenth, getKolkataToday } from '../src/utils/dateUtils';
import { compareOfficialInstallmentOrder, formatWhatsAppReminderMessage, normalizePhoneNumber, getInstallmentDisplayName } from '../src/utils/installmentFormatter';
import { calculateFifoAllocations, generateInstallments } from '../src/utils/feeCalculator';
import { normalizeInstallments, normalizeTransactions } from '../src/utils/normalizeCloudData';
import { computeSystemAnalytics, MONTH_WISE_OUTSTANDING_ORDER } from '../src/utils/analyticsEngine';
import { generateStructuredRealData } from '../src/data/trialSpreadsheetData';

assert.equal(getKolkataToday(new Date('2026-09-25T20:00:00Z')), '2026-09-26');
assert.equal(getCollectionDeadlineTenth('2026-10-01'), '2026-10-10');
assert.equal(getCollectionDeadlineTenth('2026-10-10'), '2026-10-10');
assert.equal(getCollectionDeadlineTenth('2026-10-11'), '2026-11-10');
assert.equal(
  countWorkingDaysExcludingSundays(new Date('2026-10-01T00:00:00Z'), new Date('2026-10-10T00:00:00Z')),
  9,
);
assert.equal(normalizePhoneNumber('98765 43210'), '919876543210');
assert.equal(normalizePhoneNumber('12345'), '');

const result = formatWhatsAppReminderMessage(
  { name: 'CH. DATHA MANIKANTA', className: 'Class 6' },
  {
    installments: [
      { headName: 'School Tuition Fee', installmentNumber: 1, totalInstallments: 7, dueDate: '2026-07-10', balanceAmount: 3974, status: 'partial' },
      { headName: 'Transport / Bus Fee', installmentNumber: 2, totalInstallments: 10, dueDate: '2026-07-10', balanceAmount: 1900, status: 'unpaid' },
      { headName: 'Old Arrears', installmentNumber: 1, totalInstallments: 7, dueDate: '2026-09-10', balanceAmount: 2716, status: 'unpaid' },
      { headName: 'School Tuition Fee', installmentNumber: 4, totalInstallments: 7, dueDate: '2026-10-10', balanceAmount: 9999, status: 'unpaid' },
    ],
  },
  { schoolName: 'Kakatiya School Boduppal' },
  '2026-09-25',
);

assert.equal(result.totalSum, 8590);
assert(!result.message.includes('₹9,999'));
assert(result.message.includes('Kakatiya School, Boduppal'));
assert(result.message.includes('total due till 25/09/2026 is ₹8,590'));
assert(result.message.includes('SCHOOL FEES – JULY INSTALMENT 1/7'));
assert(result.message.includes('TRANSPORT – JULY INSTALMENT 2/10'));
assert(result.message.includes('OLD FEES – FEBRUARY INSTALMENT 1/3'));
assert(!result.message.includes('OLD FEES – SEPTEMBER INSTALMENT 1/7'));
assert.equal(getInstallmentDisplayName('Books', 1), 'BOOKS DUE');
assert.equal(getInstallmentDisplayName('Transport', 2, undefined, '2026-07-10'), 'TRANSPORT – JULY INSTALMENT 2/10');
assert.equal(getInstallmentDisplayName('Old Fees', 3, 3, '2027-04-10'), 'OLD FEES – APRIL INSTALMENT 3/3');
const allocationOrder = [
  { id: 'old', headName: 'Old Fees', dueDate: '2027-02-10', installmentNumber: 1, totalInstallments: 3, balanceAmount: 100 },
  { id: 'transport', headName: 'Transport', dueDate: '2027-03-10', installmentNumber: 10, totalInstallments: 10, balanceAmount: 100 },
  { id: 'books', headName: 'Books', dueDate: '2026-06-10', installmentNumber: 1, totalInstallments: 1, balanceAmount: 100 },
];
const allocated = calculateFifoAllocations(allocationOrder as any, 250);
assert.deepEqual(allocated.map(a => [a.installmentId, a.allocatedAmount]), [['books', 100], ['transport', 100], ['old', 50]]);
assert.equal(allocated[1].totalInstallments, 10);
const officialSchedule = [
  ...generateInstallments('books', 'student', 'Books', 21000, undefined, undefined, 10, 2026),
  ...generateInstallments('transport', 'student', 'Transport', 21000, undefined, undefined, 10, 2026),
  ...generateInstallments('school', 'student', 'School Fees', 21000, undefined, undefined, 10, 2026),
  ...generateInstallments('old', 'student', 'Old Fees', 21000, undefined, undefined, 10, 2026),
];
assert.equal(officialSchedule.length, 21);
assert.deepEqual(officialSchedule.filter(i => i.headName === 'Old Fees').map(i => i.dueDate),
  ['2027-02-10', '2027-03-10', '2027-04-10']);
assert.equal(officialSchedule.reduce((sum, i) => sum + i.amount, 0), 84000);
assert.deepEqual(
  [...officialSchedule].sort(compareOfficialInstallmentOrder).map(i => getInstallmentDisplayName(i.headName, i.installmentNumber, i.totalInstallments, i.dueDate)),
  [
    'BOOKS DUE',
    'TRANSPORT – JUNE INSTALMENT 1/10',
    'SCHOOL FEES – JULY INSTALMENT 1/7',
    'TRANSPORT – JULY INSTALMENT 2/10',
    'SCHOOL FEES – AUGUST INSTALMENT 2/7',
    'TRANSPORT – AUGUST INSTALMENT 3/10',
    'SCHOOL FEES – SEPTEMBER INSTALMENT 3/7',
    'TRANSPORT – SEPTEMBER INSTALMENT 4/10',
    'SCHOOL FEES – OCTOBER INSTALMENT 4/7',
    'TRANSPORT – OCTOBER INSTALMENT 5/10',
    'SCHOOL FEES – NOVEMBER INSTALMENT 5/7',
    'TRANSPORT – NOVEMBER INSTALMENT 6/10',
    'SCHOOL FEES – DECEMBER INSTALMENT 6/7',
    'TRANSPORT – DECEMBER INSTALMENT 7/10',
    'SCHOOL FEES – JANUARY INSTALMENT 7/7',
    'TRANSPORT – JANUARY INSTALMENT 8/10',
    'TRANSPORT – FEBRUARY INSTALMENT 9/10',
    'TRANSPORT – MARCH INSTALMENT 10/10',
    'OLD FEES – FEBRUARY INSTALMENT 1/3',
    'OLD FEES – MARCH INSTALMENT 2/3',
    'OLD FEES – APRIL INSTALMENT 3/3',
  ],
);
const restored = normalizeTransactions([{ allocations: [{ installmentId: 'transport', installmentNumber: 1, allocatedAmount: 100 }] }], allocationOrder as any);
assert.equal(restored[0].allocations[0].installmentNumber, 10);
assert.equal(restored[0].allocations[0].dueDate, '2027-03-10');

const normalizedTransaction = normalizeTransactions([{
  id: 'txn-1', receiptNo: 1122, studentId: 'student-1', studentName: 'Test',
  studentRollNo: 7, studentClass: 'Class 1', date: '2026-08-22T04:30:00.000Z',
  amount: 500, paymentMode: 'Cash', allocations: [], isCancelled: false,
}])[0];
assert.equal(normalizedTransaction.receiptNo, '1122');
assert.equal(normalizedTransaction.studentRollNo, '7');
assert.equal(normalizedTransaction.date, '2026-08-22 10:00');

const normalizedInstallment = normalizeInstallments([{
  id: 'inst-1', feeStructureId: 'fee-1', studentId: 'student-1', headName: 'School Tuition Fee',
  installmentNumber: 1, totalInstallments: 1, amount: 500, dueDate: '2026-07-09T18:30:00.000Z',
  paidAmount: 0, balanceAmount: 500, status: 'unpaid',
}])[0];
assert.equal(normalizedInstallment.dueDate, '2026-07-10');

assert.deepEqual(
  MONTH_WISE_OUTSTANDING_ORDER.map((row) => row.key),
  [
    'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER',
    'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL',
  ]
);
assert.equal(MONTH_WISE_OUTSTANDING_ORDER[0].rowLabel, 'JUNE');
assert.equal(MONTH_WISE_OUTSTANDING_ORDER[9].rowLabel, 'MARCH');

const realData = generateStructuredRealData();
const saiParipuran = realData.students.find((student) => student.name === 'SAI PARIPURAN' && student.rollNo === '31');
assert(saiParipuran, 'SAI PARIPURAN Roll #31 must exist in imported data');
const saiPayments = realData.payments.filter((payment) => payment.studentId === saiParipuran.id && !payment.isCancelled);
assert.equal(saiPayments.reduce((sum, payment) => sum + payment.amount, 0), 5000);
assert.equal(saiPayments[0].allocations.length, 0);
const historicalUnmappedAmount = realData.payments.reduce((sum, payment) => {
  const allocationTotal = (payment.allocations || []).reduce((allocSum, allocation) => allocSum + Number(allocation.allocatedAmount || 0), 0);
  return sum + Math.max(0, Number(payment.amount || 0) - allocationTotal);
}, 0);
assert.equal(historicalUnmappedAmount, 29000);
const receipt1128 = realData.payments.find((payment) => String(payment.receiptNo) === '1128');
assert(receipt1128, 'Receipt 1128 must exist in imported data');
assert.equal(
  Number(receipt1128.amount || 0) - receipt1128.allocations.reduce((sum, allocation) => sum + Number(allocation.allocatedAmount || 0), 0),
  4500,
);
const realAnalytics = computeSystemAnalytics(
  realData.students,
  realData.feeStructures,
  realData.installments,
  realData.payments,
  { mode: 'fixed_amount', value: 0 },
  '2026-09-30',
);
const unmappedHead = realAnalytics.headWiseBifurcation.find((head) => head.headName === 'Unmapped / Advance Payments');
assert(unmappedHead && unmappedHead.totalCollected >= 29000, 'Unmapped paid money must be visible separately');

const oldFeeAnalytics = computeSystemAnalytics(
  [{ id: 'old-student', name: 'Old Student', rollNo: '1', className: 'Class 1', classId: 'c1', section: 'A', isActive: true, admissionDate: '2026-06-01', createdAt: '', updatedAt: '' } as any],
  [{ id: 'old-structure', studentId: 'old-student', headName: 'Old Due Carryover', actualFee: 300, committedFee: 300, concession: 0, installmentsCount: 3, isSpotFee: false } as any],
  [
    { id: 'old-1', feeStructureId: 'old-structure', studentId: 'old-student', headName: 'Old Due Carryover', installmentNumber: 1, totalInstallments: 3, amount: 100, dueDate: '2027-02-10', paidAmount: 25, balanceAmount: 75, status: 'partial' },
    { id: 'old-2', feeStructureId: 'old-structure', studentId: 'old-student', headName: 'Old Due Carryover', installmentNumber: 2, totalInstallments: 3, amount: 100, dueDate: '2027-03-10', paidAmount: 0, balanceAmount: 100, status: 'unpaid' },
    { id: 'old-3', feeStructureId: 'old-structure', studentId: 'old-student', headName: 'Old Due Carryover', installmentNumber: 3, totalInstallments: 3, amount: 100, dueDate: '2027-04-10', paidAmount: 0, balanceAmount: 100, status: 'unpaid' },
  ] as any,
  [{ id: 'old-txn', receiptNo: '1', studentId: 'old-student', studentName: 'Old Student', studentRollNo: '1', studentClass: 'Class 1', date: '2026-09-30 10:00', amount: 25, paymentMode: 'Cash', allocations: [{ installmentId: 'old-1', headName: 'Old Due Carryover', installmentNumber: 1, totalInstallments: 3, dueDate: '2027-02-10', allocatedAmount: 25 }], isCancelled: false }],
  { mode: 'fixed_amount', value: 0 },
  '2026-09-30',
);
const oldFeeHead = oldFeeAnalytics.headWiseBifurcation.find((head) => head.headName === 'Old Due Carryover');
assert.equal(oldFeeHead?.totalCommitted, 300);
assert.equal(oldFeeHead?.totalCollected, 25);
assert.equal(oldFeeHead?.totalBalanceDue, 275);
assert.equal((oldFeeHead?.totalCollected || 0) + (oldFeeHead?.totalBalanceDue || 0), oldFeeHead?.totalCommitted);

const octoberRunRate = computeSystemAnalytics(
  [{ id: 'runrate-student', name: 'Run Rate Student', rollNo: '1', className: 'Class 1', classId: 'c1', section: 'A', isActive: true, admissionDate: '2026-06-01', createdAt: '', updatedAt: '' } as any],
  [],
  [{ id: 'runrate-inst', feeStructureId: 'runrate-structure', studentId: 'runrate-student', headName: 'School Fees', installmentNumber: 1, totalInstallments: 7, amount: 9000, dueDate: '2026-09-10', paidAmount: 0, balanceAmount: 9000, status: 'unpaid' } as any],
  [],
  { mode: 'fixed_amount', value: 0 },
  '2026-10-01',
);
assert.equal(octoberRunRate.dailyTargetRunRate.nextDueDate, '2026-10-10');
assert.equal(octoberRunRate.dailyTargetRunRate.collectionDeadline, '2026-10-10');
assert.equal(octoberRunRate.dailyTargetRunRate.daysRemainingInCycle, 9);

console.log('Core date, cloud normalization, month-wise order, and WhatsApp verification passed.');
