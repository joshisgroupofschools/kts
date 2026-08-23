import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionTier,
  PaymentTransaction,
  SchoolProfile,
  Student,
  StudentFinancialSummary,
} from '../types';
import { formatCurrency, formatDate, getNextMultipleOfFiveDate } from '../utils/numberToWords';
import { getStatusCategoryMeta } from '../utils/statusResolver';
import { getClassSortIndex } from '../utils/classOrder';
import { lookupStandardClassFee } from '../data/trialSpreadsheetData';
import {
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Flame,
  MessageCircle,
  MoreHorizontal,
  Printer,
  Search,
  Settings,
  Shirt,
  Sparkles,
  UserCheck,
  UserX,
} from 'lucide-react';
import { EditStudentModal } from './EditStudentModal';

export interface ColumnVisibilityState {
  sno: boolean;
  student: boolean;
  className: boolean;
  actualSchoolFee: boolean;
  discount: boolean;
  committedSchoolFee: boolean;
  oldFee: boolean;
  transportFee: boolean;
  netPayable: boolean;
  totalPaid: boolean;
  totalDue: boolean;
  dueTillDate: boolean;
  feeHealth: boolean;
  actions: boolean;
}

const STORAGE_KEY = 'school_fee_column_prefs_v6';

const DEFAULT_COLUMNS: ColumnVisibilityState = {
  sno: true,
  student: true,
  className: true,
  actualSchoolFee: true,
  discount: true,
  committedSchoolFee: true,
  oldFee: true,
  transportFee: true,
  netPayable: true,
  totalPaid: true,
  totalDue: true,
  dueTillDate: true,
  feeHealth: true,
  actions: true,
};

const COLUMN_LABELS: Record<keyof ColumnVisibilityState, string> = {
  sno: 'S.NO',
  student: 'Student Details',
  className: 'Class',
  actualSchoolFee: 'Actual School Fees',
  discount: 'Discount',
  committedSchoolFee: 'Committed School Fees',
  oldFee: 'Old Fees',
  transportFee: 'Transport Fees',
  netPayable: 'Net Payable',
  totalPaid: 'Total Paid',
  totalDue: 'Total Due',
  dueTillDate: 'Due till date',
  feeHealth: 'Fee Health & Action',
  actions: 'Actions',
};

export type SortField =
  | 'sno'
  | 'name'
  | 'class'
  | 'actualSchoolFee'
  | 'discount'
  | 'committedSchoolFee'
  | 'oldFee'
  | 'transportFee'
  | 'netPayable'
  | 'totalPaid'
  | 'totalDue'
  | 'dueTillDate'
  | 'feeHealth';

interface MasterStudentTableProps {
  summaries: StudentFinancialSummary[];
  schoolProfile: SchoolProfile;
  classList?: string[];
  onOpenCollectModal: (student: Student, initialFeeType?: 'ALL' | 'BOOKS' | 'DRESS') => void;
  onOpenPermissionModal: (student: Student) => void;
  onOpenLedgerModal: (student: Student) => void;
  onOpenReceiptModal: (transaction: PaymentTransaction) => void;
  onOpenFeeStructureModal: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
  onToggleStudentActive: (studentId: string, currentActive: boolean) => void;
  onUpdateActionStatus?: (
    studentId: string,
    permissionExpiresAt: string | undefined,
    permissionReason: string | undefined,
    manualCategoryOverride: 'auto' | 'id_card' | 'permission' | 'action'
  ) => void;
  onOpenAddStudent?: () => void;
  onOpenBulkUpload?: () => void;
}

// Helper to determine Books / Dress Category 1 status
export function getCategory1Status(item: StudentFinancialSummary): 'BOTH' | 'BOOKS' | 'DRESS' | 'NONE' {
  const structures = item.structures || [];
  const transactions = item.transactions || [];
  const installments = item.installments || [];

  const hasBooks =
    structures.some(
      (s) =>
        s.headName.toLowerCase().includes('book') ||
        s.headName.toLowerCase().includes('kit') ||
        s.headName.toLowerCase().includes('stationery')
    ) ||
    transactions.some(
      (t) =>
        !t.isCancelled &&
        (t.allocations.some(
          (a) =>
            a.headName.toLowerCase().includes('book') ||
            a.headName.toLowerCase().includes('kit') ||
            a.headName.toLowerCase().includes('stationery')
        ) ||
          (t.remarks &&
            (t.remarks.toLowerCase().includes('book') ||
              t.remarks.toLowerCase().includes('kit') ||
              t.remarks.toLowerCase().includes('stationery'))))
    ) ||
    installments.some(
      (ins) =>
        ins.headName.toLowerCase().includes('book') ||
        ins.headName.toLowerCase().includes('kit') ||
        ins.headName.toLowerCase().includes('stationery')
    );

  const hasDress =
    structures.some(
      (s) =>
        s.headName.toLowerCase().includes('dress') ||
        s.headName.toLowerCase().includes('uniform') ||
        s.headName.toLowerCase().includes('cloth')
    ) ||
    transactions.some(
      (t) =>
        !t.isCancelled &&
        (t.allocations.some(
          (a) =>
            a.headName.toLowerCase().includes('dress') ||
            a.headName.toLowerCase().includes('uniform') ||
            a.headName.toLowerCase().includes('cloth')
        ) ||
          (t.remarks &&
            (t.remarks.toLowerCase().includes('dress') ||
              t.remarks.toLowerCase().includes('uniform') ||
              t.remarks.toLowerCase().includes('cloth'))))
    ) ||
    installments.some(
      (ins) =>
        ins.headName.toLowerCase().includes('dress') ||
        ins.headName.toLowerCase().includes('uniform') ||
        ins.headName.toLowerCase().includes('cloth')
    );

  if (hasBooks && hasDress) return 'BOTH';
  if (hasBooks) return 'BOOKS';
  if (hasDress) return 'DRESS';
  return 'NONE';
}

