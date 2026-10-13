import React from 'react';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  AdminUsersTable,
  type AdminUserRow,
} from '@/components/admin/AdminUsersTable';

export default async function AdminUsersPage() {
  const currentAdmin = await requireRole(['ADMIN'], '/admin/users');
  const { t } = await getServerTranslations();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const userRows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role as 'ADMIN' | 'REVIEWER' | 'APPLICANT',
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
          {t.admin.users.title}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          {t.admin.users.subtitle}
        </p>
      </div>

      <AdminUsersTable users={userRows} currentAdminId={currentAdmin.id} />
    </div>
  );
}
