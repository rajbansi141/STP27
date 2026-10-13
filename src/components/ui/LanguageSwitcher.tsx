'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES } from '@/lib/i18n/config';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale, isPending } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 p-1 shadow-xs text-xs font-medium">
      <Globe className="h-3.5 w-3.5 ml-1.5 text-stone-500 dark:text-stone-400" />
      {LOCALES.map((l) => {
        const isActive = locale === l;
        return (
          <button
            key={l}
            type="button"
            disabled={isPending}
            onClick={() => setLocale(l)}
            className={`px-2.5 py-1 rounded-full transition-all duration-150 ${
              isActive
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {l === 'en' ? 'EN' : 'नेपाली'}
          </button>
        );
      })}
    </div>
  );
}
