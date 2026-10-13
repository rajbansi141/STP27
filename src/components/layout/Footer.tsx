'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Heart } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();
  const { t, locale } = useI18n();

  // Hide on all dashboard routes
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reviewer') ||
    pathname.startsWith('/applicant') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/review')
  ) {
    return null;
  }

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/40 text-stone-600 dark:text-stone-400 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <span className="font-semibold text-stone-800 dark:text-stone-200">
            {t?.common?.appName || 'Saathi Teachers Programme 2027'}
          </span>
          <span className="hidden sm:inline">•</span>
          <span>
            {locale === 'ne'
              ? 'नेपालका दुर्गम विद्यालयहरूमा शैक्षिक गुणस्तर अभिवृद्धिका लागि समर्पित शिक्षक फेलोसिप।'
              : 'Dedicated teaching fellowship fostering quality education in rural community schools of Nepal.'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
          <span>{locale === 'ne' ? 'शिक्षाका लागि समर्पित' : 'Committed to Education in Nepal'}</span>
          <Heart className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
          <span>© 2026-2027</span>
        </div>
      </div>
    </footer>
  );
}
