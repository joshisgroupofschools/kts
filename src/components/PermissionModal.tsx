import React, { useState } from 'react';
import { Student } from '../types';
import { formatDate, getNextMultipleOfFiveDate } from '../utils/numberToWords';
import {
  AlertCircle,
  Award,
  Calendar,
  CalendarClock,
  CheckCircle,
  Flame,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface PermissionModalProps {
  student: Student;
  onClose: () => void;
  onSavePermission: (
    studentId: string,
    permissionExpiresAt: string | undefined,
    permissionReason: string | undefined,
    manualCategoryOverride: 'auto' | 'id_card' | 'permission' | 'action'
  ) => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  student,
  onClose,
  onSavePermission,
}) => {
  // Default to next multiple of 5 from today (e.g., if today is 21st -> 25th)
  const defaultNextMultipleOfFive = getNextMultipleOfFiveDate();

  const [expiryDate, setExpiryDate] = useState<string>(
    student.permissionExpiresAt || defaultNextMultipleOfFive
  );
  const [reason, setReason] = useState<string>(student.permissionReason || '');
  const [overrideTier, setOverrideTier] = useState<'auto' | 'id_card' | 'permission' | 'action'>(
    student.manualCategoryOverride || 'auto'
  );

  const hasActivePermission = !!student.permissionExpiresAt;
  const isExpired =
    student.permissionExpiresAt &&
    new Date(student.permissionExpiresAt).getTime() < new Date().setHours(0, 0, 0, 0);

  const handleSave = () => {
    onSavePermission(student.id, expiryDate, reason.trim() || undefined, overrideTier);
    onClose();
  };

  const handleRevoke = () => {
    onSavePermission(student.id, undefined, undefined, 'auto');
    onClose();
  };

  return (
    <div id="modal-permission-slip" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Temporary Permission Slip
              </h2>
              <p className="text-xs text-slate-400">
                {student.name} (#{student.rollNo}) • {student.className}
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {/* Current Status Banner */}
          {hasActivePermission ? (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                isExpired
                  ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
              }`}
            >
              <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block">
                  {isExpired ? 'Permission Expired (Action Needed)' : 'Active Permission Slip'}
                </span>
                <p className="text-[11px] mt-0.5">
                  Valid until <strong>{formatDate(student.permissionExpiresAt || '')}</strong>
                  {student.permissionReason ? ` (${student.permissionReason})` : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 leading-relaxed">
              Granting temporary permission suppresses this student from the <strong>Action List</strong> until the selected calendar date.
            </p>
          )}

          {/* Grace Expiry Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-800 dark:text-slate-200 font-bold">
                Select Permission Expiry Date (Valid Until):
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                Default: Next Multiple of 5 ({formatDate(defaultNextMultipleOfFive)})
              </span>
            </div>
            <input
              id="input-permission-date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {/* Quick Multiple-of-5 & Shortcut Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-medium">Quick Pick:</span>
              <button
                type="button"
                onClick={() => setExpiryDate(getNextMultipleOfFiveDate())}
                className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold"
              >
                Next 5th ({formatDate(getNextMultipleOfFiveDate())})
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 5);
                  setExpiryDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium"
              >
                +5 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 10);
                  setExpiryDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium"
              >
                +10 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  const y = endOfMonth.getFullYear();
                  const m = String(endOfMonth.getMonth() + 1).padStart(2, '0');
                  const day = String(endOfMonth.getDate()).padStart(2, '0');
                  setExpiryDate(`${y}-${m}-${day}`);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium"
              >
                Month End
              </button>
            </div>
          </div>

          {/* Reason / Remarks Input */}
          <div>
            <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1">
              Reason / Parent Commitment Note:
            </label>
            <textarea
              id="input-permission-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Parent requested extension till 28th Aug salary credit"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Manual Workflow Bucket Override */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1.5">
              Workflow Tier Override (Optional):
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'auto', label: 'Auto (System)' },
                { id: 'id_card', label: '🪪 ID Card' },
                { id: 'permission', label: '📋 Permission' },
                { id: 'action', label: '⚠️ Action' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setOverrideTier(tier.id as any)}
                  className={`py-1.5 px-2 rounded-lg font-semibold text-center border transition-all text-xs ${
                    overrideTier === tier.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {hasActivePermission ? (
            <button
              type="button"
              onClick={handleRevoke}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Revoke Permission</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-permission"
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Issue / Update Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
