export type PaymentMode = 'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer' | 'Draft' | 'Other';

export type StatusCategory = 'STRONG_GREEN' | 'LIGHT_GREEN' | 'LIGHT_YELLOW' | 'LIGHT_RED' | 'STRONG_RED';

export type ActionTier = 'ID_CARD' | 'PERMISSION_SLIP' | 'ACTION_REQUIRED';

export interface Student {
  id: string;
  rollNo: string;
  name: string;
  classId: string;
  className: string;
  section: string;
  parentName: string;
  phone: string;
  altPhone?: string;
  address?: string;
  admissionDate: string;
  isActive: boolean;
  notes?: string;
  permissionExpiresAt?: string; // ISO date string (YYYY-MM-DD)
  permissionReason?: string;
  manualCategoryOverride?: 'auto' | 'id_card' | 'permission' | 'action';
  createdAt: string;
  updatedAt: string;
}

export interface FeeHeadDefinition {
  id: string;
  headName: string;
  isMandatory: boolean;
  isSpotFee?: boolean;
  description?: string;
}

export interface ClassFeeConfig {
  id: string;
  className: string;
  actualFee: number;
  defaultInstallments: number;
  defaultDueDayOfMonth: number; // e.g. 10th of the month
  startMonth: number; // 0-indexed (e.g., 5 for June in Indian academic year)
}

export interface Installment {
  id: string;
  feeStructureId: string;
  studentId: string;
  headName: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paidAmount: number;
  balanceAmount: number;
  status: 'unpaid' | 'partial' | 'paid';
}

export interface StudentFeeStructure {
  id: string;
  studentId: string;
  headName: string;
  actualFee: number;
  committedFee: number;
  concession: number;
  concessionReason?: string;
  commitmentReceiptNo?: string;
  commitmentDate: string;
  installmentsCount: number;
  isSpotFee?: boolean;
  remarks?: string;
}

export interface PaymentAllocation {
  installmentId: string;
  headName: string;
  installmentNumber: number;
  dueDate: string;
  allocatedAmount: number;
}

export interface PaymentTransaction {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  studentClass: string;
  date: string; // YYYY-MM-DD HH:mm
  amount: number;
  paymentMode: PaymentMode;
  referenceNo?: string;
  remarks?: string;
  allocations: PaymentAllocation[];
  isCancelled: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
  collectedBy?: string;
  permissionDate?: string; // Permission to be given till date (YYYY-MM-DD)
  slipGiven?: boolean; // Whether permission slip was physically given
  permissionUpdated?: boolean; // Whether cashier/admin has updated & verified this row
}

export interface DayCloseRecord {
  date: string; // YYYY-MM-DD
  closedAt: string; // ISO string
  closedBy?: string;
  target: number;
  totalAchieved: number;
  achievedPercent: number;
  cashTotal: number;
  upiTotal: number;
  otherTotal: number;
  totalReceiptsCount: number;
  notes?: string;
}

export interface ToleranceConfig {
  mode: 'percentage' | 'fixed_amount';
  value: number; // e.g. 25 for 25% or 500 for ₹500
}

export interface SchoolProfile {
  schoolName: string;
  tagline: string;
  affiliationNo: string;
  address: string;
  phone: string;
  email: string;
  academicYear: string;
  receiptPrefix: string;
  nextReceiptSequence: number;
  currencySymbol: string;
  receiptDisclaimer: string;
  enabledReceiptFields: {
    showRollNo: boolean;
    showParentName: boolean;
    showPhone: boolean;
    showRemarks: boolean;
    showInstallmentBreakdown: boolean;
    showSignatures: boolean;
    showDualCopy: boolean;
  };
  mandatoryStudentFields: {
    rollNo: boolean;
    parentName: boolean;
    phone: boolean;
    address: boolean;
    section: boolean;
  };
}

