import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getServerTranslations } from '@/lib/i18n/server';
import { ChangePasswordForm } from './ChangePasswordForm';

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // If user doesn't need to change password, send to dashboard
  if (!user.mustChangePassword) {
    redirect('/dashboard');
  }

  const { t } = await getServerTranslations();

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stone-50/50 dark:bg-stone-950/50">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 mb-3 shadow-xs">
              🛡️
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                {user.role}: {user.name} ({user.email})
              </span>
            </div>
            <h1 className="text-2xl font-bold font-heading text-stone-900 dark:text-stone-50">
              {t.auth.changePasswordTitle}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              {t.auth.changePasswordDesc}
            </p>
          </div>

          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
