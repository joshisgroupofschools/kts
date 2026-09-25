import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  AppView,
  ClassFeeConfig,
  DayCloseRecord,
  FeeHeadDefinition,
  Installment,
  PaymentAllocation,
  PaymentMode,
  PaymentTransaction,
  SchoolProfile,
  Student,
  StudentFeeStructure,
  StudentFilterState,
  StudentFinancialSummary,
  ToleranceConfig,
} from './types';
import {
  calculateFifoAllocations,
  computeStudentFinancialSummary,
  generateInstallments,
} from './utils/feeCalculator';
import { computeSystemAnalytics } from './utils/analyticsEngine';
import { getKolkataToday } from './utils/dateUtils';
import { sortClassList, STANDARD_CLASS_ORDER } from './utils/classOrder';
import { formatCurrency, formatDate } from './utils/numberToWords';
import {
  DEFAULT_SCHOOL_PROFILE,
  DEFAULT_TOLERANCE,
  clearAllLocalData,
  exportDataAsJson,
  getDailyCollectionTarget,
  getDayCloseRecords,
  getGoogleScriptUrl,
  getSpreadsheetUrl,
  getStoredClassConfigs,
  getStoredFeeHeads,
  getStoredInstallments,
  getStoredSchoolProfile,
  getStoredStudents,
  getStoredStructures,
  getStoredToleranceConfig,
  getStoredTransactions,
  pullFromGoogleSheets,
  pushToGoogleSheets,
  restoreDataFromJson,
  saveClassConfigs,
  saveDailyCollectionTarget,
  saveDayCloseRecords,
  saveGoogleScriptUrl,
  saveInstallments,
  saveSchoolProfile,
  saveSpreadsheetUrl,
  saveStudents,
  saveStructures,
  saveToleranceConfig,
  saveTransactions,
} from './utils/storage';
import { db, COLLECTION_ID, DOC_ID } from './firebase/firebaseClient';
import { doc, onSnapshot, setDoc, runTransaction } from 'firebase/firestore';
import { Navbar } from './components/Navbar';
import { FinancialDashboard } from './components/FinancialDashboard';
import { MasterStudentTable } from './components/MasterStudentTable';
import { PaymentModal } from './components/PaymentModal';
import { DualA5ReceiptModal } from './components/DualA5ReceiptModal';
import { PermissionModal } from './components/PermissionModal';
import { StudentLedgerModal } from './components/StudentLedgerModal';
import { FeeStructureModal } from './components/FeeStructureModal';
import { AddStudentModal } from './components/AddStudentModal';
import { ClassFeeMasterModal } from './components/ClassFeeMasterModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { HelpModal } from './components/HelpModal';
import { BulkUploadModal } from './components/BulkUploadModal';
import { TrialVerificationView } from './components/TrialVerificationView';
import { TodaysReceiptsModal } from './components/TodaysReceiptsModal';
import { PasscodeGate } from './components/PasscodeGate';
import { generateStructuredRealData } from './data/trialSpreadsheetData';
import { ArrowRight, CheckCircle2, Coins, FileSpreadsheet, Sparkles, Users } from 'lucide-react';

