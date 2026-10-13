import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import { toNepaliDigits } from '@/lib/i18n/translations';
import {
  Users,
  FileCheck2,
  FileEdit,
  UserCheck,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  BookOpen,
} from 'lucide-react';

export default async function AdminOverviewPage() {
  const { t, locale } = await getServerTranslations();

  // Load all dashboard metrics concurrently
  const [
    totalApplicants,
    totalApplications,
    submittedApps,
    draftApps,
    activeReviewers,
    completedReviews,
    settings,
    stages,
    allApplications,
    recentAudits,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'APPLICANT' } }),
    prisma.application.count(),
    prisma.application.count({ where: { status: 'SUBMITTED' } }),
    prisma.application.count({ where: { status: 'DRAFT' } }),
    prisma.user.count({ where: { role: 'REVIEWER', isActive: true } }),
    prisma.review.findMany({
      select: { totalScore: true, recommendation: true },
    }),
    prisma.settings.findUnique({ where: { id: 'default' } }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
    prisma.application.findMany({
      where: { status: 'SUBMITTED' },
      select: { stage: true, data: true },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { at: 'desc' },
      include: { actor: true },
    }),
  ]);

  // Calculate cohort score stats
  let totalScoreSum = 0;
  let scoreCount = 0;
  let advanceCount = 0;
  for (const r of completedReviews) {
    if (r.totalScore !== null) {
      totalScoreSum += r.totalScore;
      scoreCount++;
    }
    if (r.recommendation === 'ADVANCE') {
      advanceCount++;
    }
  }

  const avgCohortScore = scoreCount > 0 ? (totalScoreSum / scoreCount).toFixed(1) : '—';
  const shortlistRate = scoreCount > 0 ? `${Math.round((advanceCount / scoreCount) * 100)}%` : '—';

  // Calculate deadline remaining
  let deadlineText = t.admin.kpis.applicationsClosed;
  let isClosed = true;
  if (settings?.deadline) {
    const diffMs = new Date(settings.deadline).getTime() - Date.now();
    if (diffMs > 0) {
      isClosed = false;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      deadlineText = locale === 'ne'
        ? `${toNepaliDigits(days)} दिन ${toNepaliDigits(hours)} घण्टा`
        : `${days}d ${hours}h left`;
    }
  }

  // Calculate stage breakdown
  const stageDistribution = stages.map((s) => {
    const count = allApplications.filter((a) => a.stage === s.code).length;
    const percentage = submittedApps > 0 ? Math.round((count / submittedApps) * 100) : 0;
    return {
      code: s.code,
      name: locale === 'ne' ? s.nameNe : s.nameEn,
      count,
      percentage,
    };
  });

  // Calculate subject breakdown
  const subjectCounts: Record<string, number> = {
    English: 0,
    Math: 0,
    'Grade Teaching': 0,
    Other: 0,
  };

  for (const app of allApplications) {
    const parsedData = app.data
      ? typeof app.data === 'string'
        ? JSON.parse(app.data)
        : app.data
      : {};
    const sub = parsedData.teachingSubject;
    if (sub === 'English') subjectCounts.English++;
    else if (sub === 'Math') subjectCounts.Math++;
    else if (sub === 'Grade Teaching') subjectCounts['Grade Teaching']++;
    else subjectCounts.Other++;
  }

  return (
    <div className="space-y-8">
      {/* 6 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Applicants */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="truncate">{t.admin.kpis.totalApplicants}</span>
            <Users className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <div className="font-heading font-black text-2xl text-stone-900 dark:text-stone-50">
            {locale === 'ne' ? toNepaliDigits(totalApplicants) : totalApplicants}
          </div>
        </div>

        {/* Submitted Applications */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="truncate">{t.admin.kpis.submittedApps}</span>
            <FileCheck2 className="h-4 w-4 text-teal-600 shrink-0" />
          </div>
          <div className="font-heading font-black text-2xl text-teal-700 dark:text-teal-400">
            {locale === 'ne' ? toNepaliDigits(submittedApps) : submittedApps}
          </div>
        </div>

        {/* In-Progress Drafts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="truncate">{t.admin.kpis.draftApps}</span>
            <FileEdit className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <div className="font-heading font-black text-2xl text-amber-600 dark:text-amber-400">
            {locale === 'ne' ? toNepaliDigits(draftApps) : draftApps}
          </div>
        </div>

        {/* Active Reviewers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="truncate">{t.admin.kpis.activeReviewers}</span>
            <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
          <div className="font-heading font-black text-2xl text-blue-700 dark:text-blue-400">
            {locale === 'ne' ? toNepaliDigits(activeReviewers) : activeReviewers}
          </div>
        </div>

        {/* Cohort Average Score */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="truncate">{t.admin.kpis.avgCohortScore}</span>
            <Award className="h-4 w-4 text-purple-600 shrink-0" />
          </div>
          <div className="font-heading font-black text-2xl text-stone-900 dark:text-stone-50">
            {locale === 'ne' && avgCohortScore !== '—' ? toNepaliDigits(avgCohortScore) : avgCohortScore}
            <span className="text-xs font-normal text-stone-400 ml-1">/ 40</span>
          </div>
        </div>

        {/* Deadline Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="truncate">{t.admin.kpis.daysToDeadline}</span>
            <Clock className={`h-4 w-4 shrink-0 ${isClosed ? 'text-red-500' : 'text-emerald-600'}`} />
          </div>
          <div className={`font-heading font-bold text-base truncate ${isClosed ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {deadlineText}
          </div>
        </div>
      </div>

      {/* Pipeline Funnel & Subject Distribution (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Recruitment Pipeline Progression (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>{t.admin.charts.stageFunnelTitle}</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {t.admin.charts.stageFunnelDesc}
              </p>
            </div>
            <Link
              href="/admin/candidates"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1"
            >
              <span>{t.admin.nav.candidates}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5 pt-2">
            {stageDistribution.map((stg, idx) => (
              <div key={stg.code} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-stone-800 dark:text-stone-200">
                    {idx + 1}. {stg.name}
                  </span>
                  <div className="flex items-center gap-2 text-stone-500">
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {locale === 'ne' ? toNepaliDigits(stg.count) : stg.count}
                    </span>
                    <span className="text-[11px] text-stone-400">({stg.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                    style={{ width: `${Math.max(stg.percentage, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Teaching Subject Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span>{t.admin.charts.subjectDistTitle}</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {t.admin.charts.subjectDistDesc}
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              { label: 'English', count: subjectCounts.English, color: 'bg-blue-500' },
              { label: 'Math', count: subjectCounts.Math, color: 'bg-emerald-500' },
              { label: 'Grade Teaching', count: subjectCounts['Grade Teaching'], color: 'bg-amber-500' },
            ].map((sub) => {
              const pct = submittedApps > 0 ? Math.round((sub.count / submittedApps) * 100) : 0;
              return (
                <div key={sub.label} className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-stone-900 dark:text-stone-100">{sub.label}</span>
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                      {locale === 'ne' ? toNepaliDigits(sub.count) : sub.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-200/70 dark:bg-stone-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sub.color} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-Time Audit Activity Feed */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span>{t.admin.charts.recentActivityTitle}</span>
            </h2>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1"
          >
            <span>{t.admin.nav.audit}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {recentAudits.map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-semibold px-2 py-0.5 rounded text-[11px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {item.action}
                </span>
                <span className="text-stone-900 dark:text-stone-100 font-medium">
                  {item.actor?.name || 'System / Guest'}
                </span>
                <span className="text-stone-400">({item.role || 'GUEST'})</span>
                <span className="text-stone-500 hidden md:inline truncate max-w-xs">
                  • {item.entity}
                </span>
              </div>
              <span className="text-stone-400 font-mono text-[11px] shrink-0">
                {new Date(item.at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
