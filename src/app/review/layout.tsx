import React from 'react';
import { requireRole } from '@/lib/auth/rbac';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], '/review');

  return (
    <DashboardShell
      user={{
        name: currentUser.name || (currentUser.role === 'ADMIN' ? 'System Admin' : 'Reviewer'),
        email: currentUser.email,
        role: currentUser.role as 'ADMIN' | 'REVIEWER',
      }}
    >
      {children}
    </DashboardShell>
  );
}

