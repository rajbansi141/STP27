'use client';

import React, { useSyncExternalStore, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    mql.removeEventListener('change', callback);
  };
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const isDarkStored = localStorage.getItem('stp_theme') === 'dark';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDarkStored || (!('stp_theme' in localStorage) && prefersDark);
}

function getServerSnapshot(): boolean {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    const nextDark = !isDark;
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('stp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('stp_theme', 'light');
    }
    window.dispatchEvent(new Event('storage'));
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-all shadow-xs"
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-stone-600" />}
    </button>
  );
}
