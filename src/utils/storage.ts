import {
  ClassFeeConfig,
  DayCloseRecord,
  FeeHeadDefinition,
  Installment,
  PaymentTransaction,
  SchoolProfile,
  Student,
  StudentFeeStructure,
  ToleranceConfig,
} from '../types';
import { generateStructuredRealData, lookupStandardClassFee } from '../data/trialSpreadsheetData';
import { DEFAULT_SCRIPT_WEBAPP_URL } from './googleSheetsScript';

const CURRENT_DATA_VERSION = 'v2_kakatiya_actual_sept_2026';
const DATA_VERSION_KEY = 'sfc_app_data_version';

const STORAGE_KEYS = {
  STUDENTS: 'sfc_students_v2',
  FEE_STRUCTURES: 'sfc_fee_structures_v2',
  INSTALLMENTS: 'sfc_installments_v2',
  PAYMENTS: 'sfc_payments_v2',
  CLASS_CONFIGS: 'sfc_class_configs_v2',
  FEE_HEADS: 'sfc_fee_heads_v2',
  SCHOOL_PROFILE: 'sfc_school_profile_v2',
  TOLERANCE: 'sfc_tolerance_v2',
  SHEETS_SCRIPT_URL: 'sfc_sheets_script_url_v2',
  SPREADSHEET_URL: 'sfc_spreadsheet_url_v2',
  SIMULATED_DATE: 'sfc_simulated_date_v2',
  DAY_CLOSE_RECORDS: 'sfc_day_close_records_v2',
  DAILY_TARGET: 'sfc_daily_collection_target_v2',
};

export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Fx7CUTJCHT-m3FPfG_u3_VfYNN1RRWf87-0pIbUwA4M/edit?gid=0#gid=0';

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: 'Kakatiya School Boduppal',
  tagline: '',
  affiliationNo: '',
  address: 'Boduppal, Hyderabad, Telangana',
  phone: '',
  email: 'accounts@kakatiyaschool.edu.in',
  academicYear: '2026-2027',
  receiptPrefix: 'KSB',
  nextReceiptSequence: 104,
  currencySymbol: '₹',
  receiptDisclaimer: 'Fees once paid are non-refundable and non-transferable under any circumstances. Please retain this receipt for future reference.',
  enabledReceiptFields: {
    showRollNo: true,
    showParentName: true,
    showPhone: true,
    showRemarks: true,
    showInstallmentBreakdown: true,
    showSignatures: true,
    showDualCopy: true,
  },
  mandatoryStudentFields: {
    rollNo: true,
    parentName: true,
    phone: true,
    address: false,
    section: true,
  },
};

export const DEFAULT_TOLERANCE: ToleranceConfig = {
  mode: 'fixed_amount',
  value: 500, // ₹500 default tolerance threshold
};

export const DEFAULT_CLASS_CONFIGS: ClassFeeConfig[] = [
  { id: 'cls_nursery', className: 'Nursery', actualFee: 30000, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_lkg', className: 'LKG', actualFee: 31200, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_ukg', className: 'UKG', actualFee: 32400, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_1', className: 'Class 1', actualFee: 34800, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_2', className: 'Class 2', actualFee: 36000, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_3', className: 'Class 3', actualFee: 37200, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_4', className: 'Class 4', actualFee: 38400, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_5', className: 'Class 5', actualFee: 39600, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_6', className: 'Class 6', actualFee: 42000, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_7', className: 'Class 7', actualFee: 43200, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_8', className: 'Class 8', actualFee: 44400, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_9', className: 'Class 9', actualFee: 45600, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
  { id: 'cls_10', className: 'Class 10', actualFee: 48000, defaultInstallments: 7, defaultDueDayOfMonth: 10, startMonth: 7 },
];

export const DEFAULT_FEE_HEADS: FeeHeadDefinition[] = [
  { id: 'head_school', headName: 'School Tuition Fee', isMandatory: true, description: 'Core academic tuition fee' },
  { id: 'head_transport', headName: 'Transport / Bus Fee', isMandatory: false, description: 'Optional route transportation fee' },
  { id: 'head_old_due', headName: 'Old Due Carryover', isMandatory: false, description: 'Previous year pending due carryover' },
  { id: 'head_books', headName: 'Books & Stationery', isMandatory: false, description: 'Annual books and notebook kit' },
  { id: 'head_uniform', headName: 'Uniform & Accessories', isMandatory: false, description: 'Standard school uniform set' },
  { id: 'head_lab', headName: 'Science & Computer Lab', isMandatory: false, description: 'Lab & technology maintenance fee' },
  { id: 'head_spot', headName: 'Spot / Miscellaneous Fee', isMandatory: false, isSpotFee: true, description: 'On-the-spot fee additions (events, fines, trips)' },
];

// Initial Seed Data Generator using full 228 student records
export function getInitialSeedData() {
  const real = generateStructuredRealData();
  return {
    students: real.students,
    structures: real.feeStructures,
    installments: real.installments,
    transactions: real.payments,
    classConfigs: DEFAULT_CLASS_CONFIGS,
    feeHeads: DEFAULT_FEE_HEADS,
    schoolProfile: DEFAULT_SCHOOL_PROFILE,
    tolerance: DEFAULT_TOLERANCE,
  };
}

// -------------------------------------------------------------
// Getters & Setters for individual entities
// -------------------------------------------------------------
export function getStoredStudents(): Student[] {
  const version = localStorage.getItem(DATA_VERSION_KEY);
  const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);

  if (version !== CURRENT_DATA_VERSION || !raw) {
    const seed = getInitialSeedData();
    saveAllInitialData(seed);
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    return seed.students;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 10) {
      const seed = getInitialSeedData();
      saveAllInitialData(seed);
      localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
      return seed.students;
    }
    return parsed.map((s: Student) => ({
      ...s,
      isActive: s.isActive !== false,
      parentName:
        s.parentName && (s.parentName.toLowerCase().startsWith('parent of') || s.parentName.trim().toLowerCase() === 'parent')
          ? ''
          : (s.parentName || ''),
    }));
  } catch {
    return [];
  }
}

