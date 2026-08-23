import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  HelpCircle,
  Layers,
  Printer,
  Receipt,
  Search,
  Settings,
  Sliders,
  Sparkles,
  Target,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { formatCurrency } from '../utils/numberToWords';

interface HelpModalProps {
  onClose: () => void;
  currencySymbol?: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose, currencySymbol = '₹' }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'runRate' | 'collection' | 'categories' | 'receipts' | 'misc' | 'columns' | 'bulk'>('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('run-rate');

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div
      id="modal-help-center"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden my-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                School Fee Collection Manual & FAQs
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Simple, step-by-step accountant guide & calculation handbook
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Topic Filter Tabs */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            All Topics
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('runRate'); setExpandedFaq('run-rate'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'runRate'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span>Target Run-Rate</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('collection'); setExpandedFaq('fifo-collection'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'collection'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
            <span>Collecting Fees</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('categories'); setExpandedFaq('three-categories'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-indigo-500" />
            <span>3 Action Tiers</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('misc'); setExpandedFaq('assign-misc-fees'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'misc'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-purple-500" />
            <span>Misc & Add-on Fees</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('receipts'); setExpandedFaq('receipt-printing'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-blue-500" />
            <span>Receipt Printing</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('columns'); setExpandedFaq('hide-columns'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'columns'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Hide Columns</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('bulk'); setExpandedFaq('bulk-csv'); }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bulk'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            <span>Bulk CSV</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          
          {/* FAQ 1: Run-Rate */}
          {(activeTab === 'all' || activeTab === 'runRate') && (
            <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('run-rate')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    Why is Target Run-Rate shown as {currencySymbol}4,910/day? How is it calculated?
                  </span>
                </div>
                {expandedFaq === 'run-rate' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'run-rate' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-amber-200/70 dark:border-amber-900/50">
                  <p>
                    The <strong>Target Run-Rate</strong> is your school's daily cash collection goal to ensure 100% of past-due fee installments are recovered on time before the month closes.
                  </p>
                  
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-300 dark:border-amber-800 font-mono text-xs space-y-1.5">
                    <p className="font-bold text-amber-900 dark:text-amber-300">
                      📐 The Exact Formula:
                    </p>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-slate-900 dark:text-slate-100 font-bold">
                      Daily Target Amount = Total Overdue Deficit ÷ Days Remaining in Current Cycle
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pt-1">
                      <li><strong>Total Overdue Deficit:</strong> Sum of all installments that have matured (due date ≤ today) but are still unpaid.</li>
                      <li><strong>Days Remaining in Cycle:</strong> Number of days left until the end of the current month (e.g. 20 days left in August).</li>
                      <li><strong>Example:</strong> If overdue balance is {currencySymbol}98,200 and 20 days remain, {currencySymbol}98,200 ÷ 20 = <strong>{currencySymbol}4,910 / day</strong>.</li>
                    </ul>
                  </div>

                  <p className="text-xs">
                    ⚡ <strong>Suggested Students / Day:</strong> The system also estimates how many student follow-ups (phone calls / WhatsApp reminders) are needed per day based on average installment sizes (~{currencySymbol}4,000) so the front desk can plan their daily workload effortlessly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* FAQ 2: Fee Collection & FIFO */}
          {(activeTab === 'all' || activeTab === 'collection') && (
            <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('fifo-collection')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    How does Fee Collection and FIFO (First-In, First-Out) work?
                  </span>
                </div>
                {expandedFaq === 'fifo-collection' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'fifo-collection' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-emerald-200/70 dark:border-emerald-900/50">
                  <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm">
                    <li>
                      <strong>Click "Collect"</strong> on any student row in the master table.
                    </li>
                    <li>
                      <strong>Enter the Payment Amount:</strong> Type any amount (or click <em>"Pay Full Due"</em> or <em>"Pay Installment #1"</em> buttons).
                    </li>
                    <li>
                      <strong>Automatic FIFO Allocation:</strong> The software automatically applies the payment to the <strong>oldest unpaid installment first</strong>. If the payment exceeds installment #1, the remainder automatically knocks off installment #2, and so on.
                    </li>
                    <li>
                      <strong>Select Payment Mode:</strong> Choose <strong>💵 Cash</strong> or <strong>📱 UPI</strong>. For UPI, you can type the UTR / Transaction Reference ID.
                    </li>
                    <li>
                      <strong>Instant Receipt:</strong> Upon saving, the official Dual A5 printable receipt opens automatically with zero lag!
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* FAQ 3: 3 Action Tiers */}
          {(activeTab === 'all' || activeTab === 'categories') && (
            <div className="border border-indigo-200 dark:border-indigo-900/50 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('three-categories')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    What are the 3 Action Categories (ID Card, Permission Slip, Action)?
                  </span>
                </div>
                {expandedFaq === 'three-categories' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'three-categories' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-indigo-200/70 dark:border-indigo-900/50">
                  <p>The system organizes every student into strictly 3 operational buckets:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl">
                      <div className="flex items-center gap-1.5 font-black text-emerald-800 dark:text-emerald-300 text-xs uppercase mb-1">
                        <Award className="w-4 h-4 text-emerald-600" />
                        1. ID Card
                      </div>
                      <p className="text-[11px] text-emerald-900 dark:text-emerald-200">
                        Student has cleared all matured dues or is within the allowed tolerance threshold (e.g. within {currencySymbol}500). Eligible for ID Card & exam entry.
                      </p>
                    </div>

                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 rounded-xl">
                      <div className="flex items-center gap-1.5 font-black text-indigo-800 dark:text-indigo-300 text-xs uppercase mb-1">
                        <CalendarClock className="w-4 h-4 text-indigo-600" />
                        2. Permission Slip
                      </div>
                      <p className="text-[11px] text-indigo-900 dark:text-indigo-200">
                        Student was granted an active permission slip by the Principal/Accountant (defaults to the next 5th/10th/15th/20th/25th/30th). Allowed into class temporarily.
                      </p>
                    </div>

                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl">
                      <div className="flex items-center gap-1.5 font-black text-rose-800 dark:text-rose-300 text-xs uppercase mb-1">
                        <Flame className="w-4 h-4 text-rose-600" />
                        3. Action
                      </div>
                      <p className="text-[11px] text-rose-900 dark:text-rose-200">
                        Students whose <strong>permission slip has expired</strong> or whose overdue balance exceeds tolerance. Requires immediate follow-up or recovery call.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FAQ 4: Assign Miscellaneous Fees */}
          {(activeTab === 'all' || activeTab === 'misc') && (
            <div className="border border-purple-200 dark:border-purple-900/50 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('assign-misc-fees')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-600 text-white">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    How to assign Miscellaneous / Add-on Fees (Exam, Bus, Uniform, Lab)?
                  </span>
                </div>
                {expandedFaq === 'assign-misc-fees' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'assign-misc-fees' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-purple-200/70 dark:border-purple-900/50">
                  <p>You can assign add-on fees in two ways:</p>
                  
                  <div className="space-y-2.5">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800">
                      <strong className="text-purple-900 dark:text-purple-300 font-bold block mb-1">
                        Method A: For an Individual Student (e.g. Bus Route 4 / Late Admission Fee)
                      </strong>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-xs">
                        <li>In the student table row, click the <strong>⚙️ Settings (Gear icon)</strong>.</li>
                        <li>Under <em>"Fee Heads & Add-on Fees"</em>, click <strong>"+ Add Fee Head"</strong>.</li>
                        <li>Enter Head Name (e.g., <em>"Bus Transport Route B"</em>), Amount (e.g., <em>{currencySymbol}1,500</em>), and Installment frequency.</li>
                        <li>Click <strong>"Save & Regenerate Installments"</strong>. The new fee is instantly added to the student's ledger!</li>
                      </ol>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800">
                      <strong className="text-purple-900 dark:text-purple-300 font-bold block mb-1">
                        Method B: For an Entire Class (e.g. Annual Exam Fee for all Class 10 students)
                      </strong>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-xs">
                        <li>In the top navbar menu, click <strong>"Class Master"</strong>.</li>
                        <li>Select the target class (e.g. Class 10) and add the fee head (e.g. <em>"Board Exam & Lab Fee"</em>).</li>
                        <li>Click <strong>"Apply to All Existing Students in Class"</strong>. All students in that class receive the updated schedule simultaneously!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FAQ 5: Receipt Printing */}
          {(activeTab === 'all' || activeTab === 'receipts') && (
            <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('receipt-printing')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <Printer className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    How to print Receipts on Laser & Monochrome Printers?
                  </span>
                </div>
                {expandedFaq === 'receipt-printing' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'receipt-printing' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-blue-200/70 dark:border-blue-900/50">
                  <p>
                    Receipts are designed in high-contrast solid black & white monochrome for standard office laser printers:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-xs">
                    <li><strong>Dual A5 on single A4 Sheet:</strong> Automatically formats an <strong>[ OFFICE / ACCOUNTS COPY ]</strong> on the left and a <strong>[ STUDENT / PARENT COPY ]</strong> on the right.</li>
                    <li><strong>Print Directly:</strong> Click the green <strong>"Print Receipt (A4 / A5)"</strong> button.</li>
                    <li><strong>Print in New Tab (Fallback):</strong> If your browser blocks popups or prints blanks inside an iframe, simply click <strong>"Print in New Tab"</strong> to open a clean standalone printable window.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* FAQ 6: Hiding Columns */}
          {(activeTab === 'all' || activeTab === 'columns') && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('hide-columns')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-700 text-white">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    How to hide columns (like Discount) and save preferences across reloads?
                  </span>
                </div>
                {expandedFaq === 'hide-columns' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'hide-columns' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800">
                  <p>
                    Above the student table, click the <strong>"Columns"</strong> button. Uncheck any column (such as <em>Discount</em> or <em>Committed</em>).
                  </p>
                  <p className="text-xs bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    💾 <strong>Persistent Storage:</strong> Your column visibility preferences are stored locally in your browser so they remain saved even if you log out or refresh the page.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* FAQ 7: Bulk CSV Upload */}
          {(activeTab === 'all' || activeTab === 'bulk') && (
            <div className="border border-teal-200 dark:border-teal-900/50 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('bulk-csv')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-teal-600 text-white">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    How to bulk upload students using CSV / Excel?
                  </span>
                </div>
                {expandedFaq === 'bulk-csv' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'bulk-csv' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-teal-200/70 dark:border-teal-900/50">
                  <ol className="list-decimal list-inside space-y-1.5 text-xs">
                    <li>Click <strong>"Bulk Upload (CSV)"</strong> in the top menu or table bar.</li>
                    <li>Click <strong>"Download Sample CSV"</strong> to get the pre-formatted Excel template.</li>
                    <li>Paste or fill your student records with columns: <code>RollNo, Name, Class, Section, ParentName, Phone, Concession</code>.</li>
                    <li>Upload the <code>.csv</code> file or paste rows directly into the box.</li>
                    <li>Review the instant validation preview and click <strong>"Import Students"</strong>. All installment schedules are created automatically!</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* FAQ 8: Head-Wise Bifurcation Cards */}
          {(activeTab === 'all' || activeTab === 'misc') && (
            <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFaq('head-bifurcation')}
                className="w-full px-4 py-3 text-left font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-extrabold">
                    How does Fee Head-Wise Bifurcation (Due & Collection) work?
                  </span>
                </div>
                {expandedFaq === 'head-bifurcation' ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {expandedFaq === 'head-bifurcation' && (
                <div className="px-4 pb-4 pt-1 space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-blue-200/70 dark:border-blue-900/50">
                  <p>
                    On the main financial dashboard, dedicated cards break down financial health across each distinct fee head (e.g. <em>School Tuition Fee</em>, <em>Transport Fee</em>, <em>Spot Fees</em>, <em>Lab & Books</em>):
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Collected:</strong> Realized cash & UPI received for that specific fee head with its recovery percentage.</li>
                    <li><strong>Overdue Due:</strong> Matured installments till today that remain unpaid for this head.</li>
                    <li><strong>Balance Due:</strong> Total unpaid balance committed across all active students for this head.</li>
                    <li><strong>Committed:</strong> Total aggregate revenue mapped under this fee category.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Need more assistance? Refer to your administrator or Principal.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
