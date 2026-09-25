import React, { useState, useMemo } from 'react';
import {
  REAL_SPREADSHEET_ROWS,
  SCHOOL_FEE_DUE_DATES,
  TRANSPORT_FEE_DUE_DATES,
  OLD_DUE_DATES,
  TrialSheetRow,
} from '../data/trialSpreadsheetData';
import { SchoolProfile } from '../types';
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  Bus,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  History,
  RotateCcw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface TrialVerificationViewProps {
  schoolProfile: SchoolProfile;
  onApplyRealData: () => void;
  onBackToApp: () => void;
}

export const TrialVerificationView: React.FC<TrialVerificationViewProps> = ({
  schoolProfile,
  onApplyRealData,
  onBackToApp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [headFilter, setHeadFilter] = useState('ALL'); // ALL, TRANSPORT, OLD_DUE, BOOKS, PAID_ONLY, UNPAID_ONLY
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, EXCESS, EXACTLY PAID, DUE
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [verifiedRows, setVerifiedRows] = useState<Record<number, boolean>>({});
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const currencySymbol = schoolProfile.currencySymbol || '₹';

  const formatCurrency = (val: number) => {
    const isNeg = val < 0;
    const absStr = Math.abs(Math.round(val)).toLocaleString('en-IN');
    return `${isNeg ? '-' : ''}${currencySymbol}${absStr}`;
  };

  // Metrics directly matching user's authoritative sheet
  const summaryMetrics = useMemo(() => {
    let totalSchool = 0;
    let totalTransport = 0;
    let totalOldDue = 0;
    let totalBooks = 0;
    let grandCommitted = 0;
    let totalExpected = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalDiff = 0;

    let totalInst1 = 0;
    let totalInst2 = 0;
    let totalInst3 = 0;
    let totalInst4 = 0;
    let totalInst5 = 0;
    let totalInst6 = 0;

    let transportCount = 0;
    let oldDueCount = 0;
    let booksCount = 0;

    let excessCount = 0;
    let exactCount = 0;
    let dueCount = 0;

    REAL_SPREADSHEET_ROWS.forEach((r) => {
      totalSchool += r.schoolFee || 0;
      totalTransport += r.transportFee || 0;
      totalOldDue += r.oldDueFee || 0;
      totalBooks += r.booksFee || 0;
      grandCommitted += r.totalPayable || (r.schoolFee + r.transportFee + r.oldDueFee + r.booksFee);
      totalExpected += r.expectedPayable || 0;
      totalPaid += r.totalPaid || 0;
      totalDue += r.totalDue || 0;
      totalDiff += r.difference || 0;

      totalInst1 += r.inst1 || 0;
      totalInst2 += r.inst2 || 0;
      totalInst3 += r.inst3 || 0;
      totalInst4 += r.inst4 || 0;
      totalInst5 += r.inst5 || 0;
      totalInst6 += r.inst6 || 0;

      if (r.transportFee > 0) transportCount++;
      if (r.oldDueFee > 0) oldDueCount++;
      if (r.booksFee > 0) booksCount++;

      if (r.status === 'EXCESS') excessCount++;
      else if (r.status === 'EXACTLY PAID') exactCount++;
      else dueCount++;
    });

    return {
      totalStudents: REAL_SPREADSHEET_ROWS.length,
      totalSchool,
      totalTransport,
      totalOldDue,
      totalBooks,
      grandCommitted,
      totalExpected,
      totalPaid,
      totalDue,
      totalDiff,
      totalInst1,
      totalInst2,
      totalInst3,
      totalInst4,
      totalInst5,
      totalInst6,
      transportCount,
      oldDueCount,
      booksCount,
      excessCount,
      exactCount,
      dueCount,
    };
  }, []);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return REAL_SPREADSHEET_ROWS.filter((r) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = r.name.toLowerCase().includes(query);
        const matchRoll = String(r.sNo).includes(query);
        const matchClass = r.className.toLowerCase().includes(query) || r.rawClass.toLowerCase().includes(query);
        const matchReceipt = (r.receiptRaw || '').toLowerCase().includes(query) || (r.commitReceipt || '').toLowerCase().includes(query);
        const matchMode = (r.modeRaw || '').toLowerCase().includes(query);
        const matchRemarks = (r.receipt3 || '').toLowerCase().includes(query);
        if (!matchName && !matchRoll && !matchClass && !matchReceipt && !matchMode && !matchRemarks) return false;
      }

      // Class Filter
      if (classFilter !== 'ALL') {
        if (r.className !== classFilter && r.rawClass !== classFilter) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (r.status !== statusFilter) return false;
      }

      // Head Filter
      if (headFilter === 'TRANSPORT' && r.transportFee <= 0) return false;
      if (headFilter === 'OLD_DUE' && r.oldDueFee <= 0) return false;
      if (headFilter === 'BOOKS' && (r.booksFee || 0) <= 0) return false;
      if (headFilter === 'PAID_ONLY' && r.totalPaid <= 0) return false;
      if (headFilter === 'UNPAID_ONLY' && r.totalPaid > 0) return false;

      return true;
    });
  }, [searchTerm, classFilter, headFilter, statusFilter]);

  const toggleVerify = (sNo: number) => {
    setVerifiedRows((prev) => ({
      ...prev,
      [sNo]: !prev[sNo],
    }));
  };

  const verifiedCount = Object.values(verifiedRows).filter(Boolean).length;

  const exportCSV = () => {
    const headers = [
      'S.NO 1',
      'CLASS',
      'NAME',
      'COMMITTED FEES',
      'TRANSPORT',
      'OLD DUE',
      'BOOKS FEE',
      'TOTAL PAYABLE',
      'PAYABLE',
      'PAID',
      'PAID 1ST TIME',
      'PAID 2ND TIME',
      'PAID 3RDT TIME',
      'PAID 4TH TIME',
      'PAID 5TH',
      'PAID 6TH',
      'PAID 7TH',
      'STATUS',
      'DIFFERENCE',
      'DUE',
      'DATE',
      'RECIEPT',
      'PAYMENT MODE',
      'RECIEPT2',
      'RECIEPT3',
    ];

    const csvLines = [headers.join(',')];
    REAL_SPREADSHEET_ROWS.forEach((r) => {
      csvLines.push(
        [
          r.sNo,
          `"${r.rawClass}"`,
          `"${r.name}"`,
          r.schoolFee,
          r.transportFee,
          r.oldDueFee,
          r.booksFee || '',
          r.totalPayable,
          r.expectedPayable,
          r.totalPaid,
          r.inst1 || '',
          r.inst2 || '',
          r.inst3 || '',
          r.inst4 || '',
          r.inst5 || '',
          r.inst6 || '',
          r.inst7 || '',
          `"${r.status}"`,
          r.difference,
          r.totalDue,
          `"${r.dateRaw || ''}"`,
          `"${r.receiptRaw || ''}"`,
          `"${r.modeRaw || ''}"`,
          `"${r.receipt2 || ''}"`,
          `"${r.receipt3 || ''}"`,
        ].join(',')
      );
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kakatiya_sept_master_v2_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-indigo-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                September 2026 Master Update (v2.0)
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                229 Students Verified • ₹21,98,847 Collections Realized
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              Spreadsheet Master Data Cross-Check Room
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-4xl leading-relaxed">
              Authoritative school register verification with 4 structured fee heads: 
              <span className="text-emerald-300 font-bold ml-1">1. School Tuition (₹56,49,370)</span>, 
              <span className="text-amber-300 font-bold ml-1">2. Transport (₹4,05,250)</span>, 
              <span className="text-purple-300 font-bold ml-1">3. Old Due (₹3,83,500)</span>, and 
              <span className="text-sky-300 font-bold ml-1">4. Books Fee (₹10,224)</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={exportCSV}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onBackToApp}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <History className="w-4 h-4" />
              <span>Back to Live Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setShowApplyConfirm(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Apply To Live Database</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Cards matching Authoritative Spreadsheet Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-indigo-800/60 text-xs">
          {/* Card 1: Students */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block font-semibold">Total Students</span>
            <span className="text-lg font-black text-white">{summaryMetrics.totalStudents}</span>
            <span className="text-[10px] text-indigo-300 block mt-0.5">229 Roster Entries</span>
          </div>

          {/* Card 2: School Tuition */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-emerald-500/30">
            <span className="text-[11px] text-emerald-300 block font-semibold flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              Committed Fees
            </span>
            <span className="text-base font-black text-white">{formatCurrency(summaryMetrics.totalSchool)}</span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">Core Tuition Rate</span>
          </div>

          {/* Card 3: Transport & Old Due */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-amber-500/30">
            <span className="text-[11px] text-amber-300 block font-semibold flex items-center gap-1">
              <Bus className="w-3.5 h-3.5 text-amber-400" />
              Trans + Old + Books
            </span>
            <span className="text-base font-black text-white">
              {formatCurrency(summaryMetrics.totalTransport + summaryMetrics.totalOldDue + summaryMetrics.totalBooks)}
            </span>
            <span className="text-[10px] text-amber-300/80 block mt-0.5">
              T: {formatCurrency(summaryMetrics.totalTransport)} • O: {formatCurrency(summaryMetrics.totalOldDue)}
            </span>
          </div>

          {/* Card 4: Total Payable */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-blue-500/30">
            <span className="text-[11px] text-blue-300 block font-semibold">Total Payable</span>
            <span className="text-base font-black text-white">{formatCurrency(summaryMetrics.grandCommitted)}</span>
            <span className="text-[10px] text-blue-300/80 block mt-0.5">Committed + Trans + Old + Books</span>
          </div>

          {/* Card 5: Realized Paid */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-teal-500/30">
            <span className="text-[11px] text-teal-300 block font-semibold">Recorded Paid (Sheet)</span>
            <span className="text-base font-black text-teal-300">{formatCurrency(summaryMetrics.totalPaid)}</span>
            <span className="text-[10px] text-teal-300/80 block mt-0.5 truncate">
              I1: {formatCurrency(summaryMetrics.totalInst1)} • I2: {formatCurrency(summaryMetrics.totalInst2)} • I3: {formatCurrency(summaryMetrics.totalInst3)}
            </span>
          </div>

          {/* Card 6: Total Due & Status Variance */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-rose-500/30">
            <span className="text-[11px] text-rose-300 block font-semibold">Total Due</span>
            <span className="text-base font-black text-rose-300">{formatCurrency(summaryMetrics.totalDue)}</span>
            <span className="text-[10px] text-rose-300/80 block mt-0.5">
              Diff: {formatCurrency(summaryMetrics.totalDiff)} ({summaryMetrics.excessCount} Excess, {summaryMetrics.dueCount} Due)
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student, class, receipt, remarks..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses ({summaryMetrics.totalStudents})</option>
                <option value="EXCESS">EXCESS Paid ({summaryMetrics.excessCount})</option>
                <option value="EXACTLY PAID">EXACTLY PAID ({summaryMetrics.exactCount})</option>
                <option value="DUE">DUE Pending ({summaryMetrics.dueCount})</option>
              </select>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Classes (229)</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 6">Class 6</option>
                <option value="Class 5">Class 5</option>
                <option value="Class 4">Class 4</option>
                <option value="Class 3">Class 3</option>
                <option value="Class 2">Class 2</option>
                <option value="Class 1">Class 1</option>
                <option value="UKG">UKG</option>
                <option value="LKG">LKG</option>
                <option value="Nursery">Nursery</option>
              </select>
            </div>

            {/* Head Filter */}
            <select
              value={headFilter}
              onChange={(e) => setHeadFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Heads</option>
              <option value="TRANSPORT">Has Transport 🚌 ({summaryMetrics.transportCount})</option>
              <option value="OLD_DUE">Has Old Due ({summaryMetrics.oldDueCount})</option>
              <option value="BOOKS">Has Books Fee ({summaryMetrics.booksCount})</option>
              <option value="PAID_ONLY">Has Recorded Payment</option>
              <option value="UNPAID_ONLY">Zero Paid</option>
            </select>

            <div className="text-xs font-semibold text-slate-500 pl-2">
              Showing <strong>{filteredRows.length}</strong> of {summaryMetrics.totalStudents} entries
              {verifiedCount > 0 && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  ({verifiedCount} checked)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Master Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-2 w-8 text-center">✓</th>
                <th className="py-2.5 px-2 w-10 text-center">S.No</th>
                <th className="py-2.5 px-2">Class</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-2 text-right">Committed</th>
                <th className="py-2.5 px-2 text-right">Trans</th>
                <th className="py-2.5 px-2 text-right">Old Due</th>
                <th className="py-2.5 px-2 text-right">Books</th>
                <th className="py-2.5 px-2 text-right font-black">Total Payable</th>
                <th className="py-2.5 px-2 text-right">Payable (Target)</th>
                <th className="py-2.5 px-2 text-right font-black text-emerald-600">Total Paid</th>
                <th className="py-2.5 px-2 text-center">Status</th>
                <th className="py-2.5 px-2 text-right font-bold">Difference</th>
                <th className="py-2.5 px-2 text-right font-black text-rose-600">Total Due</th>
                <th className="py-2.5 px-3">
                  <span className="block">Payments (Inst 1..6)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Date / Receipt / Mode</span>
                </th>
                <th className="py-2.5 px-2 text-center">Commit Rct</th>
                <th className="py-2.5 px-2">Remarks</th>
                <th className="py-2.5 px-2 w-8 text-center">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-8 text-center text-slate-400 italic">
                    No students match the search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isVerified = !!verifiedRows[row.sNo];
                  const isExpanded = expandedRow === row.sNo;
                  const hasTransport = row.transportFee > 0;
                  const hasOldDue = row.oldDueFee > 0;
                  const hasBooks = (row.booksFee || 0) > 0;

                  return (
                    <React.Fragment key={row.sNo}>
                      <tr
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          isVerified ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                        }`}
                      >
                        {/* Verify Checkbox */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleVerify(row.sNo)}
                            className="cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Click to mark row verified"
                          >
                            {isVerified ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-sm border border-slate-300 dark:border-slate-600 inline-block hover:border-emerald-500" />
                            )}
                          </button>
                        </td>

                        {/* S.No */}
                        <td className="py-2 px-2 text-center font-mono text-slate-500 font-bold">
                          #{row.sNo}
                        </td>

                        {/* Class */}
                        <td className="py-2 px-2">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            {row.rawClass || row.className}
                          </span>
                        </td>

                        {/* Student Name */}
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{row.name}</span>
                            {hasTransport && (
                              <span
                                className="inline-flex items-center text-xs cursor-help select-none"
                                title="Transport Assigned"
                              >
                                🚌
                              </span>
                            )}
                            {hasOldDue && (
                              <span
                                className="px-1 py-0.2 bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 rounded text-[9px] font-bold"
                                title="Old Due"
                              >
                                Old
                              </span>
                            )}
                            {hasBooks && (
                              <span
                                className="px-1 py-0.2 bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 rounded text-[9px] font-bold"
                                title="Books Fee"
                              >
                                Books
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Committed School Fee */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {row.schoolFee > 0 ? formatCurrency(row.schoolFee) : <span className="text-slate-400">-</span>}
                        </td>

                        {/* Transport */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                          {row.transportFee > 0 ? formatCurrency(row.transportFee) : <span className="text-slate-400">-</span>}
                        </td>

                        {/* Old Due */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                          {row.oldDueFee > 0 ? formatCurrency(row.oldDueFee) : <span className="text-slate-400">-</span>}
                        </td>

                        {/* Books */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                          {(row.booksFee || 0) > 0 ? formatCurrency(row.booksFee) : <span className="text-slate-400">-</span>}
                        </td>

                        {/* Total Payable */}
                        <td className="py-2 px-2 text-right font-mono font-black text-slate-900 dark:text-white">
                          {formatCurrency(row.totalPayable)}
                        </td>

                        {/* Expected Payable (Pro-rated Target) */}
                        <td className="py-2 px-2 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                          {formatCurrency(row.expectedPayable)}
                        </td>

                        {/* Total Paid */}
                        <td className="py-2 px-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {row.totalPaid > 0 ? formatCurrency(row.totalPaid) : <span className="text-slate-400 font-normal">₹0</span>}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2 px-2 text-center">
                          {row.status === 'EXCESS' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                              EXCESS
                            </span>
                          )}
                          {row.status === 'EXACTLY PAID' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                              EXACT
                            </span>
                          )}
                          {row.status === 'DUE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                              DUE
                            </span>
                          )}
                        </td>

                        {/* Difference */}
                        <td className={`py-2 px-2 text-right font-mono font-bold ${
                          row.difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : row.difference === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {row.difference > 0 ? `+${formatCurrency(row.difference)}` : formatCurrency(row.difference)}
                        </td>

                        {/* Total Due */}
                        <td className="py-2 px-2 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.totalDue)}
                        </td>

                        {/* Payment Details */}
                        <td className="py-2 px-3 text-[11px]">
                          {row.totalPaid > 0 ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {row.inst1 > 0 && <span className="font-semibold text-emerald-700 dark:text-emerald-300">I1: {formatCurrency(row.inst1)}</span>}
                                {row.inst2 > 0 && <span className="font-semibold text-teal-700 dark:text-teal-300">I2: {formatCurrency(row.inst2)}</span>}
                                {row.inst3 > 0 && <span className="font-semibold text-purple-700 dark:text-purple-300">I3: {formatCurrency(row.inst3)}</span>}
                                {row.inst4 > 0 && <span className="font-semibold text-amber-700 dark:text-amber-300">I4: {formatCurrency(row.inst4)}</span>}
                                {row.inst5 > 0 && <span className="font-semibold text-sky-700 dark:text-sky-300">I5: {formatCurrency(row.inst5)}</span>}
                                {row.inst6 > 0 && <span className="font-semibold text-indigo-700 dark:text-indigo-300">I6: {formatCurrency(row.inst6)}</span>}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                {row.dateRaw && <span>Dt: {row.dateRaw} </span>}
                                {row.receiptRaw && <span>• Rct: {row.receiptRaw} </span>}
                                {row.modeRaw && <span className="uppercase">({row.modeRaw})</span>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No payments</span>
                          )}
                        </td>

                        {/* Commitment Receipt No */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-[10px] text-indigo-700 dark:text-indigo-300">
                          {row.receipt2 ? `#${row.receipt2}` : <span className="text-slate-300 dark:text-slate-700">-</span>}
                        </td>

                        {/* Remarks */}
                        <td className="py-2 px-2 text-[10px] text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={row.receipt3}>
                          {row.receipt3 || '-'}
                        </td>

                        {/* Expand Schedule */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExpanded ? null : row.sNo)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="Expand Schedule"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Installment Schedule Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-y border-slate-200 dark:border-slate-700">
                          <td colSpan={18} className="py-3 px-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                                  Structured Due Schedule for {row.name} ({row.className}) • Target Payable: {formatCurrency(row.expectedPayable)}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Status: <strong className="text-indigo-600">{row.status}</strong> • Variance: <strong>{formatCurrency(row.difference)}</strong>
                                </span>
                              </div>

                              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-700">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                                  <div>
                                    <span className="font-black text-amber-400 text-sm">
                                      Realized Settlement: {formatCurrency(row.totalPaid)} Paid of {formatCurrency(row.totalPayable)} Total Payable
                                    </span>
                                    <span className="text-[11px] text-slate-300 ml-2">
                                      (Remaining Total Due: <strong>{formatCurrency(row.totalDue)}</strong>)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Allocation Engine: <strong>Strict FIFO Chronological Order</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                {/* Head 1: School Tuition */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                  <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300 text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                    <span>1. School Tuition (7 Inst)</span>
                                    <span className="font-mono">{formatCurrency(row.schoolFee)}</span>
                                  </div>
                                  {row.schoolFee > 0 ? (
                                    <div className="space-y-1.5 text-[11px]">
                                      {(() => {
                                        const amounts = (() => {
                                          const base = Math.floor(row.schoolFee / 7);
                                          const rem = row.schoolFee % 7;
                                          return SCHOOL_FEE_DUE_DATES.map((_, i) => (i === 0 ? base + rem : base));
                                        })();

                                        let pool = row.totalPaid;
                                        return SCHOOL_FEE_DUE_DATES.map((date, idx) => {
                                          const instAmt = amounts[idx];
                                          const paidAmt = Math.min(Math.max(0, pool), instAmt);
                                          pool -= paidAmt;
                                          const isCleared = paidAmt >= instAmt;
                                          const isPartial = paidAmt > 0 && paidAmt < instAmt;

                                          return (
                                            <div
                                              key={date}
                                              className={`flex items-center justify-between p-1.5 rounded-lg border ${
                                                isCleared
                                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                                  : isPartial
                                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                              }`}
                                            >
                                              <div>
                                                <span className="font-bold">Inst #{idx + 1}</span>
                                                <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({date})</span>
                                              </div>
                                              <div className="text-right">
                                                <div className="font-mono font-bold">{formatCurrency(instAmt)}</div>
                                                <div className="text-[10px]">
                                                  {isCleared ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Cleared</span>
                                                  ) : isPartial ? (
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                                      Partial ({formatCurrency(paidAmt)} paid)
                                                    </span>
                                                  ) : (
                                                    <span className="text-slate-400">Pending</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  ) : (
                                    <p className="text-slate-400 italic text-center py-4">No school fee assigned</p>
                                  )}
                                </div>

                                {/* Head 2: Transport */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
                                  <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300 text-xs border-b border-amber-100 dark:border-amber-900/30 pb-1.5">
                                    <span>2. Transport (10 Inst)</span>
                                    <span className="font-mono">{formatCurrency(row.transportFee)}</span>
                                  </div>
                                  {row.transportFee > 0 ? (
                                    <div className="space-y-1.5 text-[11px]">
                                      {TRANSPORT_FEE_DUE_DATES.map((date, idx) => {
                                        const base = Math.floor(row.transportFee / 10);
                                        const rem = row.transportFee % 10;
                                        const instAmt = idx === 0 ? base + rem : base;
                                        return (
                                          <div
                                            key={date}
                                            className="flex items-center justify-between p-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                          >
                                            <div>
                                              <span className="font-bold">Month #{idx + 1}</span>
                                              <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({date})</span>
                                            </div>
                                            <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                              {formatCurrency(instAmt)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-slate-400 italic text-center py-6">No transport facility assigned</p>
                                  )}
                                </div>

                                {/* Head 3: Old Due & Books */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-2">
                                  <div className="flex items-center justify-between font-bold text-purple-800 dark:text-purple-300 text-xs border-b border-purple-100 dark:border-purple-900/30 pb-1.5">
                                    <span>3. Old Due ({formatCurrency(row.oldDueFee)}) {row.booksFee ? `• Books (${formatCurrency(row.booksFee)})` : ''}</span>
                                  </div>
                                  {row.oldDueFee > 0 || (row.booksFee || 0) > 0 ? (
                                    <div className="space-y-1.5 text-[11px]">
                                      {(row.booksFee || 0) > 0 && (
                                        <div className="flex items-center justify-between p-1.5 rounded-lg border bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-bold">
                                          <span>Books & Stationery Kit</span>
                                          <span className="font-mono">{formatCurrency(row.booksFee)}</span>
                                        </div>
                                      )}
                                      {row.oldDueFee > 0 && OLD_DUE_DATES.map((date, idx) => {
                                        const base = Math.floor(row.oldDueFee / 7);
                                        const rem = row.oldDueFee % 7;
                                        const instAmt = idx === 0 ? base + rem : base;
                                        return (
                                          <div
                                            key={date}
                                            className="flex items-center justify-between p-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                          >
                                            <div>
                                              <span className="font-bold">Old Due Inst #{idx + 1}</span>
                                              <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({date})</span>
                                            </div>
                                            <div className="font-mono font-bold text-purple-700 dark:text-purple-400">
                                              {formatCurrency(instAmt)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-slate-400 italic text-center py-6">No old dues or book fees</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showApplyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Confirm Database Sync to Version 2.0
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will synchronize the live database with all <strong>229 students</strong> from your September master sheet, establishing <strong>₹64,48,344 committed</strong> and <strong>₹21,98,847 collected</strong> with individual receipts.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Roster Count:</span>
                <strong className="font-mono text-emerald-600">229 Students</strong>
              </div>
              <div className="flex justify-between">
                <span>Committed School Tuition:</span>
                <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(summaryMetrics.totalSchool)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Transport Fees:</span>
                <strong className="font-mono text-amber-600">{formatCurrency(summaryMetrics.totalTransport)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Old Due Carryovers:</span>
                <strong className="font-mono text-purple-600">{formatCurrency(summaryMetrics.totalOldDue)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Books & Stationery:</span>
                <strong className="font-mono text-sky-600">{formatCurrency(summaryMetrics.totalBooks)}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 font-bold">
                <span>Total Collections Realized:</span>
                <strong className="font-mono text-teal-600">{formatCurrency(summaryMetrics.totalPaid)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowApplyConfirm(false);
                  onApplyRealData();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
              >
                Apply & Activate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