// Helper to compute individual student headwise breakdown
export function getStudentFeeBreakdown(item: StudentFinancialSummary) {
  const structures = item.structures || [];
  const schoolFeeStruct = structures.find(
    (s) =>
      !s.isSpotFee &&
      (s.headName.toLowerCase().includes('school') ||
        s.headName.toLowerCase().includes('tuition') ||
        s.headName.toLowerCase().includes('academic'))
  );
  const oldFeeStruct = structures.find(
    (s) =>
      s.headName.toLowerCase().includes('old') ||
      s.headName.toLowerCase().includes('due') ||
      s.headName.toLowerCase().includes('prev')
  );
  const transportFeeStruct = structures.find(
    (s) =>
      s.headName.toLowerCase().includes('transport') ||
      s.headName.toLowerCase().includes('bus') ||
      s.headName.toLowerCase().includes('van')
  );

  const stdClassFee = lookupStandardClassFee(item.student.className);
  const actualSchoolFee =
    schoolFeeStruct && schoolFeeStruct.actualFee > 0
      ? schoolFeeStruct.actualFee
      : stdClassFee > 0
      ? stdClassFee
      : item.actualFees > 0
      ? item.actualFees
      : 48000;

  const committedSchoolFee = schoolFeeStruct
    ? schoolFeeStruct.committedFee
    : item.committedFees > 0
    ? item.committedFees
    : 0;

  const discount =
    schoolFeeStruct && schoolFeeStruct.concession > 0
      ? schoolFeeStruct.concession
      : Math.max(0, actualSchoolFee - committedSchoolFee);

  const oldFee = oldFeeStruct ? oldFeeStruct.committedFee : 0;
  const transportFee = transportFeeStruct ? transportFeeStruct.committedFee : 0;

  // Net payable is sum of all committed fees
  const netPayable = item.totalPayable > 0
    ? item.totalPayable
    : committedSchoolFee + oldFee + transportFee;

  return {
    actualSchoolFee,
    discount,
    committedSchoolFee,
    oldFee,
    transportFee,
    netPayable,
    hasTransport: transportFee > 0,
    hasOldFee: oldFee > 0,
  };
}

