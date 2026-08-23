import React, { useState } from 'react';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  TARGET_GOOGLE_SHEET_URL,
  TARGET_SPREADSHEET_ID,
} from '../utils/googleSheetsScript';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  HelpCircle,
  Info,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

interface GoogleSheetsSyncModalProps {
  scriptUrl: string;
  spreadsheetUrl?: string;
  isConnected: boolean;
  lastSyncTime?: string;
  onSaveScriptUrl: (url: string) => void;
  onSaveSpreadsheetUrl?: (url: string) => void;
  onPushSync: () => Promise<boolean>;
  onPullSync: () => Promise<boolean>;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetDemo: () => void;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  scriptUrl,
  spreadsheetUrl = TARGET_GOOGLE_SHEET_URL,
  isConnected,
  lastSyncTime,
  onSaveScriptUrl,
  onSaveSpreadsheetUrl,
  onPushSync,
  onPullSync,
  onExportBackup,
  onImportBackup,
  onResetDemo,
  onClose,
}) => {
  const [urlInput, setUrlInput] = useState(scriptUrl);
  const [sheetUrlInput, setSheetUrlInput] = useState(spreadsheetUrl);
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const isSpreadsheetUrlPasted = urlInput.includes('docs.google.com/spreadsheets');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveAndTest = async () => {
    const cleanUrl = urlInput.trim();
    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      setSyncStatusMsg({
        text: '⚠️ You pasted the Google Sheet document URL instead of the Apps Script Web App URL. Please follow Steps 1-6 below to get your Web App deployment URL (starts with https://script.google.com/macros/s/.../exec).',
        type: 'error',
      });
      return;
    }

    onSaveScriptUrl(cleanUrl);
    if (onSaveSpreadsheetUrl) {
      onSaveSpreadsheetUrl(sheetUrlInput.trim());
    }

    if (cleanUrl) {
      setIsSyncing(true);
      setSyncStatusMsg({
        text: 'Testing connection & pulling data from Google Sheets...',
        type: 'info',
      });
      const success = await onPullSync();
      setIsSyncing(false);
      if (success) {
        setSyncStatusMsg({
          text: '✅ Connected & synced with Google Sheets successfully! Data is now synchronized.',
          type: 'success',
        });
      } else {
        setSyncStatusMsg({
          text: '❌ Could not connect to Web App. Please ensure: 1) Deploy -> Web App -> "Who has access" is set to "Anyone". 2) You deployed a "New deployment".',
          type: 'error',
        });
      }
    } else {
      setSyncStatusMsg({
        text: 'Script URL cleared. App is running on offline local storage.',
        type: 'info',
      });
    }
  };

  const handleManualPush = async () => {
    setIsSyncing(true);
    setSyncStatusMsg({
      text: 'Pushing local database to Google Sheets...',
      type: 'info',
    });
    const success = await onPushSync();
    setIsSyncing(false);
    if (success) {
      setSyncStatusMsg({
        text: '✅ All tabs (Students, FeeStructures, Installments, Payments, ClassConfigs, Tolerance) updated in Google Sheets!',
        type: 'success',
      });
    } else {
      setSyncStatusMsg({
        text: '❌ Push sync failed. Please check the Web App deployment URL.',
        type: 'error',
      });
    }
  };

  return (
    <div id="modal-sheets-sync" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Google Sheets Real-Time Sync & Backup Hub
              </h2>
              <p className="text-xs text-slate-400">
                Direct integration with your Google Spreadsheet database
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
        <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Linked Sheet Banner */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Your Google Sheet Database:</span>
              </div>
              <a
                href={sheetUrlInput || TARGET_GOOGLE_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Open Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-mono break-all bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900">
              {sheetUrlInput || TARGET_GOOGLE_SHEET_URL}
            </p>
          </div>

          {/* Connection Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-emerald-600 animate-pulse shrink-0" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-bold block text-sm">
                  {isConnected ? 'Google Sheets Live Connected' : 'Local Mode (Offline Storage Active)'}
                </span>
                <span className="text-[11px] opacity-80">
                  {lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Deploy the Google Apps Script below to sync live to your Google Sheet.'}
                </span>
              </div>
            </div>

            {isConnected && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleManualPush}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            )}
          </div>

          {/* Web App URL Input */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Google Apps Script Web App URL:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="input-sheets-url"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveAndTest}
                disabled={isSyncing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all shrink-0"
              >
                {isSyncing ? 'Testing...' : 'Save & Connect'}
              </button>
            </div>

            {/* Warning if user pasted the Google Sheet edit URL */}
            {isSpreadsheetUrlPasted && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-1">
                  <p className="font-bold">You pasted the Google Sheets document URL.</p>
                  <p>
                    To enable live sync, open your Google Sheet → click <strong>Extensions → Apps Script</strong> → Deploy as <strong>Web app</strong>, and paste the generated URL (which starts with <code>https://script.google.com/macros/s/.../exec</code>).
                  </p>
                </div>
              </div>
            )}

            {syncStatusMsg && (
              <p
                className={`text-[11px] font-semibold p-2.5 rounded-lg border ${
                  syncStatusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : syncStatusMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                }`}
              >
                {syncStatusMsg.text}
              </p>
            )}
          </div>

          {/* Setup Instructions for the user */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-600" />
                How to Connect Your Google Sheet in 1 Minute:
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Code.gs Copied!' : 'Copy Code.gs Script'}</span>
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
              <li>
                <a
                  href={TARGET_GOOGLE_SHEET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-indigo-600 dark:text-indigo-400 underline inline-flex items-center gap-1"
                >
                  Click here to open your Google Sheet <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                In the top menu of your Google Sheet, click <strong>Extensions</strong> → <strong>Apps Script</strong>.
              </li>
              <li>
                Delete any sample code in the editor, click <strong>"Copy Code.gs Script"</strong> above, paste it, and press <strong>Save (Ctrl+S / Cmd+S)</strong>.
              </li>
              <li>
                Click the blue <strong>Deploy</strong> button (top-right) → <strong>New deployment</strong>.
              </li>
              <li>
                Click the gear icon (⚙) next to <em>Select type</em> → Select <strong>Web app</strong>.
              </li>
              <li>
                Set <em>Execute as:</em> <strong>Me (your email)</strong> and <em>Who has access:</em> <strong>Anyone</strong> (Crucial: enables smooth app sync).
              </li>
              <li>
                Click <strong>Deploy</strong>, grant permissions (<em>Advanced → Go to Untitled project (unsafe) → Allow</em>), then <strong>Copy the Web App URL</strong> and paste it into the box above!
              </li>
            </ol>
          </div>

          {/* Backup & Local Data Controls */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <span className="font-bold text-slate-900 dark:text-white block">
              Offline JSON Backup & Data Tools:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Full JSON Backup</span>
              </button>

              <label className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportBackup}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={onResetDemo}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

