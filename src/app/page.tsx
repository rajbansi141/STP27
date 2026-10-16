import Link from 'next/link';
import Image from 'next/image';
import { getServerTranslations } from '@/lib/i18n/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getApplicationDeadlineStatus } from '@/lib/application/deadline';
import { CountdownHero } from '@/components/landing/CountdownHero';
import { StickyCountdownBar } from '@/components/landing/StickyCountdownBar';
import { HomeMissionSections } from '@/components/landing/HomeMissionSections';
import prisma from '@/lib/prisma';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Compass,
} from 'lucide-react';

export default async function HomePage() {
  const { t, locale } = await getServerTranslations();
  const user = await getCurrentUser();
  const deadlineStatus = await getApplicationDeadlineStatus();

  // Check if applicant already has an application
  let existingApp = null;
  if (user && user.role === 'APPLICANT') {
    existingApp = await prisma.application.findFirst({
      where: { applicantId: user.id, year: deadlineStatus.cohortYear },
    });
  }

  return (
    <div className="flex-1 flex flex-col relative bg-stone-50/50 dark:bg-stone-950">
      {/* Sticky Countdown Bar on Scroll */}
      <StickyCountdownBar deadlineIso={deadlineStatus.deadlineIso} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-stone-200/80 dark:border-stone-800/80 bg-gradient-to-b from-stone-50 via-stone-100/50 to-white dark:from-stone-950 dark:via-stone-900/60 dark:to-stone-950">
        <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
          {/* Logo & Cohort Badge */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-md">
              <Image
                src="/saathi-logo.png"
                alt="Saathi Teachers Programme Logo"
                width={190}
                height={64}
                className="h-12 sm:h-16 w-auto object-contain dark:brightness-110"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{deadlineStatus.cycleLabel || 'Saathi Teachers Programme 2027'}</span>
            </div>
          </div>

          {/* Primary Must Not Be Secondary */}
          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-black text-stone-900 dark:text-stone-50 tracking-tight leading-tight">
            Primary Must Not Be Secondary
          </h1>

          {/* Foundational Vision Statement */}
          <p className="max-w-3xl mx-auto text-base sm:text-xl text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
            A Nepal where, through strengthened primary education, all children complete a strong
            foundational education and grow into empowered citizens capable of contributing to an
            equitable global society.
          </p>

          {/* Live Countdown in Most Visible Hero Spot */}
          <div className="pt-2">
            <CountdownHero deadlineIso={deadlineStatus.deadlineIso} />
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {deadlineStatus.isOpen ? (
              user ? (
                existingApp && existingApp.status !== 'DRAFT' ? (
                  <Link
                    href={`/apply/confirmation?ref=${existingApp.refNo}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>View Submitted Application ({existingApp.refNo})</span>
                  </Link>
                ) : (
                  <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-base shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02]"
                  >
                    <span>Become A Saathi Teacher</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )
              ) : (
                <>
                  <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-base shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02]"
                  >
                    <span>Become A Saathi Teacher</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-sm shadow-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    <Compass className="h-4 w-4 text-emerald-600" />
                    <span>Check Your Eligibility</span>
                  </Link>
                  <Link
                    href="/login?returnUrl=/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-transparent border border-transparent text-stone-600 dark:text-stone-400 font-semibold text-sm hover:text-stone-900 dark:hover:text-stone-100 transition-all"
                  >
                    <Lock className="h-4 w-4 text-stone-400" />
                    <span>{t.landing.loginToApply}</span>
                  </Link>
                </>
              )
            ) : (
              <div className="p-3.5 px-6 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold text-sm">
                {t.landing.closedTitle}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Beautiful Animated Mission & Impact Sections */}
      <HomeMissionSections
        isDeadlineOpen={deadlineStatus.isOpen}
        userRole={user?.role}
        existingAppRef={existingApp?.refNo}
      />
    </div>
  );
}
