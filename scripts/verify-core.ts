import assert from 'node:assert/strict';
import { getKolkataToday } from '../src/utils/dateUtils';
import { formatWhatsAppReminderMessage, normalizePhoneNumber, getInstallmentDisplayName } from '../src/utils/installmentFormatter';
import { calculateFifoAllocations } from '../src/utils/feeCalculator';
import { normalizeInstallments, normalizeTransactions } from '../src/utils/normalizeCloudData';
import { MONTH_WISE_OUTSTANDING_ORDER } from '../src/utils/analyticsEngine';

assert.equal(getKolkataToday(new Date('2026-09-25T20:00:00Z')), '2026-09-26');
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
assert(result.message.includes('OLD FEES – SEPTEMBER INSTALMENT 1/7'));
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
    'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH',
  ]
);
assert.equal(MONTH_WISE_OUTSTANDING_ORDER[0].rowLabel, 'JUNE');
assert.equal(MONTH_WISE_OUTSTANDING_ORDER[9].rowLabel, 'MARCH');

console.log('Core date, cloud normalization, month-wise order, and WhatsApp verification passed.');
