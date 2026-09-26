import React, { useState } from 'react';
import {
  PaymentTransaction,
  SchoolProfile,
  Student,
  StudentFinancialSummary,
} from '../types';
import { formatCurrency, formatDate } from '../utils/numberToWords';
import { getInstallmentDisplayName } from '../utils/installmentFormatter';
import {
  AlertOctagon,
  ArrowRight,
  Ban,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  Printer,
  ShieldCheck,
  Undo2,
  X,
} from 'lucide-react';

interface StudentLedgerModalProps {
  asOfDate?: string;
  student: Student;
  summary: StudentFinancialSummary;
  schoolProfile: SchoolProfile;
  onClose: () => void;
  onPrintReceipt: (transaction: PaymentTransaction) => void;
  onCancelReceipt: (transactionId: string, reason: string) => Promise<void>;
}

export const StudentLedgerModal: React.FC<StudentLedgerModalProps> = ({
  asOfDate,
  student,
  summary,
  schoolProfile,
  onClose,
  onPrintReceipt,
  onCancelReceipt,
}) => {
  const [cancellingTxnId, setCancellingTxnId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const handleConfirmCancel = async (txnId: string) => {
    if (!cancelReason.trim()) {
      alert('Please provide a mandatory reason for cancelling/voiding this receipt.');
      return;
    }
    await onCancelReceipt(txnId, cancelReason.trim());
    setCancellingTxnId(null);
    setCancelReason('');
  };

  return (
    <div id="modal-student-ledger" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Student Financial Ledger & Audit Trail
              </h2>
              <p className="text-xs text-slate-400">
                {student.name} • Roll #{student.rollNo} • {student.className} ({student.section || 'A'})
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

        {/* Content Body */}
        <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300 max-h-[80vh] overflow-y-auto">
          {/* Top Key Financial Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Actual Fees</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                {formatCurrency(summary.actualFees, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 block uppercase font-medium">Concession</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(summary.concession, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Other / Misc Fees</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                {formatCurrency(summary.otherFees, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-700 dark:text-slate-300 block uppercase font-bold">Total Payable</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                {formatCurrency(summary.totalPayable, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 block uppercase font-bold">Total Paid</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(summary.totalPaid, schoolProfile.currencySymbol)}
              </span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
              <span className="text-[10px] text-rose-700 dark:text-rose-300 block uppercase font-bold">Net Balance Due</span>
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(summary.totalDue, schoolProfile.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Section 1: Assigned Installment Schedule Tracker */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Assigned Installments Schedule ({summary.installments.length} Total)
              </span>
              {summary.nextDueDate && (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Next Due: {formatDate(summary.nextDueDate)}
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3">Fee Head & Inst #</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Scheduled Amount</th>
                    <th className="py-2 px-3 text-right">Amount Paid</th>
                    <th className="py-2 px-3 text-right">Balance Due</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.installments.map((inst) => {
                    const isOverdue =
                      inst.balanceAmount > 0 &&
                      !!asOfDate && inst.dueDate < asOfDate;

                    return (
                      <tr
                        key={inst.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                          inst.status === 'paid'
                            ? 'bg-emerald-50/20'
                            : isOverdue
                            ? 'bg-rose-50/30 font-medium'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {getInstallmentDisplayName(
                            inst.headName,
                            inst.installmentNumber,
                            inst.totalInstallments,
                            inst.dueDate
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                            {formatDate(inst.dueDate)} {isOverdue && '(Overdue)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(inst.amount, schoolProfile.currencySymbol)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                          {formatCurrency(inst.paidAmount, schoolProfile.currencySymbol)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(inst.balanceAmount, schoolProfile.currencySymbol)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {inst.status === 'paid' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                              Cleared
                            </span>
                          ) : inst.status === 'partial' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                              Partial
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isOverdue
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {isOverdue ? 'Overdue' : 'Unpaid'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Payment Transactions & Receipt Audit History */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Payment Transactions & Receipt History ({summary.transactions.length} Records)
              </span>
            </div>

            {summary.transactions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 italic">
                No payments recorded yet for this student.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className={`p-3.5 ${
                      txn.isCancelled
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 opacity-70 line-through'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg font-mono font-bold text-xs ${
                            txn.isCancelled
                              ? 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {txn.receiptNo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                              {formatCurrency(txn.amount, schoolProfile.currencySymbol)}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                              {txn.paymentMode}
                            </span>
                            {txn.isCancelled && (
                              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                                VOID / CANCELLED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>📅 {txn.date}</span>
                            {txn.referenceNo && <span>• Ref: {txn.referenceNo}</span>}
                            {txn.remarks && <span>• Note: {txn.remarks}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Action Controls for this Receipt */}
                      <div className="flex items-center gap-2">
                        {!txn.isCancelled && (
                          <>
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(txn)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700"
                              title="Print Dual A5 Copy"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Reprint</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCancellingTxnId(txn.id)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-800"
                              title="Cancel / Void Receipt and Reverse Installment Balances"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Void Receipt</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Cancellation confirmation drawer */}
                    {cancellingTxnId === txn.id && (
                      <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2 text-rose-900 dark:text-rose-200">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <AlertOctagon className="w-4 h-4 text-rose-600" />
                          <span>Confirm Receipt Voiding ({txn.receiptNo})</span>
                        </div>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300">
                          Voiding this receipt will deduct {formatCurrency(txn.amount)} from collected revenue and roll the installments back to unpaid/due balance.
                        </p>
                        <div>
                          <label className="block text-[11px] font-bold mb-1">
                            Mandatory Cancellation Reason (e.g., Cheque bounced / Data entry typo):
                          </label>
                          <input
                            type="text"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Type reason here..."
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingTxnId(null);
                              setCancelReason('');
                            }}
                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmCancel(txn.id)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-xs"
                          >
                            Confirm Void & Reverse
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold text-xs transition-colors"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
