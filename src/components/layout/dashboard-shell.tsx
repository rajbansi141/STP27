'use client';

import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SiteHeader } from '@/components/layout/site-header';
import { navigationConfig, type NavGroup } from '@/config/navigation';

export interface DashboardShellProps {
  children: React.ReactNode;
  navGroups?: NavGroup[];
  user: {
    name: string;
    email: string;
    role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
    avatar?: string;
  };
  deadlineDate?: string | null;
  defaultOpen?: boolean;
}

export function DashboardShell({
  children,
  navGroups,
  user,
  deadlineDate,
  defaultOpen = true,
}: DashboardShellProps) {
  const roleKey = (user.role?.toLowerCase() || 'applicant') as 'admin' | 'reviewer' | 'applicant';
  const resolvedNavGroups = navGroups || navigationConfig[roleKey] || navigationConfig.applicant;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar navGroups={resolvedNavGroups} user={user} />
      <SidebarInset className="min-w-0">
        <SiteHeader role={user.role} deadlineDate={deadlineDate} />
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
