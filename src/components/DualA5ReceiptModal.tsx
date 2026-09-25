import React, { useRef } from 'react';
import { PaymentTransaction, SchoolProfile, Student } from '../types';
import { formatCurrency, formatDate, numberToWords } from '../utils/numberToWords';
import { getInstallmentDisplayName } from '../utils/installmentFormatter';
import { CheckCircle2, ExternalLink, Printer, X } from 'lucide-react';

interface DualA5ReceiptModalProps {
  transaction: PaymentTransaction;
  student?: Student;
  schoolProfile: SchoolProfile;
  remainingDueBalance?: number;
  nextDueDate?: string | null;
  totalBalance?: number;
  nextInstallmentBalance?: number;
  nextInstallmentDueDate?: string | null;
  onClose: () => void;
}

export const DualA5ReceiptModal: React.FC<DualA5ReceiptModalProps> = ({
  transaction,
  student,
  schoolProfile,
  remainingDueBalance = 0,
  nextDueDate = null,
  totalBalance,
  nextInstallmentBalance,
  nextInstallmentDueDate,
  onClose,
}) => {
  const receiptPrintRef = useRef<HTMLDivElement>(null);
  const currencySymbol = schoolProfile?.currencySymbol || '₹';
  const amountInWords = numberToWords(transaction.amount);

  const displayTotalBalance = totalBalance !== undefined ? totalBalance : remainingDueBalance;
  const displayNextInstDue = nextInstallmentDueDate !== undefined ? nextInstallmentDueDate : nextDueDate;
  const displayNextInstBalance =
    nextInstallmentBalance !== undefined && nextInstallmentBalance > 0
      ? nextInstallmentBalance
      : displayTotalBalance > 0
      ? displayTotalBalance
      : 0;

  const schoolName = schoolProfile.schoolName || 'KAKATIYA SCHOOL BODUPPAL';

  const handlePrint = () => {
    window.print();
  };

  const SingleReceiptCard = ({ copyType }: { copyType: 'PARENT COPY' | 'OFFICE COPY' }) => (
    <div className="receipt-single-box border-2 border-black bg-white p-3.5 rounded flex flex-col justify-between text-black text-[11px] leading-tight select-none shadow-none font-sans">
      <div>
        {/* School Header */}
        <div className="border-b-2 border-black pb-2 mb-2 flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-black uppercase tracking-tight leading-tight">
              {schoolName}
            </h2>
            <p className="text-[10px] text-gray-700 font-medium">
              Boduppal, Hyderabad • Phone: {schoolProfile.phone || '98480xxxxx'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block px-2 py-0.5 border border-black bg-gray-100 font-black text-[10px] uppercase tracking-wider text-black rounded-xs">
              {copyType}
            </span>
          </div>
        </div>

        {/* Student & Receipt Metadata */}
        <div className="border border-black mb-2 divide-y divide-black text-[11px]">
          <div className="grid grid-cols-2 divide-x divide-black bg-gray-50">
            <div className="p-1 px-2">
              <span className="text-gray-600 font-semibold">Receipt No: </span>
              <strong className="font-mono font-black text-black">
                {transaction.receiptNo}
              </strong>
            </div>
            <div className="p-1 px-2">
              <span className="text-gray-600 font-semibold">Payment Date: </span>
              <strong className="font-bold text-black">{formatDate(transaction.date)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-black">
            <div className="p-1 px-2">
              <span className="text-gray-600 font-semibold">Student Name: </span>
              <strong className="font-black text-black">{transaction.studentName}</strong>
            </div>
            <div className="p-1 px-2">
              <span className="text-gray-600 font-semibold">Class: </span>
              <strong className="font-black text-black">{transaction.studentClass}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-black bg-gray-50">
            <div className="p-1 px-2">
              <span className="text-gray-600 font-semibold">Roll No: </span>
              <strong className="font-mono font-black text-black">#{transaction.studentRollNo}</strong>
            </div>
            <div className="p-1 px-2">
              <span className="text-gray-600 font-semibold">Payment Mode: </span>
              <strong className="font-mono font-black text-black">
                {(() => {
                  if (transaction.paymentMode === 'UPI') {
                    const rawRef = transaction.referenceNo || '';
                    const isInvalidRef = rawRef.startsWith('Commitment') || rawRef.startsWith('Rct') || rawRef.length < 5;
                    const ref = isInvalidRef ? '' : rawRef.replace(/\D/g, '');
                    const last5 = ref.length >= 5 ? ref.slice(-5) : 'XXXXX';
                    return `UPI (${last5})`;
                  }
                  return transaction.paymentMode.toUpperCase();
                })()}
              </strong>
            </div>
          </div>
        </div>

        {/* Allocations Table with Standardized Installment Names */}
        <div className="border border-black mb-2 overflow-hidden">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-gray-100 border-b border-black text-black font-black text-[10px] uppercase">
              <tr>
                <th className="py-1 px-2 border-r border-black w-7 text-center">#</th>
                <th className="py-1 px-2 border-r border-black">Fee Particulars</th>
                <th className="py-1 px-2 border-r border-black text-center w-24">Due Date</th>
                <th className="py-1 px-2 text-right w-24">Amount ({currencySymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-mono text-[10.5px]">
              {transaction.allocations.map((alloc, idx) => {
                const displayName = getInstallmentDisplayName(
                  alloc.headName,
                  alloc.installmentNumber,
                  undefined,
                  alloc.dueDate
                );

                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-1 px-2 border-r border-black text-center text-gray-600 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2 border-r border-black font-sans font-bold text-black">
                      {displayName}
                    </td>
                    <td className="py-1 px-2 border-r border-black text-center text-gray-700">
                      {formatDate(alloc.dueDate || transaction.date)}
                    </td>
                    <td className="py-1 px-2 text-right font-black text-black">
                      {formatCurrency(alloc.allocatedAmount, currencySymbol)}
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-gray-100 border-t-2 border-black font-black text-black text-xs">
                <td colSpan={3} className="py-1.5 px-2 font-sans text-right uppercase tracking-wider">
                  Total Amount Received:
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-black text-black">
                  {formatCurrency(transaction.amount, currencySymbol)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="border border-dashed border-black p-1.5 px-2 bg-gray-50 text-[10px] text-black mb-2">
          <span className="font-bold">Amount in Words: </span>
          <span className="italic font-semibold">{amountInWords}</span>
        </div>

        {/* REQUIRED 3 SUMMARY ITEMS: NEXT INSTALMENT BALANCE, NEXT INSTALMENT DUE DATE, TOTAL BALANCE */}
        <div className="border-2 border-black p-2 bg-gray-50 mb-2">
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-black">
            <div className="pr-1 text-left">
              <span className="text-[9px] font-black uppercase text-gray-600 block">
                NEXT INSTALMENT BALANCE
              </span>
              <strong className="font-mono font-black text-black text-[11.5px]">
                {displayNextInstBalance > 0
                  ? formatCurrency(displayNextInstBalance, currencySymbol)
                  : '₹0'}
              </strong>
            </div>

            <div className="px-1 text-center">
              <span className="text-[9px] font-black uppercase text-gray-600 block">
                NEXT INSTALMENT DUE DATE
              </span>
              <strong className="font-bold text-black text-[11px]">
                {displayNextInstDue ? formatDate(displayNextInstDue) : 'N/A (Cleared)'}
              </strong>
            </div>

            <div className="pl-1 text-right">
              <span className="text-[9px] font-black uppercase text-gray-600 block">
                TOTAL BALANCE
              </span>
              <strong className="font-mono font-black text-black text-[12px]">
                {formatCurrency(displayTotalBalance, currencySymbol)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Signatures */}
      <div className="pt-2 border-t border-black mt-2">
        <p className="text-[8.5px] text-gray-600 leading-tight mb-3">
          {schoolProfile.receiptDisclaimer ||
            'Note: Fees once paid are non-refundable & non-transferable. Official computer-generated receipt.'}
        </p>

        <div className="flex items-center justify-between text-[10px] pt-4 px-2">
          <div className="text-[9px] text-gray-500 font-mono">
            {transaction.remarks ? `Note: ${transaction.remarks}` : ''}
          </div>
          <div className="text-center">
            <div className="border-t-2 border-black w-36 pt-1 font-black text-black uppercase tracking-tight text-[10px]">
              Authorised Signatory
            </div>
            <span className="text-[8.5px] text-gray-500 font-medium">(Accounts Officer)</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      id="modal-dual-a5-receipt"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden my-4 print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Official Fee Receipt</span>
                <span className="font-mono text-emerald-400 font-bold">#{transaction.receiptNo}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {transaction.studentName} (#{transaction.studentRollNo}) • {transaction.studentClass}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Print Button */}
            <button
              id="btn-print-dual-receipt"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
              title="Print directly (A4 landscape with dual A5 copies)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Dual A5 Area - exact 2-column landscape layout preserved in preview and print */}
        <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 overflow-x-auto print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={receiptPrintRef}
            id="printable-receipt-area"
            className="receipt-grid-container grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto print:grid-cols-2 print:gap-4 print:max-w-none print:w-full"
          >
            <SingleReceiptCard copyType="PARENT COPY" />
            <SingleReceiptCard copyType="OFFICE COPY" />
          </div>
        </div>

        {/* Print Stylesheet guaranteeing 1:1 identical appearance */}
        <style>{`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-receipt-area, #printable-receipt-area * {
              visibility: visible !important;
            }
            #printable-receipt-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 6mm !important;
              background: #ffffff !important;
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 16px !important;
              box-sizing: border-box !important;
            }
            .receipt-single-box {
              border: 2px solid #000000 !important;
              background: #ffffff !important;
              color: #000000 !important;
              padding: 12px !important;
              border-radius: 4px !important;
              box-shadow: none !important;
              page-break-inside: avoid !important;
            }
            @page {
              size: A5 landscape;
              margin: 3mm;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
