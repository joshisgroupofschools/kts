import React, { useRef } from 'react';
import { PaymentTransaction, SchoolProfile, Student } from '../types';
import { formatCurrency, formatDate, numberToWords } from '../utils/numberToWords';
import { Building2, CheckCircle2, ExternalLink, Printer, Scissors, X } from 'lucide-react';

interface DualA5ReceiptModalProps {
  transaction: PaymentTransaction;
  student?: Student;
  schoolProfile: SchoolProfile;
  remainingDueBalance?: number;
  nextDueDate?: string | null;
  onClose: () => void;
}

export const DualA5ReceiptModal: React.FC<DualA5ReceiptModalProps> = ({
  transaction,
  student,
  schoolProfile,
  remainingDueBalance = 0,
  nextDueDate = null,
  onClose,
}) => {
  const receiptPrintRef = useRef<HTMLDivElement>(null);
  const currencySymbol = schoolProfile?.currencySymbol || '₹';
  const amountInWords = numberToWords(transaction.amount);

  const isBooksOrDressTransaction =
    transaction.allocations.some((a) => {
      const l = a.headName.toLowerCase();
      return l.includes('book') || l.includes('dress') || l.includes('uniform') || l.includes('stationery');
    }) ||
    (transaction.remarks &&
      (transaction.remarks.toLowerCase().includes('book') ||
        transaction.remarks.toLowerCase().includes('dress') ||
        transaction.remarks.toLowerCase().includes('uniform')));

  /**
   * Universal Print Handler:
   * Works reliably in sandboxed iframes by injecting an isolated printing iframe,
   * with fallback to window.print()
   */
  const handleDirectPrint = () => {
    const printContent = receiptPrintRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    try {
      // Create hidden iframe for bulletproof printing in sandbox
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${transaction.receiptNo} - ${transaction.studentName}</title>
              <meta charset="utf-8" />
              <style>
                @page {
                  size: A4 landscape;
                  margin: 6mm;
                }
                * {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                  color: #000000;
                  background: #ffffff;
                  padding: 8px;
                }
                .receipt-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 16px;
                  width: 100%;
                }
                .receipt-card {
                  border: 2px solid #000000 !important;
                  padding: 12px 14px;
                  border-radius: 6px;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  background: #ffffff !important;
                  font-size: 11px;
                  line-height: 1.35;
                }
                .receipt-header {
                  border-bottom: 2px solid #000000 !important;
                  padding-bottom: 6px;
                  margin-bottom: 6px;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                }
                .school-title {
                  font-size: 15px;
                  font-weight: 900;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  color: #000000;
                }
                .copy-badge {
                  border: 1.5px solid #000000 !important;
                  padding: 2px 6px;
                  font-size: 10px;
                  font-weight: 800;
                  text-transform: uppercase;
                  background: #f0f0f0 !important;
                  border-radius: 3px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 6px;
                  border: 1.5px solid #000000 !important;
                }
                th {
                  border: 1px solid #000000 !important;
                  padding: 4px 6px;
                  background: #f2f2f2 !important;
                  font-size: 10px;
                  font-weight: 800;
                  text-align: left;
                  text-transform: uppercase;
                }
                td {
                  border: 1px solid #000000 !important;
                  padding: 3.5px 6px;
                  font-size: 11px;
                }
                .words-box {
                  border: 1px dashed #000000 !important;
                  padding: 4px 6px;
                  font-size: 10.5px;
                  margin-bottom: 6px;
                  background: #fafafa !important;
                }
                .balance-box {
                  display: flex;
                  justify-content: space-between;
                  border: 1px solid #000000 !important;
                  padding: 4px 8px;
                  font-size: 10.5px;
                  margin-bottom: 6px;
                  background: #f5f5f5 !important;
                }
                .sign-container {
                  display: flex;
                  justify-content: flex-end;
                  margin-top: 14px;
                  padding-right: 8px;
                }
                .sign-line {
                  border-top: 1.5px solid #000000 !important;
                  width: 160px;
                  text-align: center;
                  font-size: 10px;
                  font-weight: 800;
                  padding-top: 3px;
                  text-transform: uppercase;
                }
              </style>
            </head>
            <body>
              <div class="receipt-grid">
                ${printContent.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 3000);
          }
        }, 350);
      } else {
        window.print();
      }
    } catch (err) {
      window.print();
    }
  };

  const handlePrintInCleanWindow = () => {
    const printableContent = receiptPrintRef.current?.innerHTML;
    if (!printableContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=950,height=700');
    if (!printWindow) {
      handleDirectPrint();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${transaction.receiptNo} - ${transaction.studentName}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 landscape;
              margin: 6mm 8mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #000000;
              background: #ffffff;
              padding: 10px;
            }
            .receipt-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              width: 100%;
            }
            .receipt-card {
              border: 2px solid #000000 !important;
              padding: 14px;
              border-radius: 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #ffffff !important;
              font-size: 11px;
              line-height: 1.35;
            }
            .receipt-header {
              border-bottom: 2px solid #000000 !important;
              padding-bottom: 6px;
              margin-bottom: 6px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .school-title {
              font-size: 15px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #000000;
            }
            .copy-badge {
              border: 1.5px solid #000000 !important;
              padding: 2px 6px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              background: #f0f0f0 !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              border: 1.5px solid #000000 !important;
            }
            th {
              border: 1px solid #000000 !important;
              padding: 4px 6px;
              background: #f4f4f4 !important;
              font-size: 10px;
              font-weight: 800;
              text-align: left;
            }
            td {
              border: 1px solid #000000 !important;
              padding: 4px 6px;
              font-size: 11px;
            }
            tr.total-row td {
              font-weight: 900;
              font-size: 12px;
              background: #f9f9f9 !important;
            }
            .words-box {
              border: 1px dashed #000000 !important;
              padding: 4px 6px;
              font-size: 10.5px;
              margin-bottom: 6px;
              background: #fafafa !important;
            }
            .balance-box {
              display: flex;
              justify-content: space-between;
              border: 1px solid #000000 !important;
              padding: 4px 8px;
              font-size: 10.5px;
              margin-bottom: 6px;
              background: #f5f5f5 !important;
            }
            .sign-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 16px;
              padding-right: 8px;
            }
            .sign-line {
              border-top: 1.5px solid #000000 !important;
              width: 160px;
              text-align: center;
              font-size: 10px;
              font-weight: 800;
              padding-top: 3px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-grid">
            ${printableContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // High-contrast, Black & White Professional Laser Receipt Copy
  const SingleReceiptView = ({ copyType }: { copyType: 'STUDENT COPY' | 'PARENT COPY' }) => (
    <div className="receipt-card border-2 border-slate-900 bg-white p-3.5 sm:p-4 rounded-lg flex flex-col justify-between text-slate-900 text-xs shadow-none">
      <div>
        {/* Header Bar */}
        <div className="border-b-2 border-slate-900 pb-2 mb-2 flex items-start justify-between">
          <div>
            {!isBooksOrDressTransaction ? (
              <h2 className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-tight leading-tight">
                {schoolProfile.schoolName || 'Kakatiya School Boduppal'}
              </h2>
            ) : (
              <h2 className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-tight leading-tight">
                OFFICIAL PAYMENT RECEIPT
              </h2>
            )}
            {schoolProfile.phone && !isBooksOrDressTransaction && (
              <p className="text-[9.5px] text-slate-600 mt-0.5">
                Contact: {schoolProfile.phone}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block px-2.5 py-0.5 border border-slate-900 bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider text-slate-950 rounded-xs">
              {copyType}
            </span>
          </div>
        </div>

        {/* Student & Receipt Meta Grid */}
        <div className="border border-slate-900 mb-2 divide-y divide-slate-800 text-[11px]">
          <div className="grid grid-cols-2 divide-x divide-slate-800 bg-slate-50/80">
            <div className="p-1.5 px-2">
              <span className="text-slate-600 font-medium">Receipt No: </span>
              <strong className="font-mono font-extrabold text-slate-950">
                {transaction.receiptNo}
              </strong>
            </div>
            <div className="p-1.5 px-2">
              <span className="text-slate-600 font-medium">Payment Date: </span>
              <strong className="font-semibold text-slate-950">{formatDate(transaction.date)}</strong>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-800">
            <div className="p-1.5 px-2">
              <span className="text-slate-600 font-medium">Student Name: </span>
              <strong className="font-bold text-slate-950">{transaction.studentName}</strong>
            </div>
            <div className="p-1.5 px-2">
              <span className="text-slate-600 font-medium">Roll No / Reg: </span>
              <strong className="font-mono font-bold text-slate-950">#{transaction.studentRollNo}</strong>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-800 bg-slate-50/80">
            <div className="p-1.5 px-2">
              <span className="text-slate-600 font-medium">Class & Section: </span>
              <strong className="font-bold text-slate-950">{transaction.studentClass}</strong>
            </div>
            <div className="p-1.5 px-2">
              <span className="text-slate-600 font-medium">Payment Mode: </span>
              <strong className="font-mono font-bold text-slate-950">
                {transaction.paymentMode.toUpperCase()}
                {transaction.referenceNo ? ` [Ref: ${transaction.referenceNo}]` : ''}
              </strong>
            </div>
          </div>
        </div>

        {/* Chronological Breakdown Table */}
        <div className="border border-slate-900 mb-2 overflow-hidden">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-extrabold text-[10px] uppercase">
              <tr>
                <th className="py-1 px-2 border-r border-slate-900 w-8 text-center">#</th>
                <th className="py-1 px-2 border-r border-slate-900">Particulars (Fee Head & Installment)</th>
                <th className="py-1 px-2 border-r border-slate-900 text-center">Due Date</th>
                <th className="py-1 px-2 text-right">Amount ({currencySymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[10.5px]">
              {transaction.allocations.map((alloc, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-500 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-800 font-sans font-medium text-slate-950">
                    {alloc.headName} (Installment #{alloc.installmentNumber})
                  </td>
                  <td className="py-1 px-2 border-r border-slate-800 text-center text-slate-700">
                    {formatDate(alloc.dueDate)}
                  </td>
                  <td className="py-1 px-2 text-right font-bold text-slate-950">
                    {formatCurrency(alloc.allocatedAmount, currencySymbol)}
                  </td>
                </tr>
              ))}
              {/* Grand Total Row */}
              <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-slate-950 text-xs">
                <td colSpan={3} className="py-1.5 px-2 font-sans text-right uppercase tracking-wider">
                  Total Amount Received:
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-black text-slate-950">
                  {formatCurrency(transaction.amount, currencySymbol)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="border border-dashed border-slate-800 p-1.5 px-2 bg-slate-50 text-[10.5px] text-slate-900 mb-2">
          <span className="font-bold text-slate-950">Amount in Words: </span>
          <span className="italic font-medium">{amountInWords}</span>
        </div>

        {/* Remaining Balance & Next Due Summary */}
        <div className="flex items-center justify-between border border-slate-900 p-1.5 px-2 bg-slate-50 text-[10.5px] text-slate-900 mb-2">
          <div>
            <span className="font-semibold text-slate-700">Remaining Balance: </span>
            <strong className="font-mono font-bold text-slate-950">
              {formatCurrency(remainingDueBalance, currencySymbol)}
            </strong>
          </div>
          {nextDueDate && (
            <div>
              <span className="font-semibold text-slate-700">Next Due Date: </span>
              <strong className="font-semibold text-slate-950">{formatDate(nextDueDate)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Footer Disclaimer & Signatures */}
      <div className="pt-2 border-t border-slate-400 mt-2">
        <p className="text-[8.5px] text-slate-600 leading-tight mb-3">
          {schoolProfile.receiptDisclaimer ||
            'Note: Fees once paid are non-refundable & non-transferable. Computer-generated official receipt.'}
        </p>

        {/* Authorized Signatory Only */}
        <div className="flex items-center justify-end text-[10px] pt-4 px-2">
          <div className="text-center">
            <div className="border-t-2 border-slate-900 w-36 pt-1 font-bold text-slate-950 uppercase tracking-tight">
              Authorised Signatory
            </div>
            <span className="text-[8.5px] text-slate-500 font-medium">(Cashier / Accounts Officer)</span>
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
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden my-4">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Official Fee Receipt: #{transaction.receiptNo}
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
              onClick={handleDirectPrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              title="Print directly or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt (A4 / A5)</span>
            </button>

            {/* Fallback Clean Window Print */}
            <button
              type="button"
              onClick={handlePrintInCleanWindow}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="Open standalone clean print window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print in New Tab</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Dual A5 Area */}
        <div className="p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 overflow-x-auto print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={receiptPrintRef}
            id="printable-receipt-area"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto print:grid-cols-2 print:gap-4 print:max-w-none print:w-full"
          >
            <SingleReceiptView copyType="STUDENT COPY" />
            <SingleReceiptView copyType="PARENT COPY" />
          </div>
        </div>

        {/* Print Stylesheet for High Contrast Monochrome Laser Output */}
        <style>{`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
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
              padding: 4mm !important;
              margin: 0 !important;
              background: #ffffff !important;
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 16px !important;
            }
            .receipt-card {
              border: 1.5px solid #000000 !important;
              background: #ffffff !important;
              color: #000000 !important;
              padding: 10px !important;
              box-shadow: none !important;
            }
            @page {
              size: A4 landscape;
              margin: 6mm;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
