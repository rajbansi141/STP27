import React from 'react';
import { requireRole } from '@/lib/auth/rbac';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], '/reviewer');

  return (
    <DashboardShell
      user={{
        name: currentUser.name || 'Selection Committee Member',
        email: currentUser.email,
        role: 'REVIEWER',
      }}
    >
      {children}
    </DashboardShell>
  );
}
