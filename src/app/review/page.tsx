import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { ReviewTable, type ApplicationRowItem } from '@/components/review/ReviewTable';
import {
  Users,
  Clock,
  CheckCircle2,
  Award,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  Workflow,
  Lock,
  UserCheck,
} from 'lucide-react';

interface ReviewerPortalPageProps {
  searchParams?: Promise<{
    stage?: string;
  }>;
}

export default async function ReviewerPortalPage({ searchParams }: ReviewerPortalPageProps) {
  // Enforce server-side RBAC: Only REVIEWER or ADMIN
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], '/review');
  const { t, locale } = await getServerTranslations();

  const params = searchParams ? await searchParams : undefined;
  const initialStage = params?.stage || 'ALL';

  // Load configured stages
  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  const availableStages = stages.map((s) => ({
    code: s.code,
    name: locale === 'ne' ? s.nameNe : s.nameEn,
  }));

  // Fetch ALL candidate applications across stages (so reviewers can see cohort directory)
  const allApplications = await prisma.application.findMany({
    where: {
      status: { not: 'DRAFT' },
    },
    include: {
      applicant: true,
      reviews: true,
      assignments: {
        include: { reviewer: true },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  // Calculate Stage Counts for the pipeline stepper
  const stageCounts: Record<string, number> = {};
  allApplications.forEach((app) => {
    stageCounts[app.stage] = (stageCounts[app.stage] || 0) + 1;
  });

  // Reviewer-specific KPIs
  const myAssignedApplications = allApplications.filter((app) =>
    app.assignments.some((a) => a.reviewerId === currentUser.id)
  );

  const totalAssigned = myAssignedApplications.length;
  let completedCount = 0;
  let totalScoreSum = 0;
  let advancedCount = 0;

  myAssignedApplications.forEach((app) => {
    const myReview = app.reviews.find((r) => r.reviewerId === currentUser.id);
    if (myReview) {
      completedCount++;
      if (myReview.totalScore) totalScoreSum += myReview.totalScore;
      if (myReview.recommendation === 'ADVANCE') advancedCount++;
    }
  });

  const pendingCount = totalAssigned - completedCount;
  const avgScore = completedCount > 0 ? (totalScoreSum / completedCount).toFixed(1) : '—';
  const advanceRate = completedCount > 0 ? `${Math.round((advancedCount / completedCount) * 100)}%` : '—';

  // Format table data for TanStack Table
  const tableData: ApplicationRowItem[] = allApplications.map((app) => {
    const parsedData = app.data
      ? typeof app.data === 'string'
        ? JSON.parse(app.data)
        : app.data
      : {};

    const isAssignedToMe =
      currentUser.role === 'ADMIN' ||
      app.assignments.some((a) => a.reviewerId === currentUser.id);

    const myReview = app.reviews.find((r) => r.reviewerId === currentUser.id);

    return {
      id: app.id,
      refNo: app.refNo,
      applicantName: app.applicant.name,
      applicantEmail: app.applicant.email,
      applicantPhone: parsedData.contactNumber || '—',
      degree: `${parsedData.highestLevel || "Bachelor's"} (${parsedData.fieldOfStudy || 'Education'})`,
      subject: parsedData.teachingSubject || 'General',
      stage: app.stage,
      status: app.status,
      submittedAt: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : null,
      isAssignedToMe,
      assignedReviewers: app.assignments.map((a) => ({
        id: a.reviewer.id,
        name: a.reviewer.name,
      })),
      reviewedByCurrentReviewer: Boolean(myReview),
      myScore: myReview?.totalScore || null,
      myRecommendation: myReview?.recommendation || null,
    };
  });

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t.roles[currentUser.role]}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
            {t.reviewer.portalTitle}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl">
            {t.reviewer.portalSubtitle}
          </p>
        </div>

        <div className="text-xs text-right hidden sm:block">
          <span className="text-emerald-200 font-semibold">{currentUser.name}</span>
          <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
            {currentUser.email}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-emerald-100 text-[11px]">
            <UserCheck className="h-3 w-3" />
            <span>{totalAssigned} assigned to you</span>
          </div>
        </div>
      </div>

      {/* Reviewer Personal Workload KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>{t.reviewer.kpis.totalAssigned}</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="font-heading font-black text-2xl text-stone-900 dark:text-stone-50">
            {totalAssigned}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>{t.reviewer.kpis.pendingReviews}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="font-heading font-black text-2xl text-amber-700 dark:text-amber-400">
            {pendingCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>{t.reviewer.kpis.completedReviews}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="font-heading font-black text-2xl text-emerald-700 dark:text-emerald-400">
            {completedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>{t.reviewer.kpis.avgScore}</span>
            <Award className="h-4 w-4 text-blue-500" />
          </div>
          <div className="font-heading font-black text-2xl text-stone-900 dark:text-stone-50">
            {avgScore} <span className="text-xs font-normal text-stone-400">/ 40</span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>{t.reviewer.kpis.advanceRate}</span>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </div>
          <div className="font-heading font-black text-2xl text-teal-700 dark:text-teal-400">
            {advanceRate}
          </div>
        </div>
      </div>

      {/* Stage Progression Pipeline Control for Reviewer */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900/90 p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Workflow className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              {locale === 'ne' ? 'छनोट पाइपलाइन चरणहरू' : 'Selection Pipeline Progression'}
            </span>
          </div>
          <span className="text-xs text-stone-500">
            {locale === 'ne'
              ? `कुल ${allApplications.length} उम्मेदवार`
              : `${allApplications.length} Total Candidates`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/review"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              initialStage === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300'
            }`}
          >
            <span>{locale === 'ne' ? 'सबै चरणहरू' : 'All Stages'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                initialStage === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
              }`}
            >
              {allApplications.length}
            </span>
          </Link>

          {availableStages.map((stg) => {
            const isCurrent = initialStage === stg.code;
            const count = stageCounts[stg.code] || 0;
            return (
              <Link
                key={stg.code}
                href={`/review?stage=${stg.code}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300'
                }`}
              >
                <span>{stg.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* TanStack Table Section with Assignment Locks */}
      <ReviewTable
        data={tableData}
        availableStages={availableStages}
        initialStage={initialStage}
        currentReviewerId={currentUser.id}
      />
    </div>
  );
}
