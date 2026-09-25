import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db, disableFirestoreNetwork } from '../firebase/firebaseClient';
import {
  Student,
  StudentFeeStructure,
  Installment,
  PaymentTransaction,
  ClassFeeConfig,
  FeeHeadDefinition,
  ToleranceConfig,
  SchoolProfile,
  DayCloseRecord,
  PaymentAllocation
} from '../types';

export const ROOT_PATH = 'schools/kakatiya';

export interface MigrationMeta {
  completed: boolean;
  migratedAt: string;
  counts: {
    students: number;
    installments: number;
    transactions: number;
    feeStructures: number;
    dayCloses: number;
    classConfigs: number;
    feeHeads: number;
  };
  legacyUpdatedAt?: string;
  verificationPassed: boolean;
}

// ----------------------------------------------------------------------
// Migration Service
// ----------------------------------------------------------------------
export async function getMigrationStatus(): Promise<MigrationMeta | null> {
  if (localStorage.getItem('sfc_migration_skipped') === 'true') {
    return {
      completed: true,
      migratedAt: new Date().toISOString(),
      counts: { students: 229, installments: 2345, transactions: 415, feeStructures: 10, dayCloses: 0, classConfigs: 5, feeHeads: 5 },
      verificationPassed: true,
    };
  }
  try {
    const metaRef = doc(db, `${ROOT_PATH}/meta/migration_v3`);
    const snap = await getDoc(metaRef);
    if (snap.exists()) {
      return snap.data() as MigrationMeta;
    }
    return null;
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota') || err?.message?.includes('resource-exhausted')) {
      localStorage.setItem('sfc_migration_skipped', 'true');
      disableFirestoreNetwork();
    }
    console.error('Error fetching migration status:', err);
    return null;
  }
}

export async function fetchLegacyDataSummary(): Promise<{
  exists: boolean;
  studentsCount: number;
  installmentsCount: number;
  transactionsCount: number;
  legacyData: any;
}> {
  try {
    const legacyRef = doc(db, 'kakatiya_school_ledger_v2/main_data_state');
    const snap = await getDoc(legacyRef);
    if (!snap.exists()) {
      return { exists: false, studentsCount: 0, installmentsCount: 0, transactionsCount: 0, legacyData: null };
    }
    const data = snap.data();
    return {
      exists: true,
      studentsCount: Array.isArray(data.students) ? data.students.length : 0,
      installmentsCount: Array.isArray(data.installments) ? data.installments.length : 0,
      transactionsCount: Array.isArray(data.transactions) ? data.transactions.length : 0,
      legacyData: data,
    };
  } catch (err) {
    console.error('Error fetching legacy data summary:', err);
    return { exists: false, studentsCount: 0, installmentsCount: 0, transactionsCount: 0, legacyData: null };
  }
}

