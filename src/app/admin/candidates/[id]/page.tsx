import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { AdminCandidateDetailView } from '@/components/admin/AdminCandidateDetailView';

interface AdminCandidateDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminCandidateDetailPage({
  params,
}: AdminCandidateDetailPageProps) {
  const { id } = await params;

  // Enforce server-side RBAC: Only ADMIN can access candidate dossier
  const currentUser = await requireRole(['ADMIN'], `/admin/candidates/${id}`);
  const { locale } = await getServerTranslations();

  const [application, stages, availableReviewers] = await Promise.all([
    prisma.application.findUnique({
      where: { id },
      include: {
        applicant: true,
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { at: 'desc' },
        },
        assignments: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        histories: {
          include: {
            actor: {
              select: { name: true, email: true },
            },
          },
          orderBy: { at: 'desc' },
        },
      },
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

  if (!application) {
    notFound();
  }

  return (
    <div className="flex-1 py-4 max-w-7xl mx-auto w-full">
      <AdminCandidateDetailView
        application={application}
        stages={stages}
        availableReviewers={availableReviewers}
        locale={locale}
      />
    </div>
  );
}