export const MasterStudentTable: React.FC<MasterStudentTableProps> = ({
  summaries,
  schoolProfile,
  classList = [],
  onOpenCollectModal,
  onOpenPermissionModal,
  onOpenLedgerModal,
  onOpenReceiptModal,
  onOpenFeeStructureModal,
  onEditStudent,
  onToggleStudentActive,
  onUpdateActionStatus,
}) => {
  const currencySymbol = schoolProfile?.currencySymbol || '₹';
  const [searchQuery, setSearchQuery] = useState('');
  const [category1Filter, setCategory1Filter] = useState<'ALL' | 'BOOKS' | 'DRESS' | 'BOTH' | 'NONE'>('ALL');
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [selectedStudentToEdit, setSelectedStudentToEdit] = useState<Student | null>(null);
  const [selectedStatusDate, setSelectedStatusDate] = useState<string>(() =>
    getNextMultipleOfFiveDate(new Date())
  );
  const [sortBy, setSortBy] = useState<SortField>('dueTillDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<number>(0); // 0 = All rows
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isHeadwiseMode, setIsHeadwiseMode] = useState<boolean>(false);
  const [showColumnMenu, setShowColumnMenu] = useState<boolean>(false);

  // Persistent column visibility
  const [columns, setColumns] = useState<ColumnVisibilityState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_COLUMNS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMNS;
  });

  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Close column menu and status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
      if (
        activeStatusDropdownId &&
        !(event.target as HTMLElement)?.closest?.('.status-dropdown-container')
      ) {
        setActiveStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeStatusDropdownId]);

  const handleToggleColumn = (col: keyof ColumnVisibilityState) => {
    const updated = { ...columns, [col]: !columns[col] };
    setColumns(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COLUMNS));
    } catch {
      // ignore
    }
  };

  const handleSelectAllColumns = () => {
    const allVisible: ColumnVisibilityState = {
      sno: true,
      student: true,
      className: true,
      actualSchoolFee: true,
      discount: true,
      committedSchoolFee: true,
      oldFee: true,
      transportFee: true,
      netPayable: true,
      totalPaid: true,
      totalDue: true,
      dueTillDate: true,
      feeHealth: true,
      actions: true,
    };
    setColumns(allVisible);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allVisible));
    } catch {
      // ignore
    }
  };

  // Filter students based on search query and category1 filter
  const filteredSummaries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return summaries.filter((item) => {
      const student = item.student;

      // Category 1 filter
      if (category1Filter !== 'ALL') {
        const cat = getCategory1Status(item);
        if (category1Filter === 'BOOKS' && cat !== 'BOOKS') return false;
        if (category1Filter === 'DRESS' && cat !== 'DRESS') return false;
        if (category1Filter === 'BOTH' && cat !== 'BOTH') return false;
        if (category1Filter === 'NONE' && cat !== 'NONE') return false;
      }

      if (!q) return true;

      const matchesBasic =
        student.name.toLowerCase().includes(q) ||
        student.rollNo.toLowerCase().includes(q) ||
        student.className.toLowerCase().includes(q) ||
        (student.section && student.section.toLowerCase().includes(q)) ||
        (student.parentName && student.parentName.toLowerCase().includes(q)) ||
        (student.phone && student.phone.includes(q)) ||
        (student.address && student.address.toLowerCase().includes(q));

      if (matchesBasic) return true;

      // Smart fee head search (e.g. "transport", "bus", "old", "concession", "book", "dress")
      if (item.structures && item.structures.length > 0) {
        const matchesHead = item.structures.some((s) => {
          const headLower = s.headName.toLowerCase();
          if (headLower.includes(q)) return true;
          if (
            (q.includes('trans') || q.includes('bus')) &&
            (headLower.includes('transport') || headLower.includes('bus'))
          ) {
            return true;
          }
          if (
            (q.includes('old') || q.includes('prev')) &&
            (headLower.includes('old') || headLower.includes('due') || headLower.includes('prev'))
          ) {
            return true;
          }
          if (
            (q.includes('book') || q.includes('kit')) &&
            (headLower.includes('book') || headLower.includes('kit'))
          ) {
            return true;
          }
          if (
            (q.includes('dress') || q.includes('uniform')) &&
            (headLower.includes('dress') || headLower.includes('uniform'))
          ) {
            return true;
          }
          return false;
        });
        if (matchesHead) return true;
      }

      if ((q.includes('concession') || q.includes('discount')) && item.concession > 0) {
        return true;
      }

      return false;
    });
  }, [summaries, searchQuery, category1Filter]);

  // Sort summaries on any column
  const sortedSummaries = useMemo(() => {
    return [...filteredSummaries].sort((a, b) => {
      const aBk = getStudentFeeBreakdown(a);
      const bBk = getStudentFeeBreakdown(b);
      let diff = 0;

      switch (sortBy) {
        case 'sno': {
          const numA = parseInt(a.student.rollNo.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.student.rollNo.replace(/\D/g, ''), 10) || 0;
          diff = numA !== numB ? numA - numB : a.student.rollNo.localeCompare(b.student.rollNo);
          break;
        }
        case 'name':
          diff = a.student.name.localeCompare(b.student.name);
          break;
        case 'class': {
          const rankDiff = getClassSortIndex(a.student.className) - getClassSortIndex(b.student.className);
          diff = rankDiff !== 0 ? rankDiff : a.student.className.localeCompare(b.student.className);
          break;
        }
        case 'actualSchoolFee':
          diff = aBk.actualSchoolFee - bBk.actualSchoolFee;
          break;
        case 'discount':
          diff = aBk.discount - bBk.discount;
          break;
        case 'committedSchoolFee':
          diff = aBk.committedSchoolFee - bBk.committedSchoolFee;
          break;
        case 'oldFee':
          diff = aBk.oldFee - bBk.oldFee;
          break;
        case 'transportFee':
          diff = aBk.transportFee - bBk.transportFee;
          break;
        case 'netPayable':
          diff = (a.totalPayable || aBk.netPayable) - (b.totalPayable || bBk.netPayable);
          break;
        case 'totalPaid':
          diff = a.totalPaid - b.totalPaid;
          break;
        case 'totalDue':
          diff = a.totalDue - b.totalDue;
          break;
        case 'dueTillDate':
          diff = a.dueTillDate - b.dueTillDate;
          break;
        case 'feeHealth': {
          const rankMap: Record<string, number> = {
            STRONG_GREEN: 1,
            LIGHT_GREEN: 2,
            LIGHT_YELLOW: 3,
            LIGHT_RED: 4,
            STRONG_RED: 5,
          };
          diff = (rankMap[a.statusCategory] || 3) - (rankMap[b.statusCategory] || 3);
          break;
        }
        default:
          diff = a.dueTillDate - b.dueTillDate;
          break;
      }

      return sortOrder === 'asc' ? diff : -diff;
    });
  }, [filteredSummaries, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedSummaries.length / pageSize) || 1;
  const paginatedSummaries = useMemo(() => {
    if (pageSize === 0) return sortedSummaries;
    const start = (currentPage - 1) * pageSize;
    return sortedSummaries.slice(start, start + pageSize);
  }, [sortedSummaries, currentPage, pageSize]);

  // Filtered Totals for accountant verification
  const tableTotals = useMemo(() => {
    return filteredSummaries.reduce(
      (acc, curr) => {
        const bk = getStudentFeeBreakdown(curr);
        acc.actualSchoolFee += bk.actualSchoolFee || 0;
        acc.discount += bk.discount || 0;
        acc.committedSchoolFee += bk.committedSchoolFee || 0;
        acc.oldFee += bk.oldFee || 0;
        acc.transportFee += bk.transportFee || 0;
        acc.netPayable += curr.totalPayable || bk.netPayable || 0;
        acc.totalPaid += curr.totalPaid || 0;
        acc.totalDue += curr.totalDue || 0;
        acc.dueTillDate += curr.dueTillDate || 0;
        return acc;
      },
      {
        actualSchoolFee: 0,
        discount: 0,
        committedSchoolFee: 0,
        oldFee: 0,
        transportFee: 0,
        netPayable: 0,
        totalPaid: 0,
        totalDue: 0,
        dueTillDate: 0,
      }
    );
  }, [filteredSummaries]);

  // Headwise breakdown stats across filtered students
  const headwiseStats = useMemo(() => {
    const map = new Map<
      string,
      {
        headName: string;
        studentsCount: number;
        totalCommitted: number;
        totalConcession: number;
        totalPaid: number;
        totalDue: number;
      }
    >();

    filteredSummaries.forEach((item) => {
      if (item.structures && item.structures.length > 0) {
        item.structures.forEach((st) => {
          const head = st.headName || 'School Tuition Fee';
          const entry = map.get(head) || {
            headName: head,
            studentsCount: 0,
            totalCommitted: 0,
            totalConcession: 0,
            totalPaid: 0,
            totalDue: 0,
          };
          entry.studentsCount += 1;
          entry.totalCommitted += st.committedFee || 0;
          entry.totalConcession += st.concession || 0;

          const headIns = (item.installments || []).filter((ins) => ins.headName === head);
          const headPaid = headIns.reduce((sum, ins) => sum + (ins.paidAmount || 0), 0);
          const headDue = Math.max(0, (st.committedFee || 0) - headPaid);

          entry.totalPaid += headPaid;
          entry.totalDue += headDue;
          map.set(head, entry);
        });
      } else {
        const head = 'School Tuition Fee';
        const entry = map.get(head) || {
          headName: head,
          studentsCount: 0,
          totalCommitted: 0,
          totalConcession: 0,
          totalPaid: 0,
          totalDue: 0,
        };
        entry.studentsCount += 1;
        entry.totalCommitted += item.committedFees || 0;
        entry.totalConcession += item.concession || 0;
        entry.totalPaid += item.totalPaid || 0;
        entry.totalDue += item.totalDue || 0;
        map.set(head, entry);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalCommitted - a.totalCommitted);
  }, [filteredSummaries]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const totalActiveInFiltered = useMemo(() => {
    return filteredSummaries.filter((s) => s.student.isActive !== false).length;
  }, [filteredSummaries]);

  const totalInactiveInFiltered = useMemo(() => {
    return filteredSummaries.filter((s) => s.student.isActive === false).length;
  }, [filteredSummaries]);

  const totalVisibleCols = Object.values(columns).filter(Boolean).length;

  const renderSortIndicator = (field: SortField) => {
    if (sortBy !== field) return null;
    return (
      <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div
      id="master-student-table-container"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col transition-colors"
    >
      {/* Table Top Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/90 dark:bg-slate-900/90">
        {/* Left: Search Box + Clean student count indicators */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-students"
              type="text"
              placeholder="Search student, roll no, phone, parent, class..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Student Status Counts Pill */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
            <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
              Total: <strong>{filteredSummaries.length}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
              Active: <strong>{totalActiveInFiltered}</strong>
            </span>
            {totalInactiveInFiltered > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-semibold">
                Inactive: <strong>{totalInactiveInFiltered}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right: Column Visibility, Headwise Toggle & Page Size */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Column Visibility Dropdown */}
          <div className="relative" ref={columnMenuRef}>
            <button
              id="btn-toggle-columns-menu"
              type="button"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Customize columns visibility"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Columns</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded text-[9.5px] font-bold">
                {totalVisibleCols}/14
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-3 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-slate-900 dark:text-white">Column Visibility</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAllColumns}
                      className="text-[10.5px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetColumns}
                      className="text-[10.5px] text-slate-500 hover:underline font-medium cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {(Object.keys(COLUMN_LABELS) as (keyof ColumnVisibilityState)[]).map((colKey) => (
                    <label
                      key={colKey}
                      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer select-none transition-colors ${
                        columns[colKey]
                          ? 'bg-slate-50 dark:bg-slate-800/60 font-medium'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {columns[colKey] ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{COLUMN_LABELS[colKey]}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={columns[colKey]}
                        onChange={() => handleToggleColumn(colKey)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Saved automatically</span>
                  </div>
                  <span>{totalVisibleCols} visible</span>
                </div>
              </div>
            )}
          </div>

          {/* Books / Uniforms Purchase Filter */}
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <span className="hidden sm:inline font-semibold">Filter Purchases:</span>
            <select
              id="select-category1-filter"
              value={category1Filter}
              onChange={(e) => {
                setCategory1Filter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              title="Filter students by Books / Dress purchase status"
            >
              <option value="ALL">All Students</option>
              <option value="BOOKS">📚 Only Books Purchased</option>
              <option value="DRESS">👗 Only Dress Purchased</option>
              <option value="BOTH">📚👗 Both Books & Dress Purchased</option>
              <option value="NONE">❌ Didn't Purchase Anything</option>
            </select>
          </div>

          {/* Headwise Toggle Button */}
          <button
            id="btn-toggle-headwise"
            type="button"
            onClick={() => setIsHeadwiseMode(!isHeadwiseMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              isHeadwiseMode
                ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300 dark:ring-indigo-800'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Toggle Headwise fee breakdown statistics"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Headwise</span>
            {isHeadwiseMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
            )}
          </button>

          {/* Rows Per Page */}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>All ({filteredSummaries.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Headwise Stats Breakdown Section */}
      {isHeadwiseMode && (
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800/80 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                  Headwise Fee Financial Breakdown
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">
                    {headwiseStats.length} Fee Heads
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                  Head-by-head financial analysis across {filteredSummaries.length} filtered students
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHeadwiseMode(false)}
              className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 bg-white/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {headwiseStats.map((head) => {
              const collectionPct =
                head.totalCommitted > 0
                  ? Math.round((head.totalPaid / head.totalCommitted) * 100)
                  : 100;
              const isTuition =
                head.headName.toLowerCase().includes('tuition') ||
                head.headName.toLowerCase().includes('school');
              const isTransport =
                head.headName.toLowerCase().includes('transport') ||
                head.headName.toLowerCase().includes('bus');
              const isOldDue =
                head.headName.toLowerCase().includes('old') ||
                head.headName.toLowerCase().includes('due');

              const icon = isTuition ? '🏫' : isTransport ? '🚌' : isOldDue ? '⏳' : '📚';

              return (
                <div
                  key={head.headName}
                  className="bg-white dark:bg-slate-800/90 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-3 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                        <span>{icon}</span>
                        <span className="truncate">{head.headName}</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {head.studentsCount} stds
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[11px] py-1 border-y border-slate-100 dark:border-slate-700/60 my-1 font-mono">
                      <div>
                        <span className="text-[9.5px] text-slate-400 block font-sans">Committed</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(head.totalCommitted, currencySymbol)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 block font-sans">Collected</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(head.totalPaid, currencySymbol)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9.5px] text-rose-600 dark:text-rose-400 block font-sans">Due</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(head.totalDue, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Collection Rate</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{collectionPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          collectionPct >= 80
                            ? 'bg-emerald-500'
                            : collectionPct >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, collectionPct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Table Grid */}
      <div className="overflow-x-auto">
        <table id="table-students-master" className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 select-none tracking-tight">
              {/* 1. S.NO */}
              {columns.sno && (
                <th
                  className="py-2.5 px-2 text-center w-12 cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => handleSort('sno')}
                  title="Sort by Serial Number"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>S.NO</span>
                    {renderSortIndicator('sno')}
                  </div>
                </th>
              )}

              {/* 2. Student Details */}
              {columns.student && (
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-emerald-600 transition-colors min-w-[170px]"
                  onClick={() => handleSort('name')}
                  title="Sort by Student Name"
                >
                  <div className="flex items-center gap-1">
                    <span>Student Details</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>
              )}

              {/* 3. Class */}
              {columns.className && (
                <th
                  className="py-2.5 px-2.5 cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('class')}
                  title="Sort by Class"
                >
                  <div className="flex items-center gap-1">
                    <span>Class</span>
                    {renderSortIndicator('class')}
                  </div>
                </th>
              )}

              {/* 4. Actual School Fees */}
              {columns.actualSchoolFee && (
                <th
                  className="py-2.5 px-2.5 text-right font-semibold cursor-pointer hover:text-emerald-600 transition-colors text-slate-600 dark:text-slate-400 whitespace-nowrap"
                  onClick={() => handleSort('actualSchoolFee')}
                  title="Sort by Actual Standard School Fees"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Actual School Fees</span>
                    {renderSortIndicator('actualSchoolFee')}
                  </div>
                </th>
              )}

              {/* 5. Discount */}
              {columns.discount && (
                <th
                  className="py-2.5 px-2.5 text-right font-semibold cursor-pointer hover:text-emerald-600 transition-colors text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
                  onClick={() => handleSort('discount')}
                  title="Sort by Discount / Concession"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Discount</span>
                    {renderSortIndicator('discount')}
                  </div>
                </th>
              )}

              {/* 6. Committed School Fees */}
              {columns.committedSchoolFee && (
                <th
                  className="py-2.5 px-2.5 text-right font-bold cursor-pointer hover:text-emerald-600 transition-colors text-slate-900 dark:text-slate-100 whitespace-nowrap"
                  onClick={() => handleSort('committedSchoolFee')}
                  title="Sort by Committed School Fees"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Committed School Fees</span>
                    {renderSortIndicator('committedSchoolFee')}
                  </div>
                </th>
              )}

              {/* 7. Old Fees */}
              {columns.oldFee && (
                <th
                  className="py-2.5 px-2.5 text-right font-semibold cursor-pointer hover:text-emerald-600 transition-colors text-rose-700 dark:text-rose-400 whitespace-nowrap"
                  onClick={() => handleSort('oldFee')}
                  title="Sort by Old / Previous Year Due Fees"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Old Fees</span>
                    {renderSortIndicator('oldFee')}
                  </div>
                </th>
              )}

              {/* 8. Transport Fees */}
              {columns.transportFee && (
                <th
                  className="py-2.5 px-2.5 text-right font-semibold cursor-pointer hover:text-emerald-600 transition-colors text-amber-700 dark:text-amber-400 whitespace-nowrap"
                  onClick={() => handleSort('transportFee')}
                  title="Sort by Transport Fees"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Transport Fees</span>
                    {renderSortIndicator('transportFee')}
                  </div>
                </th>
              )}

              {/* 9. Net Payable */}
              {columns.netPayable && (
                <th
                  className="py-2.5 px-2.5 text-right font-black cursor-pointer hover:text-emerald-600 transition-colors text-slate-900 dark:text-white whitespace-nowrap bg-slate-200/50 dark:bg-slate-800/80"
                  onClick={() => handleSort('netPayable')}
                  title="Sort by Net Payable (Committed School Fees + Old Fees + Transport Fees)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Payable</span>
                    {renderSortIndicator('netPayable')}
                  </div>
                </th>
              )}

              {/* 10. Total Paid */}
              {columns.totalPaid && (
                <th
                  className="py-2.5 px-2.5 text-right font-bold cursor-pointer hover:text-emerald-600 transition-colors text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
                  onClick={() => handleSort('totalPaid')}
                  title="Sort by Total Paid"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Paid</span>
                    {renderSortIndicator('totalPaid')}
                  </div>
                </th>
              )}

              {/* 11. Total Due */}
              {columns.totalDue && (
                <th
                  className="py-2.5 px-2.5 text-right font-bold cursor-pointer hover:text-emerald-600 transition-colors text-slate-800 dark:text-slate-200 whitespace-nowrap"
                  onClick={() => handleSort('totalDue')}
                  title="Sort by Total Remaining Due"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Due</span>
                    {renderSortIndicator('totalDue')}
                  </div>
                </th>
              )}

              {/* 12. Due till date */}
              {columns.dueTillDate && (
                <th
                  className="py-2.5 px-3 text-right font-black cursor-pointer bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('dueTillDate')}
                  title="Sort by Overdue amount matured as of today"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Due till date</span>
                    {renderSortIndicator('dueTillDate')}
                  </div>
                </th>
              )}

              {/* 13. Fee health & Action */}
              {columns.feeHealth && (
                <th
                  className="py-2.5 px-2.5 text-center font-bold cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('feeHealth')}
                  title="Sort by Fee Health Status"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Fee Health & Action</span>
                    {renderSortIndicator('feeHealth')}
                  </div>
                </th>
              )}

              {/* 14. Actions */}
              {columns.actions && <th className="py-2.5 px-3 text-center w-36 whitespace-nowrap">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {paginatedSummaries.length === 0 ? (
              <tr>
                <td colSpan={totalVisibleCols} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No students match your filter criteria.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      Clear search filter
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSummaries.map((item, index) => {
                const { student, statusCategory, actionTier } = item;
                const statusMeta = getStatusCategoryMeta(statusCategory);
                const latestTransaction = item.transactions[item.transactions.length - 1];
                const serialNumber =
                  pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1;

                const bk = getStudentFeeBreakdown(item);

                // Row click handler to automatically trigger fee collection
                const handleRowClick = () => {
                  onOpenCollectModal(student);
                };

                const cellPadding = 'py-2';

                return (
                  <tr
                    key={student.id}
                    id={`row-student-${student.id}`}
                    onClick={handleRowClick}
                    className={`transition-colors cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 group ${
                      !student.isActive ? 'bg-slate-100/60 dark:bg-slate-900/60 opacity-60' : ''
                    }`}
                    title="Click row to collect fees"
                  >
                    {/* 1. S.NO */}
                    {columns.sno && (
                      <td
                        className={`${cellPadding} px-2 text-center font-mono text-slate-400 text-[11px] font-medium`}
                      >
                        {serialNumber}
                      </td>
                    )}

                    {/* 2. Student Details */}
                    {columns.student && (
                      <td className={`${cellPadding} px-3`}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {student.name}
                            </span>
                            {bk.hasTransport && (
                              <span
                                className="inline-flex items-center text-xs select-none"
                                title="Transport / Bus Fee Assigned"
                              >
                                🚌
                              </span>
                            )}
                            {bk.hasOldFee && (
                              <span
                                className="inline-flex items-center text-xs select-none"
                                title="Old / Previous Year Due Assigned"
                              >
                                ⏳
                              </span>
                            )}
                            {!student.isActive && (
                              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[9px] font-bold">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              #{student.rollNo}
                            </span>
                            {student.parentName &&
                              !student.parentName.toLowerCase().startsWith('parent of') &&
                              student.parentName.trim().toLowerCase() !== 'parent' && (
                                <>
                                  <span>•</span>
                                  <span>{student.parentName}</span>
                                </>
                              )}
                            {student.phone && (
                              <>
                                <span>•</span>
                                <a
                                  href={`tel:${student.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                                  title="Call parent"
                                >
                                  {student.phone}
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* 3. Class */}
                    {columns.className && (
                      <td className={`${cellPadding} px-2.5 whitespace-nowrap`}>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {student.className}
                        </span>
                        {student.section && (
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
                            - {student.section}
                          </span>
                        )}
                      </td>
                    )}

                    {/* 4. Actual School Fees */}
                    {columns.actualSchoolFee && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-medium text-slate-500 dark:text-slate-400`}
                      >
                        {formatCurrency(bk.actualSchoolFee, currencySymbol)}
                      </td>
                    )}

                    {/* 5. Discount */}
                    {columns.discount && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-medium text-emerald-700 dark:text-emerald-400`}
                      >
                        {bk.discount > 0 ? formatCurrency(bk.discount, currencySymbol) : '—'}
                      </td>
                    )}

                    {/* 6. Committed School Fees */}
                    {columns.committedSchoolFee && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100`}
                      >
                        {formatCurrency(bk.committedSchoolFee, currencySymbol)}
                      </td>
                    )}

                    {/* 7. Old Fees */}
                    {columns.oldFee && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-medium text-rose-700 dark:text-rose-400`}
                      >
                        {bk.oldFee > 0 ? formatCurrency(bk.oldFee, currencySymbol) : '—'}
                      </td>
                    )}

                    {/* 8. Transport Fees */}
                    {columns.transportFee && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-medium text-amber-700 dark:text-amber-400`}
                      >
                        {bk.transportFee > 0 ? formatCurrency(bk.transportFee, currencySymbol) : '—'}
                      </td>
                    )}

                    {/* 9. Net Payable */}
                    {columns.netPayable && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-100/50 dark:bg-slate-800/40`}
                      >
                        {formatCurrency(bk.netPayable, currencySymbol)}
                      </td>
                    )}

                    {/* 10. Total Paid */}
                    {columns.totalPaid && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400`}
                      >
                        {formatCurrency(item.totalPaid, currencySymbol)}
                      </td>
                    )}

                    {/* 11. Total Due */}
                    {columns.totalDue && (
                      <td
                        className={`${cellPadding} px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200`}
                      >
                        {formatCurrency(item.totalDue, currencySymbol)}
                      </td>
                    )}

                    {/* 12. Due till date */}
                    {columns.dueTillDate && (
                      <td
                        className={`${cellPadding} px-3 text-right font-mono font-black text-rose-700 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30`}
                      >
                        {formatCurrency(item.dueTillDate, currencySymbol)}
                      </td>
                    )}

                    {/* 13. Fee Health & Action */}
                    {columns.feeHealth && (
                      <td className={`${cellPadding} px-2.5 text-center whitespace-nowrap`}>
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusMeta.bgClass}`}
                            title={statusMeta.label}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`}></span>
                            {statusMeta.label}
                          </span>

                          {actionTier === 'ID_CARD' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[9px]">
                              <Award className="w-2.5 h-2.5 text-emerald-600" />
                              ID Card
                            </span>
                          )}

                          {actionTier === 'PERMISSION_SLIP' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-bold text-[9px]">
                              <CalendarClock className="w-2.5 h-2.5 text-indigo-600" />
                              Till {formatDate(student.permissionExpiresAt || '')}
                            </span>
                          )}

                          {actionTier === 'ACTION_REQUIRED' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold text-[9px] bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200">
                              <Flame className="w-2.5 h-2.5 text-rose-600" />
                              Action
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 14. Actions */}
                    {columns.actions && (
                      <td
                        className={`${cellPadding} px-3`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5 relative">
                          {/* 1. Full Student Ledger Statement */}
                          <button
                            id={`btn-ledger-${student.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLedgerModal(student);
                            }}
                            className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                            title="Student Financial Ledger & Audit Statement (📋)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Books Button */}
                          <button
                            id={`btn-collect-books-${student.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCollectModal(student, 'BOOKS');
                            }}
                            className="p-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                            title="Collect Books Fee (📚)"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Dress / Uniform Button */}
                          <button
                            id={`btn-collect-dress-${student.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCollectModal(student, 'DRESS');
                            }}
                            className="p-1.5 rounded-md bg-pink-50 hover:bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition-colors cursor-pointer"
                            title="Collect Uniform / Dress Fee (👗)"
                          >
                            <Shirt className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Action Status Button */}
                          {onUpdateActionStatus && (
                            <div className="relative status-dropdown-container">
                              <button
                                id={`btn-change-status-${student.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStatusDropdownId(
                                    activeStatusDropdownId === student.id ? null : student.id
                                  );
                                }}
                                className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                                  actionTier === 'ID_CARD'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : actionTier === 'PERMISSION_SLIP'
                                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                }`}
                                title="Action Status (ID Card / Permission Slip / Action Required)"
                              >
                                {actionTier === 'ID_CARD' ? (
                                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                                ) : actionTier === 'PERMISSION_SLIP' ? (
                                  <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                                )}
                              </button>

                              {/* Status Override Popover */}
                              {activeStatusDropdownId === student.id && (
                                <div
                                  className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2.5 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="font-bold text-slate-900 dark:text-white pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <span>Change Action Status</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveStatusDropdownId(null)}
                                      className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  <div className="space-y-1.5">
                                    {/* 1. ID Card */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateActionStatus(student.id, undefined, undefined, 'id_card');
                                        setActiveStatusDropdownId(null);
                                      }}
                                      className="w-full flex items-center gap-2 p-1.5 rounded-lg text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors font-medium text-emerald-800 dark:text-emerald-300 cursor-pointer"
                                    >
                                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <div>
                                        <div className="font-bold">Issue ID Card</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                          Permit full clearance
                                        </div>
                                      </div>
                                    </button>

                                    {/* 2. Permission Slip */}
                                    <div className="p-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60">
                                      <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                                        <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Permission Slip</span>
                                      </div>
                                      <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1.5">
                                        Issue till next 5th multiple:
                                      </div>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <input
                                          type="date"
                                          value={selectedStatusDate}
                                          onChange={(e) => setSelectedStatusDate(e.target.value)}
                                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs text-slate-800 dark:text-slate-200"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onUpdateActionStatus(
                                            student.id,
                                            selectedStatusDate,
                                            'Manual permission grace granted',
                                            'permission'
                                          );
                                          setActiveStatusDropdownId(null);
                                        }}
                                        className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px] shadow-2xs cursor-pointer"
                                      >
                                        Apply Permission Slip
                                      </button>
                                    </div>

                                    {/* 3. Action Required */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateActionStatus(
                                          student.id,
                                          undefined,
                                          undefined,
                                          'action'
                                        );
                                        setActiveStatusDropdownId(null);
                                      }}
                                      className="w-full flex items-center gap-2 p-1.5 rounded-lg text-left hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors font-medium text-rose-800 dark:text-rose-300 cursor-pointer"
                                    >
                                      <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                                      <div>
                                        <div className="font-bold">Action Required</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                          Follow-up / withhold card
                                        </div>
                                      </div>
                                    </button>

                                    {/* 4. Reset to Auto */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateActionStatus(student.id, undefined, undefined, 'auto');
                                        setActiveStatusDropdownId(null);
                                      }}
                                      className="w-full text-center py-1 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline cursor-pointer"
                                    >
                                      Reset to Auto Calculation
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 4. Settings (Edit Student Details & Fee Structure) */}
                          <button
                            id={`btn-settings-${student.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFeeStructureModal(student);
                            }}
                            className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Settings (Edit Student Profile, Fees & Discounts)"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>

                          {/* 5. Print Receipt */}
                          <button
                            id={`btn-receipt-${student.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (latestTransaction) {
                                onOpenReceiptModal(latestTransaction);
                              } else {
                                alert('No payment transactions on record yet for this student.');
                              }
                            }}
                            disabled={!latestTransaction}
                            className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title={
                              latestTransaction
                                ? `Print Receipt (${latestTransaction.receiptNo})`
                                : 'No payments recorded'
                            }
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* 6. WhatsApp Message */}
                          {student.phone ? (
                            <a
                              id={`btn-whatsapp-${student.id}`}
                              href={`https://wa.me/91${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Dear Parent, reminder from ${schoolProfile.schoolName || schoolProfile.name || 'Kakatiya School'} regarding fee payment for ${student.name} of (Class ${student.className}). You total due till date ${new Date().toLocaleDateString('en-GB')} amount is ₹${item.dueTillDate.toLocaleString('en-IN')}. Thank you.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                              title="Send WhatsApp Fee Reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 rounded-md bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 border border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed"
                              title="No mobile number registered"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Reconciliation Summary Footer */}
          {filteredSummaries.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                {/* 1. S.NO & Details & Class spanning label */}
                {columns.sno && <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-xs font-semibold">Σ</td>}
                {columns.student && (
                  <td className="py-2.5 px-3 uppercase tracking-wider text-xs font-black">
                    Totals ({filteredSummaries.length} stds):
                  </td>
                )}
                {columns.className && <td className="py-2.5 px-2.5"></td>}

                {/* 4. Actual School Fees Total */}
                {columns.actualSchoolFee && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                    {formatCurrency(tableTotals.actualSchoolFee, currencySymbol)}
                  </td>
                )}

                {/* 5. Discount Total */}
                {columns.discount && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(tableTotals.discount, currencySymbol)}
                  </td>
                )}

                {/* 6. Committed School Fees Total */}
                {columns.committedSchoolFee && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs font-bold">
                    {formatCurrency(tableTotals.committedSchoolFee, currencySymbol)}
                  </td>
                )}

                {/* 7. Old Fees Total */}
                {columns.oldFee && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs text-rose-700 dark:text-rose-400">
                    {formatCurrency(tableTotals.oldFee, currencySymbol)}
                  </td>
                )}

                {/* 8. Transport Fees Total */}
                {columns.transportFee && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs text-amber-700 dark:text-amber-400">
                    {formatCurrency(tableTotals.transportFee, currencySymbol)}
                  </td>
                )}

                {/* 9. Net Payable Total */}
                {columns.netPayable && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs font-black bg-slate-200/60 dark:bg-slate-700/60 text-slate-900 dark:text-white">
                    {formatCurrency(tableTotals.netPayable, currencySymbol)}
                  </td>
                )}

                {/* 10. Total Paid Total */}
                {columns.totalPaid && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                    {formatCurrency(tableTotals.totalPaid, currencySymbol)}
                  </td>
                )}

                {/* 11. Total Due Total */}
                {columns.totalDue && (
                  <td className="py-2.5 px-2.5 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(tableTotals.totalDue, currencySymbol)}
                  </td>
                )}

                {/* 12. Due till date Total */}
                {columns.dueTillDate && (
                  <td className="py-2.5 px-3 text-right font-mono text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-950/60">
                    {formatCurrency(tableTotals.dueTillDate, currencySymbol)}
                  </td>
                )}

                {/* 13. Fee Health */}
                {columns.feeHealth && <td className="py-2.5 px-2.5"></td>}

                {/* 14. Actions */}
                {columns.actions && <td className="py-2.5 px-3"></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Controls */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
            {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, sortedSummaries.length)} of {sortedSummaries.length})
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold cursor-pointer"
            >
              First
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold cursor-pointer"
            >
              Last
            </button>
          </div>
        </div>
      )}
      {/* Edit Student Details Modal */}
      {selectedStudentToEdit && (
        <EditStudentModal
          student={selectedStudentToEdit}
          classList={classList}
          onSave={(updated) => {
            if (onEditStudent) {
              onEditStudent(updated);
            }
            setSelectedStudentToEdit(null);
          }}
          onClose={() => setSelectedStudentToEdit(null)}
        />
      )}
    </div>
  );
};