export function reinitializeToV2Data() {
  const seed = getInitialSeedData();
  saveAllInitialData(seed);
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  return seed;
}

export function saveStudents(students: Student[]) {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function getStoredStructures(): StudentFeeStructure[] {
  const raw = localStorage.getItem(STORAGE_KEYS.FEE_STRUCTURES);
  if (!raw) return getInitialSeedData().structures;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 10) {
      return getInitialSeedData().structures;
    }
    // Reconcile standard actual fees for school tuition structures
    const students = getStoredStudents();
    const studentClassMap = new Map<string, string>();
    students.forEach((s) => studentClassMap.set(s.id, s.className));

    return parsed.map((s: StudentFeeStructure) => {
      const isSchoolHead = s.headName.toLowerCase().includes('school') || s.headName.toLowerCase().includes('tuition');
      if (isSchoolHead) {
        const className = studentClassMap.get(s.studentId) || '';
        const stdFee = lookupStandardClassFee(className);
        if (stdFee > 0) {
          const actualFee = stdFee;
          const concession = Math.max(0, actualFee - s.committedFee);
          return {
            ...s,
            actualFee,
            concession,
            installmentsCount: s.installmentsCount || 7,
          };
        }
      }
      return s;
    });
  } catch {
    return [];
  }
}

export function saveStructures(structures: StudentFeeStructure[]) {
  localStorage.setItem(STORAGE_KEYS.FEE_STRUCTURES, JSON.stringify(structures));
}

export function getStoredInstallments(): Installment[] {
  const raw = localStorage.getItem(STORAGE_KEYS.INSTALLMENTS);
  if (!raw) return getInitialSeedData().installments;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 10) {
      return getInitialSeedData().installments;
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveInstallments(installments: Installment[]) {
  localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify(installments));
}

export function getStoredTransactions(): PaymentTransaction[] {
  const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  if (!raw) return getInitialSeedData().transactions;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: PaymentTransaction[]) {
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(transactions));
}

export function getStoredClassConfigs(): ClassFeeConfig[] {
  const raw = localStorage.getItem(STORAGE_KEYS.CLASS_CONFIGS);
  if (!raw) return DEFAULT_CLASS_CONFIGS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CLASS_CONFIGS;
    return parsed.map((cfg: ClassFeeConfig) => {
      const stdFee = lookupStandardClassFee(cfg.className);
      return {
        ...cfg,
        actualFee: stdFee > 0 ? stdFee : cfg.actualFee,
        defaultInstallments: 7,
      };
    });
  } catch {
    return DEFAULT_CLASS_CONFIGS;
  }
}

export function saveClassConfigs(configs: ClassFeeConfig[]) {
  localStorage.setItem(STORAGE_KEYS.CLASS_CONFIGS, JSON.stringify(configs));
}

export function getStoredFeeHeads(): FeeHeadDefinition[] {
  const raw = localStorage.getItem(STORAGE_KEYS.FEE_HEADS);
  if (!raw) return DEFAULT_FEE_HEADS;
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_FEE_HEADS;
  }
}

export function saveFeeHeads(feeHeads: FeeHeadDefinition[]) {
  localStorage.setItem(STORAGE_KEYS.FEE_HEADS, JSON.stringify(feeHeads));
}

export function getStoredSchoolProfile(): SchoolProfile {
  const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL_PROFILE);
  if (!raw) return DEFAULT_SCHOOL_PROFILE;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SCHOOL_PROFILE;
    return {
      ...DEFAULT_SCHOOL_PROFILE,
      ...parsed,
      currencySymbol: parsed.currencySymbol || DEFAULT_SCHOOL_PROFILE.currencySymbol || '₹',
      enabledReceiptFields: {
        ...DEFAULT_SCHOOL_PROFILE.enabledReceiptFields,
        ...(parsed.enabledReceiptFields || {}),
      },
      mandatoryStudentFields: {
        ...DEFAULT_SCHOOL_PROFILE.mandatoryStudentFields,
        ...(parsed.mandatoryStudentFields || {}),
      },
    };
  } catch {
    return DEFAULT_SCHOOL_PROFILE;
  }
}

