import React from 'react';
import { requireAuth } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireAuth('/profile');
  const settings = await prisma.settings.findFirst();

  return (
    <DashboardShell
      user={{
        name: currentUser.name || 'User',
        email: currentUser.email,
        role: currentUser.role as any,
      }}
      deadlineDate={settings?.deadline ? settings.deadline.toISOString() : null}
    >
      {children}
    </DashboardShell>
  );
}
