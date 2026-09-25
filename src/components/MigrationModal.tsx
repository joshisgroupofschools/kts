import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, ShieldCheck, Sparkles, X, ArrowRight } from 'lucide-react';
import {
  fetchLegacyDataSummary,
  executeOneTimeMigration,
  MigrationMeta
} from '../services/firestoreRepository';
import {
  getStoredStructures,
  getStoredClassConfigs,
  getStoredFeeHeads,
  getStoredToleranceConfig,
  getDailyCollectionTarget,
  getDayCloseRecords,
  getStoredSchoolProfile
} from '../utils/storage';

interface MigrationModalProps {
  migrationMeta: MigrationMeta | null;
  onMigrationComplete: () => void;
  onClose?: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  migrationMeta,
  onMigrationComplete,
  onClose
}) => {
  const [legacySummary, setLegacySummary] = useState<{
    exists: boolean;
    studentsCount: number;
    installmentsCount: number;
    transactionsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    async function loadLegacy() {
      setLoading(true);
      const res = await fetchLegacyDataSummary();
      setLegacySummary(res);
      setLoading(false);
    }
    loadLegacy();
  }, []);

  const handleStartMigration = async () => {
    if (!confirmed) {
      setErrorMsg('Please confirm the migration checkbox before proceeding.');
      return;
    }
    setMigrating(true);
    setStatusMsg('Acquiring migration lock and executing batched writes (max 400 per batch)...');
    setErrorMsg(null);

    const masterLocal = {
      structures: getStoredStructures(),
      classConfigs: getStoredClassConfigs(),
      feeHeads: getStoredFeeHeads(),
      tolerance: getStoredToleranceConfig(),
      dailyTarget: getDailyCollectionTarget(),
      dayCloseRecords: getDayCloseRecords(),
      schoolProfile: getStoredSchoolProfile(),
    };

    const result = await executeOneTimeMigration(masterLocal);
    setMigrating(false);

    if (result.success) {
      setStatusMsg('Migration completed successfully! Verifying counts...');
      setTimeout(() => {
        onMigrationComplete();
      }, 1500);
    } else {
      setErrorMsg(result.message);
      setStatusMsg(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Firestore Schema Migration v3</h2>
              <p className="text-xs text-slate-400">Upgrade to individual document collections</p>
            </div>
          </div>
          {onClose && migrationMeta?.completed && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5 text-slate-700 dark:text-slate-300 text-sm">
          {migrationMeta?.completed ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-3 text-center">
              <div className="inline-flex p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">Migration v3 is Already Complete</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Cloud database is fully migrated and verified with {migrationMeta.counts.students} students, {migrationMeta.counts.installments} installments, and {migrationMeta.counts.transactions} transactions.
              </p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Continue to Application
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex gap-3 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold">Required Administrator Action:</span> The single-document cloud ledger needs to be migrated to individual Firestore collections for multi-device scalability.
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-400 font-mono text-xs">
                  Inspecting legacy cloud document...
                </div>
              ) : legacySummary?.exists ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Legacy Cloud Document Status</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-lg font-black text-slate-900 dark:text-slate-100">{legacySummary.studentsCount}</div>
                      <div className="text-[11px] text-slate-500 font-medium">Cloud Students (Min 229)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-lg font-black text-slate-900 dark:text-slate-100">{legacySummary.installmentsCount}</div>
                      <div className="text-[11px] text-slate-500 font-medium">Installments (Min 2,345)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-lg font-black text-slate-900 dark:text-slate-100">{legacySummary.transactionsCount}</div>
                      <div className="text-[11px] text-slate-500 font-medium">Transactions (Min 415)</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
                  Legacy document not found! Please ensure database is connected.
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    I confirm this is the designated master laptop and I wish to execute the one-time migration to individual Firestore collections.
                  </span>
                </label>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {statusMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                  {statusMsg}
                </div>
              )}

              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('sfc_migration_skipped', 'true');
                    onMigrationComplete();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  ⚠️ Quota Exceeded? Bypass & Use Local Mode
                </button>
                <button
                  type="button"
                  disabled={migrating || !legacySummary?.exists}
                  onClick={handleStartMigration}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  {migrating ? 'Migrating Records...' : 'Start Migration v3'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
