import React from 'react';
import prisma from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import { AdminSettingsEditor } from '@/components/admin/AdminSettingsEditor';

export default async function AdminSettingsPage() {
  const { t } = await getServerTranslations();

  const [settings, stages] = await Promise.all([
    prisma.settings.findUnique({
      where: { id: 'default' },
    }),
    prisma.stage.findMany({
      orderBy: { order: 'asc' },
    }),
  ]);

  const defaultSettings = {
    deadline: settings?.deadline
      ? settings.deadline.toISOString()
      : new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    cohortYear: settings?.cohortYear || 2027,
    cycleLabel: settings?.cycleLabel || 'Saathi Teachers Programme (STP) 2027',
  };

  const stageItems = stages.map((s) => ({
    id: s.id,
    code: s.code,
    nameEn: s.nameEn,
    nameNe: s.nameNe,
    order: s.order,
    isActive: s.isActive,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
          {t.admin.settings.title}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          {t.admin.settings.subtitle}
        </p>
      </div>

      <AdminSettingsEditor
        initialSettings={defaultSettings}
        stages={stageItems}
      />
    </div>
  );
}
