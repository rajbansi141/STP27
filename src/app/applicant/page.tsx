import React from 'react';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import { ApplicantOverview } from '@/components/applicant/ApplicantOverview';

export default async function ApplicantDashboardPage() {
  const currentUser = await requireRole(['APPLICANT', 'ADMIN'], '/applicant');
  const { locale } = await getServerTranslations();

  // Load user's application, official stages, active notifications, and system settings
  const [settings, application, stages, notifications] = await Promise.all([
    prisma.settings.findFirst(),
    prisma.application.findFirst({
      where: { applicantId: currentUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        histories: {
          orderBy: { at: 'desc' },
        },
      },
    }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
    prisma.notification.findMany({
      where: { userId: currentUser.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Format serializable data for client components
  const serializedApplication = application
    ? {
        id: application.id,
        refNo: application.refNo,
        status: application.status,
        stage: application.stage,
        submittedAt: application.submittedAt ? application.submittedAt.toISOString() : null,
        data: application.data,
        draftData: application.draftData,
        histories: application.histories.map((h) => ({
          id: h.id,
          fromStage: h.fromStage,
          toStage: h.toStage,
          note: h.note,
          at: h.at.toISOString(),
        })),
      }
    : null;

  const serializedNotifications = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  const serializedSettings = {
    deadline: settings?.deadline ? settings.deadline.toISOString() : null,
    cycleLabel: settings?.cycleLabel || 'Saathi Teachers Programme (STP) 2027',
    cohortYear: settings?.cohortYear || 2027,
  };

  return (
    <ApplicantOverview
      user={{
        name: currentUser.name || 'Applicant',
        email: currentUser.email,
      }}
      application={serializedApplication}
      stages={stages}
      notifications={serializedNotifications}
      settings={serializedSettings}
      locale={locale}
    />
  );
}
