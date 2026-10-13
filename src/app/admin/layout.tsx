import React from 'react';
import { requireRole } from '@/lib/auth/rbac';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireRole(['ADMIN'], '/admin');

  return (
    <DashboardShell
      user={{
        name: currentUser.name || 'System Admin',
        email: currentUser.email,
        role: 'ADMIN',
      }}
    >
      {children}
    </DashboardShell>
  );
}