export interface StudentFinancialSummary {
  student: Student;
  actualFees: number;
  committedFees: number;
  concession: number;
  otherFees: number;
  totalPayable: number;
  totalPaid: number;
  totalDue: number;
  dueTillDate: number;
  expectedTillDate: number;
  statusCategory: StatusCategory;
  actionTier: ActionTier;
  nextDueDate: string | null;
  nextInstallmentBalance?: number;
  daysRemainingOnPermission: number | null;
  isPermissionExpired: boolean;
  hasUncommittedFee: boolean;
  installments: Installment[];
  structures: StudentFeeStructure[];
  transactions: PaymentTransaction[];
}

export interface StudentFilterState {
  searchQuery: string;
  selectedClass: string;
  selectedStatus: StatusCategory | 'ALL';
  selectedCategory: ActionTier | 'ALL';
  sortBy: 'rollNo' | 'name' | 'dueTillDate' | 'totalDue' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface FeeHeadBifurcation {
  headName: string;
  totalCommitted: number;
  totalExpectedTillDate: number;
  totalCollected: number;
  totalDueTillDate: number;
  totalBalanceDue: number;
  activeStudentsCount: number;
  outstandingStudentsCount: number;
  exclusiveStudentsCount: number;
  exclusiveStudentsAmount: number;
  previousHeadDueStudentsCount: number;
  previousHeadDueStudentsAmount: number;
  collectionRate: number;
  isSpotFee?: boolean;
}

export interface MonthWiseOutstandingRow {
  key: string;
  rowLabel: string;
  totalAmountToReceive: number;
  outstandingStudentsCount: number;
  exclusiveStudentsCount: number;
  exclusiveStudentsAmount: number;
  previousDueStudentsCount: number;
  previousDueStudentsAmount: number;
}

export interface AnalyticsSummary {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalActualRevenue: number;
  totalCommittedRevenue: number;
  totalExpectedTillDate: number;
  totalCollectedTillDate: number;
  totalCashCollected: number;
  totalUpiCollected: number;
  totalOverdueDeficitTillDate: number;
  totalOverallDue: number;
  collectionEfficiencyPercent: number;
  todayCollection: number;
  todayCash: number;
  todayUpi: number;
  todayOther: number;
  totalConcessionGiven: number;
  concessionStudentsCount: number;
  totalTransactionsCount: number;
  averageReceiptAmount: number;
  dailyTargetRunRate: {
    targetDailyAmount: number;
    daysRemainingInCycle: number;
    suggestedStudentsPerDay: number;
    backlogGap: number;
    nextDueDate: string | null;
    collectionDeadline: string | null;
  };
  categoryCounts: {
    strongGreen: number;
    lightGreen: number;
    lightYellow: number;
    lightRed: number;
    strongRed: number;
  };
  actionTierCounts: {
    idCardEligible: number;
    onPermission: number;
    actionRequired: number;
  };
  headWiseBifurcation: FeeHeadBifurcation[];
  monthWiseOutstandingAnalysis: MonthWiseOutstandingRow[];
}

export type BackendMode = 'GOOGLE_SHEETS' | 'LOCAL_CACHE';

export interface AuditLogEntry {
  eventId: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  studentId?: string;
  receiptNo?: string;
  operator?: string;
  deviceId?: string;
  beforeSummary?: string;
  afterSummary?: string;
  success: boolean;
  errorMessage?: string;
}

export interface GoogleSheetsResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  serverTime?: string;
  syncedAt?: string;
  revision?: number;
}

export interface MigrationVerificationReport {
  studentCount: number;
  feeStructureCount: number;
  installmentCount: number;
  transactionCount: number;
  allocationCount: number;
  duplicateIds: string[];
  duplicateReceiptNumbers: string[];
  orphanInstallments: string[];
  orphanTransactions: string[];
  missingAllocationInstallmentIds: string[];
  highestReceiptNumber: string;
  nextReceiptSequence: number;
  isValid: boolean;
  errors: string[];
}

export type AppView = 'LEDGER' | 'ANALYTICS' | 'FLAGGED_RECEIPTS' | 'TRIAL_VERIFICATION';
