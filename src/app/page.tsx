import Link from 'next/link';
import { getServerTranslations } from '@/lib/i18n/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getApplicationDeadlineStatus } from '@/lib/application/deadline';
import { CountdownHero } from '@/components/landing/CountdownHero';
import { StickyCountdownBar } from '@/components/landing/StickyCountdownBar';
import prisma from '@/lib/prisma';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Calendar,
  Users2,
  Lock,
  Compass,
  Award,
  BookOpen,
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

  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Sticky Countdown Bar on Scroll */}
      <StickyCountdownBar deadlineIso={deadlineStatus.deadlineIso} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-stone-200/80 dark:border-stone-800/80 bg-gradient-to-b from-stone-50 via-stone-100/60 to-white dark:from-stone-950 dark:via-stone-900/60 dark:to-stone-950">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{deadlineStatus.cycleLabel}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-stone-900 dark:text-stone-50 tracking-tight leading-tight">
            {locale === 'ne'
              ? 'ग्रामीण नेपालका बालबालिकाका लागि उत्कृष्ट शिक्षक बन्नुहोस्'
              : 'Inspire Rural Classrooms. Become a Saathi Teacher.'}
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
            {locale === 'ne'
              ? 'साथी शिक्षक कार्यक्रम २०२७ ले नेपालका सामुदायिक विद्यालयहरूमा शैक्षिक रूपान्तरण ल्याउन प्रतिबद्ध, ऊर्जावान र दक्ष युवाहरूलाई २ वर्षे पूर्णकालीन फेलोसिपका लागि आमन्त्रण गर्दछ।'
              : 'Saathi Teachers Programme (STP) 2027 invites dedicated, passionate university graduates to transform community education across rural Nepal through an intensive 2-year teaching fellowship.'}
          </p>

          {/* Large Live Countdown in the most visible spot */}
          <div className="pt-2">
            <CountdownHero deadlineIso={deadlineStatus.deadlineIso} />
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {deadlineStatus.isOpen ? (
              user ? (
                existingApp?.status === 'SUBMITTED' ? (
                  <Link
                    href={`/apply/confirmation?ref=${existingApp.refNo}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-md transition-all hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {locale === 'ne'
                        ? `पेश गरिएको आवेदन हेर्नुहोस् (${existingApp.refNo})`
                        : `View Submitted Application (${existingApp.refNo})`}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all hover:scale-[1.02]"
                  >
                    <span>{existingApp ? t.landing.resumeCta : t.landing.applyNowCta}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )
              ) : (
                <>
                  <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all hover:scale-[1.02]"
                  >
                    <span>{t.landing.applyNowCta}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login?returnUrl=/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-sm shadow-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    <Lock className="h-4 w-4 text-stone-500" />
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

      {/* Who Can Apply? (7 Criteria) */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="text-center space-y-2 mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <Compass className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'योग्यता मापदण्ड' : 'Eligibility Criteria'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-stone-900 dark:text-stone-100">
            {t.landing.whoCanApplyTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            {t.landing.whoCanApplySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {t.landing.criteria.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex items-start gap-3.5 hover:border-emerald-600/50 transition-all"
            >
              <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                {item}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Should You Apply? (6 Benefits) */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/40 dark:bg-stone-900/20">
        <div className="text-center space-y-2 mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <Award className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'फेलोसिपका मुख्य लाभहरू' : 'Fellowship Impact & Growth'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-stone-900 dark:text-stone-100">
            {t.landing.whyApplyTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            {t.landing.whyApplySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {t.landing.benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  ★
                </div>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                  {benefit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Instructions & Selection Process */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
          {/* Application Instructions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-xl font-heading font-bold text-stone-900 dark:text-stone-100">
                {t.landing.instructionsTitle}
              </h3>
            </div>
            <ul className="space-y-3">
              {t.landing.instructions.map((inst, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{inst}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Selection Process Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-xl font-heading font-bold text-stone-900 dark:text-stone-100">
                {t.landing.processTitle}
              </h3>
            </div>
            <div className="space-y-3">
              {t.landing.processSteps.map((step, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-start gap-3"
                >
                  <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {step.title}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recruitment Stages from Database */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-stone-200/80 dark:border-stone-800/80">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-stone-900 dark:text-stone-100">
            {locale === 'ne' ? 'छनोट चरणहरू' : 'Configurable Selection Stages'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            {locale === 'ne'
              ? 'प्रशासकद्वारा व्यवस्थित पारदर्शी तथा बहुस्तरीय मूल्याङ्कन'
              : 'Admin-governed multi-stage evaluation pipeline'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex items-start gap-3.5"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200 dark:border-emerald-800">
                {stage.order}
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  {stage.nameEn}
                </h3>
                <p className="text-xs font-devanagari text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                  {stage.nameNe}
                </p>
                <span className="inline-block mt-2 font-mono text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                  {stage.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
