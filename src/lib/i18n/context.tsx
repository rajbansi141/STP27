'use client';

import React, { createContext, useContext, useState, useTransition } from 'react';
import type { Locale } from './config';
import { translations, type Translations } from './translations';
import { useRouter } from 'next/navigation';

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (newLocale: Locale) => Promise<void>;
  isPending: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSetLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocaleState(newLocale);

    try {
      await fetch('/api/i18n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error('Failed to persist locale:', err);
    }
  };

  const currentTranslations = translations[locale] || translations.en;

  return (
    <I18nContext.Provider
      value={{
        locale,
        t: currentTranslations,
        setLocale: handleSetLocale,
        isPending,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
