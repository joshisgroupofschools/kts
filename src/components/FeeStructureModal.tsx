import React, { useState } from 'react';
import {
  ClassFeeConfig,
  FeeHeadDefinition,
  SchoolProfile,
  Student,
  StudentFeeStructure,
  StudentFinancialSummary,
} from '../types';
import { generateInstallments } from '../utils/feeCalculator';
import { formatCurrency } from '../utils/numberToWords';
import {
  AlertCircle,
  Banknote,
  Bus,
  CheckCircle,
  Clock,
  GraduationCap,
  Layers,
  Plus,
  Settings,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';

interface FeeStructureModalProps {
  student: Student;
  summary: StudentFinancialSummary;
  classConfigs: ClassFeeConfig[];
  feeHeads: FeeHeadDefinition[];
  schoolProfile: SchoolProfile;
  onClose: () => void;
  onSaveStructures: (
    studentId: string,
    structures: StudentFeeStructure[],
    isActive: boolean,
    studentNotes?: string
  ) => void;
}

export const FeeStructureModal: React.FC<FeeStructureModalProps> = ({
  student,
  summary,
  classConfigs,
  feeHeads,
  schoolProfile,
  onClose,
  onSaveStructures,
}) => {
  // Find class default config
  const matchedClassConfig = classConfigs.find(
    (c) => c.className.toLowerCase() === student.className.toLowerCase()
  ) || classConfigs[0];

  const existingSchoolFee = summary.structures.find(
    (s) => !s.isSpotFee && (s.headName.toLowerCase().includes('school') || s.headName.toLowerCase().includes('tuition'))
  );

  const existingTransportFee = summary.structures.find(
    (s) => s.headName.toLowerCase().includes('transport') || s.headName.toLowerCase().includes('bus')
  );

  // Form State - School Tuition Fee
  const [actualFee, setActualFee] = useState<number>(
    existingSchoolFee ? existingSchoolFee.actualFee : matchedClassConfig?.actualFee || 35000
  );
  const [committedFee, setCommittedFee] = useState<number>(
    existingSchoolFee ? existingSchoolFee.committedFee : matchedClassConfig?.actualFee || 35000
  );
  const [schoolInstallments, setSchoolInstallments] = useState<number>(
    existingSchoolFee ? existingSchoolFee.installmentsCount : matchedClassConfig?.defaultInstallments || 7
  );
  const [commitmentReceiptNo, setCommitmentReceiptNo] = useState<string>(
    existingSchoolFee?.commitmentReceiptNo || ''
  );

  // Form State - Transport Fee
  const [hasTransportFee, setHasTransportFee] = useState<boolean>(!!existingTransportFee);
  const [transportAmount, setTransportAmount] = useState<number>(
    existingTransportFee ? existingTransportFee.committedFee : 12000
  );
  const [transportInstallments, setTransportInstallments] = useState<number>(
    existingTransportFee ? existingTransportFee.installmentsCount : 10
  );
  const [transportRouteNotes, setTransportRouteNotes] = useState<string>(
    existingTransportFee?.remarks || ''
  );

  // Other Miscellaneous / Spot Fee Heads (excluding school tuition and transport)
  const existingOtherMiscFees = summary.structures.filter(
    (s) =>
      !s.headName.toLowerCase().includes('school') &&
      !s.headName.toLowerCase().includes('tuition') &&
      !s.headName.toLowerCase().includes('transport') &&
      !s.headName.toLowerCase().includes('bus')
  );

  const [otherMiscFeeList, setOtherMiscFeeList] = useState<
    Array<{
      id: string;
      headName: string;
      amount: number;
      installments: number;
      isSpotFee: boolean;
      remarks?: string;
    }>
  >(
    existingOtherMiscFees.map((m) => ({
      id: m.id,
      headName: m.headName,
      amount: m.committedFee,
      installments: m.installmentsCount,
      isSpotFee: !!m.isSpotFee,
      remarks: m.remarks,
    }))
  );

  // Student Active Status
  const [isActive, setIsActive] = useState<boolean>(student.isActive);
  const [studentNotes, setStudentNotes] = useState<string>(student.notes || '');

  // Computed totals
  const concession = Math.max(0, actualFee - committedFee);
  const transportTotal = hasTransportFee ? transportAmount : 0;
  const otherMiscTotal = otherMiscFeeList.reduce((sum, m) => sum + m.amount, 0);
  const totalPayable = committedFee + transportTotal + otherMiscTotal;

  const handleAddOtherFee = (isSpot: boolean = false) => {
    const defaultHead = isSpot ? 'Spot / Event Fee' : 'Books & Uniform Fee';
    setOtherMiscFeeList([
      ...otherMiscFeeList,
      {
        id: `misc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        headName: defaultHead,
        amount: isSpot ? 1500 : 5000,
        installments: isSpot ? 1 : 1,
        isSpotFee: isSpot,
        remarks: isSpot ? 'Spot fee addition' : '',
      },
    ]);
  };

  const handleRemoveOtherFee = (id: string) => {
    setOtherMiscFeeList(otherMiscFeeList.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newStructures: StudentFeeStructure[] = [];

    // 1. School Tuition Fee Structure
    newStructures.push({
      id: existingSchoolFee?.id || `fs_school_${Date.now()}`,
      studentId: student.id,
      headName: 'School Tuition Fee',
      actualFee,
      committedFee,
      concession,
      commitmentReceiptNo: commitmentReceiptNo.trim() || undefined,
      commitmentDate: todayStr,
      installmentsCount: schoolInstallments,
      isSpotFee: false,
    });

    // 2. Transport Fee Structure (Default 10 installments)
    if (hasTransportFee && transportAmount > 0) {
      newStructures.push({
        id: existingTransportFee?.id || `fs_transport_${Date.now()}`,
        studentId: student.id,
        headName: 'Transport / Bus Fee',
        actualFee: transportAmount,
        committedFee: transportAmount,
        concession: 0,
        commitmentDate: todayStr,
        installmentsCount: transportInstallments,
        isSpotFee: false,
        remarks: transportRouteNotes.trim() || undefined,
      });
    }

    // 3. Other Misc and Spot Fees
    otherMiscFeeList.forEach((m) => {
      newStructures.push({
        id: m.id,
        studentId: student.id,
        headName: m.headName,
        actualFee: m.amount,
        committedFee: m.amount,
        concession: 0,
        commitmentDate: todayStr,
        installmentsCount: m.installments,
        isSpotFee: m.isSpotFee,
        remarks: m.remarks,
      });
    });

    onSaveStructures(student.id, newStructures, isActive, studentNotes.trim() || undefined);
    onClose();
  };

  return (
    <div id="modal-fee-structure" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Student Fee Structure & Transport Setup
              </h2>
              <p className="text-xs text-slate-400">
                {student.name} • Roll #{student.rollNo} • {student.className}
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Main School Tuition Fee Head (Default: 7 Installments) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                School Tuition Fee Structure
              </span>
              <span className="text-[11px] text-slate-500">
                Default: {matchedClassConfig ? formatCurrency(matchedClassConfig.actualFee) : '—'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Actual / Assigned Fee ({schoolProfile.currencySymbol}):
                </label>
                <input
                  type="number"
                  min="0"
                  value={actualFee || ''}
                  onChange={(e) => setActualFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Committed Fee ({schoolProfile.currencySymbol}):
                </label>
                <input
                  type="number"
                  min="0"
                  value={committedFee || ''}
                  onChange={(e) => setCommittedFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Concession (Auto):
                </label>
                <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(concession, schoolProfile.currencySymbol)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Installments (Default: 7):
                </label>
                <select
                  value={schoolInstallments}
                  onChange={(e) => setSchoolInstallments(parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <option key={num} value={num}>
                      {num} Installment{num > 1 ? 's' : ''} (Approx. {formatCurrency(Math.floor(committedFee / (num || 1)))}/inst)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commitment Receipt / Ref No (Optional):
                </label>
                <input
                  type="text"
                  value={commitmentReceiptNo}
                  onChange={(e) => setCommitmentReceiptNo(e.target.value)}
                  placeholder="e.g. ADM-2026-101"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Transport / Bus Fee (Default: 10 Installments) */}
          <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/40 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs block">
                    Transport / Bus Facility Fee
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300">
                    Displays 🚌 icon beside student name when assigned
                  </span>
                </div>
              </div>

              {!hasTransportFee ? (
                <button
                  type="button"
                  onClick={() => {
                    setHasTransportFee(true);
                    if (!transportAmount) setTransportAmount(12000);
                    if (!transportInstallments) setTransportInstallments(10);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Transport Fee</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setHasTransportFee(false)}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Transport</span>
                </button>
              )}
            </div>

            {hasTransportFee ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Transport Amount ({schoolProfile.currencySymbol}):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={transportAmount || ''}
                      onChange={(e) => setTransportAmount(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 12000"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-bold text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Installments (Default: 10):
                    </label>
                    <select
                      value={transportInstallments}
                      onChange={(e) => setTransportInstallments(parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <option key={num} value={num}>
                          {num} Month{num > 1 ? 's' : ''} / Inst ({formatCurrency(Math.floor(transportAmount / (num || 1)))}/mo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bus Route / Stop (Optional):
                    </label>
                    <input
                      type="text"
                      value={transportRouteNotes}
                      onChange={(e) => setTransportRouteNotes(e.target.value)}
                      placeholder="e.g. Route 4 - Sector 62"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic text-center py-1">
                No transport or bus fee currently assigned to this student. Click <strong>Assign Transport Fee</strong> above to add with default 10 installments.
              </p>
            )}
          </div>

          {/* Section 3: Other Additional Heads & Spot Fees */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Other Heads & Spot Fees ({otherMiscFeeList.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddOtherFee(false)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Other Head</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOtherFee(true)}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Spot Fee</span>
                </button>
              </div>
            </div>

            {otherMiscFeeList.length === 0 ? (
              <p className="text-slate-400 italic text-center py-1">
                No additional spot or miscellaneous heads added.
              </p>
            ) : (
              <div className="space-y-2">
                {otherMiscFeeList.map((misc, idx) => (
                  <div
                    key={misc.id}
                    className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="text"
                        value={misc.headName}
                        onChange={(e) => {
                          const updated = [...otherMiscFeeList];
                          updated[idx].headName = e.target.value;
                          setOtherMiscFeeList(updated);
                        }}
                        placeholder="Head Name"
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        value={misc.amount || ''}
                        onChange={(e) => {
                          const updated = [...otherMiscFeeList];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setOtherMiscFeeList(updated);
                        }}
                        placeholder="Amount"
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-right"
                      />
                    </div>
                    <div className="w-24">
                      <select
                        value={misc.installments}
                        onChange={(e) => {
                          const updated = [...otherMiscFeeList];
                          updated[idx].installments = parseInt(e.target.value) || 1;
                          setOtherMiscFeeList(updated);
                        }}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((num) => (
                          <option key={num} value={num}>
                            {num} inst
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOtherFee(misc.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      title="Remove Head"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Student Status & Inactive Rule */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-xs block">
                  Student Enrollment Status
                </span>
                <p className="text-[11px] text-slate-500">
                  If marked Inactive: Historical payments remain in revenue, but all future unpaid dues disappear.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{isActive ? 'Active Student' : 'Inactive (Transferred)'}</span>
              </button>
            </div>

            {!isActive && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Inactivity Reason / Transfer Notes:
                </label>
                <input
                  type="text"
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="e.g. Transferred out to another city on 15/07"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Total Payable: <span className="text-emerald-600 font-mono font-extrabold">{formatCurrency(totalPayable, schoolProfile.currencySymbol)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-fee-structure"
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save & Map Installments</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
