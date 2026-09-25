import React, { useState } from 'react';
import {
  BookOpen,
  Building2,
  Calendar,
  ChevronRight,
  Coins,
  Download,
  FileSpreadsheet,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Settings,
  Sliders,
  Sparkles,
  Sun,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { AppView, SchoolProfile, ToleranceConfig } from '../types';
import { formatCurrency } from '../utils/numberToWords';

interface NavbarProps {
  schoolProfile: SchoolProfile;
  tolerance: ToleranceConfig;
  onUpdateTolerance: (tolerance: ToleranceConfig) => void;
  currentDate: string;
  onChangeDate: (date: string) => void;
  onResetDate: () => void;
  isSheetsConnected: boolean;
  onOpenSheetsSync: () => void;
  onOpenSettings: () => void;
  onOpenAddStudent: () => void;
  onOpenClassMaster: () => void;
  onOpenHelp: () => void;
  onOpenBulkUpload: () => void;
  onExportBackup: () => void;
  onImportBackup: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResetDemo: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeView?: AppView;
  onToggleView?: (view: AppView) => void;
  onOpenTodaysReceipts?: () => void;
  todaysStats?: { count: number; total: number; pendingSlips: number };
}

export const Navbar: React.FC<NavbarProps> = ({
  schoolProfile,
  tolerance,
  onUpdateTolerance,
  currentDate,
  onChangeDate,
  onResetDate,
  isSheetsConnected,
  onOpenSheetsSync,
  onOpenSettings,
  onOpenAddStudent,
  onOpenClassMaster,
  onOpenHelp,
  onOpenBulkUpload,
  onExportBackup,
  onImportBackup,
  onResetDemo,
  theme,
  onToggleTheme,
  activeView = 'LEDGER',
  onToggleView,
  onOpenTodaysReceipts,
  todaysStats,
}) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showToleranceDetails, setShowToleranceDetails] = useState(false);
  const isDateSimulated = currentDate !== new Date().toISOString().split('T')[0];
  const currencySymbol = schoolProfile?.currencySymbol || '₹';

  return (
    <>
      <header
        id="app-navbar"
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-150"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: School Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0">
                {schoolProfile.schoolName ? schoolProfile.schoolName.charAt(0).toUpperCase() : 'K'}
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate tracking-tight">
                    {schoolProfile.schoolName || 'Kakatiya School Boduppal'}
                  </h1>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 rounded-full whitespace-nowrap">
                    AY {schoolProfile.academicYear || '2026-27'}
                  </span>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] sm:text-[11px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-700/50 rounded-full whitespace-nowrap">
                    v2.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                  Accounting Ledger & Smart Installment Knock-Off
                </p>
              </div>
            </div>

            {/* Center: Empty to keep header uncluttered */}
            <div className="hidden lg:flex items-center" />

            {/* Right: Clean & Uncrowded Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* As-Of Date Indicator (Desktop) */}
              <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <input
                  id="input-system-date"
                  type="date"
                  value={currentDate}
                  onChange={(e) => onChangeDate(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
                  title="Simulate / View dues as of specific calendar date"
                />
                {isDateSimulated && (
                  <button
                    type="button"
                    onClick={onResetDate}
                    className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded hover:bg-amber-200 transition-colors"
                    title="Reset to today's real date"
                  >
                    Reset Today
                  </button>
                )}
              </div>

              {/* Hamburger Menu Button */}
              <button
                id="btn-navbar-hamburger"
                type="button"
                onClick={() => setShowDrawer(true)}
                className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Open Navigation Menu & Controls"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
                {isDateSimulated && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Slide-Over Drawer for All Secondary Features & Options */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowDrawer(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-50">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  {schoolProfile.schoolName ? schoolProfile.schoolName.charAt(0).toUpperCase() : 'K'}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {schoolProfile.schoolName || 'Kakatiya School'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Menu & System Controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Primary Actions: Add Student & Theme Toggle */}
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <button
                  id="btn-add-student-drawer"
                  type="button"
                  onClick={() => {
                    setShowDrawer(false);
                    onOpenAddStudent();
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Student</span>
                </button>

                <button
                  id="btn-toggle-theme-drawer"
                  type="button"
                  onClick={onToggleTheme}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-slate-600" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
              {/* As-Of Date Section */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Accounting As-Of Date
                  </span>
                  {isDateSimulated && (
                    <button
                      type="button"
                      onClick={onResetDate}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 hover:bg-amber-200"
                    >
                      Reset to Today
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Simulate installments due, overdue balances, and target run-rates as of any specific calendar date:
                </p>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => onChangeDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Status Tolerance Setting */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2.5">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setShowToleranceDetails(!showToleranceDetails)}
                >
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Green Status Tolerance
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                    {tolerance.mode === 'percentage' ? `${tolerance.value}%` : `${currencySymbol}${tolerance.value}`}
                  </span>
                </div>

                {showToleranceDetails && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => onUpdateTolerance({ ...tolerance, mode: 'percentage' })}
                        className={`py-1 rounded text-center font-semibold text-xs ${
                          tolerance.mode === 'percentage'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateTolerance({ ...tolerance, mode: 'fixed_amount' })}
                        className={`py-1 rounded text-center font-semibold text-xs ${
                          tolerance.mode === 'fixed_amount'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Fixed ({currencySymbol})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={tolerance.mode === 'percentage' ? '100' : '100000'}
                        value={tolerance.value}
                        onChange={(e) =>
                          onUpdateTolerance({
                            ...tolerance,
                            value: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 font-bold focus:outline-none"
                      />
                      <span className="font-bold text-slate-600 dark:text-slate-400">
                        {tolerance.mode === 'percentage' ? '%' : currencySymbol}
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500">Presets:</span>
                      {tolerance.mode === 'percentage' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateTolerance({ mode: 'percentage', value: 15 })}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-semibold"
                          >
                            15%
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateTolerance({ mode: 'percentage', value: 25 })}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-semibold"
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateTolerance({ mode: 'percentage', value: 30 })}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-semibold"
                          >
                            30%
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateTolerance({ mode: 'fixed_amount', value: 500 })}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-semibold"
                          >
                            {currencySymbol}500
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateTolerance({ mode: 'fixed_amount', value: 1000 })}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-semibold"
                          >
                            {currencySymbol}1,000
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateTolerance({ mode: 'fixed_amount', value: 2000 })}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-semibold"
                          >
                            {currencySymbol}2,000
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Navigation Pages Section */}
              <div className="space-y-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Pages & Navigation
                </span>

                {/* 1. Student Ledger */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleView?.('LEDGER');
                    setShowDrawer(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-left cursor-pointer ${
                    activeView === 'LEDGER'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                        Student Ledger
                        {activeView === 'LEDGER' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Student accounts, payments, and installment knock-off
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* 2. Financial Analytics & Fee Health */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleView?.('ANALYTICS');
                    setShowDrawer(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-left cursor-pointer ${
                    activeView === 'ANALYTICS'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                        Financial Analytics & Fee Health
                        {activeView === 'ANALYTICS' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Revenue realization, headwise breakdown & daily run-rate
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* 3. Today's Receipts & Day Reconciliation */}
                {onOpenTodaysReceipts && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDrawer(false);
                      onOpenTodaysReceipts();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          Today's Receipts & Day Close
                          {todaysStats && todaysStats.count > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-bold">
                              {todaysStats.count} Recorded
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          Cash vs UPI breakdown, permission slip status, and Day Close
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Main Features & Modules List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Features & Actions
                </span>

                {/* Class Fee Master Button */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenClassMaster();
                    setShowDrawer(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        Class Fee Schedule Master
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Nursery (₹30k) to Class 10 (₹48k) rates
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Google Sheets Sync Hub */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenSheetsSync();
                    setShowDrawer(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      {isSheetsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                        Google Sheets Sync
                        {isSheetsConnected && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold">
                            Connected
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Live Apps Script two-way sync
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Add Student Action in Menu */}
                <button
                  type="button"
                  id="btn-drawer-add-student"
                  onClick={() => {
                    onOpenAddStudent();
                    setShowDrawer(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-950 dark:text-emerald-100 text-xs flex items-center gap-1.5">
                        Add New Student
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-bold">
                          Enroll
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                        Register student & auto-generate fee structure
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </button>

                {/* Bulk CSV Upload */}
                <button
                  type="button"
                  id="btn-drawer-bulk-upload"
                  onClick={() => {
                    onOpenBulkUpload();
                    setShowDrawer(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-600 text-white shadow-xs">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-purple-950 dark:text-purple-100 text-xs flex items-center gap-1.5">
                        Bulk CSV / Excel Import
                        <span className="text-[9px] px-1.5 py-0.2 bg-purple-600 text-white rounded font-bold">
                          Batch
                        </span>
                      </div>
                      <div className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                        Batch student roster and fee onboarding
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </button>

                {/* School Profile Settings */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    setShowDrawer(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        School & Receipt Settings
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Branding, receipt prefix, & headers
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Help & FAQs */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenHelp();
                    setShowDrawer(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-200 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-teal-900 dark:text-teal-100 text-xs">
                        Accountant Manual & Run-Rate Guide
                      </div>
                      <div className="text-[11px] text-teal-700/80 dark:text-teal-300/80">
                        FIFO knock-off logic, color rules & FAQs
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-400" />
                </button>
              </div>

              {/* Data & Backup Section */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Data Backup & Maintenance
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onExportBackup();
                      setShowDrawer(false);
                    }}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Backup JSON</span>
                  </button>

                  <label className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Restore JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        onImportBackup(e);
                        setShowDrawer(false);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all data to official spreadsheet default state?')) {
                      onResetDemo();
                      setShowDrawer(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to V2 September Master Data</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Kakatiya School Ledger v2.0 (Sept Updates)</span>
              <span>229 Students Active</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
