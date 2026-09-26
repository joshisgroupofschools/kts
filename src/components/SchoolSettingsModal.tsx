import React, { useState } from 'react';
import { SchoolProfile, Student, ToleranceConfig } from '../types';
import {
  Building2,
  CheckCircle,
  Edit3,
  Phone,
  Receipt,
  Search,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react';
import { EditStudentModal } from './EditStudentModal';
import { getKolkataToday } from '../utils/dateUtils';

interface SchoolSettingsModalProps {
  schoolProfile: SchoolProfile;
  tolerance: ToleranceConfig;
  students?: Student[];
  classList?: string[];
  onSave: (profile: SchoolProfile, tolerance: ToleranceConfig) => Promise<void>;
  onUpdateStudent?: (updatedStudent: Student) => Promise<void> | void;
  onClose: () => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  schoolProfile,
  tolerance,
  students = [],
  classList = [],
  onSave,
  onUpdateStudent,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'students'>('general');
  const [profile, setProfile] = useState<SchoolProfile>({ ...schoolProfile });
  const [tol, setTol] = useState<ToleranceConfig>({ ...tolerance });
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentToEdit, setSelectedStudentToEdit] = useState<Student | null>(null);

  const handleSave = async () => {
    await onSave(profile, tol);
    onClose();
  };

  const filteredStudents = students.filter((s) => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.className.toLowerCase().includes(q) ||
      (s.parentName && s.parentName.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div id="modal-school-settings" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">School & System Preferences</h2>
                <p className="text-xs text-slate-400">Branding, Receipts & Student Details Editor</p>
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

          {/* Tab navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 pt-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'general'
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>School & Receipts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'students'
                  ? 'border-blue-500 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Edit Student Details ({students.length})</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
            {activeTab === 'general' ? (
              <>
                {/* School Profile Information */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    School Institution Details
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">School Name:</label>
                      <input
                        type="text"
                        value={profile.schoolName}
                        onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                        placeholder="e.g. Kakatiya School Boduppal"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Academic Year:</label>
                      <input
                        type="text"
                        value={profile.academicYear}
                        onChange={(e) => setProfile({ ...profile, academicYear: e.target.value })}
                        placeholder="e.g. 2026-2027"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Contact Phone:</label>
                      <input
                        type="text"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Receipt Numbering & Prefix */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Receipt Sequence & Numbering Pattern
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Receipt Prefix:</label>
                      <input
                        type="text"
                        value={profile.receiptPrefix}
                        onChange={(e) => setProfile({ ...profile, receiptPrefix: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Next Sequence No:</label>
                      <input
                        type="number"
                        min="1"
                        value={profile.nextReceiptSequence}
                        onChange={(e) =>
                          setProfile({ ...profile, nextReceiptSequence: parseInt(e.target.value) || 1 })
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Preview Format:</label>
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200">
                        {profile.receiptPrefix}-{getKolkataToday().slice(0, 4)}-{String(profile.nextReceiptSequence).padStart(5, '0')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Receipt Disclaimer / Terms Note:</label>
                    <textarea
                      rows={2}
                      value={profile.receiptDisclaimer}
                      onChange={(e) => setProfile({ ...profile, receiptDisclaimer: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Student Details Management Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student by name, mobile number, roll no, class..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">
                    {filteredStudents.length} of {students.length}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[50vh] overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No matching students found.
                    </div>
                  ) : (
                    filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[11px]">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{s.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                                {s.rollNo}
                              </span>
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                {s.className} - Sec {s.section || 'A'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-2.5 h-2.5" />
                                {s.phone || 'No Phone'}
                              </span>
                              {s.parentName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-2.5 h-2.5" />
                                  {s.parentName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedStudentToEdit(s)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-bold text-xs transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
            {activeTab === 'general' && (
              <button
                id="btn-save-settings"
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Student Modal if selected */}
      {selectedStudentToEdit && (
        <EditStudentModal
          student={selectedStudentToEdit}
          classList={classList}
          onSave={async (updated) => {
            if (onUpdateStudent) {
              await onUpdateStudent(updated);
            }
            setSelectedStudentToEdit(null);
          }}
          onClose={() => setSelectedStudentToEdit(null)}
        />
      )}
    </>
  );
};
