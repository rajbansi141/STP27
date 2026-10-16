'use client';

import React, { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Clock, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { toNepaliDigits } from '@/lib/i18n/translations';
import { motion } from 'framer-motion';

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
      <div className="max-w-xl mx-auto p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-center shadow-lg space-y-1.5">
        <div className="flex items-center justify-center gap-2 text-base font-bold text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <span>{t.landing.closedTitle}</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t.landing.closedSubtitle}
        </p>
      </div>
    );
  }

  const deadlineFormatted = new Date(deadlineIso).toLocaleDateString(
    locale === 'ne' ? 'ne-NP' : 'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-2xl mx-auto w-full"
    >
      {/* Outer Eye-Catchy Radiant Ambient Glow Wrapper */}
      <div className="relative p-0.5 rounded-3xl bg-gradient-to-r from-emerald-500/30 via-amber-500/25 to-teal-500/30 shadow-2xl">
        <div className="rounded-[22px] p-5 sm:p-7 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/70 dark:border-stone-800 space-y-4">
          {/* Header Row with Active Pulse and Deadline Date */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                {locale === 'ne' ? 'आवेदनको अन्तिम म्याद बाँकी समय' : 'Cohort 2027 Application Countdown'}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
              <Calendar className="h-3 w-3 text-emerald-600" />
              <span>{deadlineFormatted}</span>
            </div>
          </div>

          {/* Eye-Catchy Large Digits Display */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 text-center">
            {/* Days */}
            <div className="relative group p-3 sm:p-5 rounded-2xl bg-stone-50/90 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700/80 shadow-xs hover:border-emerald-500/40 transition-all">
              <div className="font-heading font-black text-3xl sm:text-5xl text-stone-900 dark:text-stone-100 tracking-tight">
                {formatDigit(timeLeft.days)}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase text-stone-500 dark:text-stone-400 tracking-wider mt-1.5">
                {t.landing.days}
              </div>
            </div>

            {/* Hours */}
            <div className="relative group p-3 sm:p-5 rounded-2xl bg-stone-50/90 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700/80 shadow-xs hover:border-emerald-500/40 transition-all">
              <div className="font-heading font-black text-3xl sm:text-5xl text-stone-900 dark:text-stone-100 tracking-tight">
                {formatDigit(timeLeft.hours)}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase text-stone-500 dark:text-stone-400 tracking-wider mt-1.5">
                {t.landing.hours}
              </div>
            </div>

            {/* Minutes */}
            <div className="relative group p-3 sm:p-5 rounded-2xl bg-stone-50/90 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700/80 shadow-xs hover:border-emerald-500/40 transition-all">
              <div className="font-heading font-black text-3xl sm:text-5xl text-stone-900 dark:text-stone-100 tracking-tight">
                {formatDigit(timeLeft.minutes)}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase text-stone-500 dark:text-stone-400 tracking-wider mt-1.5">
                {t.landing.minutes}
              </div>
            </div>

            {/* Seconds (Glowing Accent Unit) */}
            <div className="relative group p-3 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 shadow-xs hover:border-emerald-500 transition-all">
              <div className="font-heading font-black text-3xl sm:text-5xl text-emerald-700 dark:text-emerald-300 tracking-tight">
                {formatDigit(timeLeft.seconds)}
              </div>
              <div className="text-[10px] sm:text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider mt-1.5">
                {t.landing.seconds}
              </div>
            </div>
          </div>

          {/* Urgency Helper Note */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
              <span>{locale === 'ne' ? 'आफ्नो समयमै फारम पेश गर्नुहोस्' : 'Applications are evaluated on a rolling review basis'}</span>
            </span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400 hidden sm:inline">
              {locale === 'ne' ? 'स्वत: बचत सुरक्षित छ' : 'Auto-save enabled'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