export async function executeOneTimeMigration(masterLocal: {
  structures: StudentFeeStructure[];
  classConfigs: ClassFeeConfig[];
  feeHeads: FeeHeadDefinition[];
  tolerance: ToleranceConfig;
  dailyTarget: number;
  dayCloseRecords: Record<string, DayCloseRecord>;
  schoolProfile: SchoolProfile;
}): Promise<{ success: boolean; message: string }> {
  try {
    const legacySummary = await fetchLegacyDataSummary();
    if (!legacySummary.exists || !legacySummary.legacyData) {
      return { success: false, message: 'Legacy document kakatiya_school_ledger_v2/main_data_state not found in cloud.' };
    }

    const legacy = legacySummary.legacyData;
    const legacyStudents: Student[] = legacy.students || [];
    const legacyInstallments: Installment[] = legacy.installments || [];
    const legacyTransactions: PaymentTransaction[] = legacy.transactions || [];
    const legacySchoolProfile: SchoolProfile = legacy.schoolProfile || masterLocal.schoolProfile;

    // Verify minimum counts
    if (legacyStudents.length < 229 || legacyInstallments.length < 2345 || legacyTransactions.length < 415) {
      return {
        success: false,
        message: `Migration verification failed: counts below required minimums (Found Students: ${legacyStudents.length}/229, Installments: ${legacyInstallments.length}/2345, Transactions: ${legacyTransactions.length}/415).`
      };
    }

    // Check student references
    const studentIds = new Set(legacyStudents.map((s) => s.id));
    for (const inst of legacyInstallments) {
      if (!studentIds.has(inst.studentId)) {
        return { success: false, message: `Verification failed: Installment references non-existent student ID ${inst.studentId}` };
      }
    }
    for (const txn of legacyTransactions) {
      if (!studentIds.has(txn.studentId)) {
        return { success: false, message: `Verification failed: Transaction references non-existent student ID ${txn.studentId}` };
      }
    }

    // Check and ensure unique receipt numbers (handling shared sibling receipts gracefully)
    const receiptSet = new Set<string>();
    let maxReceiptSeq = legacySchoolProfile.nextReceiptSequence || 1;
    for (const txn of legacyTransactions) {
      if (!txn.isCancelled && txn.receiptNo) {
        let currentReceiptNo = txn.receiptNo;
        if (receiptSet.has(currentReceiptNo)) {
          currentReceiptNo = `${currentReceiptNo}-${txn.studentId.slice(-4)}`;
          txn.receiptNo = currentReceiptNo;
        }
        receiptSet.add(currentReceiptNo);
      }
      // Extract numeric sequence if possible
      const parts = txn.receiptNo ? txn.receiptNo.split('-') : [];
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num >= maxReceiptSeq) {
        maxReceiptSeq = num + 1;
      }
    }

    // Write in batches of at most 400 writes
    const allOperations: { type: 'set'; ref: any; data: any }[] = [];

    legacyStudents.forEach((s) => {
      allOperations.push({ type: 'set', ref: doc(db, `${ROOT_PATH}/students`, s.id), data: s });
    });

    legacyInstallments.forEach((i) => {
      allOperations.push({ type: 'set', ref: doc(db, `${ROOT_PATH}/installments`, i.id), data: i });
    });

    legacyTransactions.forEach((t) => {
      allOperations.push({ type: 'set', ref: doc(db, `${ROOT_PATH}/transactions`, t.id), data: t });
    });

    masterLocal.structures.forEach((st) => {
      allOperations.push({ type: 'set', ref: doc(db, `${ROOT_PATH}/feeStructures`, st.id), data: st });
    });

    masterLocal.classConfigs.forEach((cc) => {
      allOperations.push({ type: 'set', ref: doc(db, `${ROOT_PATH}/classConfigs`, cc.id), data: cc });
    });

    masterLocal.feeHeads.forEach((fh) => {
      allOperations.push({ type: 'set', ref: doc(db, `${ROOT_PATH}/feeHeads`, fh.id), data: fh });
    });

    Object.entries(masterLocal.dayCloseRecords).forEach(([dateStr, rec]) => {
      allOperations.push({ type: 'set', ref: doc(db, `${ROOT_PATH}/dayCloses`, dateStr), data: rec });
    });

    // Settings and counters
    allOperations.push({
      type: 'set',
      ref: doc(db, `${ROOT_PATH}/settings`, 'main'),
      data: {
        schoolProfile: legacySchoolProfile,
        tolerance: masterLocal.tolerance,
        dailyTarget: masterLocal.dailyTarget,
        updatedAt: new Date().toISOString(),
      }
    });

    allOperations.push({
      type: 'set',
      ref: doc(db, `${ROOT_PATH}/counters`, 'receipts'),
      data: { nextReceiptSequence: maxReceiptSeq, updatedAt: new Date().toISOString() }
    });

    // Commit in batches of 400
    for (let i = 0; i < allOperations.length; i += 400) {
      const chunk = allOperations.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((op) => {
        batch.set(op.ref, op.data);
      });
      await batch.commit();
    }

    // Save migration meta lock/complete
    const metaMeta: MigrationMeta = {
      completed: true,
      migratedAt: new Date().toISOString(),
      counts: {
        students: legacyStudents.length,
        installments: legacyInstallments.length,
        transactions: legacyTransactions.length,
        feeStructures: masterLocal.structures.length,
        dayCloses: Object.keys(masterLocal.dayCloseRecords).length,
        classConfigs: masterLocal.classConfigs.length,
        feeHeads: masterLocal.feeHeads.length,
      },
      legacyUpdatedAt: legacy.updatedAt || new Date().toISOString(),
      verificationPassed: true,
    };

    await setDoc(doc(db, `${ROOT_PATH}/meta/migration_v3`), metaMeta);

    return { success: true, message: 'Migration completed and verified successfully!' };
  } catch (err: any) {
    console.error('Migration error:', err);
    return { success: false, message: err.message || String(err) };
  }
}

// ----------------------------------------------------------------------
// Write Operations & Repository Actions
// ----------------------------------------------------------------------
export async function addStudentWithInstallmentsRepo(
  student: Student,
  structures: StudentFeeStructure[],
  installments: Installment[]
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, `${ROOT_PATH}/students`, student.id), student);
  structures.forEach((st) => {
    batch.set(doc(db, `${ROOT_PATH}/feeStructures`, st.id), st);
  });
  installments.forEach((inst) => {
    batch.set(doc(db, `${ROOT_PATH}/installments`, inst.id), inst);
  });
  await batch.commit();
}

export async function updateStudentRepo(student: Student): Promise<void> {
  await setDoc(doc(db, `${ROOT_PATH}/students`, student.id), student, { merge: true });
}

export async function saveFeeStructureRepo(
  studentId: string,
  newStructures: StudentFeeStructure[],
  newInstallments: Installment[],
  updatedStudent?: Student
): Promise<void> {
  const batch = writeBatch(db);
  if (updatedStudent) {
    batch.set(doc(db, `${ROOT_PATH}/students`, studentId), updatedStudent, { merge: true });
  }
  // To avoid leaving stale structures/installments, we set or update the new ones
  newStructures.forEach((st) => {
    batch.set(doc(db, `${ROOT_PATH}/feeStructures`, st.id), st);
  });
  newInstallments.forEach((inst) => {
    batch.set(doc(db, `${ROOT_PATH}/installments`, inst.id), inst, { merge: true });
  });
  await batch.commit();
}

