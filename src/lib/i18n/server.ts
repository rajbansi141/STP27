import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, type Locale } from './config';
import { translations } from './translations';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Gets the active locale from cookie or user profile on the server
 */
export async function getServerLocale(): Promise<Locale> {
  const user = await getCurrentUser();
  if (user && (user.locale === 'en' || user.locale === 'ne')) {
    return user.locale as Locale;
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale === 'ne' || cookieLocale === 'en') {
    return cookieLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Gets the server-side translation dictionary for the active locale
 */
export async function getServerTranslations() {
  const locale = await getServerLocale();
  return {
    locale,
    t: translations[locale],
  };
}
