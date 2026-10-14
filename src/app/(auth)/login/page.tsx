import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getServerTranslations } from '@/lib/i18n/server';
import { LoginForm } from './LoginForm';

interface LoginPageProps {
  searchParams: Promise<{
    returnUrl?: string;
    verified?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    if (user.mustChangePassword) {
      redirect('/change-password');
    }
    const target = params.returnUrl && params.returnUrl.startsWith('/') ? params.returnUrl : '/dashboard';
    redirect(target);
  }

  const { t } = await getServerTranslations();

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stone-50/50 dark:bg-stone-950/50">
      <div className="w-full max-w-md space-y-6">
        {params.verified === 'true' && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm">
            {t.auth.verifySuccess}
          </div>
        )}

        <div className="bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center mb-6">
            <Link href="/" className="inline-block transition-transform duration-200 hover:scale-105 mb-2">
              <div className="p-2 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 shadow-xs">
                <Image
                  src="/saathi-logo.png"
                  alt="Saathi Teachers Programme Logo"
                  width={140}
                  height={50}
                  className="h-11 w-auto object-contain dark:brightness-110"
                  priority
                />
              </div>
            </Link>
            <h1 className="text-2xl font-bold font-heading text-stone-900 dark:text-stone-50 mt-1 text-center">
              {t.auth.loginTitle}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400 text-center">
              {t.auth.loginDesc}
            </p>
          </div>

          <LoginForm returnUrl={params.returnUrl} />

          <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800 text-center space-y-3">
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              {t.auth.noAccountPrompt}{' '}
              <Link
                href="/signup"
                className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                {t.auth.signupLink}
              </Link>
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">
              {t.auth.reviewerNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