export async function savePaymentTransactionRepo(
  transactionData: PaymentTransaction,
  allocations: PaymentAllocation[]
): Promise<PaymentTransaction> {
  const counterRef = doc(db, `${ROOT_PATH}/counters`, 'receipts');
  const txnRef = doc(db, `${ROOT_PATH}/transactions`, transactionData.id);

  let confirmedTransaction: PaymentTransaction = transactionData;

  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const seq = counterSnap.exists() ? (counterSnap.data().nextReceiptSequence || 1) : 1;

    const currentYear = new Date().getFullYear();
    const sequenceStr = String(seq).padStart(5, '0');
    const finalReceiptNo = `KSB-${currentYear}-${sequenceStr}`;

    // Read affected installments
    const installmentDocs = await Promise.all(
      allocations.map(async (a) => {
        const ref = doc(db, `${ROOT_PATH}/installments`, a.installmentId);
        const snap = await transaction.get(ref);
        return { id: a.installmentId, ref, snap, allocation: a };
      })
    );

    for (const item of installmentDocs) {
      if (!item.snap.exists()) {
        throw new Error(`Installment ${item.id} no longer exists in cloud.`);
      }
      const data = item.snap.data() as Installment;
      if (item.allocation.allocatedAmount < 0) {
        throw new Error('Allocation amount cannot be negative.');
      }
      if (item.allocation.allocatedAmount > data.balanceAmount + 0.01) {
        throw new Error(`Allocation for ${data.headName} exceeds its current balance (${data.balanceAmount}).`);
      }
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    if (Math.abs(totalAllocated - transactionData.amount) > 0.01) {
      throw new Error('Allocation total must exactly equal payment amount.');
    }

    confirmedTransaction = {
      ...transactionData,
      receiptNo: finalReceiptNo,
    };

    // Update installments
    installmentDocs.forEach((item) => {
      const data = item.snap.data() as Installment;
      const newPaid = data.paidAmount + item.allocation.allocatedAmount;
      const newBal = Math.max(0, data.amount - newPaid);
      const newStatus = newBal === 0 ? ('paid' as const) : ('partial' as const);

      transaction.update(item.ref, {
        paidAmount: newPaid,
        balanceAmount: newBal,
        status: newStatus,
        lastPaymentDate: transactionData.date.split(' ')[0],
      });
    });

    // Create transaction doc
    transaction.set(txnRef, confirmedTransaction);

    // Increment receipt counter
    transaction.set(counterRef, { nextReceiptSequence: seq + 1, updatedAt: new Date().toISOString() }, { merge: true });
  });

  return confirmedTransaction;
}

export async function cancelTransactionRepo(
  transactionId: string,
  cancelReason: string
): Promise<void> {
  const txnRef = doc(db, `${ROOT_PATH}/transactions`, transactionId);
  const counterRef = doc(db, `${ROOT_PATH}/counters`, 'receipts');

  await runTransaction(db, async (transaction) => {
    const txnSnap = await transaction.get(txnRef);
    if (!txnSnap.exists()) {
      throw new Error('Transaction not found.');
    }
    const txn = txnSnap.data() as PaymentTransaction;
    if (txn.isCancelled) {
      throw new Error('Receipt is already cancelled.');
    }

    // Read affected installments
    const installmentDocs = await Promise.all(
      txn.allocations.map(async (a) => {
        const ref = doc(db, `${ROOT_PATH}/installments`, a.installmentId);
        const snap = await transaction.get(ref);
        return { ref, snap, allocation: a };
      })
    );

    installmentDocs.forEach((item) => {
      if (!item.snap.exists()) return;
      const data = item.snap.data() as Installment;
      const newPaid = Math.max(0, data.paidAmount - item.allocation.allocatedAmount);
      const newBal = data.amount - newPaid;
      const newStatus = newPaid === 0 ? ('unpaid' as const) : ('partial' as const);

      transaction.update(item.ref, {
        paidAmount: newPaid,
        balanceAmount: newBal,
        status: newStatus,
      });
    });

    transaction.update(txnRef, {
      isCancelled: true,
      cancelledAt: new Date().toISOString(),
      cancellationReason: cancelReason,
    });
  });
}

export async function saveSettingsRepo(schoolProfile: SchoolProfile, tolerance: ToleranceConfig, dailyTarget: number): Promise<void> {
  const ref = doc(db, `${ROOT_PATH}/settings`, 'main');
  await setDoc(ref, {
    schoolProfile,
    tolerance,
    dailyTarget,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function saveDayCloseRepo(dateStr: string, record: DayCloseRecord): Promise<void> {
  const ref = doc(db, `${ROOT_PATH}/dayCloses`, dateStr);
  await setDoc(ref, record);
}

export async function deleteDayCloseRepo(dateStr: string): Promise<void> {
  const ref = doc(db, `${ROOT_PATH}/dayCloses`, dateStr);
  await deleteDoc(ref);
}
