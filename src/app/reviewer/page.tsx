import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  Users,
  Clock,
  CheckCircle2,
  Award,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ReviewTable, type ApplicationRowItem } from '@/components/review/ReviewTable';

interface ReviewerDashboardPageProps {
  searchParams?: Promise<{
    stage?: string;
    filter?: string;
  }>;
}

function normalizeSubject(sub?: string | null): string {
  if (!sub) return 'General';
  const s = sub.trim().toLowerCase();
  if (s === 'english') return 'English';
  if (s === 'math' || s === 'mathematics') return 'Math';
  if (s === 'grade_teaching' || s === 'grade teaching' || s === 'grade') return 'Grade Teaching';
  if (s === 'science') return 'Science';
  return sub.charAt(0).toUpperCase() + sub.slice(1);
}

export default async function ReviewerDashboardPage({ searchParams }: ReviewerDashboardPageProps) {
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], '/reviewer');
  const { t, locale } = await getServerTranslations();

  const params = searchParams ? await searchParams : undefined;
  const initialStage = params?.stage || 'APPLICATION';

  // 1. Load ReviewerProfile
  const profile = await prisma.reviewerProfile.findUnique({
    where: { userId: currentUser.id },
  });

  // 2. Load configured stages
  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  const availableStages = stages.map((s) => ({
    code: s.code,
    name: locale === 'ne' ? s.nameNe : s.nameEn,
  }));

  // 3. Load applications (submitted) assigned to reviewer or full pool if admin
  const applications = await prisma.application.findMany({
    where: {
      status: { not: 'DRAFT' },
      ...(currentUser.role === 'REVIEWER'
        ? {
            OR: [
              { assignments: { some: { reviewerId: currentUser.id } } },
              { assignments: { none: {} } },
            ],
          }
        : {}),
    },
    include: {
      applicant: true,
      reviews: {
        include: { reviewer: true },
      },
      assignments: {
        include: { reviewer: true },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  // 4. Calculate Reviewer KPIs
  const myAssignedApplications = applications.filter((app) =>
    currentUser.role === 'ADMIN' || app.assignments.some((a) => a.reviewerId === currentUser.id)
  );

  const totalAssigned = myAssignedApplications.length;
  let completedCount = 0;
  let totalScoreSum = 0;

  myAssignedApplications.forEach((app) => {
    const myReview = app.reviews.find((r) => r.reviewerId === currentUser.id);
    if (myReview) {
      completedCount++;
      if (myReview.totalScore) totalScoreSum += myReview.totalScore;
    }
  });

  const pendingCount = Math.max(0, totalAssigned - completedCount);
  const avgScore = completedCount > 0 ? (totalScoreSum / completedCount).toFixed(1) : '—';

  // 5. Map data for TanStack ReviewTable
  const tableData: ApplicationRowItem[] = applications.map((app) => {
    const rawData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data || {};
    const myReview = app.reviews.find((r) => r.reviewerId === currentUser.id);
    const isAssigned = app.assignments.some((a) => a.reviewerId === currentUser.id);

    return {
      id: app.id,
      refNo: app.refNo,
      applicantName: app.applicant.name || rawData.fullName || 'Candidate',
      applicantEmail: app.applicant.email,
      applicantPhone: rawData.contactNumber || rawData.mobileNumber || rawData.phone || '',
      degree: rawData.highestDegree || rawData.degree || 'Bachelor',
      subject: normalizeSubject(rawData.teachingSubject || rawData.subject || rawData.position),
      stage: app.stage,
      status: app.status,
      submittedAt: app.submittedAt ? app.submittedAt.toISOString() : null,
      isAssignedToMe: isAssigned,
      assignedReviewers: app.assignments.map((a) => ({ id: a.reviewer.id, name: a.reviewer.name })),
      reviewedByCurrentReviewer: Boolean(myReview),
      myScore: myReview?.totalScore ?? null,
      myRecommendation: myReview?.recommendation ?? null,
      cvFileName: rawData.cvFileName || null,
      cvFileUrl: rawData.cvFileUrl || null,
      phoneInterviewSchedule: rawData.phoneInterviewSchedule || null,
      ascBooking: rawData.ascBooking || null,
      rawDetails: rawData,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner & Reviewer Scope Card */}
      <div className="rounded-2xl border bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 p-6 sm:p-7 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                {profile?.committeeRole || 'Selection Committee Member'} •{' '}
                {locale === 'ne' ? 'उम्मेदवार मूल्याङ्कन लाम' : 'Candidate Evaluation Queue'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
              {locale === 'ne' ? 'छनोट समिति मूल्याङ्कन पोर्टल' : 'Reviewer Evaluation Console'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              {profile?.designation ? `${profile.designation} • ` : ''}
              {locale === 'ne'
                ? 'तोकिएका उम्मेदवारहरूको शैक्षिक योग्यता, अनुभव तथा अभिप्रेरणा पत्रको मापदण्ड अनुसार वस्तुनिष्ठ मूल्याङ्कन गर्नुहोस्।'
                : 'Evaluate assigned candidate applications, academic credentials, and motivation statements against established rubrics.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/help"
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-stone-700 bg-stone-900/60 hover:bg-stone-800 text-stone-200 transition-colors shadow-xs"
            >
              {locale === 'ne' ? 'रुब्रिक निर्देशिका' : 'Rubric Guidelines'}
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total in Queue */}
        <div className="rounded-2xl border bg-white dark:bg-stone-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {locale === 'ne' ? 'कुल तोकिएको' : 'Total Queue'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
            {totalAssigned}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {locale === 'ne' ? 'समीक्षाका लागि उपलब्ध' : 'Applications in your assignment'}
          </p>
        </div>

        {/* Pending Review */}
        <div className="rounded-2xl border bg-white dark:bg-stone-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {locale === 'ne' ? 'मूल्याङ्कन बाँकी' : 'Pending Review'}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {locale === 'ne' ? 'अंक दिन बाँकी' : 'Awaiting rubric scoring'}
          </p>
        </div>

        {/* Completed Evaluations */}
        <div className="rounded-2xl border bg-white dark:bg-stone-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {locale === 'ne' ? 'सकिएको मूल्याङ्कन' : 'Completed Reviews'}
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-400">
            {completedCount}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {locale === 'ne' ? 'रुब्रिक फाइनल भइसकेको' : 'Rubrics submitted & locked'}
          </p>
        </div>

        {/* Average Score */}
        <div className="rounded-2xl border bg-white dark:bg-stone-900 p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {locale === 'ne' ? 'औसत प्राप्ताङ्क' : 'Average Score'}
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {avgScore} <span className="text-xs font-normal text-stone-400">/ 40</span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {locale === 'ne' ? 'समग्र मूल्याङ्कनको औसत' : 'Across evaluated candidates'}
          </p>
        </div>
      </div>

      {/* 3. TanStack Review Table Component */}
      <ReviewTable
        data={tableData}
        availableStages={availableStages}
        initialStage={initialStage}
        currentReviewerId={currentUser.id}
        totalCount={applications.length}
        myAssignedCount={totalAssigned}
        completedCount={completedCount}
        pendingCount={pendingCount}
      />
    </div>
  );
}
