'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
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
  adminCreateUserAction,
  adminResetUserPasswordAction,
  adminUpdateUserRoleAction,
  adminUpdateUserDetailsAction,
  adminUnlockUserAction,
  adminBatchToggleStatusAction,
  adminBatchForcePasswordResetAction,
  adminDeleteUserAction,
} from '@/app/api/admin/actions';
import {
  Search,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Loader2,
  X,
  Power,
  MoreHorizontal,
  Key,
  Edit3,
  Trash2,
  Copy,
  Check,
  Download,
  Eye,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Mail,
  Calendar,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  HelpCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildSanitizedCsv, downloadCsv } from '@/lib/csv';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  emailVerified?: string | null;
  createdAt: string;
  updatedAt?: string;
  applicationsCount?: number;
  reviewsCount?: number;
  assignmentsCount?: number;
}

interface AdminUsersTableProps {
  users: AdminUserRow[];
  currentAdminId: string;
}

type TabFilter = 'ALL' | 'REVIEWER' | 'APPLICANT' | 'ADMIN' | 'SUSPENDED' | 'ATTENTION';

export function AdminUsersTable({ users, currentAdminId }: AdminUsersTableProps) {
  const { t, locale } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [pageSize, setPageSize] = useState(10);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();
  const [isPending, startTransition] = useTransition();

  // Toast / notification feedback state
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Copy-to-clipboard tracker
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label} copied to clipboard!`, 'info');
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Helper for generating secure random passwords
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Modal States
  // 1. Provision Account Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'REVIEWER' | 'ADMIN' | 'APPLICANT'>('REVIEWER');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createMustChangePassword, setCreateMustChangePassword] = useState(true);
  const [createFeedback, setCreateFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 2. Reset Password Modal
  const [targetUserForPassword, setTargetUserForPassword] = useState<AdminUserRow | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [resetMustChange, setResetMustChange] = useState(true);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 3. Edit User Details Modal
  const [targetUserForEdit, setTargetUserForEdit] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editFeedback, setEditFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 4. Change Role Modal
  const [targetUserForRole, setTargetUserForRole] = useState<AdminUserRow | null>(null);
  const [selectedRoleValue, setSelectedRoleValue] = useState<'ADMIN' | 'REVIEWER' | 'APPLICANT'>('REVIEWER');

  // 5. User Details Modal / Drawer
  const [targetUserForView, setTargetUserForView] = useState<AdminUserRow | null>(null);

  // 6. Delete User Modal
  const [targetUserForDelete, setTargetUserForDelete] = useState<AdminUserRow | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Statistics Computations
  const stats = useMemo(() => {
    let total = users.length;
    let active = 0;
    let admins = 0;
    let reviewers = 0;
    let activeReviewers = 0;
    let applicants = 0;
    let suspended = 0;
    let attentionNeeded = 0;

    users.forEach((u) => {
      if (u.isActive) active++;
      else suspended++;

      if (u.role === 'ADMIN') admins++;
      if (u.role === 'REVIEWER') {
        reviewers++;
        if (u.isActive) activeReviewers++;
      }
      if (u.role === 'APPLICANT') applicants++;

      const isLocked = (u.failedLoginAttempts && u.failedLoginAttempts >= 5) || !!u.lockedUntil;
      if (u.mustChangePassword || isLocked || !u.isActive) {
        attentionNeeded++;
      }
    });

    return {
      total,
      active,
      suspended,
      admins,
      reviewers,
      activeReviewers,
      applicants,
      attentionNeeded,
    };
  }, [users]);

  // Tab count indicators
  const tabCounts = useMemo(() => {
    return {
      ALL: users.length,
      REVIEWER: users.filter((u) => u.role === 'REVIEWER').length,
      APPLICANT: users.filter((u) => u.role === 'APPLICANT').length,
      ADMIN: users.filter((u) => u.role === 'ADMIN').length,
      SUSPENDED: users.filter((u) => !u.isActive).length,
      ATTENTION: users.filter(
        (u) =>
          u.mustChangePassword ||
          (u.failedLoginAttempts && u.failedLoginAttempts >= 5) ||
          !!u.lockedUntil
      ).length,
    };
  }, [users]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return users.filter((u) => {
      // Tab filter
      if (activeTab === 'REVIEWER' && u.role !== 'REVIEWER') return false;
      if (activeTab === 'APPLICANT' && u.role !== 'APPLICANT') return false;
      if (activeTab === 'ADMIN' && u.role !== 'ADMIN') return false;
      if (activeTab === 'SUSPENDED' && u.isActive) return false;
      if (activeTab === 'ATTENTION') {
        const isAttention =
          u.mustChangePassword ||
          (u.failedLoginAttempts && u.failedLoginAttempts >= 5) ||
          !!u.lockedUntil;
        if (!isAttention) return false;
      }

      // Secondary dropdown filters
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;
      if (statusFilter === 'LOCKED') {
        const isLocked = (u.failedLoginAttempts && u.failedLoginAttempts >= 5) || !!u.lockedUntil;
        if (!isLocked) return false;
      }

      if (verificationFilter === 'VERIFIED' && !u.emailVerified) return false;
      if (verificationFilter === 'UNVERIFIED' && u.emailVerified) return false;

      // Global text search (Name, Email, Username, ID)
      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesUser = u.username?.toLowerCase().includes(q) || false;
        const matchesId = u.id.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesUser && !matchesId) return false;
      }
      return true;
    });
  }, [users, activeTab, roleFilter, statusFilter, verificationFilter, globalFilter]);

  // Handle Multi-Selection
  const isAllPageSelected = useMemo(() => {
    if (filteredData.length === 0) return false;
    return filteredData.every((u) => selectedIds.has(u.id));
  }, [filteredData, selectedIds]);

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredData.forEach((u) => next.add(u.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // CSV Export Action (Sanitized against CWE-1236 Formula Injection)
  const handleExportCSV = (dataset: AdminUserRow[] = filteredData, filenamePrefix = 'stp27_users') => {
    if (dataset.length === 0) {
      showToast('No user records to export.', 'info');
      return;
    }

    const headers = [
      'User ID',
      'Full Name',
      'Email Address',
      'Username',
      'Role',
      'Status',
      'Email Verified',
      'Must Change Password',
      'Failed Login Attempts',
      'Applications Count',
      'Reviews Count',
      'Registration Date',
    ];

    const rows = dataset.map((u) => [
      u.id,
      u.name,
      u.email,
      u.username || '',
      u.role,
      u.isActive ? 'Active' : 'Suspended',
      u.emailVerified ? 'Verified' : 'Unverified',
      u.mustChangePassword ? 'Yes' : 'No',
      u.failedLoginAttempts || 0,
      u.applicationsCount || 0,
      u.reviewsCount || 0,
      new Date(u.createdAt).toISOString(),
    ]);

    const csv = buildSanitizedCsv(headers, rows);
    downloadCsv(`${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast(`Exported ${dataset.length} user record(s) to CSV!`, 'success');
  };

  // Provision User Submission
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);

    startTransition(async () => {
      const res = await adminCreateUserAction({
        name: createName,
        email: createEmail,
        username: createUsername,
        password: createPassword,
        role: createRole,
        mustChangePassword: createMustChangePassword,
      });

      if (res.success) {
        setCreateFeedback({
          type: 'success',
          text: t.admin.users.createModal.success || 'User account provisioned successfully.',
        });
        showToast(`Provisioned account for ${createName}`, 'success');
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setCreateName('');
          setCreateEmail('');
          setCreateUsername('');
          setCreatePassword('');
          setCreateFeedback(null);
        }, 1200);
      } else {
        const msg =
          res.message ||
          (res.errors ? Object.values(res.errors).flat().join(' ') : 'Failed to create user account.');
        setCreateFeedback({ type: 'error', text: msg });
      }
    });
  };

  // Single User Status Toggle
  const handleToggleStatus = (targetId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleUserStatusAction(targetId);
      if (res.success) {
        showToast(
          currentStatus ? 'User account suspended.' : 'User account activated successfully.',
          'success'
        );
      } else {
        showToast(res.message || 'Failed to update user status.', 'error');
      }
    });
  };

  // Reset Password Submission
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPassword) return;
    setPasswordFeedback(null);

    startTransition(async () => {
      const res = await adminResetUserPasswordAction({
        userId: targetUserForPassword.id,
        newPassword: newPasswordValue,
        mustChangePassword: resetMustChange,
      });

      if (res.success) {
        setPasswordFeedback({ type: 'success', text: 'Password reset successfully!' });
        showToast(`Password reset for ${targetUserForPassword.name}.`, 'success');
        setTimeout(() => {
          setTargetUserForPassword(null);
          setNewPasswordValue('');
          setPasswordFeedback(null);
        }, 1200);
      } else {
        setPasswordFeedback({ type: 'error', text: res.message || 'Failed to reset password.' });
      }
    });
  };

  // Edit User Details Submission
  const handleUpdateUserDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForEdit) return;
    setEditFeedback(null);

    startTransition(async () => {
      const res = await adminUpdateUserDetailsAction({
        userId: targetUserForEdit.id,
        name: editName,
        email: editEmail,
        username: editUsername || null,
      });

      if (res.success) {
        setEditFeedback({ type: 'success', text: 'Account details updated successfully!' });
        showToast(`Updated profile for ${editName}`, 'success');
        setTimeout(() => {
          setTargetUserForEdit(null);
          setEditFeedback(null);
        }, 1200);
      } else {
        setEditFeedback({ type: 'error', text: res.message || 'Failed to update details.' });
      }
    });
  };

  // Change User Role Submission
  const handleChangeRole = () => {
    if (!targetUserForRole) return;

    startTransition(async () => {
      const res = await adminUpdateUserRoleAction({
        userId: targetUserForRole.id,
        role: selectedRoleValue,
      });

      if (res.success) {
        showToast(`Role updated to ${selectedRoleValue} for ${targetUserForRole.name}`, 'success');
        setTargetUserForRole(null);
      } else {
        showToast(res.message || 'Failed to update user role.', 'error');
      }
    });
  };

  // Unlock User Account
  const handleUnlockUser = (userId: string, userName: string) => {
    startTransition(async () => {
      const res = await adminUnlockUserAction(userId);
      if (res.success) {
        showToast(`Account unlocked for ${userName}.`, 'success');
      } else {
        showToast(res.message || 'Failed to unlock account.', 'error');
      }
    });
  };

  // Batch Status Update
  const handleBatchToggleStatus = (setActive: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    startTransition(async () => {
      const res = await adminBatchToggleStatusAction({
        userIds: ids,
        setActive,
      });

      if (res.success) {
        showToast(res.message || 'Accounts updated.', 'success');
        setSelectedIds(new Set());
      } else {
        showToast(res.message || 'Failed to update selected accounts.', 'error');
      }
    });
  };

  // Batch Force Password Reset
  const handleBatchForcePasswordReset = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    startTransition(async () => {
      const res = await adminBatchForcePasswordResetAction({
        userIds: ids,
      });

      if (res.success) {
        showToast(res.message || 'Password reset policy enforced.', 'success');
        setSelectedIds(new Set());
      } else {
        showToast(res.message || 'Failed to enforce password reset.', 'error');
      }
    });
  };

  // Delete User Submission
  const handleDeleteUser = () => {
    if (!targetUserForDelete) return;

    startTransition(async () => {
      const res = await adminDeleteUserAction(targetUserForDelete.id);
      if (res.success) {
        showToast(res.message || 'User deleted successfully.', 'success');
        setTargetUserForDelete(null);
        setDeleteConfirmationInput('');
      } else {
        showToast(res.message || 'Failed to delete user.', 'error');
      }
    });
  };

  const roleStyles = {
    ADMIN: {
      badge:
        'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
      avatarRing: 'ring-purple-400 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      icon: Shield,
    },
    REVIEWER: {
      badge:
        'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      avatarRing: 'ring-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      icon: UserCheck,
    },
    APPLICANT: {
      badge:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      avatarRing:
        'ring-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      icon: User,
    },
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');
  };

  // Tanstack Table Columns definition
  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              title="Select / Deselect all on current page"
            >
              {isAllPageSelected ? (
                <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : selectedIds.size > 0 ? (
                <div className="h-4 w-4 rounded bg-emerald-600/20 border border-emerald-600 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 bg-emerald-600 rounded-sm" />
                </div>
              ) : (
                <Square className="h-4 w-4 text-stone-300 dark:text-stone-600" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => {
          const u = row.original;
          const isSelected = selectedIds.has(u.id);
          return (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSelectOne(u.id);
                }}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4 text-stone-300 dark:text-stone-600" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        header: () => (
          <div className="flex items-center gap-1.5">
            <span>{t.admin.users.table.name}</span>
          </div>
        ),
        cell: (info) => {
          const row = info.row.original;
          const isSelf = row.id === currentAdminId;
          const style = roleStyles[row.role];
          const initials = getInitials(row.name);

          return (
            <div className="flex items-center gap-3">
              {/* Avatar circle */}
              <div
                className={`relative flex items-center justify-center h-8 w-8 rounded-full font-bold text-xs shrink-0 ring-1 shadow-xs ${style.avatarRing}`}
              >
                {initials}
                {row.isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900" />
                )}
              </div>

              {/* Name & Contact */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs truncate max-w-[180px] sm:max-w-[220px]">
                    {row.name}
                  </span>
                  {isSelf && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200">
                      You
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-stone-500 font-mono">
                  <span className="truncate max-w-[160px] sm:max-w-[200px]">{row.email}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(row.email, `email-${row.id}`, 'Email');
                    }}
                    title="Copy email address"
                    className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                  >
                    {copiedKey === `email-${row.id}` ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: t.admin.users.table.role,
        cell: (info) => {
          const role = info.getValue() as 'ADMIN' | 'REVIEWER' | 'APPLICANT';
          const style = roleStyles[role];
          const Icon = style.icon;

          return (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${style.badge}`}
            >
              <Icon className="h-3 w-3" />
              <span>{t.roles[role] || role}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'username',
        header: t.admin.users.table.username,
        cell: (info) => {
          const u = info.getValue() as string | null;
          const row = info.row.original;

          return u ? (
            <div className="flex items-center gap-1 font-mono text-xs text-stone-700 dark:text-stone-300">
              <span className="truncate max-w-[110px]">@{u}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(u, `user-${row.id}`, 'Username');
                }}
                title="Copy username"
                className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              >
                {copiedKey === `user-${row.id}` ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-stone-400 text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: t.admin.users.table.status,
        cell: (info) => {
          const row = info.row.original;
          const active = info.getValue() as boolean;
          const isLocked =
            (row.failedLoginAttempts && row.failedLoginAttempts >= 5) || !!row.lockedUntil;

          if (isLocked) {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                <Lock className="h-3 w-3" />
                <span>Locked</span>
              </span>
            );
          }

          return active ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t.admin.users.table.active}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>{t.admin.users.table.inactive}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'mustChangePassword',
        header: 'Security / Verification',
        cell: (info) => {
          const row = info.row.original;
          const mustChange = info.getValue() as boolean;
          const isVerified = !!row.emailVerified;

          return (
            <div className="flex flex-col gap-1 items-start">
              {mustChange ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Lock className="h-2.5 w-2.5" />
                  <span>Reset Required</span>
                </span>
              ) : (
                <span className="text-[10px] text-stone-500 font-medium">Password Set</span>
              )}

              {isVerified ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span>Email Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-400">
                  <span>Unverified</span>
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'workload',
        header: 'Activity & Records',
        cell: ({ row }) => {
          const u = row.original;
          if (u.role === 'REVIEWER') {
            return (
              <div className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {u.reviewsCount || 0} reviews
                </span>
                <span className="text-stone-400 mx-1">•</span>
                <span>{u.assignmentsCount || 0} assigned</span>
              </div>
            );
          }
          if (u.role === 'APPLICANT') {
            return (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                {u.applicationsCount || 0} application(s)
              </div>
            );
          }
          return <span className="text-[11px] text-purple-700 dark:text-purple-400 font-semibold">Admin Access</span>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: t.admin.users.table.created,
        cell: (info) => (
          <div className="flex flex-col text-[11px]">
            <span className="text-stone-700 dark:text-stone-300 font-mono">
              {new Date(info.getValue() as string).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-right block pr-2">{t.admin.users.table.actions}</span>,
        cell: ({ row }) => {
          const u = row.original;
          const isSelf = u.id === currentAdminId;
          const isLocked =
            (u.failedLoginAttempts && u.failedLoginAttempts >= 5) || !!u.lockedUntil;

          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Quick Power Toggle */}
              {!isSelf && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggleStatus(u.id, u.isActive)}
                  title={u.isActive ? t.admin.users.table.deactivateBtn : t.admin.users.table.activateBtn}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    u.isActive
                      ? 'border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      : 'border border-emerald-300 dark:border-emerald-800 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Action Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer focus:outline-none"
                  title="More User Operations"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs p-1">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2 py-1">
                    Manage {u.name.split(' ')[0]}
                  </DropdownMenuLabel>

                  {/* View Details */}
                  <DropdownMenuItem
                    onClick={() => setTargetUserForView(u)}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <Eye className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                    <span>View Profile & Activity</span>
                  </DropdownMenuItem>

                  {/* Contextual Route Links */}
                  {u.role === 'APPLICANT' && (
                    <DropdownMenuItem
                      render={
                        <Link
                          href={`/admin/candidates?search=${encodeURIComponent(u.email)}`}
                          className="flex items-center gap-2 px-2 py-1.5 font-medium text-emerald-700 dark:text-emerald-400"
                        />
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span>View Candidate Application</span>
                    </DropdownMenuItem>
                  )}

                  {u.role === 'REVIEWER' && (
                    <DropdownMenuItem
                      render={
                        <Link
                          href={`/admin/committee/${u.id}`}
                          className="flex items-center gap-2 px-2 py-1.5 font-medium text-blue-700 dark:text-blue-400"
                        />
                      }
                    >
                      <UserCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>View Committee Member Dossier</span>
                    </DropdownMenuItem>
                  )}

                  {/* Edit Profile */}
                  <DropdownMenuItem
                    onClick={() => {
                      setTargetUserForEdit(u);
                      setEditName(u.name);
                      setEditEmail(u.email);
                      setEditUsername(u.username || '');
                      setEditFeedback(null);
                    }}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>Edit Account Details</span>
                  </DropdownMenuItem>

                  {/* Reset Password */}
                  <DropdownMenuItem
                    onClick={() => {
                      setTargetUserForPassword(u);
                      setNewPasswordValue(generateStrongPassword());
                      setResetMustChange(true);
                      setPasswordFeedback(null);
                    }}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <Key className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Reset / Set Password</span>
                  </DropdownMenuItem>

                  {/* Change Role (cannot demote self) */}
                  {!isSelf && (
                    <DropdownMenuItem
                      onClick={() => {
                        setTargetUserForRole(u);
                        setSelectedRoleValue(u.role);
                      }}
                      className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                    >
                      <Shield className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span>Change Platform Role</span>
                    </DropdownMenuItem>
                  )}

                  {/* Unlock Account if locked */}
                  {isLocked && (
                    <DropdownMenuItem
                      onClick={() => handleUnlockUser(u.id, u.name)}
                      className="cursor-pointer gap-2 px-2 py-1.5 font-medium text-amber-700 dark:text-amber-400"
                    >
                      <Unlock className="h-3.5 w-3.5 shrink-0" />
                      <span>Unlock Account Now</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="my-1 border-stone-200 dark:border-stone-800" />

                  {/* Delete Account */}
                  {!isSelf && (
                    <DropdownMenuItem
                      onClick={() => {
                        setTargetUserForDelete(u);
                        setDeleteConfirmationInput('');
                      }}
                      className="cursor-pointer gap-2 px-2 py-1.5 font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Delete User Account</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, currentAdminId, isPending, selectedIds, isAllPageSelected, copiedKey]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-5">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/90 text-white border-emerald-600'
              : toastMessage.type === 'error'
              ? 'bg-rose-900/90 text-white border-rose-600'
              : 'bg-stone-900/90 text-white border-stone-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-stone-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Accounts */}
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`text-left p-3.5 rounded-2xl border transition-all shadow-xs ${
            activeTab === 'ALL'
              ? 'bg-stone-900 text-white border-stone-800 dark:bg-stone-100 dark:text-stone-900 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
            <span>{t.admin.users.stats.totalUsers}</span>
            <Layers className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-heading mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] opacity-75 mt-0.5">
            {stats.active} Active • {stats.suspended} Suspended
          </div>
        </button>

        {/* Reviewers */}
        <button
          type="button"
          onClick={() => setActiveTab('REVIEWER')}
          className={`text-left p-3.5 rounded-2xl border transition-all shadow-xs ${
            activeTab === 'REVIEWER'
              ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-blue-300 dark:hover:border-blue-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-medium">
            <span>{t.admin.users.stats.activeReviewers}</span>
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-heading mt-1 text-stone-900 dark:text-stone-50">
            {stats.reviewers}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            {stats.activeReviewers} currently active
          </div>
        </button>

        {/* Applicants */}
        <button
          type="button"
          onClick={() => setActiveTab('APPLICANT')}
          className={`text-left p-3.5 rounded-2xl border transition-all shadow-xs ${
            activeTab === 'APPLICANT'
              ? 'bg-emerald-700 text-white border-emerald-600 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>{t.admin.users.stats.applicants}</span>
            <User className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-heading mt-1 text-stone-900 dark:text-stone-50">
            {stats.applicants}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Registered candidates
          </div>
        </button>

        {/* Administrators */}
        <button
          type="button"
          onClick={() => setActiveTab('ADMIN')}
          className={`text-left p-3.5 rounded-2xl border transition-all shadow-xs ${
            activeTab === 'ADMIN'
              ? 'bg-purple-700 text-white border-purple-600 ring-2 ring-purple-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-purple-300 dark:hover:border-purple-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-medium">
            <span>{t.admin.users.stats.admins}</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-heading mt-1 text-stone-900 dark:text-stone-50">
            {stats.admins}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Full system control
          </div>
        </button>

        {/* Attention Needed / Security Flags */}
        <button
          type="button"
          onClick={() => setActiveTab('ATTENTION')}
          className={`col-span-2 sm:col-span-1 text-left p-3.5 rounded-2xl border transition-all shadow-xs ${
            activeTab === 'ATTENTION'
              ? 'bg-amber-600 text-white border-amber-500 ring-2 ring-amber-500/30'
              : stats.attentionNeeded > 0
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:border-amber-300'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-medium">
            <span>{t.admin.users.stats.attentionNeeded}</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-heading mt-1 text-amber-900 dark:text-amber-200">
            {stats.attentionNeeded}
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            Requires attention
          </div>
        </button>
      </div>

      {/* Quick Filter Tabs Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          {(
            [
              { key: 'ALL', label: t.admin.users.tabs.all },
              { key: 'REVIEWER', label: t.admin.users.tabs.reviewers },
              { key: 'APPLICANT', label: t.admin.users.tabs.applicants },
              { key: 'ADMIN', label: t.admin.users.tabs.admins },
              { key: 'SUSPENDED', label: t.admin.users.tabs.suspended },
              { key: 'ATTENTION', label: t.admin.users.tabs.attention },
            ] as const
          ).map((tab) => {
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-emerald-950 text-emerald-200'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t.admin.users.searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-900 dark:text-stone-100"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Controls & Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">{t.admin.users.statusFilter}</option>
            <option value="ACTIVE">{t.admin.users.activeOnly}</option>
            <option value="INACTIVE">{t.admin.users.inactiveOnly}</option>
            <option value="LOCKED">Locked Accounts</option>
          </select>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={() => handleExportCSV()}
            title="Download complete user directory in CSV format"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-stone-500" />
            <span className="hidden sm:inline">{t.admin.users.exportBtn}</span>
            <span className="sm:hidden">CSV</span>
          </button>

          {/* Provision Account Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreatePassword(generateStrongPassword());
              setCreateRole('REVIEWER');
              setCreateFeedback(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>{t.admin.users.createUserBtn}</span>
          </button>
        </div>
      </div>

      {/* Multi-Selection Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-950 text-white border border-emerald-800 rounded-2xl p-3 px-4 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <CheckSquare className="h-4 w-4 text-emerald-400" />
            <span>
              <strong>{selectedIds.size}</strong> {t.admin.users.bulk.selected}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Activate */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleBatchToggleStatus(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white transition-colors"
            >
              {t.admin.users.bulk.activate}
            </button>

            {/* Bulk Suspend */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleBatchToggleStatus(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-900 hover:bg-rose-800 text-rose-100 transition-colors"
            >
              {t.admin.users.bulk.suspend}
            </button>

            {/* Bulk Force Password Reset */}
            <button
              type="button"
              disabled={isPending}
              onClick={handleBatchForcePasswordReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-900/80 hover:bg-amber-800 text-amber-100 transition-colors flex items-center gap-1"
            >
              <Key className="h-3 w-3" />
              <span>{t.admin.users.bulk.resetPassword}</span>
            </button>

            {/* Export Selected to CSV */}
            <button
              type="button"
              onClick={() => {
                const selectedUsers = users.filter((u) => selectedIds.has(u.id));
                handleExportCSV(selectedUsers, 'selected_users');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              <span>{t.admin.users.bulk.exportCsv}</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
            >
              {t.admin.users.bulk.deselectAll}
            </button>
          </div>
        </div>
      )}

      {/* Main Users Table */}
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
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedIds.has(row.original.id);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors text-xs ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-16 text-center text-stone-400 text-xs italic"
                  >
                    <div className="max-w-xs mx-auto space-y-2">
                      <HelpCircle className="h-8 w-8 mx-auto text-stone-300 dark:text-stone-600" />
                      <p className="font-semibold text-stone-700 dark:text-stone-300">
                        No user accounts match current filters
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Try resetting your search query or switching tabs.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination Bar */}
        <div className="px-4 py-3.5 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-3">
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

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-stone-200 dark:border-stone-700">
              <span className="text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
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
            <span className="font-mono text-stone-700 dark:text-stone-300 px-1">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
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

      {/* 1. Provision Account Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    {t.admin.users.createModal.title}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Create new account with custom role & initial credentials.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 pt-1">
              {/* Role Selection Tabs */}
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                  {t.admin.users.createModal.roleLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['REVIEWER', 'ADMIN', 'APPLICANT'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCreateRole(r)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        createRole === r
                          ? r === 'ADMIN'
                            ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-500 text-purple-900 dark:text-purple-200'
                            : r === 'REVIEWER'
                            ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-500 text-blue-900 dark:text-blue-200'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.users.createModal.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Dr. Sarita Basnet"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.users.createModal.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="name@domain.org"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.users.createModal.usernameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  placeholder="sarita_basnet"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {t.admin.users.createModal.tempPasswordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateStrongPassword())}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-3 pr-8 py-2 rounded-xl text-xs font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(createPassword, 'create-pass', 'Temporary Password')}
                    title="Copy generated password"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Must Change Password Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mustChangeOnFirstLogin"
                  checked={createMustChangePassword}
                  onChange={(e) => setCreateMustChangePassword(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor="mustChangeOnFirstLogin"
                  className="text-xs text-stone-600 dark:text-stone-300 cursor-pointer select-none"
                >
                  {t.admin.users.createModal.mustChangeNotice}
                </label>
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
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

      {/* 2. Reset Password Modal */}
      {targetUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    Reset User Password
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Set a new password for {targetUserForPassword.name}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetUserForPassword(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-1">
              <div className="font-semibold text-stone-900 dark:text-stone-100">
                {targetUserForPassword.name}
              </div>
              <div className="font-mono text-stone-500 text-[11px]">
                {targetUserForPassword.email}
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordValue(generateStrongPassword())}
                    className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Generate Secure</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full pl-3 pr-16 py-2 rounded-xl text-xs font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="p-1 text-stone-400 hover:text-stone-700 text-[10px] font-semibold"
                    >
                      {showPasswordText ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          `Email: ${targetUserForPassword.email}\nPassword: ${newPasswordValue}`,
                          'copy-credentials',
                          'Credentials'
                        )
                      }
                      title="Copy email & password to clipboard"
                      className="p-1 text-stone-400 hover:text-stone-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resetMustChange"
                  checked={resetMustChange}
                  onChange={(e) => setResetMustChange(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="resetMustChange"
                  className="text-xs text-stone-600 dark:text-stone-300 cursor-pointer select-none"
                >
                  Require user to change password on next sign-in
                </label>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
                  }`}
                >
                  {passwordFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setTargetUserForPassword(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Key className="h-3.5 w-3.5" />
                  )}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit User Details Modal */}
      {targetUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    Edit Account Profile
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Modify profile details for {targetUserForEdit.name}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetUserForEdit(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserDetails} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Username (optional)
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {editFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    editFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
                  }`}
                >
                  {editFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setTargetUserForEdit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Change Role Modal */}
      {targetUserForRole && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    Change User Role
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Update access level for {targetUserForRole.name}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetUserForRole(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {(
                [
                  {
                    role: 'ADMIN',
                    title: 'System Administrator',
                    desc: 'Full administrative access to cycles, candidate records, evaluation metrics, and system configuration.',
                    color: 'purple',
                  },
                  {
                    role: 'REVIEWER',
                    title: 'Selection Committee Reviewer',
                    desc: 'Access to evaluation console, assigned candidate portfolios, scoring rubric, and consensus deliberations.',
                    color: 'blue',
                  },
                  {
                    role: 'APPLICANT',
                    title: 'Fellowship Applicant',
                    desc: 'Standard candidate account with access to personal application portal and notifications.',
                    color: 'emerald',
                  },
                ] as const
              ).map((opt) => (
                <div
                  key={opt.role}
                  onClick={() => setSelectedRoleValue(opt.role)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedRoleValue === opt.role
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-600'
                      : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                      {opt.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleStyles[opt.role].badge}`}
                    >
                      {opt.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setTargetUserForRole(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || selectedRoleValue === targetUserForRole.role}
                onClick={handleChangeRole}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                <span>Confirm Role Change</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. User Details & Activity Modal / Drawer */}
      {targetUserForView && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm ring-2 ${
                    roleStyles[targetUserForView.role].avatarRing
                  }`}
                >
                  {getInitials(targetUserForView.name)}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    {targetUserForView.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span>{targetUserForView.email}</span>
                    {targetUserForView.username && (
                      <span className="font-mono text-stone-400">@{targetUserForView.username}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetUserForView(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Status Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  roleStyles[targetUserForView.role].badge
                }`}
              >
                {targetUserForView.role}
              </span>

              {targetUserForView.isActive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Active Account</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Suspended</span>
                </span>
              )}

              {targetUserForView.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                  <Check className="h-3 w-3" />
                  <span>Email Verified</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                  Email Unverified
                </span>
              )}
            </div>

            {/* Workload / Metrics Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-center">
                <div className="text-[10px] uppercase font-bold text-stone-400">Applications</div>
                <div className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100 mt-0.5">
                  {targetUserForView.applicationsCount || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-center">
                <div className="text-[10px] uppercase font-bold text-stone-400">Reviews Done</div>
                <div className="text-lg font-bold font-heading text-blue-700 dark:text-blue-400 mt-0.5">
                  {targetUserForView.reviewsCount || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-center">
                <div className="text-[10px] uppercase font-bold text-stone-400">Assigned</div>
                <div className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100 mt-0.5">
                  {targetUserForView.assignmentsCount || 0}
                </div>
              </div>
            </div>

            {/* Account Details Specs */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              <div className="p-2.5 px-3 flex justify-between">
                <span className="text-stone-500">User ID:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">{targetUserForView.id}</span>
              </div>
              <div className="p-2.5 px-3 flex justify-between">
                <span className="text-stone-500">Registered On:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">
                  {new Date(targetUserForView.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 px-3 flex justify-between">
                <span className="text-stone-500">Password Policy:</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {targetUserForView.mustChangePassword ? 'Password reset forced on login' : 'Normal'}
                </span>
              </div>
              <div className="p-2.5 px-3 flex justify-between">
                <span className="text-stone-500">Failed Logins:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">
                  {targetUserForView.failedLoginAttempts || 0} attempt(s)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetUserForView(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Delete User Confirmation Modal */}
      {targetUserForDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  Delete User Account
                </h3>
                <p className="text-[11px] text-stone-500">
                  Permanent action for {targetUserForDelete.name}.
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-stone-900 dark:text-stone-100">{targetUserForDelete.name}</strong> (
              <span className="font-mono">{targetUserForDelete.email}</span>)?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              If this user has already submitted candidate evaluation reviews, deletion will be blocked to maintain review auditing integrity.
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 block mb-1">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setTargetUserForDelete(null);
                  setDeleteConfirmationInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || deleteConfirmationInput !== 'DELETE'}
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1.5 disabled:opacity-40"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
