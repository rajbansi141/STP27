import React from 'react';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(['APPLICANT', 'ADMIN'], '/applicant');
  const settings = await prisma.settings.findFirst();

  return (
    <DashboardShell
      user={{
        name: currentUser.name || 'Applicant',
        email: currentUser.email,
        role: 'APPLICANT',
      }}
      deadlineDate={settings?.deadline ? settings.deadline.toISOString() : null}
    >
      {children}
    </DashboardShell>
  );
}
