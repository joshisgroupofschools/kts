import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
import { DEFAULT_SCRIPT_WEBAPP_URL, TARGET_GOOGLE_SHEET_URL } from './utils/googleSheetsScript';
import { getKolkataToday } from './utils/dateUtils';
import {
  normalizeClassConfigs,
  normalizeFeeHeads,
  normalizeInstallments,
  normalizeStructures,
  normalizeStudents,
  normalizeTransactions,
} from './utils/normalizeCloudData';
import { sortClassList, STANDARD_CLASS_ORDER } from './utils/classOrder';
import { formatCurrency, formatDate } from './utils/numberToWords';
import {
  DEFAULT_SCHOOL_PROFILE,
  DEFAULT_TOLERANCE,
  clearAllLocalData,
  exportDataAsJson,
  getDailyCollectionTarget,
  getDayCloseRecords,
  getStoredClassConfigs,
  getStoredFeeHeads,
  getStoredInstallments,
  getStoredSchoolProfile,
  getStoredStudents,
  getStoredStructures,
  getStoredToleranceConfig,
  getStoredTransactions,
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
import {
  addStudentRepo,
  bulkAddStudentsRepo,
  cancelPaymentRepo,
  closeDayRepo,
  getBootstrapDataRepo,
  getChangesRepo,
  importChunkRepo,
  recordPaymentRepo,
  reopenDayRepo,
  saveClassConfigRepo,
  updateStudentRepo,
  saveFeeStructureRepo,
  saveSettingsRepo,
  savePermissionRepo,
  setStudentActiveRepo,
  updateTransactionSlipRepo,
  callAppsScriptAction,
} from './services/googleSheetsRepository';
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
import { BackupMigrateSheetsModal } from './components/BackupMigrateSheetsModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { HelpModal } from './components/HelpModal';
import { BulkUploadModal } from './components/BulkUploadModal';
import { TrialVerificationView } from './components/TrialVerificationView';
import { TodaysReceiptsModal } from './components/TodaysReceiptsModal';
import { PasscodeGate } from './components/PasscodeGate';
import { FlaggedReceiptsView, getDuplicateReceiptGroups } from './components/FlaggedReceiptsView';
import { generateStructuredRealData } from './data/trialSpreadsheetData';
import { ArrowRight, CheckCircle2, Coins, FileSpreadsheet, Sparkles, Users } from 'lucide-react';

export default function App() {
  // -------------------------------------------------------------
  // 1. Core State
  // -------------------------------------------------------------
  const [students, setStudents] = useState<Student[]>(() => normalizeStudents(getStoredStudents()));
  const [structures, setStructures] = useState<StudentFeeStructure[]>(() => normalizeStructures(getStoredStructures()));
  const [installments, setInstallments] = useState<Installment[]>(() => normalizeInstallments(getStoredInstallments()));
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => normalizeTransactions(getStoredTransactions()));
  const [classConfigs, setClassConfigs] = useState<ClassFeeConfig[]>(() => normalizeClassConfigs(getStoredClassConfigs()));
  const [feeHeads, setFeeHeads] = useState<FeeHeadDefinition[]>(() => normalizeFeeHeads(getStoredFeeHeads()));
  const [tolerance, setTolerance] = useState<ToleranceConfig>(() => getStoredToleranceConfig());
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => getStoredSchoolProfile());
  const [dailyTarget, setDailyTarget] = useState<number>(() => getDailyCollectionTarget());
  const [dayCloseRecords, setDayCloseRecords] = useState<Record<string, DayCloseRecord>>(() => getDayCloseRecords());

  // View state: LEDGER, ANALYTICS, or TRIAL_VERIFICATION
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = localStorage.getItem('sfc_current_view');
    if (saved === 'ANALYTICS') return 'ANALYTICS';
    if (saved === 'FLAGGED_RECEIPTS') return 'FLAGGED_RECEIPTS';
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
  const [scriptUrl, setScriptUrl] = useState<string>(DEFAULT_SCRIPT_WEBAPP_URL);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(TARGET_GOOGLE_SHEET_URL);
  const [isSheetsConnected, setIsSheetsConnected] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInFlight = useRef(false);
  const revisionRef = useRef<number | undefined>(undefined);

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
    | 'BACKUP_MIGRATE'
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

  const [isOnline, setIsOnline] = useState<boolean>(false);

  const applyBootstrapData = useCallback((data: any) => {
    if (!data || !Array.isArray(data.students) || !Array.isArray(data.installments) || !Array.isArray(data.transactions)) {
      throw new Error('The Google Sheets backend returned an incomplete data snapshot.');
    }
    setStudents(normalizeStudents(data.students));
    setStructures(normalizeStructures(data.structures));
    setInstallments(normalizeInstallments(data.installments));
    setTransactions(normalizeTransactions(data.transactions));
    if (Array.isArray(data.classConfigs) && data.classConfigs.length) setClassConfigs(normalizeClassConfigs(data.classConfigs));
    if (Array.isArray(data.feeHeads) && data.feeHeads.length) setFeeHeads(normalizeFeeHeads(data.feeHeads));
    if (data.schoolProfile) setSchoolProfile((prev) => ({ ...prev, ...data.schoolProfile }));
    if (data.tolerance) setTolerance((prev) => ({ ...prev, ...data.tolerance }));
    if (typeof data.dailyTarget === 'number') setDailyTarget(data.dailyTarget);
    if (data.dayCloseRecords) setDayCloseRecords(data.dayCloseRecords);
  }, []);

  const refreshFromSheets = useCallback(async (showSpinner = false): Promise<boolean> => {
    if (syncInFlight.current || !scriptUrl) return false;
    syncInFlight.current = true;
    if (showSpinner) setIsSyncing(true);
    try {
      const response = revisionRef.current === undefined
        ? await getBootstrapDataRepo(scriptUrl)
        : await getChangesRepo(scriptUrl, revisionRef.current);
      if (!response.success || !response.data) throw new Error(response.error || 'Google Sheets synchronization failed.');
      if (!response.data.unchanged) applyBootstrapData(response.data);
      revisionRef.current = Number(response.revision ?? response.data.revision ?? revisionRef.current);
      setIsSheetsConnected(true);
      setIsOnline(true);
      setSyncError(null);
      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
      return true;
    } catch (error: any) {
      setIsSheetsConnected(false);
      setIsOnline(false);
      setSyncError(error?.message || 'Unable to connect to the central Google Sheets database.');
      return false;
    } finally {
      syncInFlight.current = false;
      setIsInitialLoading(false);
      setIsSyncing(false);
    }
  }, [applyBootstrapData, scriptUrl]);

  useEffect(() => {
    saveGoogleScriptUrl(DEFAULT_SCRIPT_WEBAPP_URL);
    saveSpreadsheetUrl(TARGET_GOOGLE_SHEET_URL);
    refreshFromSheets(true);
    // Never trap users on the startup screen when Apps Script has a cold/slow response.
    // Cached data remains read-only until the central backend confirms connectivity.
    const startupFallback = window.setTimeout(() => {
      setIsInitialLoading(false);
      setSyncError((current) => current || 'Central data is still loading. Cached data is read-only until synchronization completes.');
    }, 6000);
    const timer = window.setInterval(() => refreshFromSheets(false), 7000);
    return () => {
      window.clearTimeout(startupFallback);
      window.clearInterval(timer);
    };
  }, [refreshFromSheets]);

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
      asOfDate,
      feeHeads
    );
  }, [students, structures, installments, transactions, tolerance, asOfDate, feeHeads]);

  const flaggedReceiptCount = useMemo(
    () => getDuplicateReceiptGroups(transactions).reduce((sum, [, entries]) => sum + entries.length - 1, 0),
    [transactions]
  );

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
    if (!isOnline) {
      throw new Error('Unable to save to the central database. No changes were recorded. Please check the internet connection and try again.');
    }
    if (partialStatusUpdate && selectedStudentId) {
      const target = students.find((student) => student.id === selectedStudentId);
      if (target) {
        const permissionResult = await updateStudentRepo(scriptUrl, {
          ...target,
          ...partialStatusUpdate,
          updatedAt: new Date().toISOString(),
        });
        if (!permissionResult.success) throw new Error(permissionResult.error || 'Unable to update student permission.');
      }
    }
    const result = await recordPaymentRepo(scriptUrl, { ...transactionData, allocations }, transactionData.id);
    if (!result.success || !result.data?.transaction) {
      throw new Error(result.error || 'Unable to record payment in the central database.');
    }
    await refreshFromSheets(true);
    setActiveReceiptTransaction(result.data.transaction);
    setActiveModal('RECEIPT');
  };

  // -------------------------------------------------------------
  // 6. Void / Cancel Receipt Handler (Firestore Transactional Safety)
  // -------------------------------------------------------------
  const handleCancelReceipt = async (transactionId: string, cancelReason: string) => {
    if (!cancelReason.trim()) throw new Error('Cancellation reason is required.');
    const result = await cancelPaymentRepo(scriptUrl, transactionId, cancelReason.trim());
    if (!result.success) throw new Error(result.error || 'Unable to cancel the receipt.');
    await refreshFromSheets(true);
  };

  // -------------------------------------------------------------
  // 7. Grace Permission Handler
  // -------------------------------------------------------------
  const handleSavePermission = async (
    studentId: string,
    permissionExpiresAt: string | undefined,
    permissionReason: string | undefined,
    manualCategoryOverride: 'auto' | 'id_card' | 'permission' | 'action'
  ) => {
    const result = await savePermissionRepo(scriptUrl, studentId, permissionExpiresAt || '', permissionReason);
    if (!result.success) throw new Error(result.error || 'Unable to save permission.');
    const student = students.find((item) => item.id === studentId);
    if (student) {
      const update = await updateStudentRepo(scriptUrl, { ...student, manualCategoryOverride, permissionExpiresAt, permissionReason });
      if (!update.success) throw new Error(update.error || 'Unable to update student status.');
    }
    await refreshFromSheets(true);
  };

  // -------------------------------------------------------------
  // 8. Fee Structure & Spot Fees Handler
  // -------------------------------------------------------------
  const handleSaveFeeStructures = async (
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

    const targetStudent = updatedStudents.find((student) => student.id === studentId);
    if (targetStudent) {
      const studentResult = await updateStudentRepo(scriptUrl, targetStudent);
      if (!studentResult.success) throw new Error(studentResult.error || 'Unable to update student.');
    }
    const structureResult = await saveFeeStructureRepo(scriptUrl, newStructures, newInstallmentsList);
    if (!structureResult.success) throw new Error(structureResult.error || 'Unable to save fee structure.');
    await refreshFromSheets(true);
  };

  // -------------------------------------------------------------
  // 9. Single & Bulk Student Add Handlers
  // -------------------------------------------------------------
  const handleAddSingleStudent = async (
    newStudent: Student,
    feeStructure?: StudentFeeStructure
  ) => {
    const structList = feeStructure ? [feeStructure] : [];
    const instList = feeStructure ? generateInstallments(
      feeStructure.id, newStudent.id, feeStructure.headName,
      feeStructure.committedFee, feeStructure.installmentsCount,
    ) : [];
    const result = await addStudentRepo(scriptUrl, newStudent, structList, instList);
    if (!result.success) throw new Error(result.error || 'Unable to add student to the central database.');
    await refreshFromSheets(true);
  };

  const handleAddBulkStudents = async (
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
        newInsts.push(...generateInstallments(
            struct.id,
            st.id,
            struct.headName,
            struct.committedFee,
            struct.installmentsCount,
            undefined,
            classCfg.defaultDueDayOfMonth,
          ));
      });
    }
    const result = await bulkAddStudentsRepo(scriptUrl, newStudents, newStructs, newInsts);
    if (!result.success) throw new Error(result.error || 'Unable to add students to the central database.');
    await refreshFromSheets(true);
  };

  // -------------------------------------------------------------
  // 10. Google Sheets Push / Pull Sync
  // -------------------------------------------------------------
  const handlePushToSheets = async (): Promise<boolean> => {
    setSyncError('Direct overwrite is disabled to protect newer Google Sheets data. Use the verified migration tool.');
    return false;
  };

  const handlePullFromSheets = async (): Promise<boolean> => {
    return refreshFromSheets(true);
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
      const result = await importChunkRepo(scriptUrl, Date.now(), restored);
      if (!result.success) throw new Error(result.error || 'Unable to import backup into Google Sheets.');
      await refreshFromSheets(true);
      alert('Data backup safely merged into Google Sheets.');
    }
  };

  const handleResetDemoData = () => {
    if (
      confirm(
        'Are you sure you want to reset all data to the initial factory seed? All modifications will be replaced with clean demo records.'
      )
    ) {
      alert('Factory reset is disabled while Google Sheets is the live database. Existing school data was not changed.');
    }
  };

  const handleBulkImportStudents = async (
    newStudents: Student[],
    newStructures: StudentFeeStructure[],
    newInstallments: Installment[]
  ) => {
    const result = await bulkAddStudentsRepo(scriptUrl, newStudents, newStructures, newInstallments);
    if (!result.success) throw new Error(result.error || 'Unable to import students.');
    await refreshFromSheets(true);
  };

  const handleApplyRealSpreadsheetData = async () => {
    const realData = generateStructuredRealData();
    const result = await importChunkRepo(scriptUrl, Date.now(), {
      students: realData.students,
      structures: realData.feeStructures,
      installments: realData.installments,
      transactions: realData.payments,
    });
    if (!result.success) throw new Error(result.error || 'Unable to import spreadsheet data.');
    await refreshFromSheets(true);
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

  const handleUpdateDailyTarget = async (target: number) => {
    const result = await callAppsScriptAction(scriptUrl, 'saveDailyTarget', { dailyTarget: target });
    if (!result.success) throw new Error(result.error || 'Unable to update daily target.');
    await refreshFromSheets(true);
  };

  const handleCloseDay = async (record: DayCloseRecord) => {
    const result = await closeDayRepo(scriptUrl, record);
    if (!result.success) throw new Error(result.error || 'Unable to close day.');
    await refreshFromSheets(true);
  };

  const handleReopenDay = async (date: string) => {
    const result = await reopenDayRepo(scriptUrl, date);
    if (!result.success) throw new Error(result.error || 'Unable to reopen day.');
    await refreshFromSheets(true);
  };

  const handleUpdateTransactionSlip = async (
    txId: string,
    slipGiven: boolean,
    permissionDate?: string
  ) => {
    const result = await updateTransactionSlipRepo(scriptUrl, txId, slipGiven);
    if (!result.success) throw new Error(result.error || 'Unable to update transaction slip.');
    const transaction = transactions.find((item) => item.id === txId);
    const student = transaction ? students.find((item) => item.id === transaction.studentId) : undefined;
    if (student && permissionDate) {
      const update = await updateStudentRepo(scriptUrl, {
        ...student,
        manualCategoryOverride: slipGiven ? 'permission' : student.manualCategoryOverride,
        permissionExpiresAt: permissionDate,
        permissionReason: slipGiven ? `Permission slip issued till ${formatDate(permissionDate)}` : student.permissionReason,
      });
      if (!update.success) throw new Error(update.error || 'Unable to update student permission.');
    }
    await refreshFromSheets(true);
  };

  return (
    <PasscodeGate
      schoolProfile={safeSchoolProfile}
      requiredPasscode="2025"
      title="KTS Boduppal Fees ERP Software"
      subtitle="Protected Area • Enter 4-digit PIN to access software"
    >
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
        {!isOnline && (
          <div className="bg-rose-600 text-white px-4 py-2 text-center text-xs font-black tracking-wider uppercase shadow-md flex items-center justify-center gap-2 z-50">
            <span>⚠️ OFFLINE / NOT SYNCHRONIZED — DO NOT COLLECT PAYMENT</span>
          </div>
        )}
        {isInitialLoading && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-black tracking-wide shadow-sm">
            Opening cached ledger now - latest Google Sheets data is syncing in the background...
          </div>
        )}
        {/* 1. Global Navigation Bar */}
      <Navbar
        schoolProfile={safeSchoolProfile}
        tolerance={tolerance}
        onUpdateTolerance={async (newTol) => {
          const result = await saveSettingsRepo(scriptUrl, safeSchoolProfile, newTol, dailyTarget);
          if (!result.success) throw new Error(result.error || 'Unable to update tolerance.');
          await refreshFromSheets(true);
        }}
        currentDate={asOfDate}
        onChangeDate={(newDate) => setAsOfDate(newDate)}
        onResetDate={() => setAsOfDate(getKolkataToday())}
        isSheetsConnected={isSheetsConnected}
        backendMode={isOnline ? 'GOOGLE_SHEETS' : 'LOCAL_CACHE'}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        syncError={syncError}
        onRefreshNow={() => refreshFromSheets(true)}
        onOpenSheetsSync={() => setActiveModal('SHEETS_SYNC')}
        onOpenBackupMigrate={() => setActiveModal('BACKUP_MIGRATE')}
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
        flaggedReceiptCount={flaggedReceiptCount}
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
        ) : currentView === 'FLAGGED_RECEIPTS' ? (
          <FlaggedReceiptsView
            transactions={transactions}
            schoolProfile={safeSchoolProfile}
            onBack={() => handleSetCurrentView('LEDGER')}
          />
        ) : (
          <div className="space-y-4">
            {/* Master Student Ledger Table */}
            <MasterStudentTable
              summaries={filteredStudentSummaries}
              schoolProfile={safeSchoolProfile}
              classList={classList}
              tolerance={tolerance}
              asOfDate={asOfDate}
              onEditStudent={async (updatedStudent) => {
                const result = await updateStudentRepo(scriptUrl, updatedStudent);
                if (!result.success) throw new Error(result.error || 'Unable to update student.');
                await refreshFromSheets(true);
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
              onToggleStudentActive={async (studentId, currentActive) => {
                const result = await setStudentActiveRepo(scriptUrl, studentId, !currentActive);
                if (!result.success) throw new Error(result.error || 'Unable to change student status.');
                await refreshFromSheets(true);
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
          currentDate={asOfDate}
          onClose={() => setActiveModal('NONE')}
          onSavePermission={handleSavePermission}
        />
      )}

      {activeModal === 'LEDGER' && selectedStudent && selectedSummary && (
        <StudentLedgerModal
          student={selectedStudent}
          asOfDate={asOfDate}
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
          onSaveClassConfigs={async (newConfigs) => {
            const result = await saveClassConfigRepo(scriptUrl, newConfigs);
            if (!result.success) throw new Error(result.error || 'Unable to save class configuration.');
            await refreshFromSheets(true);
          }}
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

      {activeModal === 'BACKUP_MIGRATE' && (
        <BackupMigrateSheetsModal
          scriptUrl={scriptUrl}
          spreadsheetUrl={spreadsheetUrl}
          onSaveScriptUrl={setScriptUrl}
          onSaveSpreadsheetUrl={setSpreadsheetUrl}
          onMigrationComplete={async () => { await refreshFromSheets(true); }}
          onClose={() => setActiveModal('NONE')}
        />
      )}

      {activeModal === 'SCHOOL_SETTINGS' && (
        <SchoolSettingsModal
          schoolProfile={safeSchoolProfile}
          tolerance={tolerance}
          onSave={async (newProfile, newTol) => {
            const result = await saveSettingsRepo(scriptUrl, newProfile, newTol, dailyTarget);
            if (!result.success) throw new Error(result.error || 'Unable to save settings.');
            await refreshFromSheets(true);
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
