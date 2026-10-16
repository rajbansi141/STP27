'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

// Lucide Icons
import {
  CalendarRange,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  ExternalLink,
  Users,
  Award,
  Calendar,
  Sparkles,
  Loader2,
  X,
  Sliders,
  Check,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronRight,
  ShieldCheck,
  Flame,
  Filter,
} from 'lucide-react';

// Actions & Types
import {
  CohortItem,
  createCohortAction,
  switchActiveCohortAction,
  updateCohortStatusAction,
  updateCohortDatesAction,
} from '@/app/api/admin/cohort-actions';

// shadcn UI Components
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ================= Zod Schemas =================
const createCohortSchema = z.object({
  year: z.number().int().min(2025, 'Year must be 2025 or later').max(2040, 'Year must be 2040 or earlier'),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(12, 'Code cannot exceed 12 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric characters only (e.g. STP28)'),
  nameEn: z.string().min(3, 'English title must be at least 3 characters'),
  nameNe: z.string().min(3, 'Nepali title must be at least 3 characters'),
  applicationOpen: z.string().optional(),
  applicationClose: z.string().optional(),
  setAsCurrent: z.boolean(),
});

type CreateCohortFormValues = z.infer<typeof createCohortSchema>;

const editDatesSchema = z.object({
  applicationOpen: z.string().optional(),
  applicationClose: z.string().optional(),
});

type EditDatesFormValues = z.infer<typeof editDatesSchema>;

interface CohortManagementHubProps {
  initialCohorts: CohortItem[];
  locale?: string;
}

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

