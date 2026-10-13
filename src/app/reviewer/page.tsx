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
  Eye,
  FileSpreadsheet,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ReviewerDashboardPage() {
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], '/reviewer');
  const { t, locale } = await getServerTranslations();

  // Load ReviewerProfile
  const profile = await prisma.reviewerProfile.findUnique({
    where: { userId: currentUser.id },
  });

  // Load applications assigned or in review pool
  const applications = await prisma.application.findMany({
    where: {
      status: 'SUBMITTED',
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
        where: { reviewerId: currentUser.id },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  const totalAssigned = applications.length;
  const completedReviews = applications.filter((a) => a.reviews.length > 0).length;
  const pendingReviews = totalAssigned - completedReviews;

  const scores: number[] = applications
    .flatMap((a) => a.reviews.map((r) => r.totalScore))
    .filter((s): s is number => typeof s === 'number');
  const avgScore =
    scores.length > 0
      ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1)
      : '—';

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Reviewer Scope Card */}
      <div className="rounded-2xl border bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                {profile?.committeeRole || 'Selection Committee Member'} •{' '}
                {profile?.blindReview ? 'Blind Review Active' : 'Standard Evaluation'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {locale === 'ne' ? 'छनोट समिति मूल्याङ्कन पोर्टल' : 'Reviewer Evaluation Console'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300">
              {profile?.designation ? `${profile.designation} | ` : ''}
              {locale === 'ne'
                ? 'उम्मेदवारहरूको निष्पक्ष तथा मापदण्डमा आधारित मूल्याङ्कन गर्नुहोस्।'
                : 'Evaluate candidate submissions objectively against established rubrics.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className={buttonVariants({
                variant: 'outline',
                className: 'border-stone-700 bg-stone-900/60 text-stone-100 hover:bg-stone-800',
              })}
            >
              Rubric Guidelines
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Reviewer KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total in Queue */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'कुल तोकिएको' : 'Total Queue'}
            </span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{totalAssigned}</div>
          <p className="mt-1 text-xs text-muted-foreground">Applications assigned</p>
        </div>

        {/* Pending Evaluations */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'मूल्याङ्कन बाँकी' : 'Pending Review'}
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{pendingReviews}</div>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting your score</p>
        </div>

        {/* Completed */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'सकिएको मूल्याङ्कन' : 'Completed'}
            </span>
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-600">{completedReviews}</div>
          <p className="mt-1 text-xs text-muted-foreground">Rubrics finalized</p>
        </div>

        {/* Average Score Given */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'औसत प्राप्ताङ्क' : 'Average Score'}
            </span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{avgScore}</div>
          <p className="mt-1 text-xs text-muted-foreground">Across evaluated candidates</p>
        </div>
      </div>

      {/* 3. Review Queue Table */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              {locale === 'ne' ? 'मूल्याङ्कन लाम (Queue)' : 'Applicant Evaluation Queue'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review candidates in strict accordance with the rubric criteria.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === 'ne' ? 'दर्ता नं.' : 'Ref Number'}</TableHead>
                <TableHead>{locale === 'ne' ? 'उम्मेदवार' : 'Candidate'}</TableHead>
                <TableHead>{locale === 'ne' ? 'पद' : 'Position'}</TableHead>
                <TableHead>{locale === 'ne' ? 'हालको चरण' : 'Current Stage'}</TableHead>
                <TableHead>{locale === 'ne' ? 'स्थिति' : 'Evaluation'}</TableHead>
                <TableHead className="text-right">{locale === 'ne' ? 'कार्य' : 'Action'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    {locale === 'ne'
                      ? 'हाल तपाईंलाई कुनै उम्मेदवार तोकिएको छैन।'
                      : 'No candidate applications in your review queue right now.'}
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => {
                  const hasReview = app.reviews.length > 0;
                  const candidateName = profile?.blindReview
                    ? `Candidate #${app.refNo.slice(-4)}`
                    : app.applicant.name;
                  const appData = app.data as Record<string, any> | null;
                  const position = appData?.position || 'Teacher Fellow';

                  return (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {app.refNo}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{candidateName}</div>
                        {profile?.blindReview && (
                          <span className="text-[10px] text-muted-foreground">
                            (Blind Review Masked)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{position}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {app.stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasReview ? (
                          <Badge className="bg-emerald-600 text-white text-xs">
                            Scored ({app.reviews[0].totalScore} pts)
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-amber-600 dark:text-amber-400 text-xs">
                            Pending Review
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/review/${app.id}`}
                          className={buttonVariants({
                            size: 'sm',
                            variant: hasReview ? 'outline' : 'default',
                            className: 'text-xs',
                          })}
                        >
                          {hasReview ? 'Edit Score' : 'Score Candidate'}
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
