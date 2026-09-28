import React, { useMemo } from 'react';
import { ArrowLeft, CheckCircle2, Receipt, Users } from 'lucide-react';
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
    const receiptNo = String(transaction.receiptNo ?? '').trim();
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
  const siblingEntries = duplicateGroups.reduce((sum, [, entries]) => sum + entries.length, 0);
  const currencySymbol = schoolProfile.currencySymbol || '₹';

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
        <div className="flex gap-3">
          <div className="rounded-xl bg-emerald-600 p-2 text-white"><Users className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Shared Historical Receipts</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Confirmed sibling payments split across students under one parent receipt number. Financial records remain unchanged.
            </p>
          </div>
        </div>
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-bold uppercase text-slate-500">Shared Receipt Numbers</div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{duplicateGroups.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-bold uppercase text-slate-500">Sibling Student Entries</div>
          <div className="mt-1 text-2xl font-black text-indigo-600">{siblingEntries}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-bold uppercase text-slate-500">Status</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Confirmed sibling split</div>
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          No shared historical receipt numbers are present.
        </div>
      ) : (
        <div className="space-y-3">
          {duplicateGroups.map(([receiptNo, entries]) => {
            const combinedTotal = entries.filter((entry) => !entry.isCancelled).reduce((sum, entry) => sum + entry.amount, 0);
            return (
            <div key={receiptNo} className="overflow-hidden rounded-2xl border border-emerald-200 bg-white dark:border-emerald-900 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Receipt {receiptNo}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-emerald-800 dark:text-emerald-300">Combined: {formatCurrency(combinedTotal, currencySymbol)}</span>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">{entries.length} SIBLINGS</span>
                </div>
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
          );})}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500"><Receipt className="h-4 w-4" /> Shared receipt numbers are preserved; each sibling's allocated amount remains a separate student payment.</div>
    </section>
  );
};