export function CohortManagementHub({ initialCohorts, locale = 'en' }: CohortManagementHubProps) {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<CohortItem[]>(initialCohorts);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([{ id: 'year', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDatesCohort, setEditingDatesCohort] = useState<CohortItem | null>(null);
  const [showAnalyticsWidget, setShowAnalyticsWidget] = useState(true);

  // Auto-calculated next cohort defaults
  const currentMaxYear = cohorts.length > 0 ? Math.max(...cohorts.map((c) => c.year)) : 2027;
  const nextYear = currentMaxYear + 1;
  const nextCode = `STP${String(nextYear).slice(-2)}`;

  // React Hook Form for Create Cohort
  const createForm = useForm<CreateCohortFormValues>({
    resolver: zodResolver(createCohortSchema) as any,
    defaultValues: {
      year: nextYear,
      code: nextCode,
      nameEn: `Saathi Teachers Programme ${nextYear}`,
      nameNe: `साथी शिक्षक कार्यक्रम ${nextYear}`,
      applicationOpen: '',
      applicationClose: '',
      setAsCurrent: false,
    },
  });

  // React Hook Form for Edit Dates
  const editDatesForm = useForm<EditDatesFormValues>({
    resolver: zodResolver(editDatesSchema) as any,
    defaultValues: {
      applicationOpen: '',
      applicationClose: '',
    },
  });

  // Auto-update Code and Titles when Year changes in Create Form
  const handleYearInputChange = (yr: number) => {
    createForm.setValue('year', yr);
    const code = `STP${String(yr).slice(-2)}`;
    createForm.setValue('code', code);
    createForm.setValue('nameEn', `Saathi Teachers Programme ${yr}`);
    createForm.setValue('nameNe', `साथी शिक्षक कार्यक्रम ${yr}`);
  };

  // KPI Calculations
  const currentCohort = cohorts.find((c) => c.isCurrent) || cohorts[0];
  const totalApplicants = cohorts.reduce((acc, c) => acc + c.applicationCount, 0);
  const totalFellows = cohorts.reduce((acc, c) => acc + c.finalSelectedCount, 0);
  const overallYield =
    totalApplicants > 0 ? ((totalFellows / totalApplicants) * 100).toFixed(1) : '0.0';

  const activeCohortsCount = cohorts.filter((c) => c.status === 'ACTIVE').length;
  const completedCohortsCount = cohorts.filter((c) => c.status === 'COMPLETED').length;

  // Filtered dataset for TanStack Table
  const filteredData = useMemo(() => {
    return cohorts.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesNameEn = item.nameEn.toLowerCase().includes(q);
        const matchesNameNe = item.nameNe.toLowerCase().includes(q);
        const matchesYear = String(item.year).includes(q);
        if (!matchesCode && !matchesNameEn && !matchesNameNe && !matchesYear) return false;
      }
      return true;
    });
  }, [cohorts, statusFilter, globalFilter]);

  // Handle Create Cohort Submission
  const onSubmitCreate = (values: CreateCohortFormValues) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await createCohortAction({
        year: Number(values.year),
        code: values.code.toUpperCase(),
        nameEn: values.nameEn,
        nameNe: values.nameNe,
        applicationOpen: values.applicationOpen || undefined,
        applicationClose: values.applicationClose || undefined,
        setAsCurrent: values.setAsCurrent,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Cohort cycle launched successfully!' });
        setIsCreateOpen(false);
        createForm.reset();
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to create cohort cycle.' });
      }
    });
  };

  // Handle Switch Active Cohort
  const handleSwitchActive = (cohortId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await switchActiveCohortAction(cohortId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Active recruitment cohort cycle updated!',
        });
        setCohorts((prev) =>
          prev.map((c) => ({
            ...c,
            isCurrent: c.id === cohortId,
            status: c.id === cohortId ? 'ACTIVE' : c.status,
          }))
        );
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to switch cohort.' });
      }
    });
  };

  // Handle Status Update
  const handleStatusUpdate = (cohortId: string, status: CohortItem['status']) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateCohortStatusAction(cohortId, status);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Status updated!' });
        setCohorts((prev) =>
          prev.map((c) => (c.id === cohortId ? { ...c, status } : c))
        );
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Status update failed.' });
      }
    });
  };

  // Open Edit Dates Modal
  const handleOpenEditDates = (cohort: CohortItem) => {
    setEditingDatesCohort(cohort);
    editDatesForm.reset({
      applicationOpen: cohort.applicationOpen ? cohort.applicationOpen.split('T')[0] : '',
      applicationClose: cohort.applicationClose ? cohort.applicationClose.split('T')[0] : '',
    });
  };

  // Handle Edit Dates Submission
  const onSubmitEditDates = (values: EditDatesFormValues) => {
    if (!editingDatesCohort) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await updateCohortDatesAction(
        editingDatesCohort.id,
        values.applicationOpen || undefined,
        values.applicationClose || undefined
      );

      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Timeline updated!' });
        setCohorts((prev) =>
          prev.map((c) =>
            c.id === editingDatesCohort.id
              ? {
                  ...c,
                  applicationOpen: values.applicationOpen ? new Date(values.applicationOpen).toISOString() : null,
                  applicationClose: values.applicationClose ? new Date(values.applicationClose).toISOString() : null,
                }
              : c
          )
        );
        setEditingDatesCohort(null);
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to update timeline.' });
      }
    });
  };

  // TanStack Table Column Definitions
  const columns = useMemo<ColumnDef<CohortItem>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <span>Cohort Cycle</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 text-stone-400 opacity-60" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-start gap-3 py-1">
              <div
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold font-heading text-xs shadow-sm transition-all ${
                  item.isCurrent
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                {item.code.slice(0, 5)}
                {item.isCurrent && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white dark:ring-stone-900"></span>
                  </span>
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    {item.code}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                    {item.year}
                  </span>
                  {item.isCurrent && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="h-2.5 w-2.5" />
                      Current Active
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-stone-600 dark:text-stone-300 truncate max-w-[220px] sm:max-w-[320px]">
                  {locale === 'ne' ? item.nameNe : item.nameEn}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <span>Status</span>
            <ArrowUpDown className="h-3.5 w-3.5 text-stone-400 opacity-60" />
          </button>
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === 'ACTIVE') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Cycle
              </span>
            );
          }
          if (status === 'COMPLETED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                Completed
              </span>
            );
          }
          if (status === 'ARCHIVED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <Archive className="h-3 w-3 text-amber-500" />
                Archived
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              <Clock className="h-3 w-3 text-stone-400" />
              Draft
            </span>
          );
        },
      },
      {
        accessorKey: 'applicationClose',
        header: 'Application Timeline',
        cell: ({ row }) => {
          const item = row.original;
          const open = item.applicationOpen ? new Date(item.applicationOpen) : null;
          const close = item.applicationClose ? new Date(item.applicationClose) : null;
          const now = new Date();
          const isCurrentlyOpen = open && close ? now >= open && now <= close : false;

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
                <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                <span>
                  {open ? open.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open'}
                  {' → '}
                  {close ? close.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}
                </span>
              </div>
              {item.status === 'ACTIVE' && (
                <div>
                  {isCurrentlyOpen ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Accepting applications
                    </span>
                  ) : close && now > close ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
                      Application window closed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
                      Scheduled cycle
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'applicationCount',
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <span>Applicants & Placements</span>
            <ArrowUpDown className="h-3.5 w-3.5 text-stone-400 opacity-60" />
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const conversion =
            item.applicationCount > 0
              ? Math.round((item.finalSelectedCount / item.applicationCount) * 100)
              : 0;

          return (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs font-bold font-heading text-stone-900 dark:text-stone-100">
                  <Users className="h-3.5 w-3.5 text-stone-400" />
                  <span className="tabular-nums">{item.applicationCount}</span>
                  <span className="text-stone-400 font-normal">candidates</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <Award className="h-3 w-3" />
                  <span className="tabular-nums">{item.finalSelectedCount}</span>
                  <span className="font-normal text-[11px]">placed</span>
                </div>
              </div>
              {/* Mini Tremor-style fill bar */}
              <div className="w-36 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(conversion * 2, 100)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/admin/candidates?cohortId=${item.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-stone-200 dark:border-stone-700 transition-colors"
                title="View candidate applications in this cohort"
              >
                <span>View Roster</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              {/* Origin UI inspired Action Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                  />
                }>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs font-semibold text-stone-500">
                    Cycle Management
                  </DropdownMenuLabel>
                  {!item.isCurrent && (
                    <DropdownMenuItem
                      onClick={() => handleSwitchActive(item.id)}
                      className="cursor-pointer text-xs font-medium text-emerald-600 focus:text-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                      Set as Current Active Cycle
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleOpenEditDates(item)}
                    className="cursor-pointer text-xs font-medium"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-2 text-stone-400" />
                    Edit Application Timeline
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] font-semibold text-stone-400">
                    Update Cycle Status
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate(item.id, 'ACTIVE')}
                    disabled={item.status === 'ACTIVE'}
                    className="cursor-pointer text-xs"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                    Mark as Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate(item.id, 'COMPLETED')}
                    disabled={item.status === 'COMPLETED'}
                    className="cursor-pointer text-xs"
                  >
                    <span className="h-2 w-2 rounded-full bg-indigo-500 mr-2" />
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate(item.id, 'ARCHIVED')}
                    disabled={item.status === 'ARCHIVED'}
                    className="cursor-pointer text-xs"
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                    Mark as Archived
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [locale]
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 relative"
    >
      {/* Magic UI Ambient Background Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-72 -left-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl"
      />

      {/* Top Banner Alert Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={`p-4 rounded-2xl flex items-center justify-between shadow-sm border backdrop-blur-md ${
              feedback.type === 'success'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-semibold">{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Row: Title, Subtitle & Primary Launch Action */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <CalendarRange className="h-3 w-3" />
              Multi-Year Fellowship Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            {locale === 'ne' ? 'समूह तथा भर्ना चक्र व्यवस्थापन' : 'Cohort Lifecycle & Recruitment Cycles'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-2xl">
            {locale === 'ne'
              ? 'विभिन्न वर्षका समूहहरू सिर्जना गर्नुहोस्, सक्रिय भर्ना चक्र बदल्नुहोस्, र अघिल्ला सबै वर्षहरूको अभिलेख सुरक्षित राख्नुहोस्।'
              : 'Launch new fellowship cohorts, switch active application windows, track longitudinal yield, and safely preserve past cohorts.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 rounded-xl font-semibold px-4 h-10 gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Launch Next Cohort ({nextYear})</span>
          </Button>
        </div>
      </motion.div>

      {/* Bento-Style KPI Grid (Origin UI + Magic UI aesthetics) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bento 1: Active Cycle Spotlight */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/15 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-stone-900 dark:to-stone-900 border border-emerald-500/30 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-emerald-500" />
              Active Cycle
            </span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-stone-900 dark:text-stone-50 tracking-tight">
              {currentCohort ? currentCohort.code : '—'}
            </span>
            <span className="text-sm font-bold text-stone-500">
              ({currentCohort ? currentCohort.year : '—'})
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
            {currentCohort ? (locale === 'ne' ? currentCohort.nameNe : currentCohort.nameEn) : 'No cohort active'}
          </p>
          <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs">
            <span className="text-stone-500">Active Candidates:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300 font-heading">
              {currentCohort ? currentCohort.applicationCount : 0}
            </span>
          </div>
        </div>

        {/* Bento 2: Cumulative Applicant Pool */}
        <div className="rounded-2xl bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Cumulative Applicants
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-heading font-black text-stone-900 dark:text-stone-50 tracking-tight tabular-nums">
            {totalApplicants}
          </div>
          <p className="text-xs text-stone-500 mt-1">Across all recruitment years</p>
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-500">Active Cycles:</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{activeCohortsCount}</span>
          </div>
        </div>

        {/* Bento 3: Fellows Placed & Yield */}
        <div className="rounded-2xl bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Fellows Placed
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-stone-900 dark:text-stone-50 tracking-tight tabular-nums">
              {totalFellows}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {overallYield}% yield
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Final selected fellowship Saathi Teachers</p>
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-500">Completed Batches:</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{completedCohortsCount}</span>
          </div>
        </div>

        {/* Bento 4: Longitudinal Cycle Health */}
        <div className="rounded-2xl bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Total Cohorts
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-heading font-black text-stone-900 dark:text-stone-50 tracking-tight tabular-nums">
            {cohorts.length}
          </div>
          <p className="text-xs text-stone-500 mt-1">Fully recorded fellowship cycles</p>
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-500">Next Scheduled:</span>
            <span className="font-semibold text-emerald-600 font-heading">{nextCode} ({nextYear})</span>
          </div>
        </div>
      </motion.div>

      {/* Tremor-Style Visual Cycle Comparison Widget */}
      {cohorts.length > 0 && showAnalyticsWidget && (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-bold text-stone-900 dark:text-stone-100">
                  Cohort Volume & Fellowship Yield Analytics
                </h3>
                <p className="text-xs text-stone-500">
                  Comparative performance and candidate throughput per cycle
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAnalyticsWidget(false)}
              className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer"
            >
              Hide
            </button>
          </div>

          <div className="space-y-3">
            {cohorts.map((c) => {
              const maxApp = Math.max(...cohorts.map((ch) => ch.applicationCount), 1);
              const pct = Math.round((c.applicationCount / maxApp) * 100);
              const yieldPct =
                c.applicationCount > 0
                  ? ((c.finalSelectedCount / c.applicationCount) * 100).toFixed(1)
                  : '0.0';

              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-stone-900 dark:text-stone-100 w-16">
                        {c.code}
                      </span>
                      <span className="text-stone-500 text-[11px]">({c.year})</span>
                      {c.isCurrent && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 tabular-nums text-stone-600 dark:text-stone-300">
                      <span>
                        <strong className="text-stone-900 dark:text-stone-100">{c.applicationCount}</strong>{' '}
                        applicants
                      </span>
                      <span className="text-stone-300 dark:text-stone-700">•</span>
                      <span>
                        <strong className="text-emerald-600 dark:text-emerald-400">{c.finalSelectedCount}</strong>{' '}
                        placed ({yieldPct}%)
                      </span>
                    </div>
                  </div>
                  {/* Tremor-style progress comparison */}
                  <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        c.isCurrent ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-stone-400 dark:bg-stone-600'
                      }`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Table Card (TanStack Table + shadcn Table) */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 shadow-sm overflow-hidden"
      >
        {/* Table Filter & Search Controls */}
        <div className="p-4 sm:p-5 border-b border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Cycles' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'ARCHIVED', label: 'Archived' },
              { id: 'DRAFT', label: 'Draft' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search cohorts..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* TanStack Table Rendered with shadcn Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-stone-50/70 dark:bg-stone-800/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-bold py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody ref={tableBodyRef}>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-stone-500">
                      <CalendarRange className="h-8 w-8 text-stone-300 dark:text-stone-700 mb-2" />
                      <p className="text-sm font-semibold">No cohorts found</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Try adjusting your search query or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer info */}
        <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing <strong>{table.getRowModel().rows.length}</strong> of{' '}
            <strong>{cohorts.length}</strong> cycles
          </span>
          <span className="text-[11px] text-stone-400">
            Historical cohorts are read-only and preserved for audit compliance.
          </span>
        </div>
      </motion.div>

      {/* ================= SHADCN DIALOG: LAUNCH NEXT COHORT ================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span>Launch Next Cohort Cycle</span>
            </DialogTitle>
            <DialogDescription>
              Initialize a new fellowship recruitment cycle. All application forms, reference numbers,
              and candidate pools will automatically track under this cohort code.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={createForm.control as any}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fellowship Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2028"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => handleYearInputChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control as any}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cohort Code</FormLabel>
                      <FormControl>
                        <Input placeholder="STP28" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control as any}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (English)</FormLabel>
                    <FormControl>
                      <Input placeholder="Saathi Teachers Programme 2028" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control as any}
                name="nameNe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (Nepali)</FormLabel>
                    <FormControl>
                      <Input placeholder="साथी शिक्षक कार्यक्रम २०२८" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={createForm.control as any}
                  name="applicationOpen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applications Open</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control as any}
                  name="applicationClose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applications Close</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control as any}
                name="setAsCurrent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-stone-200 dark:border-stone-800 p-3 bg-stone-50 dark:bg-stone-800/40">
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Set as Current Active Cycle Now
                      </FormLabel>
                      <FormDescription className="text-[11px] text-stone-500">
                        Automatically directs public applicants to this cohort.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Launch Cohort</span>
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ================= SHADCN DIALOG: EDIT TIMELINE ================= */}
      <Dialog
        open={Boolean(editingDatesCohort)}
        onOpenChange={(open) => !open && setEditingDatesCohort(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <span>Edit Application Timeline: {editingDatesCohort?.code}</span>
            </DialogTitle>
            <DialogDescription>
              Adjust opening and closing deadlines for {editingDatesCohort?.nameEn}.
            </DialogDescription>
          </DialogHeader>

          <Form {...editDatesForm}>
            <form onSubmit={editDatesForm.handleSubmit(onSubmitEditDates)} className="space-y-4">
              <FormField
                control={editDatesForm.control as any}
                name="applicationOpen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Window Opens</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editDatesForm.control as any}
                name="applicationClose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Window Closes (Deadline)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDatesCohort(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Timeline</span>
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
