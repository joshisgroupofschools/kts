import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Installment,
  PaymentAllocation,
  PaymentMode,
  PaymentTransaction,
  SchoolProfile,
  Student,
  StudentFinancialSummary,
} from '../types';
import { calculateFifoAllocations } from '../utils/feeCalculator';
import { formatCurrency, formatDate } from '../utils/numberToWords';
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  Layers,
  Printer,
  QrCode,
  Sparkles,
  User,
  X,
} from 'lucide-react';

interface PaymentModalProps {
  student: Student;
  summary: StudentFinancialSummary;
  schoolProfile: SchoolProfile;
  onClose: () => void;
  onSavePayment: (transaction: PaymentTransaction, customAllocations: PaymentAllocation[]) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  student,
  summary,
  schoolProfile,
  onClose,
  onSavePayment,
}) => {
  const [paymentAmount, setPaymentAmount] = useState<number>(
    summary.dueTillDate > 0 ? summary.dueTillDate : summary.totalDue
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate Preview Receipt No
  const currentYear = new Date().getFullYear();
  const sequenceStr = String(schoolProfile.nextReceiptSequence).padStart(5, '0');
  const previewReceiptNo = `${schoolProfile.receiptPrefix}-${currentYear}-${sequenceStr}`;

  // Automatically recalculate FIFO allocations whenever paymentAmount changes (unless manual override is enabled)
  useEffect(() => {
    if (!isManualOverride) {
      const computed = calculateFifoAllocations(summary.installments, paymentAmount);
      setAllocations(computed);
    }
  }, [paymentAmount, summary.installments, isManualOverride]);

  // Handle manual adjustment of a single allocation
  const handleAllocationChange = (installmentId: string, newAllocAmount: number) => {
    setIsManualOverride(true);
    const updated = allocations.map((a) => {
      if (a.installmentId === installmentId) {
        return { ...a, allocatedAmount: Math.max(0, newAllocAmount) };
      }
      return a;
    });
    setAllocations(updated);

    // Update total amount to match sum of allocations
    const newTotal = updated.reduce((sum, a) => sum + a.allocatedAmount, 0);
    setPaymentAmount(newTotal);
  };

  const handleResetToAutoFifo = () => {
    setIsManualOverride(false);
    const computed = calculateFifoAllocations(summary.installments, paymentAmount);
    setAllocations(computed);
  };

  const handleConfirm = () => {
    if (paymentAmount <= 0) {
      setErrorMsg('Payment amount must be greater than 0.');
      return;
    }
    if (paymentAmount > summary.totalDue) {
      setErrorMsg(`Cannot accept payment greater than total outstanding balance of ${formatCurrency(summary.totalDue)}.`);
      return;
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    if (totalAllocated !== paymentAmount) {
      setErrorMsg(`Total allocated amount (${formatCurrency(totalAllocated)}) does not match payment amount (${formatCurrency(paymentAmount)}).`);
      return;
    }

    // Trigger celebratory confetti effect
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    });

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const fullDateTime = `${paymentDate} ${timeStr}`;

    const newTransaction: PaymentTransaction = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receiptNo: previewReceiptNo,
      studentId: student.id,
      studentName: student.name,
      studentRollNo: student.rollNo,
      studentClass: `${student.className} - ${student.section}`,
      date: fullDateTime,
      amount: paymentAmount,
      paymentMode,
      referenceNo: referenceNo.trim() || undefined,
      remarks: remarks.trim() || undefined,
      allocations,
      isCancelled: false,
    };

    onSavePayment(newTransaction, allocations);
  };

  return (
    <div id="modal-collect-fees" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Collect Fees (FIFO Knock-off)
              </h2>
              <p className="text-xs text-slate-400">
                Receipt #{previewReceiptNo} • {student.name} (#{student.rollNo})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Student Balance Summary Ribbon */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Payable</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {formatCurrency(summary.totalPayable, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 block uppercase font-medium">Total Paid</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(summary.totalPaid, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Balance</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                {formatCurrency(summary.totalDue, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
              <span className="text-[10px] text-rose-700 dark:text-rose-300 block uppercase font-bold">
                Due Till Date
              </span>
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(summary.dueTillDate, schoolProfile.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Payment Amount Input & Quick Fill Buttons */}
          <div>
            <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1.5">
              Enter Payment Amount ({schoolProfile.currencySymbol}):
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
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
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-extrabold text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>

              {/* Quick Fill Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {summary.dueTillDate > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualOverride(false);
                      setPaymentAmount(summary.dueTillDate);
                    }}
                    className="px-2.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold rounded-xl text-xs transition-colors border border-rose-200 dark:border-rose-800"
                    title="Fill exact amount overdue till date"
                  >
                    Due Till Date ({formatCurrency(summary.dueTillDate)})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsManualOverride(false);
                    setPaymentAmount(summary.totalDue);
                  }}
                  className="px-2.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold rounded-xl text-xs transition-colors border border-emerald-200 dark:border-emerald-800"
                  title="Pay full remaining balance for the whole year"
                >
                  Full Balance ({formatCurrency(summary.totalDue)})
                </button>
              </div>
            </div>
          </div>

          {/* Live Chronological Knock-off Allocations Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Chronological FIFO Knock-Off Breakdown
              </span>
              <div className="flex items-center gap-2">
                {isManualOverride && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                    Manual Customization
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetToAutoFifo}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Auto-Reset FIFO
                </button>
              </div>
            </div>

            {allocations.length === 0 ? (
              <div className="p-4 text-center text-slate-400 italic">
                Enter an amount above to preview chronological installment allocation.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-1.5 px-3">Fee Head & Installment</th>
                      <th className="py-1.5 px-2">Due Date</th>
                      <th className="py-1.5 px-2 text-right">Remaining Balance</th>
                      <th className="py-1.5 px-3 text-right">Knock-off Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allocations.map((alloc) => {
                      const matchedInst = summary.installments.find((i) => i.id === alloc.installmentId);
                      return (
                        <tr key={alloc.installmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {alloc.headName} #{alloc.installmentNumber}
                          </td>
                          <td className="py-1.5 px-2 text-slate-500 font-mono">
                            {formatDate(alloc.dueDate)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                            {matchedInst ? formatCurrency(matchedInst.balanceAmount) : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <span className="text-slate-400">{schoolProfile.currencySymbol}</span>
                              <input
                                type="number"
                                min="0"
                                max={matchedInst ? matchedInst.balanceAmount : undefined}
                                value={alloc.allocatedAmount}
                                onChange={(e) =>
                                  handleAllocationChange(
                                    alloc.installmentId,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 text-right py-0.5 px-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded font-bold font-mono text-emerald-800 dark:text-emerald-300 focus:outline-none"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Method, Date & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Payment Mode (Cash / UPI Only):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Cash', 'UPI'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-3 rounded-xl font-bold text-center border transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMode === mode
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>{mode === 'Cash' ? '💵 Cash' : '📱 UPI'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Collection Date:
              </label>
              <input
                id="input-payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {paymentMode === 'UPI' && (
              <div className="sm:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  UPI Txn / UTR Reference ID (Optional):
                </label>
                <input
                  id="input-payment-ref"
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. UPI/4938201948 or GooglePay / PhonePe Txn Ref"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div className={paymentMode === 'UPI' ? 'sm:col-span-2' : 'sm:col-span-2'}>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Remarks / Notes (Optional):
              </label>
              <input
                id="input-payment-remarks"
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Cleared till current month installment"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            id="btn-confirm-payment"
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Save & Generate Dual A5 Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
