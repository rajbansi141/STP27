import Link from 'next/link';
import { getServerTranslations } from '@/lib/i18n/server';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default async function ForgotPasswordPage() {
  const { t } = await getServerTranslations();

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stone-50/50 dark:bg-stone-950/50">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-heading text-stone-900 dark:text-stone-50">
              {t.auth.forgotTitle}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              {t.auth.forgotDesc}
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800 text-center">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              ← {t.auth.backToLogin}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
