'use client';

import React, { useState, useRef } from 'react';
import {
  bsToAd,
  adToBs,
  calculateAge,
  formatBsDate,
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  AD_MONTHS_EN,
} from '@/lib/date/nepali-date';

interface ManualDobInputProps {
  value: string; // Stored as YYYY-MM-DD (AD)
  onChange: (adDate: string) => void;
  label?: string;
  required?: boolean;
  locale?: string;
  error?: string;
  className?: string;
}

export function ManualDobInput({
  value,
  onChange,
  label = 'Date of Birth / जन्म मिति',
  required = true,
  locale = 'en',
  error,
  className = '',
}: ManualDobInputProps) {
  const isNe = locale === 'ne';

  // Calendar toggle: 'BS' (Bikram Sambat) or 'AD' (Gregorian)
  const [calendarMode, setCalendarMode] = useState<'BS' | 'AD'>('BS');

  // Input state for BS mode
  const [bsYear, setBsYear] = useState('');
  const [bsMonth, setBsMonth] = useState('');
  const [bsDay, setBsDay] = useState('');

  // Input state for AD mode
  const [adYear, setAdYear] = useState('');
  const [adMonth, setAdMonth] = useState('');
  const [adDay, setAdDay] = useState('');

  // Input refs for automatic tabbing
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  // Sync state during render when value prop changes externally (React 19 pattern)
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setAdYear(y);
      setAdMonth(m);
      setAdDay(d);

      const bs = adToBs(value);
      if (bs) {
        setBsYear(String(bs.year));
        setBsMonth(String(bs.month).padStart(2, '0'));
        setBsDay(String(bs.day).padStart(2, '0'));
      }
    }
  }

  // Mode Toggle
  const handleToggleMode = (newMode: 'BS' | 'AD') => {
    if (newMode === calendarMode) return;
    setCalendarMode(newMode);

    if (newMode === 'AD' && bsYear && bsMonth && bsDay) {
      const y = parseInt(bsYear, 10);
      const m = parseInt(bsMonth, 10);
      const d = parseInt(bsDay, 10);
      if (y >= 2000 && y <= 2090 && m >= 1 && m <= 12 && d >= 1 && d <= 32) {
        const ad = bsToAd({ year: y, month: m, day: d });
        if (ad) {
          const [ay, am, adD] = ad.split('-');
          setAdYear(ay);
          setAdMonth(am);
          setAdDay(adD);
          onChange(ad);
        }
      }
    } else if (newMode === 'BS' && adYear && adMonth && adDay) {
      const y = parseInt(adYear, 10);
      const m = parseInt(adMonth, 10);
      const d = parseInt(adDay, 10);
      if (y >= 1944 && y <= 2033 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const adStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const bs = adToBs(adStr);
        if (bs) {
          setBsYear(String(bs.year));
          setBsMonth(String(bs.month).padStart(2, '0'));
          setBsDay(String(bs.day).padStart(2, '0'));
          onChange(adStr);
        }
      }
    }
  };

  // BS Year
  const handleBsYearChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setBsYear(clean);
    updateFromBs(clean, bsMonth, bsDay);
    if (clean.length === 4) {
      monthRef.current?.focus();
    }
  };

  // BS Month
  const handleBsMonthChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setBsMonth(clean);
    updateFromBs(bsYear, clean, bsDay);
    if (clean.length === 2) {
      dayRef.current?.focus();
    }
  };

  // BS Day
  const handleBsDayChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setBsDay(clean);
    updateFromBs(bsYear, bsMonth, clean);
  };

  const updateFromBs = (yStr: string, mStr: string, dStr: string) => {
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);

    if (y >= 2000 && y <= 2090 && m >= 1 && m <= 12 && d >= 1 && d <= 32) {
      const ad = bsToAd({ year: y, month: m, day: d });
      if (ad) {
        const [ay, am, adD] = ad.split('-');
        setAdYear(ay);
        setAdMonth(am);
        setAdDay(adD);
        onChange(ad);
        return;
      }
    }
    if (!yStr && !mStr && !dStr) {
      onChange('');
    }
  };

  // AD Year
  const handleAdYearChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setAdYear(clean);
    updateFromAd(clean, adMonth, adDay);
    if (clean.length === 4) {
      monthRef.current?.focus();
    }
  };

  // AD Month
  const handleAdMonthChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setAdMonth(clean);
    updateFromAd(adYear, clean, adDay);
    if (clean.length === 2) {
      dayRef.current?.focus();
    }
  };

  // AD Day
  const handleAdDayChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setAdDay(clean);
    updateFromAd(adYear, adMonth, clean);
  };

  const updateFromAd = (yStr: string, mStr: string, dStr: string) => {
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);

    if (y >= 1944 && y <= 2033 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const adStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const bs = adToBs(adStr);
      if (bs) {
        setBsYear(String(bs.year));
        setBsMonth(String(bs.month).padStart(2, '0'));
        setBsDay(String(bs.day).padStart(2, '0'));
        onChange(adStr);
        return;
      }
    }
    if (!yStr && !mStr && !dStr) {
      onChange('');
    }
  };

  // Backspace navigation between boxes
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'month' | 'day',
    currentVal: string
  ) => {
    if (e.key === 'Backspace' && !currentVal) {
      if (field === 'day') {
        monthRef.current?.focus();
      } else if (field === 'month') {
        yearRef.current?.focus();
      }
    }
  };

  // Month label indicator
  const currentMonthNum = calendarMode === 'BS' ? parseInt(bsMonth, 10) : parseInt(adMonth, 10);
  const currentMonthLabel =
    currentMonthNum >= 1 && currentMonthNum <= 12
      ? calendarMode === 'BS'
        ? `${BS_MONTHS_NE[currentMonthNum - 1]} (${BS_MONTHS_EN[currentMonthNum - 1]})`
        : AD_MONTHS_EN[currentMonthNum - 1]
      : null;

  // Real-time conversion feedback
  const bsResult = value ? adToBs(value) : null;
  const age = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? calculateAge(value) : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header: Label & AD/BS Toggle */}
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {/* Minimalist AD / BS Toggle */}
        <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-100 dark:bg-stone-800 text-xs">
          <button
            type="button"
            onClick={() => handleToggleMode('BS')}
            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
              calendarMode === 'BS'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            वि.सं. (BS)
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode('AD')}
            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
              calendarMode === 'AD'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            ई.सं. (AD)
          </button>
        </div>
      </div>

      {/* 3-Box Manual Numeric Inputs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Year */}
        <div>
          <span className="block text-[11px] text-stone-500 dark:text-stone-400 mb-1 font-medium">
            {calendarMode === 'BS' ? 'Year (वर्ष)' : 'Year'}
          </span>
          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder={calendarMode === 'BS' ? '2059' : '2003'}
            value={calendarMode === 'BS' ? bsYear : adYear}
            onChange={(e) =>
              calendarMode === 'BS'
                ? handleBsYearChange(e.target.value)
                : handleAdYearChange(e.target.value)
            }
            className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm font-medium text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none text-center"
          />
        </div>

        {/* Month */}
        <div>
          <span className="block text-[11px] text-stone-500 dark:text-stone-400 mb-1 font-medium">
            {calendarMode === 'BS' ? 'Month (महिना)' : 'Month'}
          </span>
          <input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder={calendarMode === 'BS' ? '09' : '01'}
            value={calendarMode === 'BS' ? bsMonth : adMonth}
            onChange={(e) =>
              calendarMode === 'BS'
                ? handleBsMonthChange(e.target.value)
                : handleAdMonthChange(e.target.value)
            }
            onKeyDown={(e) =>
              handleKeyDown(
                e,
                'month',
                calendarMode === 'BS' ? bsMonth : adMonth
              )
            }
            className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm font-medium text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none text-center"
          />
          {currentMonthLabel && (
            <span className="block text-[10px] text-stone-500 dark:text-stone-400 text-center mt-0.5 truncate">
              {currentMonthLabel}
            </span>
          )}
        </div>

        {/* Day */}
        <div>
          <span className="block text-[11px] text-stone-500 dark:text-stone-400 mb-1 font-medium">
            {calendarMode === 'BS' ? 'Day (गते)' : 'Day'}
          </span>
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder={calendarMode === 'BS' ? '22' : '06'}
            value={calendarMode === 'BS' ? bsDay : adDay}
            onChange={(e) =>
              calendarMode === 'BS'
                ? handleBsDayChange(e.target.value)
                : handleAdDayChange(e.target.value)
            }
            onKeyDown={(e) =>
              handleKeyDown(
                e,
                'day',
                calendarMode === 'BS' ? bsDay : adDay
              )
            }
            className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm font-medium text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none text-center"
          />
        </div>
      </div>

      {/* Clean Single-line Equivalent Date and Age Feedback */}
      {value && /^\d{4}-\d{2}-\d{2}$/.test(value) && (
        <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
          <span>
            {calendarMode === 'BS' ? (
              <>
                ई.सं. (AD): <strong className="text-stone-800 dark:text-stone-200">{value}</strong>
              </>
            ) : bsResult ? (
              <>
                वि.सं. (BS):{' '}
                <strong className="text-stone-800 dark:text-stone-200">
                  {bsResult.year}-{String(bsResult.month).padStart(2, '0')}-{String(bsResult.day).padStart(2, '0')} ({formatBsDate(bsResult, isNe)})
                </strong>
              </>
            ) : null}
          </span>
          {age && (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {age.years} वर्ष / yrs old
            </span>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}
