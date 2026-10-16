'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MoreHorizontal,
  Search,
  KeyRound,
  ShieldAlert,
  UserCheck,
  UserX,
  FileEdit,
  Trash2,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  User,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import {
  toggleMemberStatus,
  resetMemberPassword,
  deleteCommitteeMember,
} from '@/app/api/admin/committee/actions';
import { OneTimeCredentialsDialog } from './OneTimeCredentialsDialog';
import { AddMemberSheet } from './AddMemberSheet';

export interface CommitteeMemberRow {
  id: string;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastActiveAt?: string | null;
  evaluationsDone: number;
  evaluationsPending: number;
  reviewerProfile?: {
    phone?: string | null;
  } | null;
}

interface CommitteeTableProps {
  initialMembers: CommitteeMemberRow[];
}

export function CommitteeTable({ initialMembers }: CommitteeTableProps) {
  const { t, locale } = useI18n();
  const [members, setMembers] = React.useState<CommitteeMemberRow[]>(initialMembers);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // Modals & Sheets
  const [editingMember, setEditingMember] = React.useState<CommitteeMemberRow | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [deletingMember, setDeletingMember] = React.useState<CommitteeMemberRow | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{
    username: string;
    email: string;
    password: string;
  } | null>(null);
  const [isCredentialsOpen, setIsCredentialsOpen] = React.useState(false);

  // Sync when initialMembers update
  React.useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // Filtering
  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (m.username && m.username.toLowerCase().includes(q)) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        m.name.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && m.isActive) ||
        (statusFilter === 'SUSPENDED' && !m.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  const handleToggleStatus = async (memberId: string) => {
    try {
      const res = await toggleMemberStatus(memberId);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, isActive: res.isActive } : m))
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleResetPassword = async (member: CommitteeMemberRow) => {
    try {
      const res = await resetMemberPassword(member.id);
      setCredentials(res.credentials);
      setIsCredentialsOpen(true);
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;
    setIsDeleting(true);
    try {
      await deleteCommitteeMember(deletingMember.id);
      setMembers((prev) => prev.filter((m) => m.id !== deletingMember.id));
      setIsDeleteOpen(false);
      setDeletingMember(null);
    } catch (err) {
      console.error('Failed to delete reviewer:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatLastActive = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return locale === 'ne' ? 'भर्खरै' : 'Just now';
    if (diffMins < 60)
      return locale === 'ne' ? `${diffMins} मिनेट अघि` : `${diffMins}m ago`;
    if (diffHours < 24)
      return locale === 'ne' ? `${diffHours} घण्टा अघि` : `${diffHours}h ago`;
    if (diffDays < 7)
      return locale === 'ne' ? `${diffDays} दिन अघि` : `${diffDays}d ago`;

    return date.toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-CA');
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              locale === 'ne'
                ? 'प्रयोगकर्ता नाम, इमेल वा फोनबाट खोज्नुहोस्...'
                : 'Search by username, email, phone...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">{locale === 'ne' ? 'सबै स्थिति' : 'All Statuses'}</option>
            <option value="ACTIVE">{locale === 'ne' ? 'सक्रिय मात्र' : 'Active Only'}</option>
            <option value="SUSPENDED">{locale === 'ne' ? 'निलम्बित मात्र' : 'Suspended Only'}</option>
          </select>
        </div>
      </div>

      {/* Simplified Reviewer Table */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <TableRow>
                <TableHead>{locale === 'ne' ? 'प्रयोगकर्ता नाम' : 'Username'}</TableHead>
                <TableHead>{locale === 'ne' ? 'इमेल' : 'Email'}</TableHead>
                <TableHead>{locale === 'ne' ? 'फोन नम्बर' : 'Phone'}</TableHead>
                <TableHead>{locale === 'ne' ? 'स्थिति' : 'Status'}</TableHead>
                <TableHead>{locale === 'ne' ? 'पछिल्लो सक्रियता' : 'Last Active'}</TableHead>
                <TableHead className="text-center">
                  {locale === 'ne' ? 'मूल्याङ्कन (सम्पन्न / बाँकी)' : 'Evaluations (Done / Pending)'}
                </TableHead>
                <TableHead className="text-right">{locale === 'ne' ? 'कार्य' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                    {locale === 'ne'
                      ? 'कुनै मूल्याङ्कनकर्ता फेला परेन।'
                      : 'No reviewers found matching your filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => {
                  const phoneDisplay = member.phone || member.reviewerProfile?.phone || '—';

                  return (
                    <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                      {/* 1. Username */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {(member.username || member.name).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/admin/committee/${member.id}`}
                              className="font-semibold text-xs text-foreground font-mono hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                              {member.username || member.name}
                            </Link>
                            <span className="text-[10px] text-muted-foreground block">
                              Role: REVIEWER
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Email */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <Mail className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className="truncate max-w-[200px]">{member.email}</span>
                        </div>
                      </TableCell>

                      {/* 3. Phone */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                          <Phone className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span>{phoneDisplay}</span>
                        </div>
                      </TableCell>

                      {/* 4. Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            member.isActive
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px]'
                          }
                        >
                          {member.isActive
                            ? locale === 'ne'
                              ? 'सक्रिय'
                              : 'Active'
                            : locale === 'ne'
                            ? 'निलम्बित'
                            : 'Suspended'}
                        </Badge>
                      </TableCell>

                      {/* 5. Last active */}
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span>{formatLastActive(member.lastActiveAt)}</span>
                        </div>
                      </TableCell>

                      {/* 6. Evaluations done / pending */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-mono">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {member.evaluationsDone} done
                          </span>
                          <span className="text-muted-foreground/40">/</span>
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {member.evaluationsPending} pending
                          </span>
                        </div>
                      </TableCell>

                      {/* 7. Row actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>
                              {locale === 'ne' ? 'कार्यहरू' : 'Reviewer Actions'}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* View Profile & Performance */}
                            <DropdownMenuItem
                              render={
                                <Link
                                  href={`/admin/committee/${member.id}`}
                                  className="flex items-center w-full"
                                />
                              }
                              className="cursor-pointer"
                            >
                              <User className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                              <span>{locale === 'ne' ? 'विवरण र कार्यसम्पादन' : 'View Profile & Performance'}</span>
                            </DropdownMenuItem>

                            {/* Edit Phone / Email */}
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingMember(member);
                                setIsEditOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <FileEdit className="mr-2 h-3.5 w-3.5" />
                              <span>{locale === 'ne' ? 'इमेल / फोन सम्पादन' : 'Edit Phone / Email'}</span>
                            </DropdownMenuItem>

                            {/* Reset Password */}
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(member)}
                              className="cursor-pointer"
                            >
                              <KeyRound className="mr-2 h-3.5 w-3.5 text-amber-600" />
                              <span>{locale === 'ne' ? 'पासवर्ड पुनःसेट' : 'Reset Password'}</span>
                            </DropdownMenuItem>

                            {/* Suspend / Reactivate */}
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(member.id)}
                              className="cursor-pointer"
                            >
                              {member.isActive ? (
                                <>
                                  <UserX className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                  <span>{locale === 'ne' ? 'खाता निलम्बन' : 'Suspend Account'}</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                  <span>{locale === 'ne' ? 'खाता पुनः सक्रिय' : 'Reactivate Account'}</span>
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Delete */}
                            <DropdownMenuItem
                              onClick={() => {
                                setDeletingMember(member);
                                setIsDeleteOpen(true);
                              }}
                              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              <span>{locale === 'ne' ? 'हटाउनुहोस्' : 'Delete Reviewer'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Reviewer Sheet (reusing AddMemberSheet with initialData) */}
      <AddMemberSheet
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingMember(null);
        }}
        onSuccess={() => {}}
        initialData={editingMember}
      />

      {/* Delete Reviewer Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">
              {locale === 'ne' ? 'मूल्याङ्कनकर्ता खाता हटाउने पुष्टि' : 'Confirm Delete Reviewer'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm">
              {locale === 'ne' ? (
                <>
                  के तपाईं निश्चित रूपमा मूल्याङ्कनकर्ता{' '}
                  <strong className="text-foreground">{deletingMember?.username || deletingMember?.email}</strong>{' '}
                  लाई हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete reviewer{' '}
                  <strong className="text-foreground">{deletingMember?.username || deletingMember?.email}</strong>?
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              {locale === 'ne' ? 'रद्द' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>{locale === 'ne' ? 'हटाउँदै...' : 'Deleting...'}</span>
                </>
              ) : (
                locale === 'ne' ? 'हटाउनुहोस्' : 'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-Time Credentials Dialog */}
      <OneTimeCredentialsDialog
        credentials={credentials}
        open={isCredentialsOpen}
        onOpenChange={setIsCredentialsOpen}
      />
    </div>
  );
}
