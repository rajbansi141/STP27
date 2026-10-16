import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/rbac';
import { getApplicationDeadlineStatus } from '@/lib/application/deadline';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { ApplicationWizard } from '@/components/apply/ApplicationWizard';
import { AlertCircle, Lock } from 'lucide-react';
import Link from 'next/link';
import { getDefaultDashboardForRole } from '@/config/routes';

export default async function ApplyPage() {
  const user = await requireAuth('/apply');
  const { t, locale } = await getServerTranslations();
  const deadlineStatus = await getApplicationDeadlineStatus();

  // If user is Reviewer or Admin, prevent application submission
  if (user.role !== 'APPLICANT') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-stone-50/50 dark:bg-stone-950/50">
        <div className="max-w-md w-full text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-xl space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            i
          </div>
          <h1 className="text-xl font-bold font-heading text-stone-900 dark:text-stone-100">
            {locale === 'ne' ? 'कर्मचारी वा समीक्षक खाता' : 'Staff / Reviewer Account'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            {locale === 'ne'
              ? 'तपाईं हाल समीक्षा वा प्रशासक खाताबाट लगइन हुनुहुन्छ। केवल आवेदक (Applicant) खाताले आवेदन फारम भर्न सक्छ।'
              : 'You are currently signed in with a Reviewer or Admin account. Only applicant accounts can submit application forms.'}
          </p>
          <div className="pt-2">
            <Link
              href={getDefaultDashboardForRole(user.role)}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors"
            >
              {locale === 'ne' ? 'ड्यासबोर्डमा जानुहोस्' : 'Go to Dashboard'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check deadline
  if (!deadlineStatus.isOpen) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-stone-50/50 dark:bg-stone-950/50">
        <div className="max-w-md w-full text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-xl space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold font-heading text-stone-900 dark:text-stone-100">
            {t.landing.closedTitle}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            {t.landing.closedSubtitle}
          </p>
          <div className="pt-2">
            <Link
              href="/applicant"
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check existing application status for this cycle
  const existingApp = await prisma.application.findFirst({
    where: { applicantId: user.id, year: deadlineStatus.cohortYear },
  });

  // If already submitted (any active post-submission stage), redirect to confirmation
  if (existingApp && existingApp.status !== 'DRAFT') {
    redirect(`/apply/confirmation?ref=${existingApp.refNo}`);
  }

  // Parse draft data if available
  let initialDraft = null;
  if (existingApp?.draftData) {
    try {
      initialDraft = typeof existingApp.draftData === 'string'
        ? JSON.parse(existingApp.draftData)
        : existingApp.draftData;
    } catch {}
  }

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      <ApplicationWizard
        userEmail={user.email}
        userName={user.name}
        initialDraft={initialDraft}
        deadlineIso={deadlineStatus.deadlineIso}
      />
    </div>
  );
}