export default function App() {
  // -------------------------------------------------------------
  // 1. Core State
  // -------------------------------------------------------------
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [structures, setStructures] = useState<StudentFeeStructure[]>(() => getStoredStructures());
  const [installments, setInstallments] = useState<Installment[]>(() => getStoredInstallments());
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => getStoredTransactions());
  const [classConfigs, setClassConfigs] = useState<ClassFeeConfig[]>(() => getStoredClassConfigs());
  const [feeHeads, setFeeHeads] = useState<FeeHeadDefinition[]>(() => getStoredFeeHeads());
  const [tolerance, setTolerance] = useState<ToleranceConfig>(() => getStoredToleranceConfig());
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => getStoredSchoolProfile());
  const [dailyTarget, setDailyTarget] = useState<number>(() => getDailyCollectionTarget());
  const [dayCloseRecords, setDayCloseRecords] = useState<Record<string, DayCloseRecord>>(() => getDayCloseRecords());

  // View state: LEDGER, ANALYTICS, or TRIAL_VERIFICATION
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = localStorage.getItem('sfc_current_view');
    if (saved === 'ANALYTICS') return 'ANALYTICS';
    if (saved === 'TRIAL_VERIFICATION') return 'TRIAL_VERIFICATION';
    return 'LEDGER';
  });
  const [appliedSuccessToast, setAppliedSuccessToast] = useState(false);
  const [dismissedCrossCheckBanner, setDismissedCrossCheckBanner] = useState(() => {
    return localStorage.getItem('sfc_cross_check_dismissed') === 'true';
  });

  const handleSetCurrentView = (view: AppView) => {
    setCurrentView(view);
    localStorage.setItem('sfc_current_view', view);
  };

  // Theme State (Light / Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sfc_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sfc_theme', theme);
  }, [theme]);

  // Date Simulation (Default: Today in Asia/Kolkata)
  const [asOfDate, setAsOfDate] = useState<string>(
    () => getKolkataToday()
  );

  // Filter State
  const [filters, setFilters] = useState<StudentFilterState>({
    searchQuery: '',
    selectedClass: 'ALL',
    selectedStatus: 'ALL',
    selectedCategory: 'ALL',
    sortBy: 'status',
    sortOrder: 'asc',
  });

  // Backend Sync State
  const [scriptUrl, setScriptUrl] = useState<string>(() => getGoogleScriptUrl());
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => getSpreadsheetUrl());
  const [isSheetsConnected, setIsSheetsConnected] = useState<boolean>(() => !!getGoogleScriptUrl());
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined);

  // -------------------------------------------------------------
  // 2. Modals Active State
  // -------------------------------------------------------------
  const [activeModal, setActiveModal] = useState<
    | 'NONE'
    | 'PAYMENT'
    | 'RECEIPT'
    | 'PERMISSION'
    | 'LEDGER'
    | 'FEE_STRUCTURE'
    | 'ADD_STUDENT'
    | 'CLASS_MASTER'
    | 'SHEETS_SYNC'
    | 'SCHOOL_SETTINGS'
    | 'HELP'
    | 'BULK_UPLOAD'
    | 'TODAYS_RECEIPTS'
  >('NONE');

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [collectInitialFeeType, setCollectInitialFeeType] = useState<'ALL' | 'BOOKS' | 'DRESS'>('ALL');
  const [activeReceiptTransaction, setActiveReceiptTransaction] = useState<PaymentTransaction | null>(null);

  // -------------------------------------------------------------
  // 3. LocalStorage Persistence Sync
  // -------------------------------------------------------------
  useEffect(() => {
    saveStudents(students);
  }, [students]);

  useEffect(() => {
    saveStructures(structures);
  }, [structures]);

  useEffect(() => {
    saveInstallments(installments);
  }, [installments]);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveClassConfigs(classConfigs);
  }, [classConfigs]);

  useEffect(() => {
    saveToleranceConfig(tolerance);
  }, [tolerance]);

  useEffect(() => {
    saveSchoolProfile(schoolProfile);
  }, [schoolProfile]);

  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(true);

  // Firebase Firestore real-time sync across logins & devices
  useEffect(() => {
    const docRef = doc(db, COLLECTION_ID, DOC_ID);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.students && Array.isArray(data.students)) {
          setStudents(data.students);
        }
        if (data.structures && Array.isArray(data.structures)) {
          setStructures(data.structures);
        }
        if (data.installments && Array.isArray(data.installments)) {
          setInstallments(data.installments);
        }
        if (data.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
        if (data.classConfigs && Array.isArray(data.classConfigs)) {
          setClassConfigs(data.classConfigs);
        }
        if (data.feeHeads && Array.isArray(data.feeHeads)) {
          setFeeHeads(data.feeHeads);
        }
        if (data.tolerance) {
          setTolerance(data.tolerance);
        }
        if (data.schoolProfile) {
          setSchoolProfile(data.schoolProfile);
        }
        if (typeof data.dailyTarget === 'number') {
          setDailyTarget(data.dailyTarget);
        }
        if (data.dayCloseRecords) {
          setDayCloseRecords(data.dayCloseRecords);
        }
      } else {
        setDoc(docRef, {
          students,
          structures,
          installments,
          transactions,
          classConfigs,
          feeHeads,
          tolerance,
          schoolProfile,
          dailyTarget,
          dayCloseRecords,
          nextReceiptSequence: schoolProfile.nextReceiptSequence || 1,
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.error('Firestore init error:', err));
      }
      setIsLoadingCloud(false);
    }, (err) => {
      console.error('Firestore snapshot error:', err);
      setIsLoadingCloud(false);
    });
    return () => unsubscribe();
  }, []);

  // Safe schoolProfile guaranteeing all fields
  const safeSchoolProfile: SchoolProfile = useMemo(() => {
    return {
      ...DEFAULT_SCHOOL_PROFILE,
      ...(schoolProfile || {}),
      currencySymbol: schoolProfile?.currencySymbol || DEFAULT_SCHOOL_PROFILE.currencySymbol || '₹',
      enabledReceiptFields: {
        ...DEFAULT_SCHOOL_PROFILE.enabledReceiptFields,
        ...(schoolProfile?.enabledReceiptFields || {}),
      },
      mandatoryStudentFields: {
        ...DEFAULT_SCHOOL_PROFILE.mandatoryStudentFields,
        ...(schoolProfile?.mandatoryStudentFields || {}),
      },
    };
  }, [schoolProfile]);

  // Distinct Classes List (Ordered Nursery -> LKG -> UKG -> Class 1..10)
  const classList = useMemo(() => {
    const classSet = new Set<string>(STANDARD_CLASS_ORDER);
    classConfigs.forEach((c) => classSet.add(c.className));
    students.forEach((s) => {
      if (s.className) classSet.add(s.className);
    });
    return sortClassList(Array.from(classSet));
  }, [classConfigs, students]);

  // -------------------------------------------------------------
  // 4. Financial Calculations & Summary Computations
  // -------------------------------------------------------------
  const studentSummaries = useMemo<Record<string, StudentFinancialSummary>>(() => {
    const map: Record<string, StudentFinancialSummary> = {};
    students.forEach((student) => {
      map[student.id] = computeStudentFinancialSummary(
        student,
        structures,
        installments,
        transactions,
        tolerance,
        asOfDate
      );
    });
    return map;
  }, [students, structures, installments, transactions, tolerance, asOfDate]);

  // Overall Financial Analytics
  const analytics = useMemo(() => {
    return computeSystemAnalytics(
      students,
      structures,
      installments,
      transactions,
      tolerance,
      asOfDate
    );
  }, [students, structures, installments, transactions, tolerance, asOfDate]);

  // Filtered summaries list based on active dashboard/class filters
  const filteredStudentSummaries = useMemo(() => {
    const list: StudentFinancialSummary[] = Object.values(studentSummaries);
    return list.filter((summary: StudentFinancialSummary) => {
      // 1. Class filter
      if (filters.selectedClass !== 'ALL' && summary.student.className !== filters.selectedClass) {
        return false;
      }
      // 2. Status category filter (5 colors / inactive)
      if (filters.selectedStatus === 'INACTIVE') {
        if (summary.student.isActive) return false;
      } else if (filters.selectedStatus !== 'ALL') {
        if (!summary.student.isActive) return false;
        if (summary.statusCategory !== filters.selectedStatus) return false;
      }
      // 3. Action tier filter
      if (filters.selectedCategory !== 'ALL') {
        if (summary.actionTier !== filters.selectedCategory) return false;
      }
      return true;
    });
  }, [studentSummaries, filters.selectedClass, filters.selectedStatus, filters.selectedCategory]);

  // Selected student entity and summary
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedSummary = useMemo(() => {
    return selectedStudentId ? studentSummaries[selectedStudentId] : undefined;
  }, [studentSummaries, selectedStudentId]);

  // -------------------------------------------------------------
  // 5. Payment Collection Handler (Firestore Transactional Safety)
  // -------------------------------------------------------------
  const handleSavePayment = async (
    transactionData: PaymentTransaction,
    allocations: PaymentAllocation[],
    partialStatusUpdate?: {
      manualCategoryOverride: 'auto' | 'id_card' | 'permission' | 'action';
      permissionExpiresAt?: string;
      permissionReason?: string;
    }
  ) => {
    try {
      const docRef = doc(db, COLLECTION_ID, DOC_ID);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        let cloudStudents = snap.exists() ? snap.data().students || students : students;
        let cloudTransactions = snap.exists() ? snap.data().transactions || transactions : transactions;
        let cloudInstallments = snap.exists() ? snap.data().installments || installments : installments;
        let cloudSchoolProfile = snap.exists() ? snap.data().schoolProfile || schoolProfile : schoolProfile;
        let cloudStructures = snap.exists() ? snap.data().structures || structures : structures;
        let cloudClassConfigs = snap.exists() ? snap.data().classConfigs || classConfigs : classConfigs;
        let cloudFeeHeads = snap.exists() ? snap.data().feeHeads || feeHeads : feeHeads;
        let cloudTolerance = snap.exists() ? snap.data().tolerance || tolerance : tolerance;
        let cloudDailyTarget = snap.exists() ? snap.data().dailyTarget || dailyTarget : dailyTarget;
        let cloudDayCloseRecords = snap.exists() ? snap.data().dayCloseRecords || dayCloseRecords : dayCloseRecords;

        const currentYear = new Date().getFullYear();
        const seq = cloudSchoolProfile.nextReceiptSequence || 1;
        const sequenceStr = String(seq).padStart(5, '0');
        const finalReceiptNo = `${cloudSchoolProfile.receiptPrefix || 'KSB'}-${currentYear}-${sequenceStr}`;

        if (cloudTransactions.some((t: PaymentTransaction) => t.receiptNo === finalReceiptNo)) {
          throw new Error(`Receipt number ${finalReceiptNo} already exists. Please retry.`);
        }

        for (const alloc of allocations) {
          if (alloc.allocatedAmount < 0) throw new Error('Allocation amount cannot be negative.');
          const targetInst = cloudInstallments.find((i: Installment) => i.id === alloc.installmentId);
          if (!targetInst) {
            throw new Error(`Referenced installment ID ${alloc.installmentId} no longer exists. Please refresh and correct fee structure.`);
          }
          if (alloc.allocatedAmount > targetInst.balanceAmount + 0.01) {
            throw new Error(`Allocation for ${targetInst.headName} exceeds its current balance.`);
          }
        }

        const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
        if (Math.abs(totalAllocated - transactionData.amount) > 0.01) {
          throw new Error('Allocation total must exactly equal payment amount.');
        }

        const finalTransaction = {
          ...transactionData,
          receiptNo: finalReceiptNo,
        };

        if (partialStatusUpdate && selectedStudentId) {
          cloudStudents = cloudStudents.map((s: Student) => {
            if (s.id === selectedStudentId) {
              return {
                ...s,
                manualCategoryOverride: partialStatusUpdate.manualCategoryOverride,
                permissionExpiresAt: partialStatusUpdate.permissionExpiresAt,
                permissionReason: partialStatusUpdate.permissionReason,
                updatedAt: new Date().toISOString(),
              };
            }
            return s;
          });
        }

        const updatedCloudInstallments = cloudInstallments.map((inst: Installment) => {
          const matched = allocations.find((a) => a.installmentId === inst.id);
          if (!matched) return inst;

          const newPaid = inst.paidAmount + matched.allocatedAmount;
          const newBal = Math.max(0, inst.amount - newPaid);
          const newStatus = newBal === 0 ? ('paid' as const) : ('partial' as const);

          return {
            ...inst,
            paidAmount: newPaid,
            balanceAmount: newBal,
            status: newStatus,
            lastPaymentDate: asOfDate,
          };
        });

        const updatedCloudTransactions = [finalTransaction, ...cloudTransactions];
        const updatedSchoolProfile = {
          ...cloudSchoolProfile,
          nextReceiptSequence: seq + 1,
        };

        transaction.set(docRef, {
          students: cloudStudents,
          structures: cloudStructures,
          installments: updatedCloudInstallments,
          transactions: updatedCloudTransactions,
          classConfigs: cloudClassConfigs,
          feeHeads: cloudFeeHeads,
          tolerance: cloudTolerance,
          schoolProfile: updatedSchoolProfile,
          dailyTarget: cloudDailyTarget,
          dayCloseRecords: cloudDayCloseRecords,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        setStudents(cloudStudents);
        setInstallments(updatedCloudInstallments);
        setTransactions(updatedCloudTransactions);
        setSchoolProfile(updatedSchoolProfile);

        setActiveReceiptTransaction(finalTransaction);
        setActiveModal('RECEIPT');
      });
    } catch (err: any) {
      alert(`Payment Save Failed: ${err.message || err}`);
    }
  };

  // -------------------------------------------------------------
  // 6. Void / Cancel Receipt Handler (Firestore Transactional Safety)
  // -------------------------------------------------------------
  const handleCancelReceipt = async (transactionId: string, cancelReason: string) => {
    try {
      const docRef = doc(db, COLLECTION_ID, DOC_ID);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const cloudTransactions = data.transactions || transactions;
        const cloudInstallments = data.installments || installments;

        const txn = cloudTransactions.find((t: PaymentTransaction) => t.id === transactionId);
        if (!txn || txn.isCancelled) return;

        const updatedCloudInstallments = cloudInstallments.map((inst: Installment) => {
          const matched = txn.allocations.find((a: PaymentAllocation) => a.installmentId === inst.id);
          if (!matched) return inst;

          const newPaid = Math.max(0, inst.paidAmount - matched.allocatedAmount);
          const newBal = inst.amount - newPaid;
          const newStatus = newPaid === 0 ? ('unpaid' as const) : ('partial' as const);

          return {
            ...inst,
            paidAmount: newPaid,
            balanceAmount: newBal,
            status: newStatus,
          };
        });

        const updatedCloudTransactions = cloudTransactions.map((t: PaymentTransaction) => {
          if (t.id === transactionId) {
            return {
              ...t,
              isCancelled: true,
              cancelledAt: new Date().toISOString(),
              cancellationReason: cancelReason,
            };
          }
          return t;
        });

        transaction.set(docRef, {
          ...data,
          installments: updatedCloudInstallments,
          transactions: updatedCloudTransactions,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        setInstallments(updatedCloudInstallments);
        setTransactions(updatedCloudTransactions);
      });
    } catch (err: any) {
      alert(`Cancellation Failed: ${err.message || err}`);
    }
  };

  // -------------------------------------------------------------
  // 7. Grace Permission Handler
  // -------------------------------------------------------------
  const handleSavePermission = (
    studentId: string,
    permissionExpiresAt: string | undefined,
    permissionReason: string | undefined,
    manualCategoryOverride: 'auto' | 'id_card' | 'permission' | 'action'
  ) => {
    const updated = students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          permissionExpiresAt,
          permissionReason,
          manualCategoryOverride,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    setStudents(updated);
  };

  // -------------------------------------------------------------
  // 8. Fee Structure & Spot Fees Handler
  // -------------------------------------------------------------
  const handleSaveFeeStructures = (
    studentId: string,
    newStructures: StudentFeeStructure[],
    isActive: boolean,
    studentNotes?: string,
    updatedStudent?: Student
  ) => {
    const updatedStudents = students.map((s) => {
      if (s.id === studentId) {
        if (updatedStudent) return { ...updatedStudent, updatedAt: new Date().toISOString() };
        return {
          ...s,
          isActive,
          notes: studentNotes,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    const otherStructures = structures.filter((s) => s.studentId !== studentId);
    const updatedStructures = [...otherStructures, ...newStructures];

    const existingStudentInstallments = installments.filter((i) => i.studentId === studentId);
    const otherInstallments = installments.filter((i) => i.studentId !== studentId);
    const newInstallmentsList: Installment[] = [];

    newStructures.forEach((struct) => {
      const generated = generateInstallments(
        struct.id,
        studentId,
        struct.headName,
        struct.committedFee,
        struct.installmentsCount
      );
      generated.forEach((genInst) => {
        const existingPaidMatch = existingStudentInstallments.find(
          (ei) => ei.headName === genInst.headName && ei.installmentNumber === genInst.installmentNumber
        );
        if (existingPaidMatch && existingPaidMatch.paidAmount > 0) {
          const reconciledPaid = existingPaidMatch.paidAmount;
          const reconciledBal = Math.max(0, genInst.amount - reconciledPaid);
          const reconciledStatus = reconciledBal === 0 ? ('paid' as const) : ('partial' as const);
          newInstallmentsList.push({
            ...genInst,
            id: existingPaidMatch.id,
            paidAmount: reconciledPaid,
            balanceAmount: reconciledBal,
            status: reconciledStatus,
          });
        } else {
          newInstallmentsList.push(genInst);
        }
      });
    });

    setStudents(updatedStudents);
    setStructures(updatedStructures);
    setInstallments([...otherInstallments, ...newInstallmentsList]);

    const docRef = doc(db, COLLECTION_ID, DOC_ID);
    setDoc(docRef, {
      students: updatedStudents,
      structures: updatedStructures,
      installments: [...otherInstallments, ...newInstallmentsList],
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((err) => console.error('Firestore fee structure write error:', err));
  };

  // -------------------------------------------------------------
  // 9. Single & Bulk Student Add Handlers
  // -------------------------------------------------------------
  const handleAddSingleStudent = (
    newStudent: Student,
    feeStructure?: StudentFeeStructure
  ) => {
    setStudents([newStudent, ...students]);

    if (feeStructure) {
      setStructures([...structures, feeStructure]);
      const newInsts = generateInstallments(
        feeStructure.id,
        newStudent.id,
        feeStructure.headName,
        feeStructure.committedFee,
        feeStructure.installmentsCount
      );
      setInstallments([...installments, ...newInsts]);
    }
  };

  const handleAddBulkStudents = (
    newStudents: Student[],
    autoCommitClassFee: boolean,
    targetClassName: string
  ) => {
    const classCfg = classConfigs.find(
      (c) => c.className.toLowerCase() === targetClassName.toLowerCase()
    );

    const newStructs: StudentFeeStructure[] = [];
    const newInsts: Installment[] = [];

    if (autoCommitClassFee && classCfg) {
      newStudents.forEach((st) => {
        const struct: StudentFeeStructure = {
          id: `fs_bulk_${Date.now()}_${st.id}`,
          studentId: st.id,
          headName: 'School Tuition Fee',
          actualFee: classCfg.actualFee,
          committedFee: classCfg.actualFee,
          concession: 0,
          commitmentDate: asOfDate,
          installmentsCount: classCfg.defaultInstallments,
          isSpotFee: false,
        };
        newStructs.push(struct);

        const instList = generateInstallments(
          struct.id,
          st.id,
          struct.headName,
          struct.committedFee,
          struct.installmentsCount,
          undefined,
          classCfg.defaultDueDayOfMonth
        );
        newInsts.push(...instList);
      });
    }

    setStudents([...newStudents, ...students]);
    if (newStructs.length > 0) {
      setStructures([...structures, ...newStructs]);
      setInstallments([...installments, ...newInsts]);
    }
  };

  // -------------------------------------------------------------
  // 10. Google Sheets Push / Pull Sync
  // -------------------------------------------------------------
  const handlePushToSheets = async (): Promise<boolean> => {
    const success = await pushToGoogleSheets(
      scriptUrl,
      students,
      structures,
      installments,
      transactions,
      classConfigs,
      tolerance,
      safeSchoolProfile
    );
    if (success) {
      setIsSheetsConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString());
    }
    return success;
  };

  const handlePullFromSheets = async (): Promise<boolean> => {
    const data = await pullFromGoogleSheets(scriptUrl);
    if (!data) return false;

    if (data.students) setStudents(data.students);
    if (data.structures) setStructures(data.structures);
    if (data.installments) setInstallments(data.installments);
    if (data.transactions) setTransactions(data.transactions);
    if (data.classConfigs) setClassConfigs(data.classConfigs);
    if (data.tolerance && typeof data.tolerance === 'object') {
      setTolerance((prev) => ({ ...DEFAULT_TOLERANCE, ...prev, ...data.tolerance }));
    }
    if (data.schoolProfile && typeof data.schoolProfile === 'object') {
      setSchoolProfile((prev) => ({ ...DEFAULT_SCHOOL_PROFILE, ...prev, ...data.schoolProfile }));
    }

    setIsSheetsConnected(true);
    setLastSyncTime(new Date().toLocaleTimeString());
    return true;
  };

  // Backup handlers
  const handleExportBackup = () => {
    exportDataAsJson({
      students,
      structures,
      installments,
      transactions,
      classConfigs,
      feeHeads,
      tolerance,
      schoolProfile: safeSchoolProfile,
    });
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const restored = await restoreDataFromJson(file);
    if (restored) {
      if (restored.students) setStudents(restored.students);
      if (restored.structures) setStructures(restored.structures);
      if (restored.installments) setInstallments(restored.installments);
      if (restored.transactions) setTransactions(restored.transactions);
      if (restored.classConfigs) setClassConfigs(restored.classConfigs);
      if (restored.tolerance) setTolerance(restored.tolerance);
      if (restored.schoolProfile) setSchoolProfile(restored.schoolProfile);
      alert('Data backup successfully restored!');
    }
  };

  const handleResetDemoData = () => {
    if (
      confirm(
        'Are you sure you want to reset all data to the initial factory seed? All modifications will be replaced with clean demo records.'
      )
    ) {
      clearAllLocalData();
      window.location.reload();
    }
  };

  const handleBulkImportStudents = (
    newStudents: Student[],
    newStructures: StudentFeeStructure[],
    newInstallments: Installment[]
  ) => {
    setStudents((prev) => [...prev, ...newStudents]);
    setStructures((prev) => [...prev, ...newStructures]);
    setInstallments((prev) => [...prev, ...newInstallments]);
  };

  const handleApplyRealSpreadsheetData = () => {
    const realData = generateStructuredRealData();
    setStudents(realData.students);
    setStructures(realData.feeStructures);
    setInstallments(realData.installments);
    setTransactions(realData.payments);
    saveStudents(realData.students);
    saveStructures(realData.feeStructures);
    saveInstallments(realData.installments);
    saveTransactions(realData.payments);
    setAppliedSuccessToast(true);
    setDismissedCrossCheckBanner(true);
    localStorage.setItem('sfc_cross_check_dismissed', 'true');
    handleSetCurrentView('LEDGER');
    setTimeout(() => setAppliedSuccessToast(false), 8000);
  };

  const handleDismissCrossCheckBanner = () => {
    setDismissedCrossCheckBanner(true);
    localStorage.setItem('sfc_cross_check_dismissed', 'true');
  };

  const todaysStats = useMemo(() => {
    const dayTxns = transactions.filter((tx) => !tx.isCancelled && tx.date.split(' ')[0] === asOfDate);
    let total = 0;
    let pendingSlips = 0;
    dayTxns.forEach((tx) => {
      total += tx.amount || 0;
      const summary = studentSummaries[tx.studentId];
      if (summary && summary.totalDue > 0 && !tx.permissionUpdated) {
        pendingSlips++;
      }
    });
    return {
      count: dayTxns.length,
      total,
      pendingSlips,
    };
  }, [transactions, asOfDate, studentSummaries]);

  const handleUpdateDailyTarget = (target: number) => {
    setDailyTarget(target);
    saveDailyCollectionTarget(target);
  };

  const handleCloseDay = (record: DayCloseRecord) => {
    const updated = { ...dayCloseRecords, [record.date]: record };
    setDayCloseRecords(updated);
    saveDayCloseRecords(updated);
  };

  const handleReopenDay = (date: string) => {
    const updated = { ...dayCloseRecords };
    delete updated[date];
    setDayCloseRecords(updated);
    saveDayCloseRecords(updated);
  };

  const handleUpdateTransactionSlip = (
    txId: string,
    slipGiven: boolean,
    permissionDate?: string
  ) => {
    let updatedStudentId: string | null = null;
    const updatedTransactions = transactions.map((tx) => {
      if (tx.id === txId) {
        updatedStudentId = tx.studentId;
        return {
          ...tx,
          slipGiven,
          permissionDate,
          permissionUpdated: true,
        };
      }
      return tx;
    });

    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);

    if (updatedStudentId && permissionDate) {
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === updatedStudentId) {
            return {
              ...s,
              manualCategoryOverride: slipGiven ? 'permission' : s.manualCategoryOverride,
              permissionExpiresAt: permissionDate,
              permissionReason: slipGiven
                ? `Permission slip issued till ${formatDate(permissionDate)}`
                : s.permissionReason,
              updatedAt: new Date().toISOString(),
            };
          }
          return s;
        })
      );
    }
  };

  if (isLoadingCloud) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold">Loading latest data...</h2>
        <p className="text-sm text-slate-400 mt-1">Synchronizing cloud ledger across devices</p>
      </div>
    );
  }

  return (
    <PasscodeGate
      schoolProfile={safeSchoolProfile}
      requiredPasscode="2025"
      title="Kakatiya School Administration"
      subtitle="Protected Area • Enter 4-digit PIN to access software"
    >
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
        {/* 1. Global Navigation Bar */}
      <Navbar
        schoolProfile={safeSchoolProfile}
        tolerance={tolerance}
        onUpdateTolerance={(newTol) => setTolerance(newTol)}
        currentDate={asOfDate}
        onChangeDate={(newDate) => setAsOfDate(newDate)}
        onResetDate={() => setAsOfDate(getKolkataToday())}
        isSheetsConnected={isSheetsConnected}
        onOpenSheetsSync={() => setActiveModal('SHEETS_SYNC')}
        onOpenSettings={() => setActiveModal('SCHOOL_SETTINGS')}
        onOpenAddStudent={() => setActiveModal('ADD_STUDENT')}
        onOpenClassMaster={() => setActiveModal('CLASS_MASTER')}
        onOpenHelp={() => setActiveModal('HELP')}
        onOpenBulkUpload={() => setActiveModal('BULK_UPLOAD')}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetDemo={handleResetDemoData}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        activeView={currentView}
        onToggleView={(v) => handleSetCurrentView(v)}
        onOpenTodaysReceipts={() => setActiveModal('TODAYS_RECEIPTS')}
        todaysStats={todaysStats}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Success Toast Banner */}
        {appliedSuccessToast && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <span>
                Version 2.0 September master data successfully activated! (229 Students • ₹64,48,344 Committed • ₹21,98,847 Collections Realized).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAppliedSuccessToast(false)}
              className="text-xs bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1 rounded-lg font-bold"
            >
              Dismiss
            </button>
          </div>
        )}



        {/* View Switch: Cross-Check Room, Dedicated Financial Analytics Page, or Master Student Ledger */}
        {currentView === 'TRIAL_VERIFICATION' ? (
          <TrialVerificationView
            schoolProfile={safeSchoolProfile}
            onApplyRealData={handleApplyRealSpreadsheetData}
            onBackToApp={() => handleSetCurrentView('LEDGER')}
          />
        ) : currentView === 'ANALYTICS' ? (
          <PasscodeGate
            schoolProfile={safeSchoolProfile}
            requiredPasscode="2027"
            title="Financial Analytics & Fee Health"
            subtitle="Executive Fee Health & Analytics • Enter 4-digit PIN to access"
            onBackToLedger={() => handleSetCurrentView('LEDGER')}
          >
            <FinancialDashboard
              analytics={analytics}
              schoolProfile={safeSchoolProfile}
              tolerance={tolerance}
              selectedStatusFilter={filters.selectedStatus}
              onSelectStatusFilter={(status) => setFilters((prev) => ({ ...prev, selectedStatus: status }))}
              selectedActionFilter={filters.selectedCategory}
              onSelectActionFilter={(cat) => setFilters((prev) => ({ ...prev, selectedCategory: cat }))}
              selectedClassFilter={filters.selectedClass}
              onSelectClassFilter={(cls) => setFilters((prev) => ({ ...prev, selectedClass: cls }))}
              classList={classList}
              onNavigateToLedger={() => handleSetCurrentView('LEDGER')}
            />
          </PasscodeGate>
        ) : (
          <div className="space-y-4">
            {/* Master Student Ledger Table */}
            <MasterStudentTable
              summaries={filteredStudentSummaries}
              schoolProfile={safeSchoolProfile}
              classList={classList}
              tolerance={tolerance}
              onEditStudent={(updatedStudent) => {
                setStudents((prev) =>
                  prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
                );
                saveStudents(
                  students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
                );
              }}
              onOpenCollectModal={(student, initialFeeType = 'ALL') => {
                setSelectedStudentId(student.id);
                setCollectInitialFeeType(initialFeeType);
                setActiveModal('PAYMENT');
              }}
              onOpenPermissionModal={(student) => {
                setSelectedStudentId(student.id);
                setActiveModal('PERMISSION');
              }}
              onOpenLedgerModal={(student) => {
                setSelectedStudentId(student.id);
                setActiveModal('LEDGER');
              }}
              onOpenReceiptModal={(txn) => {
                setActiveReceiptTransaction(txn);
                setActiveModal('RECEIPT');
              }}
              onOpenFeeStructureModal={(student) => {
                setSelectedStudentId(student.id);
                setActiveModal('FEE_STRUCTURE');
              }}
              onToggleStudentActive={(studentId, currentActive) => {
                setStudents((prev) =>
                  prev.map((s) => (s.id === studentId ? { ...s, isActive: !currentActive } : s))
                );
              }}
              onUpdateActionStatus={handleSavePermission}
              onOpenAddStudent={() => setActiveModal('ADD_STUDENT')}
              onOpenBulkUpload={() => setActiveModal('BULK_UPLOAD')}
            />
          </div>
        )}
      </main>

      {/* 4. Interactive Modals */}
      {activeModal === 'PAYMENT' && selectedStudent && selectedSummary && (
        <PaymentModal
          student={selectedStudent}
          summary={selectedSummary}
          schoolProfile={safeSchoolProfile}
          initialFeeType={collectInitialFeeType}
          currentDate={asOfDate}
          onClose={() => setActiveModal('NONE')}
          onSavePayment={handleSavePayment}
        />
      )}

      {activeModal === 'RECEIPT' && activeReceiptTransaction && (
        <DualA5ReceiptModal
          transaction={activeReceiptTransaction}
          student={students.find((s) => s.id === activeReceiptTransaction.studentId)}
          schoolProfile={safeSchoolProfile}
          remainingDueBalance={
            studentSummaries[activeReceiptTransaction.studentId]?.totalDue || 0
          }
          totalBalance={
            studentSummaries[activeReceiptTransaction.studentId]?.totalDue || 0
          }
          nextDueDate={studentSummaries[activeReceiptTransaction.studentId]?.nextDueDate}
          nextInstallmentDueDate={studentSummaries[activeReceiptTransaction.studentId]?.nextDueDate}
          nextInstallmentBalance={
            studentSummaries[activeReceiptTransaction.studentId]?.nextInstallmentBalance || 0
          }
          onClose={() => {
            setActiveModal('NONE');
            setActiveReceiptTransaction(null);
          }}
        />
      )}

      {activeModal === 'PERMISSION' && selectedStudent && (
        <PermissionModal
          student={selectedStudent}
          onClose={() => setActiveModal('NONE')}
          onSavePermission={handleSavePermission}
        />
      )}

      {activeModal === 'LEDGER' && selectedStudent && selectedSummary && (
        <StudentLedgerModal
          student={selectedStudent}
          summary={selectedSummary}
          schoolProfile={safeSchoolProfile}
          onClose={() => setActiveModal('NONE')}
          onPrintReceipt={(txn) => {
            setActiveReceiptTransaction(txn);
            setActiveModal('RECEIPT');
          }}
          onCancelReceipt={handleCancelReceipt}
        />
      )}

      {activeModal === 'FEE_STRUCTURE' && selectedStudent && selectedSummary && (
        <FeeStructureModal
          student={selectedStudent}
          summary={selectedSummary}
          classConfigs={classConfigs}
          feeHeads={feeHeads}
          schoolProfile={safeSchoolProfile}
          onClose={() => setActiveModal('NONE')}
          onSaveStructures={handleSaveFeeStructures}
        />
      )}

      {activeModal === 'ADD_STUDENT' && (
        <AddStudentModal
          classList={classList}
          classConfigs={classConfigs}
          schoolProfile={safeSchoolProfile}
          onClose={() => setActiveModal('NONE')}
          onAddSingleStudent={handleAddSingleStudent}
          onAddBulkStudents={handleAddBulkStudents}
        />
      )}

      {activeModal === 'BULK_UPLOAD' && (
        <BulkUploadModal
          existingStudents={students}
          schoolProfile={safeSchoolProfile}
          onClose={() => setActiveModal('NONE')}
          onImportStudents={handleBulkImportStudents}
        />
      )}

      {activeModal === 'HELP' && (
        <HelpModal
          currencySymbol={safeSchoolProfile.currencySymbol}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'CLASS_MASTER' && (
        <ClassFeeMasterModal
          classConfigs={classConfigs}
          schoolProfile={safeSchoolProfile}
          onClose={() => setActiveModal('NONE')}
          onSaveClassConfigs={(newConfigs) => setClassConfigs(newConfigs)}
        />
      )}

      {activeModal === 'SHEETS_SYNC' && (
        <GoogleSheetsSyncModal
          scriptUrl={scriptUrl}
          spreadsheetUrl={spreadsheetUrl}
          isConnected={isSheetsConnected}
          lastSyncTime={lastSyncTime}
          onSaveScriptUrl={(url) => {
            setScriptUrl(url);
            saveGoogleScriptUrl(url);
            setIsSheetsConnected(!!url);
          }}
          onSaveSpreadsheetUrl={(url) => {
            setSpreadsheetUrl(url);
            saveSpreadsheetUrl(url);
          }}
          onPushSync={handlePushToSheets}
          onPullSync={handlePullFromSheets}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetDemo={handleResetDemoData}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'SCHOOL_SETTINGS' && (
        <SchoolSettingsModal
          schoolProfile={safeSchoolProfile}
          tolerance={tolerance}
          onSave={(newProfile, newTol) => {
            setSchoolProfile(newProfile);
            setTolerance(newTol);
            saveSchoolProfile(newProfile);
            saveToleranceConfig(newTol);
          }}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'TODAYS_RECEIPTS' && (
        <TodaysReceiptsModal
          currentDate={asOfDate}
          onChangeDate={setAsOfDate}
          transactions={transactions}
          students={students}
          studentSummaries={studentSummaries}
          schoolProfile={safeSchoolProfile}
          dailyTarget={dailyTarget}
          onUpdateDailyTarget={handleUpdateDailyTarget}
          dayCloseRecords={dayCloseRecords}
          onCloseDay={handleCloseDay}
          onReopenDay={handleReopenDay}
          onUpdateTransactionSlip={handleUpdateTransactionSlip}
          onOpenReceiptModal={(tx) => {
            setActiveReceiptTransaction(tx);
            setActiveModal('RECEIPT');
          }}
          onClose={() => setActiveModal('NONE')}
        />
      )}
      </div>
    </PasscodeGate>
  );
}
