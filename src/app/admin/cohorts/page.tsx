import { requireRole } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { CohortManagementHub } from '@/components/admin/cohort/CohortManagementHub';
import { CohortItem } from '@/app/api/admin/cohort-actions';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cohort & Recruitment Cycles | STP Admin',
  description: 'Manage fellowship cohort cycles, timelines, and applicant pools.',
};

export default async function AdminCohortsPage() {
  await requireRole(['ADMIN'], '/admin/cohorts');
  const { locale } = await getServerTranslations();

  const cohorts = await prisma.cohort.findMany({
    orderBy: { year: 'desc' },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
      applications: {
        where: { status: 'FINAL_SELECTED' },
        select: { id: true },
      },
    },
  });

  const formatted: CohortItem[] = cohorts.map((c) => ({
    id: c.id,
    code: c.code,
    nameEn: c.nameEn,
    nameNe: c.nameNe,
    year: c.year,
    status: c.status as CohortItem['status'],
    isCurrent: c.isCurrent,
    description: c.description,
    applicationOpen: c.applicationOpen ? c.applicationOpen.toISOString() : null,
    applicationClose: c.applicationClose ? c.applicationClose.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    applicationCount: c._count.applications,
    finalSelectedCount: c.applications.length,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <CohortManagementHub initialCohorts={formatted} locale={locale} />
    </div>
  );
}
