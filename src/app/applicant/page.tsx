import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import { DeadlineCountdownCard } from '@/components/applicant/DeadlineCountdownCard';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function ApplicantDashboardPage() {
  const currentUser = await requireRole(['APPLICANT', 'ADMIN'], '/applicant');
  const { t, locale } = await getServerTranslations();

  const [settings, application, stages] = await Promise.all([
    prisma.settings.findFirst(),
    prisma.application.findFirst({
      where: { applicantId: currentUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        histories: {
          orderBy: { at: 'asc' },
        },
      },
    }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
  ]);

  const deadlineISO = settings?.deadline ? settings.deadline.toISOString() : null;
  const applicationData = application?.data as Record<string, any> | null;
  const appliedPosition = applicationData?.position || 'Teacher Fellow';

  return (
    <div className="space-y-6">
      {/* 1. Prominent Live Countdown Card */}
      <DeadlineCountdownCard deadlineDate={deadlineISO} />

      {/* 2. SectionCards: KPI Row (dashboard-01 style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Status */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t?.common?.status || 'Status'}
            </span>
            <FileText className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold">
              {application
                ? application.status === 'SUBMITTED'
                  ? locale === 'ne'
                    ? 'पेश गरिएको'
                    : 'Submitted'
                  : locale === 'ne'
                  ? 'ड्राफ्ट'
                  : 'Draft'
                : locale === 'ne'
                ? 'सुरु गरिएको छैन'
                : 'Not Started'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {application?.refNo ? `Ref: ${application.refNo}` : 'STP 2027 Cohort'}
          </p>
        </div>

        {/* Card 2: Current Stage */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'हालको चरण' : 'Current Stage'}
            </span>
            <Clock className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold font-mono">
              {application ? application.stage : 'APPLICATION'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === 'ne' ? 'छनोट पाइपलाइन' : 'Selection Pipeline'}
          </p>
        </div>

        {/* Card 3: Position Applied */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'लक्षित पद' : 'Position'}
            </span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold truncate block">
              {appliedPosition}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === 'ne' ? 'सामुदायिक विद्यालय' : 'Community Schools'}
          </p>
        </div>

        {/* Card 4: Submission Date */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'मिति' : 'Submitted On'}
            </span>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold">
              {application?.submittedAt
                ? new Date(application.submittedAt).toLocaleDateString()
                : '—'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {application?.submittedAt ? 'Official record' : 'Awaiting submission'}
          </p>
        </div>
      </div>

      {/* 3. Main Action Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-card to-muted/40 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>STP 2027 Fellow Application</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              {application?.status === 'SUBMITTED'
                ? locale === 'ne'
                  ? 'तपाईंको आवेदन सफलतापूर्वक पेश भइसकेको छ'
                  : 'Your Application Has Been Submitted'
                : locale === 'ne'
                ? 'आवेदन फारम पूरा गर्नुहोस्'
                : 'Complete Your Application'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {application?.status === 'SUBMITTED'
                ? locale === 'ne'
                  ? 'तपाईंको आवेदन छनोट समितिद्वारा मूल्याङ्कनको चरणमा छ। नतिजा तथा अद्यावधिकहरू यही पोर्टलमा प्रकाशित हुनेछन्।'
                  : 'Your application is actively under review by the Selection Committee. Status updates will appear here.'
                : locale === 'ne'
                ? 'कृपया अन्तिम म्याद अगावै आफ्नो व्यक्तिगत विवरण, शैक्षिक योग्यता तथा निबन्ध पूरा गरी पेश गर्नुहोस्।'
                : 'Please complete all sections including personal info, academic credentials, and personal statement before the deadline.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {application?.status === 'SUBMITTED' ? (
              <>
                <Link
                  href="/applicant/application"
                  className={buttonVariants({ variant: 'outline' })}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {locale === 'ne' ? 'आवेदन हेर्नुहोस्' : 'View Application'}
                </Link>
                <Link
                  href="/applicant/downloads"
                  className={buttonVariants({ variant: 'secondary' })}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {locale === 'ne' ? 'PDF डाउनलोड' : 'Download PDF'}
                </Link>
              </>
            ) : (
              <Link
                href="/apply"
                className={buttonVariants({
                  className: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold',
                })}
              >
                {locale === 'ne' ? 'आवेदन जारी राख्नुहोस्' : 'Resume Application'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 4. Stage Progression Flow */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <h4 className="text-base font-semibold">
          {locale === 'ne' ? 'छनोट प्रक्रिया चरणहरू' : 'Selection Pipeline Stages'}
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {stages.map((stage, idx) => {
            const isCompleted =
              application?.histories?.some((h) => h.toStage === stage.code) || false;
            const isCurrent = application?.stage === stage.code;

            return (
              <div
                key={stage.id}
                className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-xs transition-all ${
                  isCurrent
                    ? 'border-emerald-600 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-600'
                    : isCompleted
                    ? 'border-border bg-muted/30'
                    : 'border-dashed border-muted-foreground/30 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-[10px] text-muted-foreground">
                    #{idx + 1}
                  </span>
                  {isCurrent ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                      {locale === 'ne' ? 'हालको' : 'Current'}
                    </Badge>
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : null}
                </div>
                <div className="mt-2 font-medium">
                  {locale === 'ne' ? stage.nameNe : stage.nameEn}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
