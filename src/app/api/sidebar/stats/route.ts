import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Stage breakdown counts for candidate pipeline
    const stageCountsRaw = await prisma.application.groupBy({
      by: ['stage'],
      _count: { id: true },
      where: {
        status: { not: 'DRAFT' },
        ...(user.role === 'REVIEWER'
          ? {
              OR: [
                { assignments: { some: { reviewerId: user.id } } },
                { assignments: { none: {} } },
              ],
            }
          : {}),
      },
    });

    const stageCounts: Record<string, number> = {
      APPLICATION: 0,
      PHONE_INTERVIEW: 0,
      ASC: 0,
      PARENTS_MEET: 0,
      SAATHI_SCHOOL: 0,
      PLACEMENT: 0,
    };

    for (const row of stageCountsRaw) {
      if (row.stage) {
        stageCounts[row.stage] = row._count.id;
      }
    }

    const totalInPipeline = Object.values(stageCounts).reduce((acc, curr) => acc + curr, 0);

    // 2. Role-specific metric numbers
    let applicantsCount = 0;
    let pendingReviewsCount = 0;
    let applicantStageInfo: { stage: string; stageOrder: number; totalStages: number } | null = null;
    let recentAuditsCount = 0;

    if (user.role === 'ADMIN') {
      const [totalApps, recentAudits] = await Promise.all([
        prisma.application.count({
          where: { status: { not: 'DRAFT' } },
        }),
        prisma.auditLog.count({
          where: {
            at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
            },
          },
        }),
      ]);
      applicantsCount = totalApps;
      recentAuditsCount = recentAudits;
    } else if (user.role === 'REVIEWER') {
      const assignedApps = await prisma.application.findMany({
        where: {
          status: { not: 'DRAFT' },
          OR: [
            { assignments: { some: { reviewerId: user.id } } },
            { assignments: { none: {} } },
          ],
        },
        select: {
          id: true,
          reviews: {
            where: { reviewerId: user.id },
            select: { id: true },
          },
        },
      });
      pendingReviewsCount = assignedApps.filter((a) => a.reviews.length === 0).length;
    } else {
      // Applicant
      const myApp = await prisma.application.findFirst({
        where: { applicantId: user.id },
        select: { stage: true, status: true },
        orderBy: { createdAt: 'desc' },
      });

      const allStages = await prisma.stage.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });

      if (myApp?.stage) {
        const idx = allStages.findIndex((s) => s.code === myApp.stage);
        applicantStageInfo = {
          stage: myApp.stage,
          stageOrder: idx >= 0 ? idx + 1 : 1,
          totalStages: allStages.length || 6,
        };
      }
    }

    // 3. Unread notifications
    const unreadNotifications = await prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return NextResponse.json({
      success: true,
      stageCounts,
      totalInPipeline,
      applicantsCount,
      pendingReviewsCount,
      applicantStageInfo,
      unreadNotifications,
      recentAuditsCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sidebar stats API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sidebar stats' },
      { status: 500 }
    );
  }
}
