import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { SchoolProfile } from '../types';

interface PasscodeGateProps {
  schoolProfile: SchoolProfile;
  children: React.ReactNode;
}

const REQUIRED_PASSCODE = '5840';
const PASSCODE_STORAGE_KEY = 'sfc_app_passcode_authenticated_v1';

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ schoolProfile, children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(PASSCODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numbers
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next input
    if (cleanValue && index < 3) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // If 4 digits entered, verify
    if (index === 3 && cleanValue) {
      const fullCode = newDigits.join('');
      verifyPasscode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`pin-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'Enter') {
      verifyPasscode(digits.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      if (pasted.length === 4) {
        verifyPasscode(pasted);
      } else {
        const nextInput = document.getElementById(`pin-input-${pasted.length}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const verifyPasscode = (code: string) => {
    if (code === REQUIRED_PASSCODE) {
      try {
        sessionStorage.setItem(PASSCODE_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
      setIsAuthenticated(true);
    } else {
      setIsShaking(true);
      setError('Incorrect Passcode. Please enter the 4-digit code (5840).');
      setTimeout(() => {
        setIsShaking(false);
        setDigits(['', '', '', '']);
        const firstInput = document.getElementById('pin-input-0');
        if (firstInput) firstInput.focus();
      }, 600);
    }
  };

  const handleNumpadClick = (num: string) => {
    const nextEmptyIndex = digits.findIndex((d) => d === '');
    if (nextEmptyIndex !== -1) {
      handleDigitChange(nextEmptyIndex, num);
    }
  };

  const handleNumpadBackspace = () => {
    for (let i = 3; i >= 0; i--) {
      if (digits[i] !== '') {
        const newDigits = [...digits];
        newDigits[i] = '';
        setDigits(newDigits);
        const input = document.getElementById(`pin-input-${i}`);
        if (input) input.focus();
        break;
      }
    }
  };

  // Focus first input on mount
  useEffect(() => {
    if (!isAuthenticated) {
      const firstInput = document.getElementById('pin-input-0');
      if (firstInput) firstInput.focus();
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon and Header */}
        <div className="relative z-10 space-y-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {schoolProfile.schoolName || 'Kakatiya School'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              School Fee Collection System & Financial Ledger
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 my-4">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-semibold mb-3">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Enter Security Passcode to Access</span>
            </div>

            {/* 4-digit PIN Inputs */}
            <div
              className={`flex items-center justify-center gap-3 ${
                isShaking ? 'animate-bounce' : ''
              }`}
            >
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`pin-input-${idx}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-black bg-slate-800 border-2 border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-white outline-none transition-all"
                  autoComplete="off"
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 mt-3 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick On-Screen Numpad for Touch/Mobile */}
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumpadClick(num)}
                className="h-11 bg-slate-700/60 hover:bg-slate-700 active:bg-slate-600 border border-slate-600/50 rounded-xl text-lg font-bold text-white transition-all cursor-pointer shadow-xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDigits(['', '', '', ''])}
              className="h-11 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/40 rounded-xl text-xs font-bold text-slate-400 transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleNumpadClick('0')}
              className="h-11 bg-slate-700/60 hover:bg-slate-700 active:bg-slate-600 border border-slate-600/50 rounded-xl text-lg font-bold text-white transition-all cursor-pointer shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleNumpadBackspace}
              className="h-11 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/40 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {/* Unlock button */}
          <button
            type="button"
            onClick={() => verifyPasscode(digits.join(''))}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Unlock Dashboard</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
