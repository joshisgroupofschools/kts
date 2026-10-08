import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Download,
  Edit3,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Lock,
  MessageCircle,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import {
  DayCloseRecord,
  PaymentTransaction,
  SchoolProfile,
  Student,
  StudentFinancialSummary,
} from '../types';
import { formatCurrency, formatDate, getNextMultipleOfFiveDate } from '../utils/numberToWords';
import { compareOfficialInstallmentOrder, getInstallmentDisplayName } from '../utils/installmentFormatter';
import { countWorkingDaysExcludingSundays, getCollectionDeadlineTenth } from '../utils/dateUtils';

interface TodaysReceiptsModalProps {
  currentDate: string;
  onChangeDate: (date: string) => void;
  transactions: PaymentTransaction[];
  students: Student[];
  studentSummaries: Record<string, StudentFinancialSummary>;
  schoolProfile: SchoolProfile;
  dailyTarget: number;
  onUpdateDailyTarget: (target: number) => void;
  dayCloseRecords: Record<string, DayCloseRecord>;
  onCloseDay: (record: DayCloseRecord) => void;
  onReopenDay: (date: string) => void;
  onUpdateTransactionSlip: (
    txId: string,
    slipGiven: boolean,
    permissionDate?: string
  ) => void;
  onOpenReceiptModal: (transaction: PaymentTransaction) => void;
  onCancelReceipt: (transactionId: string, cancelReason: string) => Promise<void>;
  onClose: () => void;
}

