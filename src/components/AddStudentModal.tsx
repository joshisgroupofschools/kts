import React, { useState } from 'react';
import {
  ClassFeeConfig,
  SchoolProfile,
  Student,
  StudentFeeStructure,
} from '../types';
import { generateInstallments } from '../utils/feeCalculator';
import { getKolkataToday } from '../utils/dateUtils';
import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';

interface AddStudentModalProps {
  classList: string[];
  classConfigs: ClassFeeConfig[];
  schoolProfile: SchoolProfile;
  onClose: () => void;
  onAddSingleStudent: (student: Student, feeStructure?: StudentFeeStructure) => Promise<void>;
  onAddBulkStudents: (
    students: Student[],
    autoCommitClassFee: boolean,
    targetClassName: string
  ) => Promise<void>;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  classList,
  classConfigs,
  schoolProfile,
  onClose,
  onAddSingleStudent,
  onAddBulkStudents,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Single Add Form State
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(classList[0] || 'Class 1');
  const [section, setSection] = useState('A');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [admissionDate, setAdmissionDate] = useState(
    getKolkataToday()
  );
  const [autoCommitFee, setAutoCommitFee] = useState(true);
  const [singleCommittedFee, setSingleCommittedFee] = useState<number>(35000);
  const [singleInstallments, setSingleInstallments] = useState<number>(7);

  // Bulk Add Form State
  const [bulkClass, setBulkClass] = useState(classList[0] || 'Class 1');
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkAutoCommit, setBulkAutoCommit] = useState(false); // Default to uncommitted (Strong Red) as user requested!

  // Update default fees when class changes in single add
  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    const cfg = classConfigs.find(
      (c) => c.className.toLowerCase() === newClass.toLowerCase()
    );
    if (cfg) {
      setSingleCommittedFee(cfg.actualFee);
      setSingleInstallments(cfg.defaultInstallments);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Student Name is required.');
      return;
    }
    const finalRollNo = rollNo.trim() || `2026-${Math.floor(100 + Math.random() * 900)}`;

    const newStudent: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rollNo: finalRollNo,
      name: name.trim(),
      classId: `cls_${selectedClass.toLowerCase().replace(/\s+/g, '')}`,
      className: selectedClass,
      section: section.trim() || 'A',
      parentName: parentName.trim(),
      phone: phone.trim(),
      altPhone: altPhone.trim() || undefined,
      address: address.trim() || undefined,
      admissionDate,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let feeStruct: StudentFeeStructure | undefined = undefined;
    if (autoCommitFee) {
      const cfg = classConfigs.find(
        (c) => c.className.toLowerCase() === selectedClass.toLowerCase()
      );
      const actual = cfg ? cfg.actualFee : singleCommittedFee;
      feeStruct = {
        id: `fs_${Date.now()}`,
        studentId: newStudent.id,
        headName: 'School Tuition Fee',
        actualFee: actual,
        committedFee: singleCommittedFee,
        concession: Math.max(0, actual - singleCommittedFee),
        commitmentDate: admissionDate,
        installmentsCount: singleInstallments,
        isSpotFee: false,
      };
    }

    setIsSaving(true);
    setSaveError('');
    try {
      await onAddSingleStudent(newStudent, feeStruct);
      onClose();
    } catch (error: any) {
      setSaveError(error?.message || 'Unable to save student. No changes were recorded.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkRawText.trim()) {
      alert('Please paste student rows or enter data.');
      return;
    }

    const lines = bulkRawText.trim().split('\n');
    const parsedStudents: Student[] = [];

    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      // Support comma or tab separated values: Name, RollNo, ParentName, Phone, Section
      const parts = line.includes('\t')
        ? line.split('\t').map((p) => p.trim())
        : line.split(',').map((p) => p.trim());

      const studentName = parts[0] || `Student ${idx + 1}`;
      const studentRoll = parts[1] || `2026-${Math.floor(100 + Math.random() * 900)}`;
      const studentParent = parts[2] || 'Parent';
      const studentPhone = parts[3] || '';
      const studentSec = parts[4] || 'A';

      parsedStudents.push({
        id: `std_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        rollNo: studentRoll,
        name: studentName,
        classId: `cls_${bulkClass.toLowerCase().replace(/\s+/g, '')}`,
        className: bulkClass,
        section: studentSec,
        parentName: studentParent,
        phone: studentPhone,
        admissionDate: getKolkataToday(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    if (parsedStudents.length === 0) {
      alert('No valid student records found in input.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      await onAddBulkStudents(parsedStudents, bulkAutoCommit, bulkClass);
      onClose();
    } catch (error: any) {
      setSaveError(error?.message || 'Unable to save students. No changes were recorded.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="modal-add-student" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Tab Switcher */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Enroll New Students</h2>
              <p className="text-xs text-slate-400">Single Registration or Class-Wise Bulk Import</p>
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

        {/* Tab Selector */}
        <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`py-2.5 text-center flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'single'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Single Student Form</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`py-2.5 text-center flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'bulk'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Class-Wise Bulk Import</span>
          </button>
        </div>

        {/* Body Content */}
          <div className="p-5 text-xs text-slate-700 dark:text-slate-300 max-h-[70vh] overflow-y-auto">
            {saveError && <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-3 font-bold text-rose-700">{saveError}</div>}
          {activeTab === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Roll / Admission No
                  </label>
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="e.g. 2026-009 (Auto if empty)"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Class / Grade *
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {classList.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="A / B / C"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Optional Immediate Fee Commitment Box */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={autoCommitFee}
                      onChange={(e) => setAutoCommitFee(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Map Fee Structure Immediately</span>
                  </label>
                  {!autoCommitFee && (
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200">
                      Will show as Strong Red (Uncommitted)
                    </span>
                  )}
                </div>

                {autoCommitFee && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Committed School Fee ({schoolProfile.currencySymbol}):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={singleCommittedFee}
                        onChange={(e) => setSingleCommittedFee(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Installments Count:
                      </label>
                      <select
                        value={singleInstallments}
                        onChange={(e) => setSingleInstallments(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                          <option key={num} value={num}>
                            {num} installments
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                  <button
                    id="btn-submit-single-student"
                    type="submit"
                    disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                    <span>{isSaving ? 'Saving…' : 'Register Student'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    1. Select Target Class for Bulk Import:
                  </label>
                  <select
                    value={bulkClass}
                    onChange={(e) => setBulkClass(e.target.value)}
                    className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none"
                  >
                    {classList.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  All imported rows will be enrolled into <strong>{bulkClass}</strong>.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    2. Paste Student Rows (CSV or Tab-Delimited from Excel):
                  </label>
                  <span className="text-[10px] text-slate-500">Format: Name, RollNo, Parent, Phone, Section</span>
                </div>
                <textarea
                  rows={6}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  placeholder={`Aarav Sharma, 2026-101, Rajesh Sharma, 9876543210, A\nDiya Patel, 2026-102, Ketan Patel, 9812345678, A\nRohan Verma, 2026-103, Sunil Verma, 9765432109, B`}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={bulkAutoCommit}
                    onChange={(e) => setBulkAutoCommit(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Auto-commit standard class fee structure ({bulkClass})</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1">
                  If unchecked (recommended), all students will be imported with <strong>Strong Red 🔴 Uncommitted</strong> status so you can map individual committed fees later.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-bulk-students"
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                    <span>{isSaving ? 'Saving…' : 'Batch Import Students'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
