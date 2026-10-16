import React from 'react';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { CommitteePageClient } from '@/components/admin/committee/CommitteePageClient';

export default async function CommitteeManagementPage() {
  await requireRole(['ADMIN'], '/admin/committee');

  const [reviewers, totalEvaluations, totalApplications] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'REVIEWER' },
      include: {
        reviewerProfile: true,
        reviews: {
          select: { id: true },
        },
        sessions: {
          orderBy: { lastActiveAt: 'desc' },
          take: 1,
          select: { lastActiveAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count(),
    prisma.application.count({
      where: { status: { not: 'DRAFT' } },
    }),
  ]);

  const mappedMembers = reviewers.map((r) => {
    const evaluationsDone = r.reviews.length;
    const evaluationsPending = Math.max(0, totalApplications - evaluationsDone);
    const lastActiveAt = r.sessions[0]?.lastActiveAt
      ? r.sessions[0].lastActiveAt.toISOString()
      : r.createdAt.toISOString();

    return {
      id: r.id,
      name: r.name || r.username || 'Reviewer',
      username: r.username,
      email: r.email,
      phone: r.reviewerProfile?.phone || null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      lastActiveAt,
      evaluationsDone,
      evaluationsPending,
      reviewerProfile: r.reviewerProfile
        ? {
            phone: r.reviewerProfile.phone,
          }
        : null,
      reviewsCount: evaluationsDone,
    };
  });

  const totalReviewers = mappedMembers.length;
  const activeReviewers = mappedMembers.filter((m) => m.isActive).length;

  return (
    <CommitteePageClient
      members={mappedMembers}
      totalReviewers={totalReviewers}
      activeReviewers={activeReviewers}
      totalEvaluations={totalEvaluations}
    />
  );
}
