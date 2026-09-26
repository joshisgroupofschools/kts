import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { getKolkataToday } from '../utils/dateUtils';
import {
  PaymentAllocation,
  PaymentMode,
  PaymentTransaction,
  SchoolProfile,
  Student,
  StudentFinancialSummary,
} from '../types';
import { calculateFifoAllocations } from '../utils/feeCalculator';
import { formatCurrency, formatDate, getNextMultipleOfFiveDate } from '../utils/numberToWords';
import { compareOfficialInstallmentOrder, getInstallmentDisplayName } from '../utils/installmentFormatter';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Banknote,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Flame,
  Layers,
  Printer,
  QrCode,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

interface PaymentModalProps {
  student: Student;
  summary: StudentFinancialSummary;
  schoolProfile: SchoolProfile;
  initialFeeType?: 'ALL' | 'BOOKS' | 'DRESS' | string;
  currentDate?: string;
  onClose: () => void;
  onSavePayment: (
    transaction: PaymentTransaction,
    customAllocations: PaymentAllocation[],
    partialStatusUpdate?: any
  ) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  student,
  summary,
  schoolProfile,
  initialFeeType = 'ALL',
  currentDate,
  onClose,
  onSavePayment,
}) => {
  const filteredInstallments = useMemo(() => {
    if (initialFeeType === 'BOOKS') {
      return summary.installments.filter(
        (i) => i.headName.toLowerCase().includes('book') || i.headName.toLowerCase().includes('stationery')
      );
    }
    if (initialFeeType === 'DRESS') {
      return summary.installments.filter(
        (i) =>
          i.headName.toLowerCase().includes('dress') ||
          i.headName.toLowerCase().includes('uniform') ||
          i.headName.toLowerCase().includes('cloth')
      );
    }
    return summary.installments;
  }, [summary.installments, initialFeeType]);

  const initialAmount = useMemo(() => {
    const list = filteredInstallments.length > 0 && initialFeeType !== 'ALL' ? filteredInstallments : summary.installments;
    const selectedDate = currentDate || getKolkataToday();
    return list
      .filter((i) => i.balanceAmount > 0 && i.dueDate <= selectedDate)
      .reduce((acc, i) => acc + i.balanceAmount, 0);
  }, [filteredInstallments, summary.installments, initialFeeType, currentDate]);

  const [paymentAmount, setPaymentAmount] = useState<number>(initialAmount);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(
    currentDate || getKolkataToday()
  );
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Generate Preview Receipt No
  const currentYear = Number(paymentDate.slice(0, 4));
  const sequenceStr = String(schoolProfile.nextReceiptSequence || 1).padStart(5, '0');
  const previewReceiptNo = `${schoolProfile.receiptPrefix || 'KSB'}-${currentYear}-${sequenceStr}`;

  // Automatically recalculate FIFO allocations whenever paymentAmount changes
  useEffect(() => {
    if (!isManualOverride) {
      const sourceInsts = filteredInstallments.length > 0 && initialFeeType !== 'ALL' ? filteredInstallments : summary.installments;
      const computed = calculateFifoAllocations(sourceInsts, paymentAmount);
      setAllocations(computed);
    }
  }, [paymentAmount, summary.installments, filteredInstallments, initialFeeType, isManualOverride]);

  const handleAllocationChange = (installmentId: string, amount: number) => {
    setIsManualOverride(true);
    const updated = allocations.map((a) => {
      if (a.installmentId === installmentId) {
        return { ...a, allocatedAmount: Math.max(0, amount) };
      }
      return a;
    });
    setAllocations(updated);

    const newTotal = updated.reduce((sum, a) => sum + a.allocatedAmount, 0);
    setPaymentAmount(newTotal);
  };

  const handleResetToAutoFifo = () => {
    setIsManualOverride(false);
    const computed = calculateFifoAllocations(summary.installments, paymentAmount);
    setAllocations(computed);
  };

  const isPartialPayment = paymentAmount > 0 && paymentAmount < summary.totalDue;

  const handleConfirm = async () => {
    if (isSaving) return;
    if (paymentAmount <= 0) {
      setErrorMsg('Payment amount must be greater than 0.');
      return;
    }
    if (paymentAmount > summary.totalDue) {
      setErrorMsg(`Cannot accept payment greater than total outstanding balance of ${formatCurrency(summary.totalDue, schoolProfile.currencySymbol)}.`);
      return;
    }

    if (paymentMode === 'UPI' && !referenceNo.trim()) {
      setErrorMsg('Please enter the mandatory UPI UTR / Reference Number for UPI payments.');
      return;
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    if (totalAllocated === 0 && paymentAmount > 0) {
      setErrorMsg('Payment must be allocated to existing installments.');
      return;
    } else if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
      setErrorMsg(`Total allocated amount (${formatCurrency(totalAllocated, schoolProfile.currencySymbol)}) does not match payment amount (${formatCurrency(paymentAmount, schoolProfile.currencySymbol)}).`);
      return;
    }

    const now = new Date();
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
    const fullDateTime = `${paymentDate} ${timeStr}`;

    const newTransaction: PaymentTransaction = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receiptNo: previewReceiptNo,
      studentId: student.id,
      studentName: student.name,
      studentRollNo: student.rollNo,
      studentClass: `${student.className}${student.section ? ' - ' + student.section : ''}`,
      date: fullDateTime,
      amount: paymentAmount,
      paymentMode,
      referenceNo: referenceNo.trim() || undefined,
      remarks: remarks.trim() || undefined,
      allocations,
      isCancelled: false,
    };

    setErrorMsg(null);
    setIsSaving(true);
    try {
      await onSavePayment(newTransaction, allocations);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (error: any) {
      setErrorMsg(error?.message || 'Unable to save to the central database. No changes were recorded.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="modal-collect-fees"
      className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-y-auto animate-in fade-in duration-150"
    >
      {/* Full-Page Sticky Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 sm:px-8 py-3.5 border-b border-slate-800 shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="Cancel & Back to Ledger"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Ledger</span>
          </button>

          <div className="h-6 w-px bg-slate-800 shrink-0" />

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white flex items-center gap-2 truncate">
              <span>Fee Collection & Official Receipt</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                #{previewReceiptNo}
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {student.name} • Roll #{student.rollNo} • {student.className}
              {student.phone ? ` • Phone: ${student.phone}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-payment"
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition-all cursor-pointer active:scale-95"
          >
            <Banknote className="w-4 h-4" />
            <span>{isSaving ? 'Saving…' : 'Accept & Generate Receipt'}</span>
          </button>
        </div>
      </header>

      {/* Main Full-Page Workspace Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800 dark:text-rose-200 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Student Fee Overview Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Total Payable</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(summary.totalPayable, schoolProfile.currencySymbol)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
              <span className="text-[10.5px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">Total Paid Till Date</span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(summary.totalPaid, schoolProfile.currencySymbol)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60">
              <span className="text-[10.5px] text-rose-700 dark:text-rose-400 uppercase font-bold block">Overdue Matured Till Date</span>
              <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(summary.dueTillDate, schoolProfile.currencySymbol)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10.5px] text-slate-700 dark:text-slate-300 uppercase font-bold block">Net Outstanding Balance</span>
              <span className="text-base sm:text-lg font-black text-slate-950 dark:text-white font-mono">
                {formatCurrency(summary.totalDue, schoolProfile.currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Payment Inputs & Details (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Payment Amount & Mode</span>
              </h2>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Collection Amount ({schoolProfile.currencySymbol}):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">
                    {schoolProfile.currencySymbol}
                  </span>
                  <input
                    id="input-payment-amount"
                    type="number"
                    min="1"
                    max={summary.totalDue}
                    value={paymentAmount || ''}
                    onChange={(e) => {
                      setIsManualOverride(false);
                      setPaymentAmount(Math.max(0, parseFloat(e.target.value) || 0));
                      setErrorMsg(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xl font-black text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                {/* Quick Auto-Fill Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualOverride(false);
                      setPaymentAmount(summary.dueTillDate);
                    }}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer text-center truncate"
                    title="Fill exact amount overdue till date"
                  >
                    Till Date: {formatCurrency(summary.dueTillDate, schoolProfile.currencySymbol)}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsManualOverride(false);
                      setPaymentAmount(summary.totalDue);
                    }}
                    className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer text-center truncate"
                    title="Pay full remaining balance for the academic year"
                  >
                    Full Balance: {formatCurrency(summary.totalDue, schoolProfile.currencySymbol)}
                  </button>
                </div>
              </div>

              {/* Payment Mode Selection (Strictly Cash or UPI) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Payment Mode (Cash / UPI Only):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`py-2.5 px-3 rounded-xl font-black text-center border transition-all text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      paymentMode === 'Cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>💵 Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2.5 px-3 rounded-xl font-black text-center border transition-all text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      paymentMode === 'UPI'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>📱 UPI (PhonePe / GPay / Paytm)</span>
                  </button>
                </div>
              </div>

              {/* Mandatory UTR Last 5 Digits when UPI selected */}
              {paymentMode === 'UPI' && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-800 rounded-xl space-y-1 animate-fadeIn">
                  <label className="block text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                    UPI UTR - Last 5 Digits (Mandatory for UPI):
                  </label>
                  <input
                    id="input-payment-ref"
                    type="text"
                    maxLength={5}
                    value={referenceNo}
                    onChange={(e) => {
                      setReferenceNo(e.target.value.replace(/\D/g, '').slice(0, 5));
                      setErrorMsg(null);
                    }}
                    placeholder="Enter last 5 digits (e.g. 48311)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10.5px] text-indigo-700 dark:text-indigo-400 block font-medium">
                    Only the last 5 digits of the UTR will be recorded as UPI (XXXXX).
                  </span>
                </div>
              )}



              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Receipt Remarks / Notes (Optional):
                </label>
                <input
                  id="input-payment-remarks"
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Paid by father, term 1 cleared"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Chronological FIFO Knock-Off Schedule (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Chronological Installments Allocation</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Auto-allocated to earliest pending installments in strict FIFO order
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isManualOverride && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                      Manual Customization
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetToAutoFifo}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                  >
                    Reset Auto-FIFO
                  </button>
                </div>
              </div>

              {/* Installments Knock-off Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Standardized Installment Name</th>
                      <th className="py-2.5 px-2 text-center">Due Date</th>
                      <th className="py-2.5 px-2 text-right">Remaining Due</th>
                      <th className="py-2.5 px-3 text-right">Allocated ({schoolProfile.currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(() => {
                      const sortedInstallments = [...summary.installments].sort(compareOfficialInstallmentOrder);
                      return sortedInstallments.map((inst) => {
                      const alloc = allocations.find((a) => a.installmentId === inst.id);
                      const allocatedAmt = alloc ? alloc.allocatedAmount : 0;
                      const displayName = getInstallmentDisplayName(
                        inst.headName,
                        inst.installmentNumber,
                        inst.totalInstallments,
                        inst.dueDate
                      );

                      if (inst.balanceAmount <= 0 && allocatedAmt <= 0) {
                        return null; // Skip fully cleared in this view to keep it clean
                      }

                      return (
                        <tr
                          key={inst.id}
                          className={`transition-colors ${
                            allocatedAmt > 0
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            <div>{displayName}</div>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                            {formatDate(inst.dueDate)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400 font-bold">
                            {formatCurrency(inst.balanceAmount, schoolProfile.currencySymbol)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <span className="text-slate-400 text-xs">{schoolProfile.currencySymbol}</span>
                              <input
                                type="number"
                                readOnly
                                tabIndex={-1}
                                min="0"
                                max={inst.balanceAmount}
                                value={allocatedAmt}
                                className="w-24 text-right py-1 px-2 rounded-lg font-bold font-mono text-xs focus:outline-none bg-emerald-100/70 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700 cursor-not-allowed"
                                title="Automatic FIFO allocation (read-only)"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/90 font-bold border-t border-slate-200 dark:border-slate-700 text-xs">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-700 dark:text-slate-300 font-black">
                        Total Allocated:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(
                          allocations.reduce((sum, a) => sum + a.allocatedAmount, 0),
                          schoolProfile.currencySymbol
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Receipt Preview Info Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dual A5 Laser Receipt will be instantly generated upon confirmation.</span>
                </div>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  {isSaving ? 'Saving…' : 'Save & Print'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