export function saveSchoolProfile(profile: SchoolProfile) {
  const safeProfile = {
    ...DEFAULT_SCHOOL_PROFILE,
    ...profile,
    currencySymbol: profile?.currencySymbol || DEFAULT_SCHOOL_PROFILE.currencySymbol || '₹',
  };
  localStorage.setItem(STORAGE_KEYS.SCHOOL_PROFILE, JSON.stringify(safeProfile));
}

export function getStoredToleranceConfig(): ToleranceConfig {
  const raw = localStorage.getItem(STORAGE_KEYS.TOLERANCE);
  if (!raw) return DEFAULT_TOLERANCE;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_TOLERANCE;
    return {
      ...DEFAULT_TOLERANCE,
      ...parsed,
      mode: parsed.mode || DEFAULT_TOLERANCE.mode,
      value: typeof parsed.value === 'number' ? parsed.value : DEFAULT_TOLERANCE.value,
    };
  } catch {
    return DEFAULT_TOLERANCE;
  }
}

export function saveToleranceConfig(tolerance: ToleranceConfig) {
  const safeTolerance = {
    ...DEFAULT_TOLERANCE,
    ...tolerance,
  };
  localStorage.setItem(STORAGE_KEYS.TOLERANCE, JSON.stringify(safeTolerance));
}

export function getSpreadsheetUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_URL);
  if (!stored || stored.includes('1POcQ-_RTdHe8YMVV87O99ZcFIG3UN8pC07MdefnqT8w')) {
    return DEFAULT_SPREADSHEET_URL;
  }
  return stored;
}

export function saveSpreadsheetUrl(url: string) {
  localStorage.setItem(STORAGE_KEYS.SPREADSHEET_URL, url);
}

export function getGoogleScriptUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEYS.SHEETS_SCRIPT_URL);
  if (stored) return stored;
  return DEFAULT_SCRIPT_WEBAPP_URL;
}

export function saveGoogleScriptUrl(url: string) {
  localStorage.setItem(STORAGE_KEYS.SHEETS_SCRIPT_URL, url);
}

function saveAllInitialData(seed: ReturnType<typeof getInitialSeedData>) {
  saveStudents(seed.students);
  saveStructures(seed.structures);
  saveInstallments(seed.installments);
  saveTransactions(seed.transactions);
  saveClassConfigs(seed.classConfigs);
  saveFeeHeads(seed.feeHeads);
  saveSchoolProfile(seed.schoolProfile);
  saveToleranceConfig(seed.tolerance);
  saveSpreadsheetUrl(DEFAULT_SPREADSHEET_URL);
}

export function clearAllLocalData() {
  localStorage.clear();
}

// -------------------------------------------------------------
// Google Sheets Backend Integration Handlers
// -------------------------------------------------------------
export async function pushToGoogleSheets(
  scriptUrl: string,
  students: Student[],
  structures: StudentFeeStructure[],
  installments: Installment[],
  transactions: PaymentTransaction[],
  classConfigs: ClassFeeConfig[],
  tolerance: ToleranceConfig,
  schoolProfile: SchoolProfile
): Promise<boolean> {
  if (!scriptUrl) return false;
  try {
    const payload = {
      action: 'syncAllData',
      data: {
        students,
        structures,
        feeStructures: structures,
        installments,
        transactions,
        payments: transactions,
        classConfigs,
        tolerance,
        schoolProfile,
      },
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      // If response is HTML or redirect text
      return response.ok;
    }
    return result.status === 'success' || response.ok;
  } catch (err) {
    console.error('Failed to push data to Google Sheets:', err);
    return false;
  }
}

export async function pullFromGoogleSheets(scriptUrl: string): Promise<any | null> {
  if (!scriptUrl) return null;
  try {
    const fetchUrl = scriptUrl.includes('?') ? `${scriptUrl}&action=getAllData` : `${scriptUrl}?action=getAllData`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow',
    });
    const text = await response.text();
    const result = JSON.parse(text);
    if (result.status === 'success' && result.data) {
      return result.data;
    }
    return null;
  } catch (err) {
    console.error('Failed to pull data from Google Sheets:', err);
    return null;
  }
}

// -------------------------------------------------------------
// JSON Backup Export & Restore
// -------------------------------------------------------------
export function exportDataAsJson(data: any) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee_software_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreDataFromJson(file: File): Promise<any | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (err) {
        alert('Invalid JSON backup file.');
        resolve(null);
      }
    };
    reader.readAsText(file);
  });
}

// -------------------------------------------------------------
// Day Close Records & Daily Target
// -------------------------------------------------------------
export function getDayCloseRecords(): Record<string, DayCloseRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAY_CLOSE_RECORDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDayCloseRecords(records: Record<string, DayCloseRecord>) {
  try {
    localStorage.setItem(STORAGE_KEYS.DAY_CLOSE_RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save day close records:', err);
  }
}

export function getDailyCollectionTarget(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_TARGET);
    if (raw) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // fallback
  }
  return 50000; // Default ₹50,000 daily collection target
}

export function saveDailyCollectionTarget(target: number) {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_TARGET, String(target));
  } catch (err) {
    console.error('Failed to save daily collection target:', err);
  }
}
