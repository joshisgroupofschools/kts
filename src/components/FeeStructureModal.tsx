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
import { getKolkataToday } from '../utils/dateUtils';
import {
  AlertCircle,
  Banknote,
  Bus,
  CheckCircle,
  Clock,
  Edit3,
  GraduationCap,
  Layers,
  Phone,
  Plus,
  Save,
  Settings,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
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
    studentNotes?: string,
    updatedStudent?: Student
  ) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'FEES'>('PROFILE');

  // Student Profile State
  const [name, setName] = useState<string>(student.name);
  const [rollNo, setRollNo] = useState<string>(student.rollNo);
  const [className, setClassName] = useState<string>(student.className);
  const [section, setSection] = useState<string>(student.section || 'A');
  const [parentName, setParentName] = useState<string>(student.parentName || '');
  const [phone, setPhone] = useState<string>(student.phone || '');
  const [altPhone, setAltPhone] = useState<string>(student.altPhone || '');
  const [address, setAddress] = useState<string>(student.address || '');
  const [admissionDate, setAdmissionDate] = useState<string>(
    student.admissionDate || getKolkataToday()
  );
  const [isActive, setIsActive] = useState<boolean>(student.isActive);
  const [studentNotes, setStudentNotes] = useState<string>(student.notes || '');

  // Find class default config
  const matchedClassConfig = classConfigs.find(
    (c) => c.className.toLowerCase() === className.toLowerCase()
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
    existingOtherMiscFees.map((m) => {
      const isOldFee = /old|previous|arrear|carryover/i.test(m.headName);
      return {
        id: m.id,
        headName: m.headName,
        amount: m.committedFee,
        installments: isOldFee ? 3 : m.installmentsCount,
        isSpotFee: !!m.isSpotFee,
        remarks: m.remarks,
      };
    })
  );

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

  const handleSave = async () => {
    const todayStr = getKolkataToday();
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
      const isOldFee = /old|previous|arrear|carryover/i.test(m.headName);
      newStructures.push({
        id: m.id,
        studentId: student.id,
        headName: m.headName,
        actualFee: m.amount,
        committedFee: m.amount,
        concession: 0,
        commitmentDate: todayStr,
        installmentsCount: isOldFee ? 3 : m.installments,
        isSpotFee: m.isSpotFee,
        remarks: m.remarks,
      });
    });

    const updatedStudent: Student = {
      ...student,
      name: name.trim() || student.name,
      rollNo: rollNo.trim() || student.rollNo,
      className: className || student.className,
      section: section.trim() || 'A',
      parentName: parentName.trim(),
      phone: phone.trim(),
      altPhone: altPhone.trim() || undefined,
      address: address.trim() || undefined,
      admissionDate,
      isActive,
      notes: studentNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    await onSaveStructures(
      student.id,
      newStructures,
      isActive,
      studentNotes.trim() || undefined,
      updatedStudent
    );
    onClose();
  };

  return (
    <div id="modal-student-settings" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Student Settings & Fee Configuration
              </h2>
              <p className="text-xs text-slate-400">
                {student.name} • Roll #{student.rollNo} • {student.className}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Student Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FEES')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'FEES'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fee Structure & Discounts</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300 max-h-[70vh] overflow-y-auto">
          {activeTab === 'PROFILE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Student Full Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Student Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Mobile Number (WhatsApp Reminder) *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Alternative Phone */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alternative Phone
                  </label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Roll Number */}
                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Roll Number / Admission ID *
                  </label>
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Class & Section */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">
                      Class
                    </label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Section
                    </label>
                    <input
                      type="text"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Parent / Guardian Name */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. H.No 4-12, Main Bazar, Suryapet"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FEES' && (
            <div className="space-y-4">
              {/* Section 1: Main School Tuition Fee Head */}
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
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Actual Fee ({schoolProfile.currencySymbol}):</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Standard</span>
                    </label>
                    <input
                      type="number"
                      value={actualFee}
                      onChange={(e) => setActualFee(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 dark:text-white mb-1">
                      Committed Fee ({schoolProfile.currencySymbol}):
                    </label>
                    <input
                      type="number"
                      value={committedFee}
                      onChange={(e) => setCommittedFee(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-emerald-500/70 rounded-lg text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Installments Count:
                    </label>
                    <select
                      value={schoolInstallments}
                      onChange={(e) => setSchoolInstallments(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <option key={num} value={num}>
                          {num} Installments {num === 7 ? '(Standard)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Concession summary line */}
                <div className="flex items-center justify-between text-xs bg-emerald-50/80 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800/60">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Concession / Discount:
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(concession, schoolProfile.currencySymbol)}
                    {actualFee > 0 && ` (${Math.round((concession / actualFee) * 100)}%)`}
                  </span>
                </div>
              </div>

              {/* Section 2: Transport Fee Head */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Transport & Bus Service
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasTransportFee(!hasTransportFee)}
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {hasTransportFee ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <ToggleRight className="w-5 h-5 text-emerald-600" /> Active
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <ToggleLeft className="w-5 h-5 text-slate-400" /> No Transport
                      </span>
                    )}
                  </button>
                </div>

                {hasTransportFee && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Annual Transport Fee:
                      </label>
                      <input
                        type="number"
                        value={transportAmount}
                        onChange={(e) => setTransportAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Installments:
                      </label>
                      <select
                        value={transportInstallments}
                        onChange={(e) => setTransportInstallments(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        {[1, 2, 4, 8, 10, 12].map((num) => (
                          <option key={num} value={num}>
                            {num} Installments {num === 10 ? '(10 Months)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Route / Stop:
                      </label>
                      <input
                        type="text"
                        value={transportRouteNotes}
                        onChange={(e) => setTransportRouteNotes(e.target.value)}
                        placeholder="e.g. Route #4 - Clock Tower"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Other Fee Heads */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Additional Fee Heads & Books/Uniforms
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddOtherFee(false)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Head
                  </button>
                </div>

                {otherMiscFeeList.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No additional fee heads added.</p>
                ) : (
                  <div className="space-y-2">
                    {otherMiscFeeList.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                          type="text"
                          value={m.headName}
                          onChange={(e) => {
                            const updated = otherMiscFeeList.map((item) =>
                              item.id === m.id ? { ...item, headName: e.target.value } : item
                            );
                            setOtherMiscFeeList(updated);
                          }}
                          className="flex-1 px-2 py-1 bg-transparent border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold"
                        />
                        <input
                          type="number"
                          value={m.amount}
                          onChange={(e) => {
                            const updated = otherMiscFeeList.map((item) =>
                              item.id === m.id ? { ...item, amount: parseFloat(e.target.value) || 0 } : item
                            );
                            setOtherMiscFeeList(updated);
                          }}
                          className="w-24 px-2 py-1 bg-transparent border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-right"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOtherFee(m.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Active Student Status</span>
              <p className="text-[11px] text-slate-500">
                Inactive students are excluded from active fee dashboards.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              {isActive ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <ToggleRight className="w-6 h-6 text-emerald-600" /> Active Enrolled
                </span>
              ) : (
                <span className="text-rose-600 flex items-center gap-1">
                  <ToggleLeft className="w-6 h-6 text-rose-500" /> Inactive / Left
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-500">Total Net Payable: </span>
            <strong className="font-mono text-slate-900 dark:text-white text-sm">
              {formatCurrency(totalPayable, schoolProfile.currencySymbol)}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
