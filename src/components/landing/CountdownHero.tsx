'use client';

import React, { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Clock, AlertCircle } from 'lucide-react';
import { toNepaliDigits } from '@/lib/i18n/translations';

interface CountdownHeroProps {
  deadlineIso: string;
}

export function CountdownHero({ deadlineIso }: CountdownHeroProps) {
  const { t, locale } = useI18n();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const target = new Date(deadlineIso).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [deadlineIso]);

  const formatDigit = (num: number) => {
    const str = String(num).padStart(2, '0');
    return locale === 'ne' ? toNepaliDigits(str) : str;
  };

  if (timeLeft.isExpired) {
    return (
      <div className="max-w-xl mx-auto p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-center shadow-md space-y-1">
        <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <span>{t.landing.closedTitle}</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t.landing.closedSubtitle}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl p-4 sm:p-6 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-800/60 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span>{t.landing.deadlineLabel}</span>
          </span>
          <span className="text-[11px] font-mono text-stone-500">
            {new Date(deadlineIso).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Live Large Countdown Cards */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
          <div className="p-3 sm:p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700">
            <div className="font-heading font-black text-2xl sm:text-4xl text-emerald-800 dark:text-emerald-300">
              {formatDigit(timeLeft.days)}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold uppercase text-stone-500 tracking-wider mt-1">
              {t.landing.days}
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700">
            <div className="font-heading font-black text-2xl sm:text-4xl text-emerald-800 dark:text-emerald-300">
              {formatDigit(timeLeft.hours)}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold uppercase text-stone-500 tracking-wider mt-1">
              {t.landing.hours}
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700">
            <div className="font-heading font-black text-2xl sm:text-4xl text-emerald-800 dark:text-emerald-300">
              {formatDigit(timeLeft.minutes)}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold uppercase text-stone-500 tracking-wider mt-1">
              {t.landing.minutes}
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60">
            <div className="font-heading font-black text-2xl sm:text-4xl text-emerald-700 dark:text-emerald-400">
              {formatDigit(timeLeft.seconds)}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider mt-1">
              {t.landing.seconds}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
