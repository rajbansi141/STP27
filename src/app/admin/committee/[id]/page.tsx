import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  Phone,
  Briefcase,
  Layers,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ActivityTimeline } from '@/components/admin/committee/ActivityTimeline';

interface MemberDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CommitteeMemberDetailPage({ params }: MemberDetailPageProps) {
  await requireRole(['ADMIN'], '/admin/committee');
  const { id } = await params;
  const { t, locale } = await getServerTranslations();

  const member = await prisma.user.findUnique({
    where: { id, role: 'REVIEWER' },
    include: {
      reviewerProfile: true,
      stageAssignments: true,
      reviews: {
        include: {
          application: {
            include: {
              applicant: true,
            },
          },
        },
        orderBy: { at: 'desc' },
      },
    },
  });

  if (!member) {
    notFound();
  }

  // Fetch relevant audit logs for this member
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [{ actorId: id }, { entityId: id }],
    },
    orderBy: { at: 'desc' },
    take: 50,
  });

  const profile = member.reviewerProfile;
  const positions = profile?.assignedPositions
    ? profile.assignedPositions.split(', ')
    : [];
  const stages =
    member.stageAssignments.length > 0
      ? member.stageAssignments.map((s) => s.stageCode)
      : profile?.assignedStages
      ? profile.assignedStages.split(', ')
      : [];

  const totalReviews = member.reviews.length;
  const scores = member.reviews
    .map((r) => r.totalScore)
    .filter((s): s is number => typeof s === 'number');
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : '—';

  const recommendedCount = member.reviews.filter(
    (r) => r.recommendation === 'ADVANCE' || r.recommendation === 'RECOMMEND'
  ).length;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/committee"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'gap-1 text-xs',
          })}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {locale === 'ne' ? 'सबै समिति सदस्यहरू' : 'Back to Committee List'}
        </Link>
      </div>

      {/* Member Profile Overview Banner */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {locale === 'ne' && profile?.nameNe ? profile.nameNe : member.name}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {member.email}
              </span>
              {profile?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {profile.phone}
                </span>
              )}
              {member.username && (
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  @{member.username}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={
                member.isActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
              }
            >
              {member.isActive
                ? (locale === 'ne' ? 'सक्रिय मूल्याङ्कनकर्ता' : 'Active Evaluator')
                : (locale === 'ne' ? 'निलम्बित' : 'Suspended')}
            </Badge>
            <Badge variant="outline" className="font-semibold">
              {profile?.committeeRole
                ? (locale === 'ne'
                    ? (profile.committeeRole === 'Chairperson' ? 'संयोजक' : profile.committeeRole === 'Member' ? 'सदस्य' : profile.committeeRole === 'Subject Expert' ? 'विषय विज्ञ' : 'पर्यवेक्षक')
                    : profile.committeeRole)
                : (locale === 'ne' ? 'सदस्य' : 'Member')}
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 pt-4 border-t text-xs">
          <div>
            <span className="text-muted-foreground font-medium block">Designation</span>
            <span className="font-semibold text-sm">{profile?.designation || 'Reviewer'}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium block">Blind Review Policy</span>
            <span className="font-semibold text-sm">
              {profile?.blindReview ? 'Enforced (Masked Candidate Data)' : 'Standard Evaluation'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium block">Onboarded Date</span>
            <span className="font-semibold text-sm">
              {new Date(member.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Scope Cards: Positions & Stages */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="h-4 w-4 text-emerald-600" />
            <span>Assigned Teaching Positions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {positions.length > 0 ? (
              positions.map((pos) => (
                <Badge key={pos} variant="secondary" className="text-xs">
                  {pos}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">All Positions</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-teal-600" />
            <span>Assigned Evaluation Stages</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stages.length > 0 ? (
              stages.map((stg) => (
                <Badge key={stg} variant="outline" className="text-xs font-mono">
                  {stg}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">All Stages</span>
            )}
          </div>
        </div>
      </div>

      {/* Evaluation Performance KPI row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Total Scored
          </span>
          <div className="mt-1 text-2xl font-bold">{totalReviews}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Candidates evaluated</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Average Score Given
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{avgScore}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Out of 100 maximum</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Recommended
          </span>
          <div className="mt-1 text-2xl font-bold text-teal-600">{recommendedCount}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Positive progression recommendations
          </p>
        </div>
      </div>

      {/* Candidate Evaluations Table */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Candidate Reviews Submitted
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref Number</TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead className="text-right">Evaluation Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {member.reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                    No evaluations submitted yet by this committee member.
                  </TableCell>
                </TableRow>
              ) : (
                member.reviews.map((r) => {
                  const appData = r.application.data as Record<string, any> | null;
                  const position = appData?.position || 'Saathi Teacher';

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {r.application.refNo}
                      </TableCell>
                      <TableCell className="text-sm">
                        {profile?.blindReview
                          ? `Candidate #${r.application.refNo.slice(-4)}`
                          : r.application.applicant.name}
                      </TableCell>
                      <TableCell className="text-xs">{position}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-emerald-600">
                        {r.totalScore} pts
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.recommendation === 'ADVANCE' || r.recommendation === 'RECOMMEND' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {r.recommendation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(r.at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline
        logs={auditLogs.map((l) => ({
          id: l.id,
          action: l.action,
          at: l.at.toISOString(),
          ip: l.ip,
          userAgent: l.userAgent,
          meta: l.meta ? (typeof l.meta === 'string' ? l.meta : JSON.stringify(l.meta)) : null,
        }))}
        memberName={member.name || 'Member'}
      />
    </div>
  );
}
