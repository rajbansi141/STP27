import { redirect } from 'next/navigation';
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
} from 'lucide-react';

export default async function ReviewerPortalPage() {
  // Enforce server-side RBAC: Only REVIEWER or ADMIN
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], '/review');
  const { t, locale } = await getServerTranslations();

  // Load configured stages
  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  const availableStages = stages.map((s) => ({
    code: s.code,
    name: locale === 'ne' ? s.nameNe : s.nameEn,
  }));

  // Fetch applications
  // If ADMIN, sees all submitted applications; if REVIEWER, sees assigned or all submitted in recruitment pool
  const applications = await prisma.application.findMany({
    where: {
      status: 'SUBMITTED',
      ...(currentUser.role === 'REVIEWER'
        ? {
            OR: [
              { assignments: { some: { reviewerId: currentUser.id } } },
              { assignments: { none: {} } }, // also show pool for review
            ],
          }
        : {}),
    },
    include: {
      applicant: true,
      reviews: true,
      assignments: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  // Calculate reviewer KPIs
  const totalAssigned = applications.length;
  let completedCount = 0;
  let totalScoreSum = 0;
  let advancedCount = 0;

  const tableData: ApplicationRowItem[] = applications.map((app) => {
    const parsedData = app.data
      ? typeof app.data === 'string'
        ? JSON.parse(app.data)
        : app.data
      : {};

    const myReview = app.reviews.find((r) => r.reviewerId === currentUser.id);

    if (myReview) {
      completedCount++;
      if (myReview.totalScore) totalScoreSum += myReview.totalScore;
      if (myReview.recommendation === 'ADVANCE') advancedCount++;
    }

    return {
      id: app.id,
      refNo: app.refNo,
      applicantName: app.applicant.name,
      applicantEmail: app.applicant.email,
      applicantPhone: parsedData.contactNumber || '—',
      degree: `${parsedData.highestLevel || "Bachelor's"} (${parsedData.fieldOfStudy || 'Education'})`,
      subject: parsedData.teachingSubject || 'General',
      stage: app.stage,
      submittedAt: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : null,
      reviewedByCurrentReviewer: Boolean(myReview),
      myScore: myReview?.totalScore || null,
      myRecommendation: myReview?.recommendation || null,
    };
  });

  const pendingCount = totalAssigned - completedCount;
  const avgScore = completedCount > 0 ? (totalScoreSum / completedCount).toFixed(1) : '—';
  const advanceRate = completedCount > 0 ? `${Math.round((advancedCount / completedCount) * 100)}%` : '—';

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
          <span className="text-emerald-200">{currentUser.name}</span>
          <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
            {currentUser.email}
          </div>
        </div>
      </div>

      {/* KPI Cards (Tremor-inspired metric cards) */}
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

      {/* TanStack Table Section */}
      <ReviewTable data={tableData} availableStages={availableStages} />
    </div>
  );
}
