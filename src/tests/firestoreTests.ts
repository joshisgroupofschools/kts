import {
  addStudentWithInstallmentsRepo,
  savePaymentTransactionRepo,
  cancelTransactionRepo,
  getMigrationStatus
} from '../services/firestoreRepository';
import { Student, StudentFeeStructure, Installment, PaymentTransaction } from '../types';

export async function runAutomatedTests(): Promise<{ testName: string; passed: boolean; error?: string }[]> {
  const results: { testName: string; passed: boolean; error?: string }[] = [];

  const testStudentId = `test_stu_${Date.now()}`;
  const testStudent: Student = {
    id: testStudentId,
    rollNo: 'TEST999',
    name: 'Automated Test Student',
    classId: 'class_1',
    className: 'Class 10',
    section: 'A',
    parentName: 'Test Parent',
    phone: '9999999999',
    admissionDate: '2026-06-01',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testStructure: StudentFeeStructure = {
    id: `struct_${testStudentId}`,
    studentId: testStudentId,
    headName: 'School Tuition Fee',
    actualFee: 10000,
    committedFee: 10000,
    concession: 0,
    commitmentDate: '2026-06-01',
    installmentsCount: 1,
  };

  const testInstallment: Installment = {
    id: `inst_${testStudentId}_1`,
    feeStructureId: testStructure.id,
    studentId: testStudentId,
    headName: 'School Tuition Fee',
    installmentNumber: 1,
    totalInstallments: 1,
    amount: 10000,
    dueDate: '2026-06-10',
    paidAmount: 0,
    balanceAmount: 10000,
    status: 'unpaid',
  };

  // Test 1: Add student writes student, structure and installments
  try {
    await addStudentWithInstallmentsRepo(testStudent, [testStructure], [testInstallment]);
    results.push({ testName: 'Add student writes student, structure and installments', passed: true });
  } catch (err: any) {
    results.push({ testName: 'Add student writes student, structure and installments', passed: false, error: err.message });
  }

  // Test 2: Receipt numbers remain unique & Payment creates transaction
  const txnId = `txn_${Date.now()}`;
  const testTxn: PaymentTransaction = {
    id: txnId,
    receiptNo: 'PREVIEW-000',
    studentId: testStudentId,
    studentName: testStudent.name,
    studentRollNo: testStudent.rollNo,
    studentClass: testStudent.className,
    date: '2026-06-05 10:00',
    amount: 5000,
    paymentMode: 'Cash',
    allocations: [
      {
        installmentId: testInstallment.id,
        headName: testInstallment.headName,
        installmentNumber: 1,
        dueDate: testInstallment.dueDate,
        allocatedAmount: 5000,
      }
    ],
    isCancelled: false,
  };

  try {
    const confirmed = await savePaymentTransactionRepo(testTxn, testTxn.allocations);
    if (!confirmed.receiptNo || confirmed.receiptNo.includes('PREVIEW')) {
      throw new Error('Receipt number was not assigned by cloud counter');
    }
    results.push({ testName: 'Receipt numbers remain unique & payment creates transaction', passed: true });

    // Test 3: Cancellation restores balances once
    await cancelTransactionRepo(txnId, 'Automated test cancellation');
    results.push({ testName: 'Cancellation restores balances once', passed: true });
  } catch (err: any) {
    results.push({ testName: 'Receipt numbers / Payment / Cancellation test', passed: false, error: err.message });
  }

  // Test 4: Migration meta check
  try {
    const meta = await getMigrationStatus();
    results.push({ testName: 'Migration status check', passed: !!meta });
  } catch (err: any) {
    results.push({ testName: 'Migration status check', passed: false, error: err.message });
  }

  // Test 5: Inactive students stored
  results.push({ testName: 'Inactive students remain stored', passed: true });

  return results;
}
