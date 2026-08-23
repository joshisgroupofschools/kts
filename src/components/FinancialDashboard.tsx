import React, { useMemo, useState } from 'react';
import {
  ActionTier,
  AnalyticsSummary,
  SchoolProfile,
  StatusCategory,
  ToleranceConfig,
} from '../types';
import { formatCurrency } from '../utils/numberToWords';
import { sortClassList } from '../utils/classOrder';
import {
  AlertCircle,
  Award,
  BookOpen,
  Building2,
  Bus,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  Flame,
  FlaskConical,
  GraduationCap,
  Layers,
  Percent,
  Receipt,
  Shirt,
  Sparkles,
  Table,
  Tag,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

interface FinancialDashboardProps {
  analytics: AnalyticsSummary;
  schoolProfile: SchoolProfile;
  tolerance: ToleranceConfig;
  selectedStatusFilter: StatusCategory | 'ALL' | 'INACTIVE';
  onSelectStatusFilter: (status: StatusCategory | 'ALL' | 'INACTIVE') => void;
  selectedActionFilter: ActionTier | 'ALL';
  onSelectActionFilter: (action: ActionTier | 'ALL') => void;
  selectedClassFilter: string;
  onSelectClassFilter: (className: string) => void;
  classList: string[];
}

const REVEALED_CARDS_STORAGE_KEY = 'school_fee_revealed_cards_v2';

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  analytics,
  schoolProfile,
  tolerance,
  selectedStatusFilter,
  onSelectStatusFilter,
  selectedActionFilter,
  onSelectActionFilter,
  selectedClassFilter,
  onSelectClassFilter,
  classList,
}) => {
  const currencySymbol = schoolProfile?.currencySymbol || '₹';

  // Per-card/subcard visibility state: By default all numbers are hidden (masked)
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(REVEALED_CARDS_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const isCardRevealed = (cardKey: string) => !!revealedCards[cardKey];

  const toggleCardReveal = (cardKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevealedCards((prev) => {
      const updated = { ...prev, [cardKey]: !prev[cardKey] };
      try {
        localStorage.setItem(REVEALED_CARDS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const allCardKeys = ['set1', 'set2', 'set3', 'set4'];

  const areAllCardsRevealed = useMemo(() => {
    return allCardKeys.every((k) => !!revealedCards[k]);
  }, [revealedCards]);

  const toggleAllCardsReveal = () => {
    if (areAllCardsRevealed) {
      setRevealedCards({});
      try {
        localStorage.setItem(REVEALED_CARDS_STORAGE_KEY, JSON.stringify({}));
      } catch {}
    } else {
      const allTrue: Record<string, boolean> = {};
      allCardKeys.forEach((k) => {
        allTrue[k] = true;
      });
      setRevealedCards(allTrue);
      try {
        localStorage.setItem(REVEALED_CARDS_STORAGE_KEY, JSON.stringify(allTrue));
      } catch {}
    }
  };

  const {
    totalStudents,
    activeStudents,
    inactiveStudents,
    totalActualRevenue = 0,
    totalCommittedRevenue = 0,
    totalExpectedTillDate = 0,
    totalCollectedTillDate = 0,
    totalCashCollected = 0,
    totalUpiCollected = 0,
    totalOverdueDeficitTillDate = 0,
    totalOverallDue = 0,
    collectionEfficiencyPercent = 0,
    todayCollection = 0,
    todayCash = 0,
    todayUpi = 0,
    totalConcessionGiven = 0,
    concessionStudentsCount = 0,
    totalTransactionsCount = 0,
    averageReceiptAmount = 0,
    dailyTargetRunRate,
    categoryCounts,
    actionTierCounts,
    headWiseBifurcation = [],
  } = analytics;

  // Actual fee fallback
  const actualStandardFeeSum = totalActualRevenue > 0 ? totalActualRevenue : totalCommittedRevenue + totalConcessionGiven;

  // Percentage calculations
  const allTimeCashPct = totalCollectedTillDate > 0 ? Math.round((totalCashCollected / totalCollectedTillDate) * 100) : 0;
  const allTimeUpiPct = totalCollectedTillDate > 0 ? Math.round((totalUpiCollected / totalCollectedTillDate) * 100) : 0;

  const getHeadIcon = (headName: string) => {
    const lower = headName.toLowerCase();
    if (lower.includes('school') || lower.includes('tuition')) {
      return <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
    if (lower.includes('transport') || lower.includes('bus')) {
      return <Bus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    if (lower.includes('old') || lower.includes('due') || lower.includes('previous')) {
      return <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />;
    }
    if (lower.includes('book') || lower.includes('stationery')) {
      return <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (lower.includes('uniform') || lower.includes('dress')) {
      return <Shirt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    }
    if (lower.includes('lab') || lower.includes('computer') || lower.includes('science')) {
      return <FlaskConical className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />;
  };

  return (
    <section id="financial-dashboard" className="space-y-3.5">
      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Financial Analytics & Fee Health</span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Total: <strong className="text-slate-900 dark:text-white">{totalStudents}</strong>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                Active: <strong className="text-emerald-700 dark:text-emerald-400">{activeStudents}</strong>
                {inactiveStudents > 0 && (
                  <>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                    Inactive: <strong className="text-slate-500">{inactiveStudents}</strong>
                  </>
                )}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Eye Icon: Toggle All Numbers */}
          <button
            id="toggle-all-stats-btn"
            type="button"
            onClick={toggleAllCardsReveal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
            title={areAllCardsRevealed ? 'Hide numbers on all cards' : 'Show numbers on all cards'}
          >
            {areAllCardsRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Hide All Stats</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Show All Stats</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* EXACT 4 MAIN CARDS GRID (WITH EMBEDDED SUB-CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        
        {/* ============================================================ */}
        {/* CARD 1: SET 1 (Active Students, Actual Collection, Committed Collection, Concession) */}
        {/* ============================================================ */}
        <div
          id="card-set-1"
          onClick={() => toggleCardReveal('set1')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer select-none"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  SET 1: Enrollment & Fees
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => toggleCardReveal('set1', e)}
                className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                title={isCardRevealed('set1') ? 'Hide SET 1 stats' : 'Show SET 1 stats'}
              >
                {isCardRevealed('set1') ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 4 Sub-Items */}
            <div className="space-y-2.5">
              {/* 1) Active Students */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                  <span>1. Active Students</span>
                  <span className="text-[10px] text-slate-500">
                    Total: {isCardRevealed('set1') ? totalStudents : '••'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {isCardRevealed('set1') ? activeStudents : <span className="text-slate-400 font-normal text-sm">••••••</span>}
                  </div>
                  {inactiveStudents > 0 && (
                    <span className="text-[10px] font-medium text-slate-500">
                      Inactive: {isCardRevealed('set1') ? inactiveStudents : '•'}
                    </span>
                  )}
                </div>
              </div>

              {/* 2) Actual Collection (Standard Class Fee Baseline) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                  <span>2. Actual Collection</span>
                  <span className="text-[10px] font-medium text-slate-500">Standard Rate</span>
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                  {isCardRevealed('set1') ? (
                    formatCurrency(actualStandardFeeSum, currencySymbol)
                  ) : (
                    <span className="text-slate-400 font-normal text-sm">••••••</span>
                  )}
                </div>
              </div>

              {/* 3) Committed Collection */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                  <span>3. Committed Collection</span>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Agreed Fees</span>
                </div>
                <div className="text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                  {isCardRevealed('set1') ? (
                    formatCurrency(totalCommittedRevenue, currencySymbol)
                  ) : (
                    <span className="text-blue-400/60 font-normal text-sm">••••••</span>
                  )}
                </div>
              </div>

              {/* 4) Concession */}
              <div className="bg-purple-50/70 dark:bg-purple-950/30 rounded-lg p-2 border border-purple-100 dark:border-purple-900/40">
                <div className="flex items-center justify-between text-[11px] font-semibold text-purple-800 dark:text-purple-300 mb-0.5">
                  <span>4. Concession</span>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    {isCardRevealed('set1') ? `${concessionStudentsCount} stds` : '••'}
                  </span>
                </div>
                <div className="text-base font-black text-purple-700 dark:text-purple-400 font-mono">
                  {isCardRevealed('set1') ? (
                    formatCurrency(totalConcessionGiven, currencySymbol)
                  ) : (
                    <span className="text-purple-400/60 font-normal text-sm">••••••</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 2: SET 2 (Total Collected, Total Due) */}
        {/* ============================================================ */}
        <div
          id="card-set-2"
          onClick={() => toggleCardReveal('set2')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer select-none"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  SET 2: Realized & Due
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => toggleCardReveal('set2', e)}
                className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                title={isCardRevealed('set2') ? 'Hide SET 2 stats' : 'Show SET 2 stats'}
              >
                {isCardRevealed('set2') ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 2 Sub-Items */}
            <div className="space-y-3">
              {/* 1) Total Collected */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg p-3 border border-emerald-200 dark:border-emerald-900/60">
                <div className="flex items-center justify-between text-[11.5px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  <span>1. Total Collected</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-200/70 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-mono">
                    {isCardRevealed('set2') ? `${collectionEfficiencyPercent}% Eff.` : '••%'}
                  </span>
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight mb-2">
                  {isCardRevealed('set2') ? (
                    formatCurrency(totalCollectedTillDate, currencySymbol)
                  ) : (
                    <span className="text-emerald-400/60 font-normal text-base">••••••••</span>
                  )}
                </div>
                
                {/* Cash vs UPI Breakdown */}
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 grid grid-cols-2 gap-1 text-[10.5px] font-mono text-emerald-800 dark:text-emerald-300">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Cash: </span>
                    <strong className="font-bold">{isCardRevealed('set2') ? formatCurrency(totalCashCollected, currencySymbol) : '••'}</strong>
                    {isCardRevealed('set2') && <span className="text-[9.5px] text-slate-500 block">({allTimeCashPct}%)</span>}
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">UPI: </span>
                    <strong className="font-bold">{isCardRevealed('set2') ? formatCurrency(totalUpiCollected, currencySymbol) : '••'}</strong>
                    {isCardRevealed('set2') && <span className="text-[9.5px] text-slate-500 block">({allTimeUpiPct}%)</span>}
                  </div>
                </div>
              </div>

              {/* 2) Total Due */}
              <div className="bg-rose-50/80 dark:bg-rose-950/40 rounded-lg p-3 border border-rose-200 dark:border-rose-900/60">
                <div className="flex items-center justify-between text-[11.5px] font-bold text-rose-800 dark:text-rose-300 mb-1">
                  <span>2. Total Due</span>
                  <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                    All Cycles
                  </span>
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight mb-1">
                  {isCardRevealed('set2') ? (
                    formatCurrency(totalOverallDue, currencySymbol)
                  ) : (
                    <span className="text-rose-400/60 font-normal text-base">••••••••</span>
                  )}
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Receipts Issued:</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {isCardRevealed('set2') ? `${totalTransactionsCount} txns` : '••'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 3: SET 3 (Payable till date, Due Till date, Todays collection target / Run-Rate) */}
        {/* ============================================================ */}
        <div
          id="card-set-3"
          onClick={() => toggleCardReveal('set3')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer select-none"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  SET 3: Period Dues & Target
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => toggleCardReveal('set3', e)}
                className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                title={isCardRevealed('set3') ? 'Hide SET 3 stats' : 'Show SET 3 stats'}
              >
                {isCardRevealed('set3') ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 3 Sub-Items */}
            <div className="space-y-2.5">
              {/* 1) Payable till date */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                  <span>1. Payable Till Date</span>
                  <span className="text-[10px] text-slate-500">Matured Installments</span>
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                  {isCardRevealed('set3') ? (
                    formatCurrency(totalExpectedTillDate, currencySymbol)
                  ) : (
                    <span className="text-slate-400 font-normal text-sm">••••••</span>
                  )}
                </div>
              </div>

              {/* 2) Due Till date */}
              <div className="bg-rose-50/70 dark:bg-rose-950/30 rounded-lg p-2 border border-rose-100 dark:border-rose-900/40">
                <div className="flex items-center justify-between text-[11px] font-semibold text-rose-800 dark:text-rose-300 mb-0.5">
                  <span>2. Due Till Date</span>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">Overdue Deficit</span>
                </div>
                <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                  {isCardRevealed('set3') ? (
                    formatCurrency(totalOverdueDeficitTillDate, currencySymbol)
                  ) : (
                    <span className="text-rose-400/60 font-normal text-sm">••••••</span>
                  )}
                </div>
              </div>

              {/* 3) Todays collection target (Run-Rate Features) */}
              <div className="bg-slate-900 text-white rounded-lg p-2.5 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    3. Today's Target (Run-Rate)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {dailyTargetRunRate.daysRemainingInCycle}d left
                  </span>
                </div>
                <div className="text-base font-black text-amber-300 font-mono tracking-tight">
                  {isCardRevealed('set3') ? (
                    <>
                      {formatCurrency(dailyTargetRunRate.targetDailyAmount, currencySymbol)}
                      <span className="text-[10px] font-normal text-slate-400">/day</span>
                    </>
                  ) : (
                    <span className="text-amber-400/60 font-normal text-sm">••••••</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-300 mt-1.5 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>Today's Recv: <strong>{isCardRevealed('set3') ? formatCurrency(todayCollection, currencySymbol) : '••'}</strong></span>
                  <span>Goal: <strong>{isCardRevealed('set3') ? `~${dailyTargetRunRate.suggestedStudentsPerDay} stds/d` : '••'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 4: SET 4 (Headwise report in small table type) */}
        {/* ============================================================ */}
        <div
          id="card-set-4"
          onClick={() => toggleCardReveal('set4')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer select-none"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <div className="flex items-center gap-1.5">
                <Table className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  SET 4: Headwise Report
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => toggleCardReveal('set4', e)}
                className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors"
                title={isCardRevealed('set4') ? 'Hide SET 4 stats' : 'Show SET 4 stats'}
              >
                {isCardRevealed('set4') ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Small Table Type View */}
            <div className="overflow-x-auto overflow-y-auto max-h-[220px] rounded-lg border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-[10.5px]">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-1 px-1.5">Head</th>
                    <th className="py-1 px-1.5 text-right">Collectable</th>
                    <th className="py-1 px-1.5 text-right text-rose-600 dark:text-rose-400">Due Till Date</th>
                    <th className="py-1 px-1.5 text-right">Total Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {headWiseBifurcation.map((head) => (
                    <tr key={head.headName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-1.5 px-1.5 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        {getHeadIcon(head.headName)}
                        <span className="truncate max-w-[70px] sm:max-w-[85px]" title={head.headName}>
                          {head.headName.replace('Fee', '').trim()}
                        </span>
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {isCardRevealed('set4') ? formatCurrency(head.totalCommitted, currencySymbol) : '••'}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">
                        {isCardRevealed('set4') ? formatCurrency(head.totalDueTillDate, currencySymbol) : '••'}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {isCardRevealed('set4') ? formatCurrency(head.totalBalanceDue, currencySymbol) : '••'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mini Summary Footer */}
            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              <span>{headWiseBifurcation.length} Fee Heads active</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                {isCardRevealed('set4') ? `${collectionEfficiencyPercent}% Collected` : '••% Collected'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Accountant Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3">
        {/* Row 1: Workflow Tiers & Class Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mr-1">
              Workflow Tiers:
            </span>

            <button
              id="tab-all-actions"
              type="button"
              onClick={() => onSelectActionFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedActionFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All Active ({activeStudents})
            </button>

            <button
              id="tab-id-card"
              type="button"
              onClick={() => onSelectActionFilter('ID_CARD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedActionFilter === 'ID_CARD'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>ID Card ({actionTierCounts.idCardEligible})</span>
            </button>

            <button
              id="tab-permission-slips"
              type="button"
              onClick={() => onSelectActionFilter('PERMISSION_SLIP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedActionFilter === 'PERMISSION_SLIP'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Permission Slip ({actionTierCounts.onPermission})</span>
            </button>

            <button
              id="tab-action-required"
              type="button"
              onClick={() => onSelectActionFilter('ACTION_REQUIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedActionFilter === 'ACTION_REQUIRED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Action ({actionTierCounts.actionRequired})</span>
            </button>
          </div>

          {/* Class Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Class:</span>
            <select
              id="select-class-filter"
              value={selectedClassFilter}
              onChange={(e) => onSelectClassFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Classes ({classList.length})</option>
              {sortClassList(classList).map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: 5-Color Fee Health Status Badges Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">
            Status Breakdown:
          </span>

          {/* 1. Fully Cleared (Strong Green) */}
          <button
            id="filter-strong-green"
            type="button"
            onClick={() => onSelectStatusFilter(selectedStatusFilter === 'STRONG_GREEN' ? 'ALL' : 'STRONG_GREEN')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedStatusFilter === 'STRONG_GREEN'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Cleared (0 Due): <strong>{categoryCounts.strongGreen}</strong></span>
          </button>

          {/* 2. Within Tolerance (Light Green) */}
          <button
            id="filter-light-green"
            type="button"
            onClick={() => onSelectStatusFilter(selectedStatusFilter === 'LIGHT_GREEN' ? 'ALL' : 'LIGHT_GREEN')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedStatusFilter === 'LIGHT_GREEN'
                ? 'bg-green-600 text-white border-green-600 shadow-xs'
                : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>Within Tolerance: <strong>{categoryCounts.lightGreen}</strong></span>
          </button>

          {/* 3. Paid but Deficit (Light Yellow) */}
          <button
            id="filter-light-yellow"
            type="button"
            onClick={() => onSelectStatusFilter(selectedStatusFilter === 'LIGHT_YELLOW' ? 'ALL' : 'LIGHT_YELLOW')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedStatusFilter === 'LIGHT_YELLOW'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Partial Deficit: <strong>{categoryCounts.lightYellow}</strong></span>
          </button>

          {/* 4. Committed No Payment (Light Red) */}
          <button
            id="filter-light-red"
            type="button"
            onClick={() => onSelectStatusFilter(selectedStatusFilter === 'LIGHT_RED' ? 'ALL' : 'LIGHT_RED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedStatusFilter === 'LIGHT_RED'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Committed Unpaid: <strong>{categoryCounts.lightRed}</strong></span>
          </button>

          {/* 5. Uncommitted Fee (Strong Red) */}
          {categoryCounts.strongRed > 0 && (
            <button
              id="filter-strong-red"
              type="button"
              onClick={() => onSelectStatusFilter(selectedStatusFilter === 'STRONG_RED' ? 'ALL' : 'STRONG_RED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedStatusFilter === 'STRONG_RED'
                  ? 'bg-red-700 text-white border-red-700 shadow-xs'
                  : 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              <span>Fee Not Mapped: <strong>{categoryCounts.strongRed}</strong></span>
            </button>
          )}

          {/* Inactive */}
          {inactiveStudents > 0 && (
            <button
              id="filter-inactive"
              type="button"
              onClick={() => onSelectStatusFilter(selectedStatusFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedStatusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span>Inactive: <strong>{inactiveStudents}</strong></span>
            </button>
          )}

          {selectedStatusFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectStatusFilter('ALL')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-auto cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
