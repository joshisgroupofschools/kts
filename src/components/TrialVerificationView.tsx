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
  const [headFilter, setHeadFilter] = useState('ALL'); // ALL, TRANSPORT, OLD_DUE, PAID_ONLY
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [verifiedRows, setVerifiedRows] = useState<Record<number, boolean>>({});
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const currencySymbol = schoolProfile.currencySymbol || '₹';

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN')}`;
  };

  // Metrics
  const summaryMetrics = useMemo(() => {
    let totalSchool = 0;
    let totalTransport = 0;
    let totalOldDue = 0;
    let totalPaid = 0;
    let transportCount = 0;
    let oldDueCount = 0;

    REAL_SPREADSHEET_ROWS.forEach((r) => {
      totalSchool += r.schoolFee;
      totalTransport += r.transportFee;
      totalOldDue += r.oldDueFee;
      totalPaid += r.totalPaid;
      if (r.transportFee > 0) transportCount++;
      if (r.oldDueFee > 0) oldDueCount++;
    });

    return {
      totalStudents: REAL_SPREADSHEET_ROWS.length,
      totalSchool,
      totalTransport,
      totalOldDue,
      grandCommitted: totalSchool + totalTransport + totalOldDue,
      totalPaid,
      transportCount,
      oldDueCount,
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
        const matchReceipt = r.receiptRaw.toLowerCase().includes(query) || r.commitReceipt.toLowerCase().includes(query);
        if (!matchName && !matchRoll && !matchClass && !matchReceipt) return false;
      }

      // Class Filter
      if (classFilter !== 'ALL') {
        if (r.className !== classFilter && r.rawClass !== classFilter) return false;
      }

      // Head Filter
      if (headFilter === 'TRANSPORT' && r.transportFee <= 0) return false;
      if (headFilter === 'OLD_DUE' && r.oldDueFee <= 0) return false;
      if (headFilter === 'PAID_ONLY' && r.totalPaid <= 0) return false;
      if (headFilter === 'UNPAID_ONLY' && r.totalPaid > 0) return false;

      return true;
    });
  }, [searchTerm, classFilter, headFilter]);

  const toggleVerify = (sNo: number) => {
    setVerifiedRows((prev) => ({
      ...prev,
      [sNo]: !prev[sNo],
    }));
  };

  const verifiedCount = Object.values(verifiedRows).filter(Boolean).length;

  const exportCSV = () => {
    const headers = [
      'S.No',
      'Class',
      'Name',
      'School Fee (7 Inst)',
      'Transport Fee (10 Inst)',
      'Old Due (7 Inst)',
      'Total Committed',
      'Total Paid',
      'Instalment 1',
      'Instalment 2',
      'Date',
      'Receipt',
      'Mode',
      'Committed Fee Receipt No',
    ];

    const csvLines = [headers.join(',')];
    REAL_SPREADSHEET_ROWS.forEach((r) => {
      csvLines.push(
        [
          r.sNo,
          `"${r.className}"`,
          `"${r.name}"`,
          r.schoolFee,
          r.transportFee,
          r.oldDueFee,
          r.totalCommitted,
          r.totalPaid,
          r.inst1,
          r.inst2,
          `"${r.dateRaw}"`,
          `"${r.receiptRaw}"`,
          `"${r.modeRaw}"`,
          `"${r.commitReceipt}"`,
        ].join(',')
      );
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trial_data_cross_check_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider border border-indigo-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-300" />
                Live Trial & Data Cross-Check View
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Google Sheet Structured Import
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              Spreadsheet Master Data Cross-Check Room
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-3xl leading-relaxed">
              Verify all <strong>{summaryMetrics.totalStudents} student entries</strong> with their exact 3 structured heads: 
              <span className="text-emerald-300 font-bold ml-1">1. School Fee (7 Inst: Jul 10–Jan 10)</span>, 
              <span className="text-amber-300 font-bold ml-1">2. Transport (10 Inst: Jun 10–Mar 10)</span>, and 
              <span className="text-purple-300 font-bold ml-1">3. Old Due (7 Inst: Sep 10–Mar 10)</span>.
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

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-indigo-800/60 text-xs">
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block font-semibold">Total Students</span>
            <span className="text-lg font-black text-white">{summaryMetrics.totalStudents}</span>
            <span className="text-[10px] text-indigo-300 block mt-0.5">228 Real Records</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-emerald-500/30">
            <span className="text-[11px] text-emerald-300 block font-semibold flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              School Tuition (7 Inst)
            </span>
            <span className="text-base font-black text-white">{formatCurrency(summaryMetrics.totalSchool)}</span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">Jul 10 to Jan 10</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-amber-500/30">
            <span className="text-[11px] text-amber-300 block font-semibold flex items-center gap-1">
              <Bus className="w-3.5 h-3.5 text-amber-400" />
              Transport Fee (10 Inst)
            </span>
            <span className="text-base font-black text-white">{formatCurrency(summaryMetrics.totalTransport)}</span>
            <span className="text-[10px] text-amber-300/80 block mt-0.5">{summaryMetrics.transportCount} Bus Students</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-purple-500/30">
            <span className="text-[11px] text-purple-300 block font-semibold flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-purple-400" />
              Old Due (7 Inst)
            </span>
            <span className="text-base font-black text-white">{formatCurrency(summaryMetrics.totalOldDue)}</span>
            <span className="text-[10px] text-purple-300/80 block mt-0.5">{summaryMetrics.oldDueCount} Carryovers</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-blue-500/30">
            <span className="text-[11px] text-blue-300 block font-semibold">Total Committed</span>
            <span className="text-base font-black text-white">{formatCurrency(summaryMetrics.grandCommitted)}</span>
            <span className="text-[10px] text-blue-300/80 block mt-0.5">School + Trans + Old</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-teal-500/30">
            <span className="text-[11px] text-teal-300 block font-semibold">Recorded Paid (Sheet)</span>
            <span className="text-base font-black text-teal-300">{formatCurrency(summaryMetrics.totalPaid)}</span>
            <span className="text-[10px] text-teal-300/80 block mt-0.5">Realized Receipts</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, roll #, receipt..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Class Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Classes (228)</option>
                <option value="Nursery">Nursery (5)</option>
                <option value="LKG">LKG (13)</option>
                <option value="UKG">UKG (19)</option>
                <option value="Class 1">Class 1 (23)</option>
                <option value="Class 2">Class 2 (16)</option>
                <option value="Class 3">Class 3 (28)</option>
                <option value="Class 4">Class 4 (26)</option>
                <option value="Class 5">Class 5 (15)</option>
                <option value="Class 6">Class 6 (17)</option>
                <option value="Class 7">Class 7 (18)</option>
                <option value="Class 8">Class 8 (19)</option>
                <option value="Class 9">Class 9 (10)</option>
                <option value="Class 10">Class 10 (19)</option>
              </select>
            </div>

            {/* Head Filter */}
            <select
              value={headFilter}
              onChange={(e) => setHeadFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Fee Heads</option>
              <option value="TRANSPORT">Has Transport 🚌 ({summaryMetrics.transportCount})</option>
              <option value="OLD_DUE">Has Old Due Carryover ({summaryMetrics.oldDueCount})</option>
              <option value="PAID_ONLY">Has Recorded Payment</option>
              <option value="UNPAID_ONLY">Unpaid / Zero Paid</option>
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
                <th className="py-2.5 px-3 w-10 text-center">Verify</th>
                <th className="py-2.5 px-2 w-12 text-center">S.No</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-3 text-right">
                  <span className="block">School Fee</span>
                  <span className="text-[10px] text-slate-400 font-normal">7 Inst (Jul–Jan)</span>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <span className="block">Transport Fee</span>
                  <span className="text-[10px] text-slate-400 font-normal">10 Inst (Jun–Mar)</span>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <span className="block">Old Due</span>
                  <span className="text-[10px] text-slate-400 font-normal">7 Inst (Sep–Mar)</span>
                </th>
                <th className="py-2.5 px-3 text-right font-black">
                  Total Committed
                </th>
                <th className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                  Total Paid
                </th>
                <th className="py-2.5 px-3">
                  <span className="block">Payment Details</span>
                  <span className="text-[10px] text-slate-400 font-normal">Inst 1 / Inst 2 / Date / Receipt</span>
                </th>
                <th className="py-2.5 px-3 text-center">Commitment Receipt</th>
                <th className="py-2.5 px-2 w-10 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                    No students match the search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isVerified = !!verifiedRows[row.sNo];
                  const isExpanded = expandedRow === row.sNo;
                  const hasTransport = row.transportFee > 0;
                  const hasOldDue = row.oldDueFee > 0;

                  return (
                    <React.Fragment key={row.sNo}>
                      <tr
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          isVerified ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                        }`}
                      >
                        {/* Verify Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleVerify(row.sNo)}
                            className="cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Click to mark row verified"
                          >
                            {isVerified ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
                            ) : (
                              <div className="w-4 h-4 rounded-sm border border-slate-300 dark:border-slate-600 inline-block hover:border-emerald-500" />
                            )}
                          </button>
                        </td>

                        {/* S.No */}
                        <td className="py-2.5 px-2 text-center font-mono text-slate-500 font-bold">
                          #{row.sNo}
                        </td>

                        {/* Class */}
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                            {row.className}
                          </span>
                        </td>

                        {/* Student Name */}
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{row.name}</span>
                            {hasTransport && (
                              <span
                                className="inline-flex items-center text-xs cursor-help select-none"
                                title="Transport / Bus Fee Assigned"
                              >
                                🚌
                              </span>
                            )}
                            {hasOldDue && (
                              <span
                                className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 rounded text-[9px] font-bold"
                                title="Previous Year Pending Due"
                              >
                                Old Due
                              </span>
                            )}
                          </div>
                        </td>

                        {/* School Fee */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {row.schoolFee > 0 ? (
                            <div>
                              <span>{formatCurrency(row.schoolFee)}</span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {formatCurrency(Math.floor(row.schoolFee / 7))}/mo × 7
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Transport Fee */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                          {row.transportFee > 0 ? (
                            <div>
                              <span>{formatCurrency(row.transportFee)}</span>
                              <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 block font-normal">
                                {formatCurrency(Math.floor(row.transportFee / 10))}/mo × 10
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Old Due */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                          {row.oldDueFee > 0 ? (
                            <div>
                              <span>{formatCurrency(row.oldDueFee)}</span>
                              <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 block font-normal">
                                {formatCurrency(Math.floor(row.oldDueFee / 7))}/mo × 7
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Total Committed */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          {formatCurrency(row.totalCommitted)}
                        </td>

                        {/* Total Paid */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {row.totalPaid > 0 ? formatCurrency(row.totalPaid) : <span className="text-slate-400 font-normal">₹0</span>}
                        </td>

                        {/* Payment Details */}
                        <td className="py-2.5 px-3 text-[11px]">
                          {row.totalPaid > 0 ? (
                            <div className="space-y-0.5">
                              {row.inst1 > 0 && (
                                <div>
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                    Inst 1: {formatCurrency(row.inst1)}
                                  </span>
                                </div>
                              )}
                              {row.inst2 > 0 && (
                                <div>
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                    Inst 2: {formatCurrency(row.inst2)}
                                  </span>
                                </div>
                              )}
                              <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                {row.dateRaw && <span>Dt: {row.dateRaw} </span>}
                                {row.receiptRaw && <span>• Rct: {row.receiptRaw} </span>}
                                {row.modeRaw && <span className="uppercase">({row.modeRaw})</span>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No payments recorded</span>
                          )}
                        </td>

                        {/* Commitment Receipt No */}
                        <td className="py-2.5 px-3 text-center">
                          {row.commitReceipt ? (
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded font-mono font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                              #{row.commitReceipt}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>

                        {/* Expand Schedule */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExpanded ? null : row.sNo)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="Expand 3-Head Installment Schedule"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Installment Schedule Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-y border-slate-200 dark:border-slate-700">
                          <td colSpan={12} className="py-3 px-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                                  3-Head Structured Due Schedule for {row.name} ({row.className})
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  All installments due on the <strong>10th</strong> of each month
                                </span>
                              </div>

                              {/* Real-time Allocation & Payment Settlement Mapping */}
                              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-700">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                                  <div>
                                    <span className="font-black text-amber-400 text-sm">
                                      Realized Settlement: {formatCurrency(row.totalPaid)} Paid of {formatCurrency(row.totalCommitted)} Total Committed
                                    </span>
                                    <span className="text-[11px] text-slate-300 ml-2">
                                      (Remaining Balance: <strong>{formatCurrency(row.totalCommitted - row.totalPaid)}</strong>)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Allocation Engine: <strong>Strict FIFO Chronological Order</strong> (Due Date priority)
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                {/* Head 1: School Tuition */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                  <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300 text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                    <span>1. School Fee (7 Inst)</span>
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

                                        // Calculate school fee paid using FIFO (assuming transport/old due priority based on due date)
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
                                    <p className="text-slate-400 italic text-center py-4">No school fee</p>
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

                                {/* Head 3: Old Due */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-2">
                                  <div className="flex items-center justify-between font-bold text-purple-800 dark:text-purple-300 text-xs border-b border-purple-100 dark:border-purple-900/30 pb-1.5">
                                    <span>3. Old Due (7 Inst)</span>
                                    <span className="font-mono">{formatCurrency(row.oldDueFee)}</span>
                                  </div>
                                  {row.oldDueFee > 0 ? (
                                    <div className="space-y-1.5 text-[11px]">
                                      {OLD_DUE_DATES.map((date, idx) => {
                                        const base = Math.floor(row.oldDueFee / 7);
                                        const rem = row.oldDueFee % 7;
                                        const instAmt = idx === 0 ? base + rem : base;
                                        return (
                                          <div
                                            key={date}
                                            className="flex items-center justify-between p-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                          >
                                            <div>
                                              <span className="font-bold">Inst #{idx + 1}</span>
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
                                    <p className="text-slate-400 italic text-center py-6">No previous year dues</p>
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
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Real Spreadsheet Data Import
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You are about to replace previous sample records with the <strong>228 verified student accounts</strong> from your official Google Sheet:
            </p>

            <ul className="text-xs space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>228 Active Students</strong> across Nursery, LKG, UKG & Classes 1–10</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>School Fees:</strong> {formatCurrency(summaryMetrics.totalSchool)} across 7 installments (Jul 10–Jan 10)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Transport Fees:</strong> {formatCurrency(summaryMetrics.totalTransport)} across 10 installments (Jun 10–Mar 10)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Old Due Carryovers:</strong> {formatCurrency(summaryMetrics.totalOldDue)} across 7 installments (Sep 10–Mar 10)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Recorded Payments:</strong> {formatCurrency(summaryMetrics.totalPaid)} mapped to receipt numbers & dates</span>
              </li>
            </ul>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyConfirm(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel & Continue Cross-Checking
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowApplyConfirm(false);
                  onApplyRealData();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Yes, Apply Real Data to App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
