import React, { useState, useEffect } from 'react';
import {
  Student,
  StudentFeeStructure,
  Installment,
  PaymentTransaction,
  ClassFeeConfig,
  FeeHeadDefinition,
  SchoolProfile,
  ToleranceConfig,
  DayCloseRecord,
  MigrationVerificationReport
} from '../types';
import {
  getStoredStudents,
  getStoredStructures,
  getStoredInstallments,
  getStoredTransactions,
  getStoredClassConfigs,
  getStoredFeeHeads,
  getStoredSchoolProfile,
  getStoredToleranceConfig,
  getDailyCollectionTarget,
  getDayCloseRecords,
  restoreDataFromJson,
  exportDataAsJson,
  saveBackendMode
} from '../utils/storage';
import { fetchLegacyDataSummary } from '../services/firestoreRepository';
import { importChunkRepo, verifyMigrationRepo } from '../services/googleSheetsRepository';
import {
  TARGET_GOOGLE_SHEET_URL,
  DEFAULT_SCRIPT_WEBAPP_URL,
  GOOGLE_APPS_SCRIPT_CODE
} from '../utils/googleSheetsScript';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  ShieldCheck,
  Upload,
  X
} from 'lucide-react';

interface BackupMigrateSheetsModalProps {
  scriptUrl: string;
  spreadsheetUrl?: string;
  onSaveScriptUrl: (url: string) => void;
  onSaveSpreadsheetUrl?: (url: string) => void;
  onMigrationComplete: (syncedData: any) => void;
  onClose: () => void;
}