export const TodaysReceiptsModal: React.FC<TodaysReceiptsModalProps> = ({
  currentDate,
  onChangeDate,
  transactions,
  students,
  studentSummaries,
  schoolProfile,
  dailyTarget,
  onUpdateDailyTarget,
  dayCloseRecords,
  onCloseDay,
  onReopenDay,
  onUpdateTransactionSlip,
  onOpenReceiptModal,
  onCancelReceipt,
  onClose,
}) => {
  const [fromDate, setFromDate] = useState<string>(currentDate);
  const [toDate, setToDate] = useState<string>(currentDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'Cash' | 'UPI' | 'Other'>('ALL');
  const [filterSlipStatus, setFilterSlipStatus] = useState<'ALL' | 'PENDING' | 'GIVEN'>('ALL');
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState<string>(String(dailyTarget));
  const [closeDaySuccess, setCloseDaySuccess] = useState(false);
  const [cancellingReceiptId, setCancellingReceiptId] = useState<string | null>(null);

  const currencySymbol = schoolProfile?.currencySymbol || '₹';

  const reportStartDate = fromDate <= toDate ? fromDate : toDate;
  const reportEndDate = fromDate <= toDate ? toDate : fromDate;
  const isSingleDayReport = reportStartDate === reportEndDate;
  const reportPeriodLabel = isSingleDayReport
    ? formatDate(reportStartDate)
    : `${formatDate(reportStartDate)} to ${formatDate(reportEndDate)}`;
  const closeRecordKey = isSingleDayReport ? reportStartDate : `${reportStartDate}_to_${reportEndDate}`;
  const periodWord = isSingleDayReport ? 'Today' : 'Period';

  // Filter transactions for the selected date range
  const dayTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.isCancelled) return false;
      const txDateOnly = tx.date.split(' ')[0];
      return txDateOnly >= reportStartDate && txDateOnly <= reportEndDate;
    });
  }, [transactions, reportStartDate, reportEndDate]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalCollected = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let otherTotal = 0;
    let verifiedCount = 0;
    let pendingCount = 0;

    dayTransactions.forEach((tx) => {
      totalCollected += tx.amount || 0;
      if (tx.paymentMode === 'Cash') {
        cashTotal += tx.amount || 0;
      } else if (tx.paymentMode === 'UPI') {
        upiTotal += tx.amount || 0;
      } else {
        otherTotal += tx.amount || 0;
      }

      // Check slip status verification
      const summary = studentSummaries[tx.studentId];
      const hasBalance = summary ? summary.totalDue > 0 : false;

      // If fully paid, no slip needed -> considered auto-verified
      if (!hasBalance) {
        verifiedCount++;
      } else if (tx.permissionUpdated) {
        verifiedCount++;
      } else {
        pendingCount++;
      }
    });

    const toDateString = (date: Date) => date.toISOString().slice(0, 10);
    const getDueTillDateFor = (dateStr: string) => {
      let dueTillDate = 0;
      Object.values(studentSummaries).forEach((s: any) => {
        if (s.student?.isActive === false) return;
        (s.installments || []).forEach((ins: any) => {
          if (ins.balanceAmount > 0 && ins.status !== 'paid' && ins.dueDate <= dateStr) {
            dueTillDate += ins.balanceAmount;
          }
        });
      });
      return dueTillDate;
    };
    const getWorkingDateStrings = (startDate: string, endDate: string) => {
      const dates: string[] = [];
      const cursor = new Date(`${startDate}T00:00:00Z`);
      const end = new Date(`${endDate}T00:00:00Z`);
      while (cursor <= end) {
        if (cursor.getUTCDay() !== 0) {
          dates.push(toDateString(cursor));
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return dates;
    };

    // Automatic target calculation:
    // - single day: due till that day divided by working days up to that month's 10th collection deadline
    // - range: sum of each selected working day's own daily target
    const todayStr = reportEndDate || currentDate;
    const totalOverdueDeficit = getDueTillDateFor(todayStr);
    const collectionDeadline = getCollectionDeadlineTenth(todayStr);

    const calculateDailyTargetFor = (dateStr: string) => {
      const deadline = getCollectionDeadlineTenth(dateStr);
      const daysToDeadline = countWorkingDaysExcludingSundays(
        new Date(`${dateStr}T00:00:00Z`),
        new Date(`${deadline}T00:00:00Z`)
      );
      return Math.ceil(getDueTillDateFor(dateStr) / Math.max(1, daysToDeadline)) || 0;
    };

    const selectedWorkingDates = getWorkingDateStrings(reportStartDate, reportEndDate);
    const daysRemainingToDeadline = countWorkingDaysExcludingSundays(
      new Date(`${todayStr}T00:00:00Z`),
      new Date(`${collectionDeadline}T00:00:00Z`)
    );
    const target = isSingleDayReport
      ? calculateDailyTargetFor(todayStr)
      : selectedWorkingDates.reduce((sum, dateStr) => sum + calculateDailyTargetFor(dateStr), 0);

    const collectionPercent = target > 0 ? Math.min(999, (totalCollected / target) * 100) : 0;
    const canCloseDay = dayTransactions.length > 0 && pendingCount === 0;
    const achievedPercent = collectionPercent;

    return {
      totalCollected,
      cashTotal,
      upiTotal,
      otherTotal,
      totalCount: dayTransactions.length,
      collectionPercent,
      target,
      verifiedCount,
      pendingCount,
      canCloseDay,
      totalAchieved: totalCollected,
      achievedPercent,
      totalOverdueDeficit,
      daysRemaining: isSingleDayReport ? daysRemainingToDeadline : selectedWorkingDates.length,
      collectionDeadline,
    };
  }, [dayTransactions, studentSummaries, reportStartDate, reportEndDate, currentDate, isSingleDayReport]);

  // Check if day is already closed
  const existingDayClose = dayCloseRecords[closeRecordKey];

  // Filtered list for UI table
  const filteredList = useMemo(() => {
    return dayTransactions.filter((tx) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tx.studentName.toLowerCase().includes(q);
        const matchRoll = tx.studentRollNo.toLowerCase().includes(q);
        const matchClass = tx.studentClass.toLowerCase().includes(q);
        const matchReceipt = tx.receiptNo.toLowerCase().includes(q);
        const matchRef = tx.referenceNo?.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchClass && !matchReceipt && !matchRef) {
          return false;
        }
      }

      // Mode filter
      if (filterMode !== 'ALL') {
        if (filterMode === 'Other') {
          if (tx.paymentMode === 'Cash' || tx.paymentMode === 'UPI') return false;
        } else if (tx.paymentMode !== filterMode) {
          return false;
        }
      }

      // Slip status filter
      if (filterSlipStatus !== 'ALL') {
        const summary = studentSummaries[tx.studentId];
        const hasBalance = summary ? summary.totalDue > 0 : false;
        const isPending = hasBalance && !tx.permissionUpdated;
        if (filterSlipStatus === 'PENDING' && !isPending) return false;
        if (filterSlipStatus === 'GIVEN' && isPending) return false;
      }

      return true;
    });
  }, [dayTransactions, searchQuery, filterMode, filterSlipStatus, studentSummaries]);

  const handleSaveTarget = () => {
    const val = parseFloat(tempTarget);
    if (!isNaN(val) && val > 0) {
      onUpdateDailyTarget(val);
      setIsEditingTarget(false);
    }
  };

  const handleTriggerCloseDay = () => {
    if (!stats.canCloseDay) return;

    const record: DayCloseRecord = {
      date: closeRecordKey,
      closedAt: new Date().toISOString(),
      closedBy: 'Head Cashier / Accounts Dept',
      target: stats.target,
      totalAchieved: stats.totalAchieved,
      achievedPercent: stats.achievedPercent,
      cashTotal: stats.cashTotal,
      upiTotal: stats.upiTotal,
      otherTotal: stats.otherTotal,
      totalReceiptsCount: stats.totalCount,
      notes: `Reconciliation closed for ${reportPeriodLabel} with ${stats.totalCount} receipts.`,
    };

    onCloseDay(record);
    setCloseDaySuccess(true);
    setTimeout(() => setCloseDaySuccess(false), 4000);
  };

  const handlePrintDailySheet = () => {
    window.print();
  };

  const handleCancelReceipt = async (tx: PaymentTransaction) => {
    const reason = window.prompt(`Cancel receipt #${tx.receiptNo}? Enter cancellation reason:`);
    if (!reason?.trim()) return;
    try {
      setCancellingReceiptId(tx.id);
      await onCancelReceipt(tx.id, reason.trim());
    } catch (error: any) {
      window.alert(error?.message || 'Unable to cancel receipt.');
    } finally {
      setCancellingReceiptId(null);
    }
  };

  return (
    <div
      id="page-todays-receipts"
      className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto flex flex-col animate-fadeIn"
    >
      <div className="w-full min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              ← Back to Dashboard
            </button>
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Today's Receipts & Day Reconciliation
                </h2>
                {existingDayClose ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Day Closed
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Unlock className="w-3 h-3" />
                    Day Active ({stats.pendingCount > 0 ? `${stats.pendingCount} Slips Pending` : 'All Verified'})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {schoolProfile.schoolName || 'Kakatiya School Boduppal'} • Cash & UPI Collections with Permission Slips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Date Range Selector */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  onChangeDate(e.target.value);
                }}
                className="bg-transparent text-slate-900 dark:text-white font-medium text-xs focus:outline-none cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-medium text-xs focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handlePrintDailySheet}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Daily Collection Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {closeDaySuccess && (
          <div className="bg-emerald-500 text-white px-5 py-2.5 flex items-center justify-between text-xs font-bold shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Reconciliation closed successfully for {reportPeriodLabel}.</span>
            </div>
            <button onClick={() => setCloseDaySuccess(false)} className="text-emerald-100 hover:text-white">×</button>
          </div>
        )}

        {/* Collection summary */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
            {/* 1. TODAY YOU MUST COLLECT */}
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs">
              <div className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                {isSingleDayReport ? 'Day Wise Target' : 'Period Target'}
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-slate-800 dark:text-slate-100">
                {formatCurrency(stats.target, currencySymbol)}
              </div>
              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 block mt-0.5">
                {isSingleDayReport
                  ? `Due till ${formatDate(reportEndDate)} ÷ ${stats.daysRemaining} days, till ${formatDate(stats.collectionDeadline)}`
                  : `Sum of ${stats.daysRemaining} selected working-day targets`}
              </span>
            </div>

            {/* 2. TOTAL COLLECTED */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl shadow-2xs">
              <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider block mb-1">
                {periodWord} Collected
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                {formatCurrency(stats.totalCollected, currencySymbol)}
              </div>
            </div>

            <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/80 rounded-xl shadow-2xs">
              <span className="text-orange-700 dark:text-orange-300 text-[11px] font-bold uppercase tracking-wider block mb-1">
                {periodWord} Yet to Collect
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-orange-700 dark:text-orange-300">
                {formatCurrency(Math.max(0, stats.target - stats.totalCollected), currencySymbol)}
              </div>
            </div>

            {/* COLLECTION % */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Collection %</span>
                <span className="text-[10px] font-mono">{stats.collectionPercent.toFixed(1)}%</span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-indigo-700 dark:text-indigo-300">
                {stats.collectionPercent.toFixed(1)}%
              </div>
              <div className="w-full bg-indigo-200 dark:bg-indigo-900 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.collectionPercent)}%` }}
                />
              </div>
            </div>

            {/* 4. UPI TOTAL */}
            <div className="p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/80 rounded-xl shadow-2xs">
              <span className="text-violet-700 dark:text-violet-300 text-[11px] font-bold uppercase tracking-wider block mb-1">
                UPI Total
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-violet-700 dark:text-violet-300">
                {formatCurrency(stats.upiTotal, currencySymbol)}
              </div>
            </div>

            {/* 5. CASH TOTAL */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl shadow-2xs">
              <span className="text-amber-700 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider block mb-1">
                Cash Total
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-amber-700 dark:text-amber-300">
                {formatCurrency(stats.cashTotal, currencySymbol)}
              </div>
            </div>

            {/* 6. RECEIPTS COUNT & SLIP STATUS */}
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-1">
                Receipts / Slips
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                {stats.totalCount} <span className="text-xs font-semibold text-slate-500">receipts</span>
              </div>
              <div className="text-[10px] font-bold mt-0.5">
                {stats.pendingCount > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400">{stats.pendingCount} slip/card pending</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">All slip/card updates done</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, receipt #, roll #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">Mode:</span>
            {(['ALL', 'Cash', 'UPI', 'Other'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilterMode(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === m
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1.5" />

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">Slips:</span>
            <button
              type="button"
              onClick={() => setFilterSlipStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterSlipStatus === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({dayTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSlipStatus('PENDING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterSlipStatus === 'PENDING'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100'
              }`}
            >
              Pending ({stats.pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterSlipStatus('GIVEN')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterSlipStatus === 'GIVEN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100'
              }`}
            >
              Verified ({stats.verifiedCount})
            </button>
          </div>
        </div>

        {/* Day Close Instruction & Lock Banner */}
        <div className="px-5 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Day Close Rule:</strong> For partial payments, please update <em>Permission To Be Given Till Date</em> and confirm <em>Slip/Card Given or Not?</em> on each row below. Only after all receipts are updated can you close the day.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {existingDayClose ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                  Reconciliation closed for {reportPeriodLabel} on {formatDate(existingDayClose.closedAt.split('T')[0])}
                </span>
                <button
                  type="button"
                  onClick={() => onReopenDay(closeRecordKey)}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold border border-amber-300 transition-colors cursor-pointer text-[11px]"
                >
                  Re-Open
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-close-that-day"
                onClick={handleTriggerCloseDay}
                disabled={!stats.canCloseDay}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
                  stats.canCloseDay
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/20 active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                }`}
                title={
                  stats.canCloseDay
                    ? 'All receipts verified. Click to finalize reconciliation.'
                    : `Cannot close: ${stats.pendingCount} receipt(s) still need slip verification.`
                }
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{stats.canCloseDay ? 'Close & Reconcile' : `Update ${stats.pendingCount} Slips To Close`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Receipts Table Workspace */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-5">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No receipts recorded for {isSingleDayReport ? formatDate(reportStartDate) : `${formatDate(reportStartDate)} to ${formatDate(reportEndDate)}`}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No fee collection transactions found matching your current search or date filters. Select another date or generate a receipt from the Student Ledger.
              </p>
            </div>
          ) : (
            <>
            <div className="space-y-3 lg:hidden">
              {filteredList.map((tx) => {
                const student = students.find((s) => s.id === tx.studentId);
                const summary = studentSummaries[tx.studentId];
                const remainingDue = (summary?.installments || []).reduce((sum, installment) =>
                  sum + (installment.dueDate <= reportEndDate ? Math.max(0, installment.balanceAmount) : 0), 0);
                const needsPermissionDate = remainingDue > 1000;
                const canIssueIdCard = remainingDue <= 1000;
                const defaultPermDate =
                  tx.permissionDate ||
                  student?.permissionExpiresAt ||
                  getNextMultipleOfFiveDate(new Date(reportEndDate));
                const isSlipGiven = tx.slipGiven === true;
                const isUpdated = tx.permissionUpdated || (canIssueIdCard && isSlipGiven) || remainingDue === 0;
                const allocationTotal = (tx.allocations || []).reduce(
                  (sum, allocation) => sum + Number(allocation.allocatedAmount || 0),
                  0
                );
                const unmappedAmount = Math.max(0, Number(tx.amount || 0) - allocationTotal);

                return (
                  <div
                    key={`mobile-${tx.id}`}
                    className={`rounded-2xl border p-3 shadow-xs ${
                      !isUpdated
                        ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                          #{tx.receiptNo}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{tx.date.includes(' ') ? tx.date.split(' ')[1] : 'Recorded'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(tx.amount, currencySymbol)}
                        </div>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            tx.paymentMode === 'UPI'
                              ? 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : tx.paymentMode === 'Cash'
                              ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {tx.paymentMode === 'UPI' ? <QrCode className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                          {tx.paymentMode}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                      <div className="font-bold text-slate-900 dark:text-white">{tx.studentName}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Roll #{tx.studentRollNo} • {tx.studentClass}
                      </div>
                      {student?.phone && (
                        <div className="text-[10px] text-slate-400">Ph: {student.phone}</div>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Fees Paid For
                      </div>
                      <div className="space-y-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                        {(tx.allocations || []).length > 0 &&
                          [...tx.allocations].sort(compareOfficialInstallmentOrder).map((a, idx) => (
                            <div key={idx}>
                              {getInstallmentDisplayName(a.headName, a.installmentNumber, a.totalInstallments, a.dueDate)}:{' '}
                              <strong className="text-slate-900 dark:text-white">
                                {formatCurrency(a.allocatedAmount, currencySymbol)}
                              </strong>
                            </div>
                          ))}
                        {unmappedAmount > 0.01 && (
                          <div className="font-bold text-amber-700 dark:text-amber-300">
                            Unmapped historical payment – fee not assigned: {formatCurrency(unmappedAmount, currencySymbol)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Balance Till Date
                        </div>
                        {remainingDue > 0 ? (
                          <>
                            <div className="font-mono text-sm font-black text-rose-600 dark:text-rose-400">
                              {formatCurrency(remainingDue, currencySymbol)}
                            </div>
                            <div className="text-[9.5px] font-bold uppercase text-rose-500">Partial Due</div>
                          </>
                        ) : (
                          <>
                            <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {currencySymbol}0
                            </div>
                            <div className="text-[9.5px] font-bold uppercase text-emerald-600">Cleared</div>
                          </>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Permission / Card
                        </div>
                        {needsPermissionDate ? (
                          <input
                            type="date"
                            value={tx.permissionDate || student?.permissionExpiresAt || defaultPermDate}
                            onChange={(e) => onUpdateTransactionSlip(tx.id, tx.slipGiven || false, e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          />
                        ) : (
                          <div className="mt-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                            Issue ID Card
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {needsPermissionDate ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateTransactionSlip(
                                tx.id,
                                true,
                                tx.permissionDate || student?.permissionExpiresAt || defaultPermDate
                              )
                            }
                            className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-black ${
                              isSlipGiven
                                ? 'border-emerald-700 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            Slip Given
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateTransactionSlip(
                                tx.id,
                                false,
                                tx.permissionDate || student?.permissionExpiresAt || defaultPermDate
                              )
                            }
                            className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-black ${
                              !isSlipGiven && tx.permissionUpdated
                                ? 'border-rose-700 bg-rose-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            Pending
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateTransactionSlip(tx.id, true, undefined)}
                            className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-black ${
                              isSlipGiven
                                ? 'border-emerald-700 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            ID Card Given
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateTransactionSlip(tx.id, false, undefined)}
                            className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-black ${
                              !isSlipGiven && tx.permissionUpdated
                                ? 'border-rose-700 bg-rose-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            Not Given
                          </button>
                        </>
                      )}
                    </div>

                    {!isUpdated && (
                      <div className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        Update required for day close
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onOpenReceiptModal(tx)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Receipt
                      </button>
                      {student?.phone && (
                        <a
                          href={`https://wa.me/91${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Dear Parent, receipt #${tx.receiptNo} of ₹${tx.amount.toLocaleString('en-IN')} has been acknowledged for ${tx.studentName} (${tx.studentClass}). Payment Mode: ${tx.paymentMode}. Remaining Balance Till ${formatDate(reportEndDate)}: ₹${remainingDue.toLocaleString('en-IN')}. Thank you.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-black text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCancelReceipt(tx)}
                        disabled={cancellingReceiptId === tx.id}
                        className="flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                        title="Cancel / Void Receipt"
                      >
                        {cancellingReceiptId === tx.id ? (
                          <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span>Total Reconciled ({filteredList.length})</span>
                  <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(filteredList.reduce((sum, tx) => sum + tx.amount, 0), currencySymbol)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Cash: {formatCurrency(stats.cashTotal, currencySymbol)} • UPI: {formatCurrency(stats.upiTotal, currencySymbol)}
                </div>
              </div>
            </div>

            <div className="hidden lg:block border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs bg-white dark:bg-slate-900">
              <table className="w-full min-w-[1180px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3">Receipt / Time</th>
                    <th className="py-3 px-3">Student & Class</th>
                    <th className="py-3 px-3 text-right">Amount Paid</th>
                    <th className="py-3 px-2 text-center">Payment Mode</th>
                    <th className="py-3 px-3">Fees Paid For</th>
                    <th className="py-3 px-3">Remaining Balance Till Date</th>
                    <th className="py-3 px-3 min-w-[160px]">
                      Permission To Be Given Till Date
                    </th>
                    <th className="py-3 px-3 min-w-[180px]">
                      Slip/Card Given or Not?
                    </th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredList.map((tx) => {
                    const student = students.find((s) => s.id === tx.studentId);
                    const summary = studentSummaries[tx.studentId];
                    const remainingDue = (summary?.installments || []).reduce((sum, installment) =>
                      sum + (installment.dueDate <= reportEndDate ? Math.max(0, installment.balanceAmount) : 0), 0);
                    const needsPermissionDate = remainingDue > 1000;
                    const canIssueIdCard = remainingDue <= 1000;

                    // Fallback default permission date if not set
                    const defaultPermDate =
                      tx.permissionDate ||
                      student?.permissionExpiresAt ||
                      getNextMultipleOfFiveDate(new Date(reportEndDate));

                    const isSlipGiven = tx.slipGiven === true;
                    const isUpdated = tx.permissionUpdated || (canIssueIdCard && isSlipGiven) || remainingDue === 0;

                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors ${
                          !isUpdated
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Receipt No & Time */}
                        <td className="py-3 px-3">
                          <div className="font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>#{tx.receiptNo}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{tx.date.includes(' ') ? tx.date.split(' ')[1] : 'Recorded'}</span>
                          </div>
                        </td>

                        {/* Student & Class */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {tx.studentName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Roll #{tx.studentRollNo}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {tx.studentClass}
                            </span>
                          </div>
                          {student?.phone && (
                            <div className="text-[10px] text-slate-400">
                              Ph: {student.phone}
                            </div>
                          )}
                        </td>

                        {/* Amount Paid */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatCurrency(tx.amount, currencySymbol)}
                          </span>
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              tx.paymentMode === 'UPI'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                : tx.paymentMode === 'Cash'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {tx.paymentMode === 'UPI' ? (
                              <QrCode className="w-3 h-3" />
                            ) : (
                              <Banknote className="w-3 h-3" />
                            )}
                            {tx.paymentMode}
                          </span>
                          {tx.referenceNo && (
                            <div className="text-[9.5px] font-mono text-slate-400 mt-0.5 truncate max-w-[90px] mx-auto" title={tx.referenceNo}>
                              Ref: {tx.referenceNo}
                            </div>
                          )}
                        </td>

                        {/* Allocations Breakdown */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                          {(() => {
                            const allocationTotal = (tx.allocations || []).reduce(
                              (sum, allocation) => sum + Number(allocation.allocatedAmount || 0),
                              0
                            );
                            const unmappedAmount = Math.max(0, Number(tx.amount || 0) - allocationTotal);
                            return (
                              <div className="space-y-0.5">
                                {(tx.allocations || []).length > 0 &&
                                  [...tx.allocations].sort(compareOfficialInstallmentOrder).map((a, idx) => (
                                    <div key={idx} className="max-w-[260px] leading-snug">
                                      {getInstallmentDisplayName(a.headName, a.installmentNumber, a.totalInstallments, a.dueDate)}: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(a.allocatedAmount, currencySymbol)}</strong>
                                    </div>
                                  ))}
                                {unmappedAmount > 0.01 && (
                                  <div className="font-bold text-amber-700 dark:text-amber-300">
                                    Unmapped historical payment – fee not assigned: {formatCurrency(unmappedAmount, currencySymbol)}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Remaining Balance Till Date */}
                        <td className="py-3 px-3">
                          {remainingDue > 0 ? (
                            <div>
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                {formatCurrency(remainingDue, currencySymbol)}
                              </span>
                              <span className="block text-[9.5px] text-rose-500 font-semibold uppercase">
                                Partial Due
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {currencySymbol}0
                              </span>
                              <span className="block text-[9.5px] text-emerald-600 font-semibold uppercase">
                                Cleared Till Date
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Permission To Be Given Till Date */}
                        <td className="py-3 px-3">
                          {needsPermissionDate ? (
                            <div className="space-y-1">
                              <input
                                type="date"
                                value={tx.permissionDate || student?.permissionExpiresAt || defaultPermDate}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  onUpdateTransactionSlip(tx.id, tx.slipGiven || false, newDate);
                                }}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                      const nextDate = getNextMultipleOfFiveDate(reportEndDate);
                                    onUpdateTransactionSlip(tx.id, tx.slipGiven || false, nextDate);
                                  }}
                                  className="text-[9.5px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                  title="Auto-set next 5th multiple calendar date"
                                >
                                  + Next 5th
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                              Issue ID Card
                            </span>
                          )}
                        </td>

                        {/* Slip/Card Given or Not? */}
                        <td className="py-3 px-3">
                          {needsPermissionDate ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateTransactionSlip(
                                      tx.id,
                                      true,
                                      tx.permissionDate || student?.permissionExpiresAt || defaultPermDate
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    isSlipGiven
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  ✓ Slip Given
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateTransactionSlip(
                                      tx.id,
                                      false,
                                      tx.permissionDate || student?.permissionExpiresAt || defaultPermDate
                                    )
                                  }
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    !isSlipGiven && tx.permissionUpdated
                                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-rose-50'
                                  }`}
                                >
                                  × Pending
                                </button>
                              </div>

                              {!tx.permissionUpdated && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block animate-pulse">
                                  Update required for day close
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onUpdateTransactionSlip(tx.id, true, undefined)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    isSlipGiven
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  ID Card Given
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateTransactionSlip(tx.id, false, undefined)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    !isSlipGiven && tx.permissionUpdated
                                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-rose-50'
                                  }`}
                                >
                                  Not Given
                                </button>
                              </div>
                              {remainingDue > 0 && (
                                <span className="text-[9.5px] text-emerald-600 font-semibold">
                                  Due {formatCurrency(remainingDue, currencySymbol)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenReceiptModal(tx)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                              title="View & Re-print Dual A5 Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {student?.phone && (
                              <a
                                href={`https://wa.me/91${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Dear Parent, receipt #${tx.receiptNo} of ₹${tx.amount.toLocaleString('en-IN')} has been acknowledged for ${tx.studentName} (${tx.studentClass}). Payment Mode: ${tx.paymentMode}. Remaining Balance Till ${formatDate(reportEndDate)}: ₹${remainingDue.toLocaleString('en-IN')}. Thank you.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300 border border-green-200 dark:border-green-800 transition-colors cursor-pointer"
                                title="Send Receipt Confirmation on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCancelReceipt(tx)}
                              disabled={cancellingReceiptId === tx.id}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Cancel / Void Receipt"
                            >
                              {cancellingReceiptId === tx.id ? (
                                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 uppercase tracking-wider text-slate-700 dark:text-slate-300 font-black">
                      Total Reconciled ({filteredList.length} Receipts):
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(
                        filteredList.reduce((sum, tx) => sum + tx.amount, 0),
                        currencySymbol
                      )}
                    </td>
                    <td colSpan={6} className="py-3 px-3 text-right text-slate-500 text-[11px]">
                      Cash: {formatCurrency(stats.cashTotal, currencySymbol)} • UPI: {formatCurrency(stats.upiTotal, currencySymbol)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Reconciliation Period: <strong>{isSingleDayReport ? formatDate(reportStartDate) : `${formatDate(reportStartDate)} to ${formatDate(reportEndDate)}`}</strong> • Generated Receipts: <strong>{stats.totalCount}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Close Window
            </button>

            {!existingDayClose && (
              <button
                type="button"
                onClick={handleTriggerCloseDay}
                disabled={!stats.canCloseDay}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                  stats.canCloseDay
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{stats.canCloseDay ? 'Finalize & Close' : `Update ${stats.pendingCount} Slips To Close`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
