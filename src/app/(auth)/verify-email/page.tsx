import { getServerTranslations } from '@/lib/i18n/server';
import { VerifyEmailForm } from './VerifyEmailForm';

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string;
  }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { t } = await getServerTranslations();
  const params = await searchParams;

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stone-50/50 dark:bg-stone-950/50">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-heading text-stone-900 dark:text-stone-50">
              {t.auth.verifyTitle}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              {t.auth.verifyDesc}
            </p>
          </div>

          <VerifyEmailForm initialEmail={params.email || ''} />
        </div>
      </div>
    </div>
  );
}
