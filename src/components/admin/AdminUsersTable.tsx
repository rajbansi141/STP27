'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useI18n } from '@/lib/i18n/context';
import {
  createReviewerAction,
  toggleUserStatusAction,
} from '@/app/api/admin/actions';
import {
  Search,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  X,
  Power,
} from 'lucide-react';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

interface AdminUsersTableProps {
  users: AdminUserRow[];
  currentAdminId: string;
}

export function AdminUsersTable({ users, currentAdminId }: AdminUsersTableProps) {
  const { t } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);

  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();
  const [isPending, startTransition] = useTransition();

  // Create Reviewer Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewerUsername, setReviewerUsername] = useState('');
  const [reviewerPassword, setReviewerPassword] = useState('');
  const [createFeedback, setCreateFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;

      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesUser = u.username?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesEmail && !matchesUser) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, globalFilter]);

  // Handle Create Reviewer
  const handleCreateReviewer = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);

    startTransition(async () => {
      const res = await createReviewerAction({
        name: reviewerName,
        email: reviewerEmail,
        username: reviewerUsername,
        password: reviewerPassword,
      });

      if (res.success) {
        setCreateFeedback({ type: 'success', text: t.admin.users.createModal.success });
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setReviewerName('');
          setReviewerEmail('');
          setReviewerUsername('');
          setReviewerPassword('');
          setCreateFeedback(null);
        }, 1200);
      } else {
        const msg =
          res.message ||
          (res.errors ? Object.values(res.errors).flat().join(' ') : 'Failed to create reviewer.');
        setCreateFeedback({ type: 'error', text: msg });
      }
    });
  };

  // Handle Toggle Status
  const handleToggleStatus = (targetId: string) => {
    startTransition(async () => {
      await toggleUserStatusAction(targetId);
    });
  };

  const roleStyles = {
    ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    REVIEWER: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    APPLICANT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  };

  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t.admin.users.table.name,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                {row.name}
              </div>
              <div className="text-[11px] text-stone-500 font-mono">{row.email}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: t.admin.users.table.role,
        cell: (info) => {
          const role = info.getValue() as 'ADMIN' | 'REVIEWER' | 'APPLICANT';
          return (
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${roleStyles[role]}`}
            >
              {t.roles[role]}
            </span>
          );
        },
      },
      {
        accessorKey: 'username',
        header: t.admin.users.table.username,
        cell: (info) => {
          const u = info.getValue() as string | null;
          return u ? (
            <span className="font-mono text-xs text-stone-700 dark:text-stone-300">@{u}</span>
          ) : (
            <span className="text-stone-400 text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: t.admin.users.table.status,
        cell: (info) => {
          const active = info.getValue() as boolean;
          return active ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t.admin.users.table.active}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{t.admin.users.table.inactive}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'mustChangePassword',
        header: 'Password Policy',
        cell: (info) => {
          const flag = info.getValue() as boolean;
          return flag ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Lock className="h-3 w-3" />
              <span>Reset Required</span>
            </span>
          ) : (
            <span className="text-[11px] text-stone-400">Normal</span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t.admin.users.table.created,
        cell: (info) => (
          <span className="text-[11px] text-stone-500 font-mono">
            {new Date(info.getValue() as string).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t.admin.users.table.actions,
        cell: ({ row }) => {
          const u = row.original;
          const isSelf = u.id === currentAdminId;

          return (
            <div>
              {!isSelf && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggleStatus(u.id)}
                  title={u.isActive ? t.admin.users.table.deactivateBtn : t.admin.users.table.activateBtn}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    u.isActive
                      ? 'border border-red-200 dark:border-red-800 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40'
                      : 'border border-emerald-200 dark:border-emerald-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <Power className="h-3 w-3" />
                  <span>{u.isActive ? t.admin.users.table.deactivateBtn : t.admin.users.table.activateBtn}</span>
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [t, currentAdminId, isPending]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t.admin.users.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-900 dark:text-stone-100"
          />
        </div>

        {/* Filter Dropdowns and Create Reviewer Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="ALL">{t.admin.users.roleFilter}</option>
            <option value="ADMIN">ADMIN</option>
            <option value="REVIEWER">REVIEWER</option>
            <option value="APPLICANT">APPLICANT</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="ALL">{t.admin.users.statusFilter}</option>
            <option value="ACTIVE">{t.admin.users.activeOnly}</option>
            <option value="INACTIVE">{t.admin.users.inactiveOnly}</option>
          </select>

          {/* Create Reviewer Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateFeedback(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>{t.admin.users.createReviewerBtn}</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-stone-50/80 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider select-none"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody ref={tableBodyRef} className="divide-y divide-stone-100 dark:divide-stone-800">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors text-xs"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-12 text-center text-stone-400 text-xs italic"
                  >
                    No user accounts match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <div>
            Showing{' '}
            <strong className="text-stone-800 dark:text-stone-200">
              {table.getRowModel().rows.length}
            </strong>{' '}
            of{' '}
            <strong className="text-stone-800 dark:text-stone-200">
              {filteredData.length}
            </strong>{' '}
            users
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
            >
              Previous
            </button>
            <span className="font-mono text-stone-700 dark:text-stone-300">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <button
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Provision Reviewer Account Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                {t.admin.users.createModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              {t.admin.users.createModal.notice}
            </p>

            <form onSubmit={handleCreateReviewer} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.users.createModal.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Dr. Sarita Basnet"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.users.createModal.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="reviewer@saathiteachers.org"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.users.createModal.usernameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={reviewerUsername}
                  onChange={(e) => setReviewerUsername(e.target.value)}
                  placeholder="sarita_reviewer"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.users.createModal.tempPasswordLabel}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={reviewerPassword}
                  onChange={(e) => setReviewerPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              {createFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    createFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
                  }`}
                >
                  {createFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  <span>{t.admin.users.createModal.submitBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
