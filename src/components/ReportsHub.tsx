import React, { useState, useMemo } from 'react';
import {
  Student,
  StudentFinancialSummary,
  PaymentTransaction,
  SchoolProfile,
  AnalyticsSummary,
} from '../types';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  History,
  Layers,
  MessageCircle,
  Phone,
  Printer,
  Receipt,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { formatCurrency as formatNumWords } from '../utils/numberToWords';

export type ReportSubTab = 'DUE' | 'PAID' | 'SUMMARY';

interface ReportsHubProps {
  initialTab?: ReportSubTab;
  summaries: StudentFinancialSummary[];
  transactions: PaymentTransaction[];
  schoolProfile: SchoolProfile;
  analytics: AnalyticsSummary;
  classList: string[];
  onOpenPaymentModal?: (student: Student, headName?: string) => void;
  onOpenLedgerModal?: (student: Student) => void;
  onOpenReceiptModal?: (transaction: PaymentTransaction) => void;
  onBackToDashboard: () => void;
  onTabChange?: (tab: ReportSubTab) => void;
}

export const ReportsHub: React.FC<ReportsHubProps> = ({
  initialTab = 'SUMMARY',
  summaries,
  transactions,
  schoolProfile,
  analytics,
  classList,
  onOpenPaymentModal,
  onOpenLedgerModal,
  onOpenReceiptModal,
  onBackToDashboard,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<ReportSubTab>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tab: ReportSubTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Filters for Due Report
  const [dueClassFilter, setDueClassFilter] = useState('ALL');
  const [dueStatusFilter, setDueStatusFilter] = useState<'ALL' | 'DUE' | 'OVERDUE_TILL_DATE' | 'EXCESS' | 'CRITICAL'>('ALL');
  const [dueSearchQuery, setDueSearchQuery] = useState('');
  const [dueSortBy, setDueSortBy] = useState<'totalDue' | 'dueTillDate' | 'name' | 'rollNo'>('totalDue');
  const [dueSortOrder, setDueSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filters for Paid Report
  const [paidClassFilter, setPaidClassFilter] = useState('ALL');
  const [paidModeFilter, setPaidModeFilter] = useState<'ALL' | 'Cash' | 'UPI' | 'Cheque'>('ALL');
  const [paidDateFilter, setPaidDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_30_DAYS'>('ALL');
  const [paidSearchQuery, setPaidSearchQuery] = useState('');

  // Currency Formatter
  const currencySymbol = schoolProfile?.currencySymbol || '₹';
  const formatCurrency = (amount: number) => {
    const isNeg = amount < 0;
    const absVal = Math.abs(Math.round(amount));
    return `${isNeg ? '-' : ''}${currencySymbol}${absVal.toLocaleString('en-IN')}`;
  };

  // -------------------------------------------------------------
  // 1. DUE REPORT DATA PREPARATION
  // -------------------------------------------------------------
  const dueReportData = useMemo(() => {
    return summaries
      .filter((s) => {
        // Class filter
        if (dueClassFilter !== 'ALL' && s.student.className !== dueClassFilter) return false;

        // Search query
        if (dueSearchQuery.trim()) {
          const q = dueSearchQuery.toLowerCase();
          const matchName = s.student.name.toLowerCase().includes(q);
          const matchRoll = s.student.rollNo.toLowerCase().includes(q);
          const matchPhone = (s.student.phone || '').includes(q);
          const matchClass = s.student.className.toLowerCase().includes(q);
          if (!matchName && !matchRoll && !matchPhone && !matchClass) return false;
        }

        // Status filter
        if (dueStatusFilter === 'DUE') {
          return s.totalDue > 0;
        }
        if (dueStatusFilter === 'OVERDUE_TILL_DATE') {
          return s.dueTillDate > 0;
        }
        if (dueStatusFilter === 'EXCESS') {
          return s.totalDue < 0 || s.totalPaid > s.totalPayable;
        }
        if (dueStatusFilter === 'CRITICAL') {
          return s.totalDue >= 20000;
        }

        return true;
      })
      .sort((a, b) => {
        if (dueSortBy === 'totalDue') {
          return dueSortOrder === 'desc' ? b.totalDue - a.totalDue : a.totalDue - b.totalDue;
        }
        if (dueSortBy === 'dueTillDate') {
          return dueSortOrder === 'desc' ? b.dueTillDate - a.dueTillDate : a.dueTillDate - b.dueTillDate;
        }
        if (dueSortBy === 'rollNo') {
          const rA = parseInt(a.student.rollNo, 10) || 0;
          const rB = parseInt(b.student.rollNo, 10) || 0;
          return dueSortOrder === 'desc' ? rB - rA : rA - rB;
        }
        return dueSortOrder === 'desc'
          ? b.student.name.localeCompare(a.student.name)
          : a.student.name.localeCompare(b.student.name);
      });
  }, [summaries, dueClassFilter, dueSearchQuery, dueStatusFilter, dueSortBy, dueSortOrder]);

  const dueMetrics = useMemo(() => {
    let countWithDue = 0;
    let countOverdueTillDate = 0;
    let countExcess = 0;
    let countCritical = 0;
    let totalOutstandingDue = 0;
    let totalOverdueTillDate = 0;
    let totalExcessAmount = 0;

    summaries.forEach((s) => {
      if (s.totalDue > 0) {
        countWithDue++;
        totalOutstandingDue += s.totalDue;
      }
      if (s.dueTillDate > 0) {
        countOverdueTillDate++;
        totalOverdueTillDate += s.dueTillDate;
      }
      if (s.totalDue < 0) {
        countExcess++;
        totalExcessAmount += Math.abs(s.totalDue);
      }
      if (s.totalDue >= 20000) {
        countCritical++;
      }
    });

    return {
      countWithDue,
      countOverdueTillDate,
      countExcess,
      countCritical,
      totalOutstandingDue,
      totalOverdueTillDate,
      totalExcessAmount,
      totalStudents: summaries.length,
    };
  }, [summaries]);

  // -------------------------------------------------------------
  // 2. PAID REPORT DATA PREPARATION
  // -------------------------------------------------------------
  const paidReportData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    return transactions
      .filter((t) => !t.isCancelled)
      .filter((t) => {
        // Mode filter
        if (paidModeFilter !== 'ALL' && t.paymentMode !== paidModeFilter) return false;

        // Class filter
        if (paidClassFilter !== 'ALL' && t.studentClass !== paidClassFilter) return false;

        // Date filter
        const tDate = (t.date || '').split('T')[0].split(' ')[0];
        if (paidDateFilter === 'TODAY' && tDate !== todayStr) return false;
        if (paidDateFilter === 'THIS_MONTH' && !tDate.startsWith(currentMonthStr)) return false;
        if (paidDateFilter === 'LAST_30_DAYS' && tDate < thirtyDaysAgo) return false;

        // Search query
        if (paidSearchQuery.trim()) {
          const q = paidSearchQuery.toLowerCase();
          const matchName = t.studentName.toLowerCase().includes(q);
          const matchReceipt = t.receiptNo.toLowerCase().includes(q);
          const matchRoll = (t.studentRollNo || '').toLowerCase().includes(q);
          const matchRef = (t.referenceNo || '').toLowerCase().includes(q);
          const matchRemarks = (t.remarks || '').toLowerCase().includes(q);
          if (!matchName && !matchReceipt && !matchRoll && !matchRef && !matchRemarks) return false;
        }

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, paidModeFilter, paidClassFilter, paidDateFilter, paidSearchQuery]);

  const paidMetrics = useMemo(() => {
    let totalCash = 0;
    let totalUpi = 0;
    let totalCheque = 0;
    let totalPaidSum = 0;

    transactions.forEach((t) => {
      if (t.isCancelled) return;
      totalPaidSum += t.amount;
      if (t.paymentMode === 'Cash') totalCash += t.amount;
      else if (t.paymentMode === 'UPI') totalUpi += t.amount;
      else if (t.paymentMode === 'Cheque') totalCheque += t.amount;
    });

    return {
      totalPaidSum,
      totalCash,
      totalUpi,
      totalCheque,
      totalTransactions: transactions.filter((t) => !t.isCancelled).length,
    };
  }, [transactions]);

  // -------------------------------------------------------------
  // 3. SUMMARY REPORT: CLASS-WISE BREAKDOWN
  // -------------------------------------------------------------
  const classBreakdown = useMemo(() => {
    const classOrder = [
      'Nursery',
      'LKG',
      'UKG',
      'Class 1',
      'Class 2',
      'Class 3',
      'Class 4',
      'Class 5',
      'Class 6',
      'Class 7',
      'Class 8',
      'Class 9',
      'Class 10',
    ];

    const map: Record<
      string,
      {
        className: string;
        studentCount: number;
        schoolFee: number;
        transportFee: number;
        oldDueFee: number;
        booksFee: number;
        totalPayable: number;
        totalPaid: number;
        totalDue: number;
        dueTillDate: number;
        excessCount: number;
        exactCount: number;
        dueCount: number;
      }
    > = {};

    summaries.forEach((s) => {
      const c = s.student.className || 'Unknown';
      if (!map[c]) {
        map[c] = {
          className: c,
          studentCount: 0,
          schoolFee: 0,
          transportFee: 0,
          oldDueFee: 0,
          booksFee: 0,
          totalPayable: 0,
          totalPaid: 0,
          totalDue: 0,
          dueTillDate: 0,
          excessCount: 0,
          exactCount: 0,
          dueCount: 0,
        };
      }

      map[c].studentCount++;
      map[c].totalPayable += s.totalPayable;
      map[c].totalPaid += s.totalPaid;
      map[c].totalDue += s.totalDue;
      map[c].dueTillDate += s.dueTillDate;

      // Extract heads
      s.structures.forEach((st) => {
        const h = st.headName.toLowerCase();
        if (h.includes('tuition') || h.includes('school')) {
          map[c].schoolFee += st.committedFee;
        } else if (h.includes('transport') || h.includes('bus')) {
          map[c].transportFee += st.committedFee;
        } else if (h.includes('old')) {
          map[c].oldDueFee += st.committedFee;
        } else if (h.includes('book') || h.includes('stationery')) {
          map[c].booksFee += st.committedFee;
        }
      });

      if (s.totalDue < 0) map[c].excessCount++;
      else if (s.totalDue === 0) map[c].exactCount++;
      else map[c].dueCount++;
    });

    return Object.values(map).sort((a, b) => {
      const idxA = classOrder.indexOf(a.className);
      const idxB = classOrder.indexOf(b.className);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.className.localeCompare(b.className);
    });
  }, [summaries]);

  // CSV Exporters
  const exportDueReportCSV = () => {
    const headers = [
      'Roll No',
      'Class',
      'Student Name',
      'Phone',
      'Total Payable',
      'Total Paid',
      'Total Due',
      'Due Till Date',
      'Status',
    ];
    const lines = [headers.join(',')];
    dueReportData.forEach((s) => {
      lines.push(
        [
          s.student.rollNo,
          `"${s.student.className}"`,
          `"${s.student.name}"`,
          `"${s.student.phone || ''}"`,
          s.totalPayable,
          s.totalPaid,
          s.totalDue,
          s.dueTillDate,
          `"${s.statusCategory}"`,
        ].join(',')
      );
    });
    downloadCSV(lines.join('\n'), `kakatiya_due_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPaidReportCSV = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Roll No',
      'Student Name',
      'Class',
      'Amount',
      'Payment Mode',
      'Reference No',
      'Remarks',
    ];
    const lines = [headers.join(',')];
    paidReportData.forEach((t) => {
      lines.push(
        [
          `"${t.receiptNo}"`,
          `"${t.date}"`,
          `"${t.studentRollNo || ''}"`,
          `"${t.studentName}"`,
          `"${t.studentClass}"`,
          t.amount,
          `"${t.paymentMode}"`,
          `"${t.referenceNo || ''}"`,
          `"${(t.remarks || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    });
    downloadCSV(lines.join('\n'), `kakatiya_paid_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportSummaryReportCSV = () => {
    const headers = [
      'Class',
      'Students',
      'Committed Tuition',
      'Transport Fee',
      'Old Due Fee',
      'Books Fee',
      'Total Payable',
      'Total Paid',
      'Total Due',
      'Collection %',
    ];
    const lines = [headers.join(',')];
    classBreakdown.forEach((c) => {
      const rate = c.totalPayable > 0 ? Math.round((c.totalPaid / c.totalPayable) * 100) : 0;
      lines.push(
        [
          `"${c.className}"`,
          c.studentCount,
          c.schoolFee,
          c.transportFee,
          c.oldDueFee,
          c.booksFee,
          c.totalPayable,
          c.totalPaid,
          c.totalDue,
          `"${rate}%"`,
        ].join(',')
      );
    });
    downloadCSV(lines.join('\n'), `kakatiya_executive_summary_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-indigo-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-400/30 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-300" />
                Comprehensive Reporting Hub
              </span>
              <span className="text-xs text-indigo-200 font-semibold">
                Kakatiya School Boduppal (AY {schoolProfile?.academicYear || '2026-27'})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Financial Dues, Receipts & Executive Summary
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-3xl leading-relaxed">
              Exportable, printable statements for <strong>229 Active Students</strong>. Total Committed:{' '}
              <span className="text-emerald-300 font-bold">{formatCurrency(6448344)}</span> • Realized Paid:{' '}
              <span className="text-teal-300 font-bold">{formatCurrency(2198847)}</span> • Outstanding Due:{' '}
              <span className="text-rose-300 font-bold">{formatCurrency(4249497)}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>

            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-indigo-800/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSelectTab('SUMMARY')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'SUMMARY'
                ? 'bg-emerald-500 text-slate-950 shadow-lg scale-102'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Executive Summary Report</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/20 text-[10px] font-mono">
              13 Classes
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('DUE')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'DUE'
                ? 'bg-rose-500 text-white shadow-lg scale-102'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>2. Due & Overdue Report</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/20 text-[10px] font-mono">
              {dueMetrics.countWithDue} Students
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('PAID')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'PAID'
                ? 'bg-teal-400 text-slate-950 shadow-lg scale-102'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>3. Paid & Realized Collections Report</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/20 text-[10px] font-mono">
              {paidMetrics.totalTransactions} Txns
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: EXECUTIVE SUMMARY REPORT */}
      {/* ========================================================= */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-6">
          {/* Executive Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-500" />
                Total Committed Revenue
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(6448344)}
              </div>
              <p className="text-[11px] text-slate-400">
                Tuition (₹56.49L) + Trans (₹4.05L) + Old (₹3.83L) + Books (₹10.2K)
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-500/30 shadow-xs space-y-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Realized Paid Collections
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(2198847)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Overall Efficiency: <strong>34.1% Collected</strong>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-500/30 shadow-xs space-y-1">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Total Outstanding Due
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {formatCurrency(4249497)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Total Uncollected Balance across 173 Students
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-500/30 shadow-xs space-y-1">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Pro-Rated Target Payable
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(2648268)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Variance from Sept Target: <strong>-₹4,49,421</strong>
              </p>
            </div>
          </div>

          {/* Fee Heads Bifurcation Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Fee-Head Performance & Collection Rate (4 Heads)
              </h2>
              <span className="text-xs text-slate-500">AY 2026-27 Active Accounts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Head 1: Tuition */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-white flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                    School Tuition Fee
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px]">
                    36.4%
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Committed:</span>
                    <strong className="font-mono">{formatCurrency(5649370)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Collected:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(2057976)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Balance Due:</span>
                    <strong className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(3591394)}</strong>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '36.4%' }} />
                </div>
              </div>

              {/* Head 2: Transport */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-white flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5 text-amber-500" />
                    Transport / Bus
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono text-[10px]">
                    27.0%
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Committed:</span>
                    <strong className="font-mono">{formatCurrency(405250)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Collected:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(109493)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Balance Due:</span>
                    <strong className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(295757)}</strong>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '27.0%' }} />
                </div>
              </div>

              {/* Head 3: Old Due */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-white flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-purple-500" />
                    Old Due Carryover
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px]">
                    3.7%
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Committed:</span>
                    <strong className="font-mono">{formatCurrency(383500)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Collected:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(14154)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Balance Due:</span>
                    <strong className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(369346)}</strong>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: '3.7%' }} />
                </div>
              </div>

              {/* Head 4: Books Fee */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-white flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                    Books & Stationery
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-mono text-[10px]">
                    100%
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Committed:</span>
                    <strong className="font-mono">{formatCurrency(10224)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Collected:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(10224)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Balance Due:</span>
                    <strong className="font-mono text-emerald-600">₹0 (Cleared)</strong>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Class-wise Financial Performance Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Class-Wise Comprehensive Financial Summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed roster of committed, paid, and outstanding dues across all 13 grade levels.
                </p>
              </div>

              <button
                type="button"
                onClick={exportSummaryReportCSV}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Class Summary CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-2 text-center">Students</th>
                    <th className="py-2.5 px-3 text-right">Committed Tuition</th>
                    <th className="py-2.5 px-2 text-right">Transport</th>
                    <th className="py-2.5 px-2 text-right">Old Due</th>
                    <th className="py-2.5 px-2 text-right">Books</th>
                    <th className="py-2.5 px-3 text-right font-black">Total Payable</th>
                    <th className="py-2.5 px-3 text-right font-black text-emerald-600">Total Paid</th>
                    <th className="py-2.5 px-3 text-right font-black text-rose-600">Total Due</th>
                    <th className="py-2.5 px-3 text-center">Efficiency</th>
                    <th className="py-2.5 px-3 text-center">Status (Ex/Ok/Due)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classBreakdown.map((row) => {
                    const collectionRate = row.totalPayable > 0 ? Math.round((row.totalPaid / row.totalPayable) * 100) : 0;
                    return (
                      <tr key={row.className} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                            {row.className}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                          {row.studentCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(row.schoolFee)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-amber-700 dark:text-amber-400">
                          {row.transportFee > 0 ? formatCurrency(row.transportFee) : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-purple-700 dark:text-purple-400">
                          {row.oldDueFee > 0 ? formatCurrency(row.oldDueFee) : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-sky-700 dark:text-sky-400">
                          {row.booksFee > 0 ? formatCurrency(row.booksFee) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          {formatCurrency(row.totalPayable)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.totalPaid)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.totalDue)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            collectionRate >= 50
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : collectionRate >= 30
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {collectionRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] font-mono">
                          <span className="text-emerald-600 font-bold">{row.excessCount}</span> /{' '}
                          <span className="text-blue-600 font-bold">{row.exactCount}</span> /{' '}
                          <span className="text-rose-600 font-bold">{row.dueCount}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Table Footer Totals matching Spreadsheet */}
                <tfoot className="bg-slate-100 dark:bg-slate-850 font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <tr>
                    <td className="py-3 px-3">TOTAL / ALL CLASSES</td>
                    <td className="py-3 px-2 text-center font-mono">229</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(5649370)}</td>
                    <td className="py-3 px-2 text-right font-mono text-amber-700 dark:text-amber-400">{formatCurrency(405250)}</td>
                    <td className="py-3 px-2 text-right font-mono text-purple-700 dark:text-purple-400">{formatCurrency(383500)}</td>
                    <td className="py-3 px-2 text-right font-mono text-sky-700 dark:text-sky-400">{formatCurrency(10224)}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-700 dark:text-indigo-300">{formatCurrency(6448344)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(2198847)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400">{formatCurrency(4249497)}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-600">34.1%</td>
                    <td className="py-3 px-3 text-center font-mono">52 / 4 / 173</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DUE REPORT */}
      {/* ========================================================= */}
      {activeTab === 'DUE' && (
        <div className="space-y-4">
          {/* Due Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-xs">
              <span className="text-slate-500 font-semibold block">Total Outstanding Balance</span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 block mt-0.5">
                {formatCurrency(dueMetrics.totalOutstandingDue)}
              </span>
              <span className="text-[11px] text-slate-400 block">Across {dueMetrics.countWithDue} Students</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-xs">
              <span className="text-slate-500 font-semibold block">Due Till Date (Overdue Now)</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                {formatCurrency(dueMetrics.totalOverdueTillDate)}
              </span>
              <span className="text-[11px] text-slate-400 block">{dueMetrics.countOverdueTillDate} Students Overdue</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-900/40 shadow-xs">
              <span className="text-slate-500 font-semibold block">Critical Defaulters (&gt;= ₹20k)</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 block mt-0.5">
                {dueMetrics.countCritical} Students
              </span>
              <span className="text-[11px] text-slate-400 block">Urgent follow-up needed</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs">
              <span className="text-slate-500 font-semibold block">Excess / Advance Paid</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {formatCurrency(dueMetrics.totalExcessAmount)}
              </span>
              <span className="text-[11px] text-slate-400 block">{dueMetrics.countExcess} Students with Advance</span>
            </div>
          </div>

          {/* Filter Bar for Due Report */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dueSearchQuery}
                onChange={(e) => setDueSearchQuery(e.target.value)}
                placeholder="Search student, roll no, phone..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Status Filter */}
              <select
                value={dueStatusFilter}
                onChange={(e) => setDueStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Due Categories ({dueMetrics.totalStudents})</option>
                <option value="DUE">Outstanding Dues ({dueMetrics.countWithDue})</option>
                <option value="OVERDUE_TILL_DATE">Overdue Till Date ({dueMetrics.countOverdueTillDate})</option>
                <option value="CRITICAL">Critical &gt;= ₹20,000 ({dueMetrics.countCritical})</option>
                <option value="EXCESS">Advance / Excess Paid ({dueMetrics.countExcess})</option>
              </select>

              {/* Class Filter */}
              <select
                value={dueClassFilter}
                onChange={(e) => setDueClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Classes</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Sort Order */}
              <select
                value={`${dueSortBy}-${dueSortOrder}`}
                onChange={(e) => {
                  const [by, ord] = e.target.value.split('-');
                  setDueSortBy(by as any);
                  setDueSortOrder(ord as any);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="totalDue-desc">Sort: Highest Due First</option>
                <option value="totalDue-asc">Sort: Lowest Due First</option>
                <option value="dueTillDate-desc">Sort: Highest Overdue Till Date</option>
                <option value="name-asc">Sort: Name (A-Z)</option>
                <option value="rollNo-asc">Sort: Roll No (1-229)</option>
              </select>

              <button
                type="button"
                onClick={exportDueReportCSV}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Due Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Roll</th>
                    <th className="py-2.5 px-2">Class</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Parent Contact</th>
                    <th className="py-2.5 px-3 text-right">Committed</th>
                    <th className="py-2.5 px-3 text-right">Total Paid</th>
                    <th className="py-2.5 px-3 text-right font-black text-rose-600">Pending Due</th>
                    <th className="py-2.5 px-3 text-right font-bold text-amber-600">Due Till Date</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dueReportData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                        No students match the due report criteria.
                      </td>
                    </tr>
                  ) : (
                    dueReportData.map((s) => {
                      const isCritical = s.totalDue >= 20000;
                      const isAdvance = s.totalDue < 0;

                      return (
                        <tr
                          key={s.student.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                            isCritical ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            #{s.student.rollNo}
                          </td>
                          <td className="py-2.5 px-2 font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                              {s.student.className}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <span>{s.student.name}</span>
                              {isCritical && (
                                <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[9px] font-black uppercase">
                                  Critical
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {s.student.phone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{s.student.phone}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(s.totalPayable)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(s.totalPaid)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-black ${
                            isAdvance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isAdvance ? `+${formatCurrency(Math.abs(s.totalDue))} (Adv)` : formatCurrency(s.totalDue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                            {s.dueTillDate > 0 ? formatCurrency(s.dueTillDate) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              s.statusCategory === 'Fully Paid' || isAdvance
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : s.statusCategory === 'On Track'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : s.statusCategory === 'Grace Period'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {s.statusCategory}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onOpenPaymentModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPaymentModal(s.student)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                  title="Collect Payment"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Collect</span>
                                </button>
                              )}

                              {onOpenLedgerModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenLedgerModal(s.student)}
                                  className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                                  title="View Full Ledger"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {s.student.phone && (
                                <a
                                  href={`https://wa.me/91${s.student.phone}?text=${encodeURIComponent(
                                    `Dear Parent, This is a gentle fee reminder from ${schoolProfile.schoolName || 'Kakatiya School'}. Pending fee for ${s.student.name} (${s.student.className}) is ${formatCurrency(s.totalDue)}. Kindly clear the dues at your earliest convenience.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                  title="Send WhatsApp Reminder"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PAID REPORT */}
      {/* ========================================================= */}
      {activeTab === 'PAID' && (
        <div className="space-y-4">
          {/* Paid Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-900/40 shadow-xs">
              <span className="text-slate-500 font-semibold block">Total Realized Collections</span>
              <span className="text-xl font-black text-teal-600 dark:text-teal-400 block mt-0.5">
                {formatCurrency(paidMetrics.totalPaidSum)}
              </span>
              <span className="text-[11px] text-slate-400 block">{paidMetrics.totalTransactions} Completed Payments</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs">
              <span className="text-slate-500 font-semibold block flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                Cash Collections
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {formatCurrency(paidMetrics.totalCash)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {paidMetrics.totalPaidSum > 0 ? Math.round((paidMetrics.totalCash / paidMetrics.totalPaidSum) * 100) : 0}% of Total
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900/40 shadow-xs">
              <span className="text-slate-500 font-semibold block flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                UPI & Online Transfers
              </span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                {formatCurrency(paidMetrics.totalUpi)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {paidMetrics.totalPaidSum > 0 ? Math.round((paidMetrics.totalUpi / paidMetrics.totalPaidSum) * 100) : 0}% of Total
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-slate-500 font-semibold block">Average Realization / Student</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block mt-0.5">
                {formatCurrency(summaries.length > 0 ? Math.round(paidMetrics.totalPaidSum / summaries.length) : 0)}
              </span>
              <span className="text-[11px] text-slate-400 block">Base of 229 Roster Students</span>
            </div>
          </div>

          {/* Filter Bar for Paid Report */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={paidSearchQuery}
                onChange={(e) => setPaidSearchQuery(e.target.value)}
                placeholder="Search receipt no, student, ref..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Payment Mode */}
              <select
                value={paidModeFilter}
                onChange={(e) => setPaidModeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Modes (Cash + UPI)</option>
                <option value="Cash">Cash Only ({formatCurrency(paidMetrics.totalCash)})</option>
                <option value="UPI">UPI / Online ({formatCurrency(paidMetrics.totalUpi)})</option>
                <option value="Cheque">Cheque Only</option>
              </select>

              {/* Class Filter */}
              <select
                value={paidClassFilter}
                onChange={(e) => setPaidClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Classes</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={exportPaidReportCSV}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Paid Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-2 text-center">Class</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 text-right font-black text-teal-600">Amount Paid</th>
                    <th className="py-2.5 px-2 text-center">Mode</th>
                    <th className="py-2.5 px-3">Reference / Remarks</th>
                    <th className="py-2.5 px-3">Allocated Fee Heads</th>
                    <th className="py-2.5 px-2 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paidReportData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No transactions found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paidReportData.map((txn) => {
                      return (
                        <tr key={txn.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {txn.date ? txn.date.split('T')[0] : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            {txn.receiptNo}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {txn.studentClass}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {txn.studentName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              txn.paymentMode === 'Cash'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {txn.paymentMode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={txn.remarks}>
                            {txn.referenceNo ? <strong className="text-slate-800 dark:text-slate-200">Ref: {txn.referenceNo} </strong> : null}
                            {txn.remarks || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[10px]">
                            {txn.allocations && txn.allocations.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {txn.allocations.map((a, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                                  >
                                    {a.headName.split(' ')[0]}: {formatCurrency(a.allocatedAmount)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Direct Realization</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {onOpenReceiptModal && (
                              <button
                                type="button"
                                onClick={() => onOpenReceiptModal(txn)}
                                className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                title="Print / View Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
