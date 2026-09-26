import React, { useMemo } from 'react';
import { AlertTriangle, ArrowLeft, Flag, Receipt } from 'lucide-react';
import { PaymentTransaction, SchoolProfile } from '../types';
import { formatCurrency } from '../utils/numberToWords';

interface FlaggedReceiptsViewProps {
  transactions: PaymentTransaction[];
  schoolProfile: SchoolProfile;
  onBack: () => void;
}

export const getDuplicateReceiptGroups = (transactions: PaymentTransaction[]) => {
  const groups = new Map<string, PaymentTransaction[]>();
  transactions.forEach((transaction) => {
    const receiptNo = transaction.receiptNo?.trim();
    if (!receiptNo) return;
    groups.set(receiptNo, [...(groups.get(receiptNo) || []), transaction]);
  });
  return Array.from(groups.entries())
    .filter(([, entries]) => entries.length > 1)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
};

export const FlaggedReceiptsView: React.FC<FlaggedReceiptsViewProps> = ({
  transactions,
  schoolProfile,
  onBack,
}) => {
  const duplicateGroups = useMemo(() => getDuplicateReceiptGroups(transactions), [transactions]);
  const extraOccurrences = duplicateGroups.reduce((sum, [, entries]) => sum + entries.length - 1, 0);
  const currencySymbol = schoolProfile.currencySymbol || '₹';

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
        <div className="flex gap-3">
          <div className="rounded-xl bg-amber-500 p-2 text-white"><Flag className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Flagged Historical Receipts</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Read-only review page. Existing receipt numbers and financial history have not been changed.
            </p>
          </div>
        </div>
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-bold uppercase text-slate-500">Flagged Receipt Numbers</div>
          <div className="mt-1 text-2xl font-black text-amber-600">{duplicateGroups.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-bold uppercase text-slate-500">Extra Duplicate Occurrences</div>
          <div className="mt-1 text-2xl font-black text-rose-600">{extraOccurrences}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-bold uppercase text-slate-500">Action</div>
          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">Awaiting your instructions</div>
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          No duplicate receipt numbers are present.
        </div>
      ) : (
        <div className="space-y-3">
          {duplicateGroups.map(([receiptNo, entries]) => (
            <div key={receiptNo} className="overflow-hidden rounded-2xl border border-rose-200 bg-white dark:border-rose-900 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/40">
                <div className="flex items-center gap-2 font-black text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4" /> {receiptNo}
                </div>
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">{entries.length} RECORDS</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-800/70">
                    <tr>
                      <th className="px-4 py-2">Date</th><th className="px-4 py-2">Student</th><th className="px-4 py-2">Roll No.</th><th className="px-4 py-2">Class</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Mode</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Record ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {entries.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-2.5 whitespace-nowrap">{transaction.date}</td>
                        <td className="px-4 py-2.5 font-bold">{transaction.studentName}</td>
                        <td className="px-4 py-2.5">{transaction.studentRollNo || '-'}</td>
                        <td className="px-4 py-2.5">{transaction.studentClass || '-'}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(transaction.amount, currencySymbol)}</td>
                        <td className="px-4 py-2.5">{transaction.paymentMode}</td>
                        <td className="px-4 py-2.5">{transaction.isCancelled ? 'Cancelled' : 'Active'}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{transaction.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500"><Receipt className="h-4 w-4" /> No receipt can be edited or deleted from this page.</div>
    </section>
  );
};
