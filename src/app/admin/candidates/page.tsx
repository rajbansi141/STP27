import React from 'react';
import prisma from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  AdminCandidatesTable,
  type AdminCandidateRow,
} from '@/components/admin/AdminCandidatesTable';

interface AdminCandidatesPageProps {
  searchParams?: Promise<{
    stage?: string;
    subject?: string;
    cohortId?: string;
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

export default async function AdminCandidatesPage({ searchParams }: AdminCandidatesPageProps) {
  const { t, locale } = await getServerTranslations();
  const params = searchParams ? await searchParams : undefined;
  const initialStage = params?.stage || 'ALL';
  const initialSubject = params?.subject || 'ALL';
  const initialCohortId = params?.cohortId || 'ALL';

  const [applications, stages, reviewers, cohorts] = await Promise.all([
    prisma.application.findMany({
      include: {
        applicant: true,
        reviews: true,
        assignments: {
          include: { reviewer: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'REVIEWER', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.cohort.findMany({
      orderBy: { year: 'desc' },
      select: { id: true, code: true, year: true, isCurrent: true },
    }),
  ]);

  const candidateRows: AdminCandidateRow[] = applications.map((app) => {
    const parsedData = app.data
      ? typeof app.data === 'string'
        ? JSON.parse(app.data)
        : app.data
      : {};

    const validScores = app.reviews
      .filter((r) => r.totalScore !== null)
      .map((r) => r.totalScore as number);

    const avgScore =
      validScores.length > 0
        ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1))
        : null;

    return {
      id: app.id,
      refNo: app.refNo,
      applicantName: app.applicant.name,
      applicantEmail: app.applicant.email,
      applicantPhone: parsedData.contactNumber || '—',
      subject: normalizeSubject(parsedData.teachingSubject),
      degree: `${parsedData.highestLevel || "Bachelor's"} (${parsedData.fieldOfStudy || 'Education'})`,
      stage: app.stage,
      status: app.status,
      submittedAt: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : null,
      reviewCount: app.reviews.length,
      avgScore,
      assignedReviewers: app.assignments.map((a) => ({
        id: a.reviewer.id,
        name: a.reviewer.name,
      })),
      cvFileName: parsedData.cvFileName || null,
      cvFileUrl: parsedData.cvFileUrl || null,
      phoneInterviewSchedule: parsedData.phoneInterviewSchedule || null,
      ascBooking: parsedData.ascBooking || null,
      cohortId: app.cohortId,
    };
  });

  const availableStages = stages.map((s) => ({
    code: s.code,
    name: s.code === 'ASC' ? 'ASC' : (locale === 'ne' ? s.nameNe : s.nameEn),
  }));

  // Count candidates per stage
  const stageCounts: Record<string, number> = {};
  applications.forEach((app) => {
    stageCounts[app.stage] = (stageCounts[app.stage] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
            {t.admin.candidates.title}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {t.admin.candidates.subtitle}
          </p>
        </div>
      </div>

      <AdminCandidatesTable
        candidates={candidateRows}
        stages={availableStages}
        reviewers={reviewers}
        cohorts={cohorts}
        initialStage={initialStage}
        initialSubject={initialSubject}
        initialCohortId={initialCohortId}
        stageCounts={stageCounts}
        totalCount={applications.length}
      />
    </div>
  );
}
