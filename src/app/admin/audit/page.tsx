import React from 'react';
import prisma from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  AdminAuditTable,
  type AuditLogRow,
} from '@/components/admin/AdminAuditTable';

export default async function AdminAuditPage() {
  const { t } = await getServerTranslations();

  const auditLogs = await prisma.auditLog.findMany({
    take: 200,
    orderBy: { at: 'desc' },
    include: { actor: true },
  });

  const rows: AuditLogRow[] = auditLogs.map((log) => {
    let parsedMeta: any = {};
    if (log.meta) {
      if (typeof log.meta === 'string') {
        try {
          parsedMeta = JSON.parse(log.meta);
        } catch {
          parsedMeta = log.meta;
        }
      } else {
        parsedMeta = log.meta;
      }
    }

    return {
      id: log.id,
      actorName: log.actor?.name || 'System / Unauthenticated',
      actorEmail: log.actor?.email || null,
      role: log.role,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      meta: parsedMeta,
      ip: log.ip,
      at: log.at.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
          {t.admin.audit.title}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          {t.admin.audit.subtitle}
        </p>
      </div>

      <AdminAuditTable logs={rows} />
    </div>
  );
}
