export type Locale = 'en' | 'ne';

export const LOCALES: Locale[] = ['en', 'ne'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'stp_locale';

export const LOCALE_LABELS: Record<Locale, { label: string; nativeName: string }> = {
  en: {
    label: 'English',
    nativeName: 'English',
  },
  ne: {
    label: 'Nepali',
    nativeName: 'नेपाली',
  },
};
