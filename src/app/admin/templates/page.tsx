import React from 'react';
import prisma from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import { AdminEmailHub } from '@/components/admin/AdminEmailHub';

export default async function AdminTemplatesPage() {
  const { t } = await getServerTranslations();

  const [templates, recentLogs, pendingCount] = await Promise.all([
    prisma.emailTemplate.findMany({
      orderBy: [{ code: 'asc' }, { locale: 'asc' }],
    }),
    prisma.emailLog.findMany({
      take: 25,
      orderBy: { sentAt: 'desc' },
      include: { template: true },
    }),
    prisma.emailLog.count({
      where: { status: 'PENDING' },
    }),
  ]);

  const templateItems = templates.map((t) => ({
    id: t.id,
    code: t.code,
    stage: t.stage,
    locale: t.locale,
    subject: t.subject,
    body: t.body,
    active: t.active,
  }));

  const logItems = recentLogs.map((l) => ({
    id: l.id,
    to: l.to,
    subject: l.subject,
    templateCode: l.template?.code || null,
    status: l.status,
    error: l.error,
    sentAt: l.sentAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <AdminEmailHub
        templates={templateItems}
        recentLogs={logItems}
        pendingCount={pendingCount}
      />
    </div>
  );
}
