import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { ConfirmationCard } from './ConfirmationCard';
import { CheckCircle2, Lock, ArrowLeft, Download, ShieldCheck } from 'lucide-react';

interface ConfirmationPageProps {
  searchParams: Promise<{
    ref?: string;
  }>;
}

export default async function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const user = await requireAuth();
  const { t, locale } = await getServerTranslations();
  const params = await searchParams;

  // Find user's submitted application
  const app = await prisma.application.findFirst({
    where: {
      applicantId: user.id,
      status: 'SUBMITTED',
      ...(params.ref ? { refNo: params.ref } : {}),
    },
    include: {
      applicant: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  if (!app) {
    redirect('/dashboard');
  }

  const appData = app.data ? (typeof app.data === 'string' ? JSON.parse(app.data) : app.data) : {};

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-6">
      {/* Success Hero Card */}
      <div className="bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-6 sm:p-10 shadow-xl text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-xs">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
            {t.apply.confirmation.title}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-lg mx-auto">
            {t.apply.confirmation.notice}
          </p>
        </div>

        {/* Reference Number Display */}
        <ConfirmationCard refNo={app.refNo} />

        {/* Locked Status Banner */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-2 text-xs text-stone-600 dark:text-stone-300">
          <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{t.apply.confirmation.lockedBanner}</span>
        </div>

        {/* Application Metadata & Summary */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-left">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
            <span className="text-stone-500">{t.apply.confirmation.applicantLabel}:</span>
            <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5">{app.applicant.name}</div>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
            <span className="text-stone-500">{t.apply.confirmation.subjectLabel}:</span>
            <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5 capitalize">
              {appData.teachingSubject || 'General'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
            <span className="text-stone-500">{t.apply.confirmation.submittedAtLabel}:</span>
            <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'Just now'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.apply.confirmation.backDashboard}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
