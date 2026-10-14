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
  }>;
}

export default async function AdminCandidatesPage({ searchParams }: AdminCandidatesPageProps) {
  const { t, locale } = await getServerTranslations();
  const params = searchParams ? await searchParams : undefined;
  const initialStage = params?.stage || 'ALL';

  const [applications, stages, reviewers] = await Promise.all([
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
      subject: parsedData.teachingSubject || 'General',
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
    };
  });

  const availableStages = stages.map((s) => ({
    code: s.code,
    name: locale === 'ne' ? s.nameNe : s.nameEn,
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
        initialStage={initialStage}
        stageCounts={stageCounts}
        totalCount={applications.length}
      />
    </div>
  );
}