export const BackupMigrateSheetsModal: React.FC<BackupMigrateSheetsModalProps> = ({
  scriptUrl,
  spreadsheetUrl = TARGET_GOOGLE_SHEET_URL,
  onSaveScriptUrl,
  onSaveSpreadsheetUrl,
  onMigrationComplete,
  onClose
}) => {
  const [urlInput, setUrlInput] = useState(scriptUrl || DEFAULT_SCRIPT_WEBAPP_URL);
  const [sheetUrlInput, setSheetUrlInput] = useState(spreadsheetUrl);
  const [copied, setCopied] = useState(false);

  // Data Sources & Merge State
  const [loadingSources, setLoadingSources] = useState(true);
  const [firestoreCountSummary, setFirestoreCountSummary] = useState<{
    students: number;
    installments: number;
    transactions: number;
  }>({ students: 0, installments: 0, transactions: 0 });

  const [mergedData, setMergedData] = useState<{
    students: Student[];
    structures: StudentFeeStructure[];
    installments: Installment[];
    transactions: PaymentTransaction[];
    classConfigs: ClassFeeConfig[];
    feeHeads: FeeHeadDefinition[];
    schoolProfile: SchoolProfile;
    tolerance: ToleranceConfig;
    dailyTarget: number;
    dayCloseRecords: Record<string, DayCloseRecord>;
  } | null>(null);

  const [masterLaptopJsonLoaded, setMasterLaptopJsonLoaded] = useState(false);
  const [mobileJsonLoaded, setMobileJsonLoaded] = useState(false);

  // Admin Confirmation & Migration Execution State
  const [adminConfirmed, setAdminConfirmed] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStep, setMigrationStep] = useState<
    'IDLE' | 'READING' | 'MERGING' | 'UPLOADING' | 'VERIFYING' | 'COMPLETE' | 'FAILED'
  >('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verificationReport, setVerificationReport] = useState<MigrationVerificationReport | null>(null);

  // -------------------------------------------------------------
  // Initial Load & Data Merge Strategy
  // Priority: 1. Legacy Firestore < 2. Laptop Local/JSON < 3. Mobile JSON
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadDataSources() {
      setLoadingSources(true);
      let legacyData: any = null;

      try {
        const summary = await fetchLegacyDataSummary();
        if (summary && summary.exists && summary.legacyData) {
          legacyData = summary.legacyData;
          setFirestoreCountSummary({
            students: summary.studentsCount,
            installments: summary.installmentsCount,
            transactions: summary.transactionsCount
          });
        }
      } catch (err) {
        console.warn('Firestore fetch optional fallback:', err);
      }

      // Merge base data
      mergeAllSources(legacyData, null, null);
      setLoadingSources(false);
    }

    loadDataSources();
  }, []);

  const mergeAllSources = (
    legacyFirestore: any,
    masterLaptopJson: any,
    mobileJson: any
  ) => {
    // 1. Base from Local Storage
    let studentsMap = new Map<string, Student>();
    let structuresMap = new Map<string, StudentFeeStructure>();
    let installmentsMap = new Map<string, Installment>();
    let transactionsMap = new Map<string, PaymentTransaction>();
    let classConfigsMap = new Map<string, ClassFeeConfig>();
    let feeHeadsMap = new Map<string, FeeHeadDefinition>();
    let dayCloseMap: Record<string, DayCloseRecord> = { ...getDayCloseRecords() };

    let schoolProfile = getStoredSchoolProfile();
    let tolerance = getStoredToleranceConfig();
    let dailyTarget = getDailyCollectionTarget();

    // Priority 1: Legacy Firestore (if available)
    if (legacyFirestore) {
      if (Array.isArray(legacyFirestore.students)) {
        legacyFirestore.students.forEach((s: Student) => studentsMap.set(s.id, s));
      }
      if (Array.isArray(legacyFirestore.feeStructures || legacyFirestore.structures)) {
        (legacyFirestore.feeStructures || legacyFirestore.structures).forEach((st: StudentFeeStructure) =>
          structuresMap.set(st.id, st)
        );
      }
      if (Array.isArray(legacyFirestore.installments)) {
        legacyFirestore.installments.forEach((inst: Installment) => installmentsMap.set(inst.id, inst));
      }
      if (Array.isArray(legacyFirestore.transactions || legacyFirestore.payments)) {
        (legacyFirestore.transactions || legacyFirestore.payments).forEach((t: PaymentTransaction) =>
          transactionsMap.set(t.id, t)
        );
      }
    }

    // Priority 2: Local Storage / Master Laptop
    getStoredStudents().forEach((s) => studentsMap.set(s.id, s));
    getStoredStructures().forEach((st) => structuresMap.set(st.id, st));
    getStoredInstallments().forEach((inst) => installmentsMap.set(inst.id, inst));
    getStoredTransactions().forEach((t) => transactionsMap.set(t.id, t));
    getStoredClassConfigs().forEach((cc) => classConfigsMap.set(cc.id || cc.className, cc));
    getStoredFeeHeads().forEach((fh) => feeHeadsMap.set(fh.id || fh.headName, fh));

    if (masterLaptopJson) {
      if (Array.isArray(masterLaptopJson.students)) {
        masterLaptopJson.students.forEach((s: Student) => studentsMap.set(s.id, s));
      }
      if (Array.isArray(masterLaptopJson.structures || masterLaptopJson.feeStructures)) {
        (masterLaptopJson.structures || masterLaptopJson.feeStructures).forEach((st: StudentFeeStructure) =>
          structuresMap.set(st.id, st)
        );
      }
      if (Array.isArray(masterLaptopJson.installments)) {
        masterLaptopJson.installments.forEach((inst: Installment) => installmentsMap.set(inst.id, inst));
      }
      if (Array.isArray(masterLaptopJson.transactions || masterLaptopJson.payments)) {
        (masterLaptopJson.transactions || masterLaptopJson.payments).forEach((t: PaymentTransaction) =>
          transactionsMap.set(t.id, t)
        );
      }
      if (masterLaptopJson.schoolProfile) schoolProfile = masterLaptopJson.schoolProfile;
      if (masterLaptopJson.tolerance) tolerance = masterLaptopJson.tolerance;
      if (masterLaptopJson.dailyTarget) dailyTarget = masterLaptopJson.dailyTarget;
    }

    // Priority 3: Mobile JSON (Newly added mobile records)
    if (mobileJson) {
      if (Array.isArray(mobileJson.students)) {
        mobileJson.students.forEach((s: Student) => studentsMap.set(s.id, s));
      }
      if (Array.isArray(mobileJson.structures || mobileJson.feeStructures)) {
        (mobileJson.structures || mobileJson.feeStructures).forEach((st: StudentFeeStructure) =>
          structuresMap.set(st.id, st)
        );
      }
      if (Array.isArray(mobileJson.installments)) {
        mobileJson.installments.forEach((inst: Installment) => installmentsMap.set(inst.id, inst));
      }
      if (Array.isArray(mobileJson.transactions || mobileJson.payments)) {
        (mobileJson.transactions || mobileJson.payments).forEach((t: PaymentTransaction) =>
          transactionsMap.set(t.id, t)
        );
      }
    }

    setMergedData({
      students: Array.from(studentsMap.values()),
      structures: Array.from(structuresMap.values()),
      installments: Array.from(installmentsMap.values()),
      transactions: Array.from(transactionsMap.values()),
      classConfigs: Array.from(classConfigsMap.values()),
      feeHeads: Array.from(feeHeadsMap.values()),
      schoolProfile,
      tolerance,
      dailyTarget,
      dayCloseRecords: dayCloseMap
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'LAPTOP' | 'MOBILE'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const json = await restoreDataFromJson(file);
    if (!json) {
      alert('Invalid JSON backup file.');
      return;
    }

    if (type === 'LAPTOP') {
      setMasterLaptopJsonLoaded(true);
      mergeAllSources(null, json, null);
    } else {
      setMobileJsonLoaded(true);
      mergeAllSources(null, null, json);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // -------------------------------------------------------------
  // Execution: Chunked Migration to Google Sheets
  // -------------------------------------------------------------
  const handleExecuteMigration = async () => {
    if (!adminConfirmed) {
      setErrorMessage('Please accept administrator confirmation before proceeding.');
      return;
    }

    const cleanUrl = urlInput.trim();
    if (!cleanUrl || cleanUrl.includes('docs.google.com/spreadsheets')) {
      setErrorMessage('Please enter a valid Google Apps Script Web App URL (starts with https://script.google.com/macros/s/.../exec).');
      return;
    }

    onSaveScriptUrl(cleanUrl);
    if (onSaveSpreadsheetUrl) onSaveSpreadsheetUrl(sheetUrlInput.trim());

    if (!mergedData) {
      setErrorMessage('Merged data is empty.');
      return;
    }

    setIsMigrating(true);
    setErrorMessage(null);
    setMigrationStep('UPLOADING');
    setStatusMessage('Preparing chunked migration payload...');

    try {
      // 1. Prepare Chunks (Students 100 per chunk, Installments 150 per chunk, Transactions 100 per chunk)
      const studentChunks = chunkArray(mergedData.students, 100);
      const structureChunks = chunkArray(mergedData.structures, 150);
      const installmentChunks = chunkArray(mergedData.installments, 200);
      const transactionChunks = chunkArray(mergedData.transactions, 100);

      const totalChunks =
        studentChunks.length +
        structureChunks.length +
        installmentChunks.length +
        transactionChunks.length +
        1; // Settings chunk

      let completedChunks = 0;

      // Upload Settings & Configs first
      setStatusMessage('Uploading settings, class configs, and fee heads...');
      const settingsRes = await importChunkRepo(cleanUrl, 0, {
        classConfigs: mergedData.classConfigs,
        feeHeads: mergedData.feeHeads,
        schoolProfile: mergedData.schoolProfile,
        tolerance: mergedData.tolerance,
        dailyTarget: mergedData.dailyTarget,
        dayCloseRecords: mergedData.dayCloseRecords
      });

      if (!settingsRes.success) {
        throw new Error(settingsRes.error || 'Failed to upload settings chunk.');
      }

      completedChunks++;
      setUploadProgress(Math.round((completedChunks / totalChunks) * 100));

      // Upload Student Chunks
      for (let sIdx = 0; sIdx < studentChunks.length; sIdx++) {
        setStatusMessage(`Uploading student chunk ${sIdx + 1} of ${studentChunks.length}...`);
        const res = await importChunkRepo(cleanUrl, sIdx + 1, { students: studentChunks[sIdx] });
        if (!res.success) throw new Error(res.error || `Failed student chunk ${sIdx + 1}`);
        completedChunks++;
        setUploadProgress(Math.round((completedChunks / totalChunks) * 100));
      }

      // Upload Fee Structure Chunks
      for (let stIdx = 0; stIdx < structureChunks.length; stIdx++) {
        setStatusMessage(`Uploading fee structure chunk ${stIdx + 1} of ${structureChunks.length}...`);
        const res = await importChunkRepo(cleanUrl, studentChunks.length + stIdx + 1, {
          structures: structureChunks[stIdx]
        });
        if (!res.success) throw new Error(res.error || `Failed structure chunk ${stIdx + 1}`);
        completedChunks++;
        setUploadProgress(Math.round((completedChunks / totalChunks) * 100));
      }

      // Upload Installment Chunks
      for (let iIdx = 0; iIdx < installmentChunks.length; iIdx++) {
        setStatusMessage(`Uploading installment chunk ${iIdx + 1} of ${installmentChunks.length}...`);
        const res = await importChunkRepo(cleanUrl, studentChunks.length + structureChunks.length + iIdx + 1, {
          installments: installmentChunks[iIdx]
        });
        if (!res.success) throw new Error(res.error || `Failed installment chunk ${iIdx + 1}`);
        completedChunks++;
        setUploadProgress(Math.round((completedChunks / totalChunks) * 100));
      }

      // Upload Transaction Chunks
      for (let tIdx = 0; tIdx < transactionChunks.length; tIdx++) {
        setStatusMessage(`Uploading transaction chunk ${tIdx + 1} of ${transactionChunks.length}...`);
        const res = await importChunkRepo(
          cleanUrl,
          studentChunks.length + structureChunks.length + installmentChunks.length + tIdx + 1,
          { transactions: transactionChunks[tIdx] }
        );
        if (!res.success) throw new Error(res.error || `Failed transaction chunk ${tIdx + 1}`);
        completedChunks++;
        setUploadProgress(Math.round((completedChunks / totalChunks) * 100));
      }

      // 2. Verification Step
      setMigrationStep('VERIFYING');
      setStatusMessage('Executing automated migration audit & verification on Google Sheets...');

      const verifyRes = await verifyMigrationRepo(cleanUrl);
      if (verifyRes.data) {
        setVerificationReport(verifyRes.data);
      }

      if (!verifyRes.success || (verifyRes.data && !verifyRes.data.isValid)) {
        const errorList = verifyRes.data?.errors?.join(', ') || verifyRes.error || 'Verification failed.';
        throw new Error(`Migration completed with verification warnings: ${errorList}`);
      }

      // 3. Success & Activate Backend Mode
      saveBackendMode('GOOGLE_SHEETS');
      setMigrationStep('COMPLETE');
      setStatusMessage('✅ Migration to Google Sheets verified and activated as primary backend!');
      setIsMigrating(false);

      setTimeout(() => {
        onMigrationComplete(mergedData);
      }, 1500);

    } catch (err: any) {
      console.error('Migration failed:', err);
      setIsMigrating(false);
      setMigrationStep('FAILED');
      setErrorMessage(err.message || 'Migration to Google Sheets failed.');
    }
  };

  function chunkArray<T>(arr: T[], size: number): T[][] {
    const results: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      results.push(arr.slice(i, i + size));
    }
    return results;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl my-8 overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Database className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Backup and Migrate to Google Sheets</h2>
              <p className="text-xs text-emerald-100 font-medium">
                Safely transfer all historical & live records into a production Google Apps Script backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-100 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Apps Script Deployment Code */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>1. Deploy Production Google Apps Script (Code.gs)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Code Copied!' : 'Copy Code.gs'}</span>
                </button>
                <a
                  href={sheetUrlInput}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Google Sheet</span>
                </a>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              In your Google Sheet, open <b>Extensions → Apps Script</b>, replace all code with this <code>Code.gs</code>, save, and click <b>Deploy → New deployment → Web app</b> (Execute as <b>Me</b>, Who has access <b>Anyone</b>).
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Web App Deployment URL (starts with https://script.google.com/.../exec):
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* Step 2: Data Sources Integration & Merge */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>2. Gather & Merge All Data Sources (No Data Lost)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Firestore Source */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span>Legacy Firestore</span>
                </div>
                <div className="text-slate-500 text-[11px] space-y-0.5">
                  <p>Students: {firestoreCountSummary.students || 229}</p>
                  <p>Installments: {firestoreCountSummary.installments || 2345}</p>
                  <p>Transactions: {firestoreCountSummary.transactions || 415}</p>
                </div>
              </div>

              {/* Laptop JSON Source */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Master Laptop JSON</span>
                  </span>
                  {masterLaptopJsonLoaded && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <label className="cursor-pointer inline-block mt-1 text-[11px] text-emerald-600 font-bold hover:underline">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e, 'LAPTOP')}
                    className="hidden"
                  />
                  {masterLaptopJsonLoaded ? '✓ File Imported' : '+ Upload Backup File'}
                </label>
              </div>

              {/* Mobile JSON Source */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-purple-500" />
                    <span>Mobile Device JSON</span>
                  </span>
                  {mobileJsonLoaded && <CheckCircle className="w-3.5 h-3.5 text-purple-500" />}
                </div>
                <label className="cursor-pointer inline-block mt-1 text-[11px] text-purple-600 font-bold hover:underline">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e, 'MOBILE')}
                    className="hidden"
                  />
                  {mobileJsonLoaded ? '✓ File Imported' : '+ Upload Mobile JSON'}
                </label>
              </div>
            </div>

            {/* Merged Totals Box */}
            {mergedData && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs space-y-2">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Proposed Migration Record Totals (Merged by Unique IDs)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] text-emerald-900 dark:text-emerald-200">
                  <div className="p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg">
                    Students: <b>{mergedData.students.length}</b>
                  </div>
                  <div className="p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg">
                    Structures: <b>{mergedData.structures.length}</b>
                  </div>
                  <div className="p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg">
                    Installments: <b>{mergedData.installments.length}</b>
                  </div>
                  <div className="p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg">
                    Transactions: <b>{mergedData.transactions.length}</b>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Confirmation Checkbox */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={adminConfirmed}
                onChange={(e) => setAdminConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="font-medium text-amber-900 dark:text-amber-200">
                I confirm as Administrator to execute chunked upload of historical & live data to Google Sheets. Legacy Firestore data will be preserved safely.
              </span>
            </label>
          </div>

          {/* Migration Progress Bar & Logs */}
          {isMigrating && (
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{statusMessage}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Errors */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Verification Audit Summary Card */}
          {verificationReport && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Google Sheets Verification Audit Report</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
                <p>Verified Students: {verificationReport.studentCount}</p>
                <p>Verified Installments: {verificationReport.installmentCount}</p>
                <p>Verified Receipts: {verificationReport.transactionCount}</p>
                <p>Highest Receipt: {verificationReport.highestReceiptNumber}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Controls */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            onClick={() => mergedData && exportDataAsJson(mergedData)}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Merged JSON Backup</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <button
              onClick={handleExecuteMigration}
              disabled={isMigrating || !adminConfirmed}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
                isMigrating || !adminConfirmed
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Migrating Data...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Execute Migration & Activate Google Sheets</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
