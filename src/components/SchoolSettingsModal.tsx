import React, { useState } from 'react';
import { SchoolProfile, ToleranceConfig } from '../types';
import {
  Building2,
  CheckCircle,
  FileText,
  Percent,
  Receipt,
  Settings,
  Sliders,
  X,
} from 'lucide-react';

interface SchoolSettingsModalProps {
  schoolProfile: SchoolProfile;
  tolerance: ToleranceConfig;
  onSave: (profile: SchoolProfile, tolerance: ToleranceConfig) => void;
  onClose: () => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  schoolProfile,
  tolerance,
  onSave,
  onClose,
}) => {
  const [profile, setProfile] = useState<SchoolProfile>({ ...schoolProfile });
  const [tol, setTol] = useState<ToleranceConfig>({ ...tolerance });

  const handleSave = () => {
    onSave(profile, tol);
    onClose();
  };

  return (
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
              <p className="text-xs text-slate-400">Branding, Receipt Formats & Tolerance Rules</p>
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

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
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
                  placeholder="e.g. Delhi Public Academy"
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
                  {profile.receiptPrefix}-{new Date().getFullYear()}-{String(profile.nextReceiptSequence).padStart(5, '0')}
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
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-save-settings"
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
