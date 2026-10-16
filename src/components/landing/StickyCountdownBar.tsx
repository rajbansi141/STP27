'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { toNepaliDigits } from '@/lib/i18n/translations';
import { Clock, ArrowRight } from 'lucide-react';

interface StickyCountdownBarProps {
  deadlineIso: string;
}

export function StickyCountdownBar({ deadlineIso }: StickyCountdownBarProps) {
  const { t, locale } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar once scrolled 320px past the hero
      if (window.scrollY > 320) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  if (!isVisible) return null;

  const formatDigit = (num: number) => {
    const str = String(num).padStart(2, '0');
    return locale === 'ne' ? toNepaliDigits(str) : str;
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-emerald-900/95 text-white backdrop-blur-md border-b border-emerald-700/80 shadow-lg transition-transform duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-medium truncate">
          <Clock className="h-4 w-4 text-emerald-300 shrink-0" />
          <span className="hidden sm:inline font-semibold">
            {timeLeft.isExpired ? t.landing.closedTitle : t.landing.deadlineLabel}:
          </span>
          {!timeLeft.isExpired ? (
            <div className="flex items-center gap-1 font-mono font-bold text-emerald-200">
              <span>{formatDigit(timeLeft.days)}d</span>
              <span>:</span>
              <span>{formatDigit(timeLeft.hours)}h</span>
              <span>:</span>
              <span>{formatDigit(timeLeft.minutes)}m</span>
              <span>:</span>
              <span className="text-amber-300">{formatDigit(timeLeft.seconds)}s</span>
            </div>
          ) : (
            <span className="text-amber-300 font-bold">{t.landing.closedTitle}</span>
          )}
        </div>

        <div>
          {!timeLeft.isExpired ? (
            <Link
              href="/apply"
              className="inline-flex items-center gap-1 px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-colors shadow-xs"
            >
              <span>{t?.nav?.applyNow || 'Become A Saathi Teacher'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-stone-300 italic">{t.landing.closedTitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
