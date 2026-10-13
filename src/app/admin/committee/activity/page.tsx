import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  Activity,
  Users,
  Clock,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActivityTimeline } from '@/components/admin/committee/ActivityTimeline';

export default async function ReviewerActivityPage() {
  await requireRole(['ADMIN'], '/admin/committee/activity');
  const { t, locale } = await getServerTranslations();

  const [auditLogs, activeReviewers, totalReviews] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: 'COMMITTEE' } },
          { action: { contains: 'REVIEW' } },
          { actor: { role: 'REVIEWER' } },
        ],
      },
      orderBy: { at: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      where: { role: 'REVIEWER' },
      include: {
        reviewerProfile: true,
        reviews: {
          select: { id: true, totalScore: true, at: true },
          orderBy: { at: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.review.count(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/committee"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'gap-1 text-xs mb-2',
            })}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {locale === 'ne' ? 'छनोट समितिमा फर्कनुहोस्' : 'Back to Committee'}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-600" />
            {t?.nav?.reviewerActivity || 'Reviewer Activity & Audit Trail'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitor real-time evaluation logs, scoring sessions, and administrative access events.
          </p>
        </div>
      </div>

      {/* Reviewer Activity Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeReviewers.map((rev) => {
          const lastActivity = rev.reviews[0]?.at;
          return (
            <div key={rev.id} className="rounded-xl border bg-card p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <Link
                  href={`/admin/committee/${rev.id}`}
                  className="font-semibold text-sm hover:underline text-foreground"
                >
                  {rev.name}
                </Link>
                <Badge variant={rev.isActive ? 'default' : 'secondary'} className="text-[10px]">
                  {rev.isActive ? 'Active' : 'Suspended'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {rev.reviewerProfile?.designation || 'Reviewer'} •{' '}
                {rev.reviewerProfile?.committeeRole || 'Member'}
              </p>
              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>Reviews: <strong>{rev.reviews.length}</strong></span>
                <span>
                  {lastActivity
                    ? `Last scored: ${new Date(lastActivity).toLocaleDateString()}`
                    : 'No evaluations yet'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Audit Timeline */}
      <ActivityTimeline
        logs={auditLogs.map((l) => ({
          id: l.id,
          action: l.action,
          at: l.at.toISOString(),
          ip: l.ip,
          userAgent: l.userAgent,
          meta: l.meta ? (typeof l.meta === 'string' ? l.meta : JSON.stringify(l.meta)) : null,
        }))}
        memberName="All_Reviewers"
      />
    </div>
  );
}
