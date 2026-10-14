'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useI18n } from '@/lib/i18n/context';
import {
  Search,
  Download,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  Send,
  Loader2,
  Lock,
  UserCheck,
  Users,
  BookOpen,
  Edit3,
} from 'lucide-react';
import { submitBatchToAdminAction } from '@/app/api/review/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ApplicationRowItem {
  id: string;
  refNo: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  degree: string;
  subject: string;
  stage: string;
  status: string;
  submittedAt: string | null;
  isAssignedToMe: boolean;
  assignedReviewers: { id: string; name: string }[];
  reviewedByCurrentReviewer: boolean;
  myScore: number | null;
  myRecommendation: string | null;
}

interface ReviewTableProps {
  data: ApplicationRowItem[];
  availableStages: { code: string; name: string }[];
  initialStage?: string;
  currentReviewerId?: string;
}

export function ReviewTable({
  data,
  availableStages,
  initialStage = 'ALL',
}: ReviewTableProps) {
  const { t, locale } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [stageFilter, setStageFilter] = useState(initialStage || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assignmentScope, setAssignmentScope] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ]);

  useEffect(() => {
    if (initialStage) {
      setStageFilter(initialStage);
    }
  }, [initialStage]);

  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  const handleSubmitBatch = async () => {
    setIsBatchSubmitting(true);
    setBatchFeedback(null);
    try {
      const res = await submitBatchToAdminAction();
      if (res.success) {
        setBatchFeedback(
          locale === 'ne'
            ? 'मूल्याङ्कन ब्याच सफलतापूर्वक व्यवस्थापकलाई पेश गरियो।'
            : 'Evaluation batch successfully submitted to admin!'
        );
        setTimeout(() => {
          setIsBatchOpen(false);
          setBatchFeedback(null);
        }, 1500);
      } else {
        setBatchFeedback(res.message || 'Failed to submit batch.');
      }
    } catch {
      setBatchFeedback('An unexpected error occurred.');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Stage filter
      if (stageFilter !== 'ALL' && item.stage !== stageFilter) {
        return false;
      }
      // Review status filter
      if (statusFilter === 'PENDING' && item.reviewedByCurrentReviewer) {
        return false;
      }
      if (statusFilter === 'REVIEWED' && !item.reviewedByCurrentReviewer) {
        return false;
      }
      // Assignment scope filter
      if (assignmentScope === 'ASSIGNED' && !item.isAssignedToMe) {
        return false;
      }
      if (assignmentScope === 'UNASSIGNED' && item.assignedReviewers.length > 0) {
        return false;
      }
      // Global search filter
      if (globalFilter.trim()) {
        const query = globalFilter.toLowerCase();
        const matchesRef = item.refNo.toLowerCase().includes(query);
        const matchesName = item.applicantName.toLowerCase().includes(query);
        const matchesSubject = item.subject.toLowerCase().includes(query);
        const matchesDegree = item.degree.toLowerCase().includes(query);
        if (!matchesRef && !matchesName && !matchesSubject && !matchesDegree) {
          return false;
        }
      }
      return true;
    });
  }, [data, stageFilter, statusFilter, assignmentScope, globalFilter]);

  // Counts for scope filter tabs
  const myAssignedCount = useMemo(() => data.filter((d) => d.isAssignedToMe).length, [data]);
  const unassignedCount = useMemo(() => data.filter((d) => d.assignedReviewers.length === 0).length, [data]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Reference No',
      'Applicant Name',
      'Email',
      'Phone',
      'Degree',
      'Preferred Subject',
      'Current Stage',
      'Assigned to You',
      'Evaluated By You',
      'My Score (out of 40)',
      'Recommendation',
      'Submitted At',
    ];

    const rows = filteredData.map((d) => [
      `"${d.refNo}"`,
      `"${d.applicantName.replace(/"/g, '""')}"`,
      `"${d.applicantEmail}"`,
      `"${d.applicantPhone}"`,
      `"${d.degree}"`,
      `"${d.subject}"`,
      `"${d.stage}"`,
      d.isAssignedToMe ? 'Yes' : 'No',
      d.reviewedByCurrentReviewer ? 'Yes' : 'No',
      d.myScore !== null ? d.myScore : 'N/A',
      d.myRecommendation || 'N/A',
      d.submittedAt ? `"${d.submittedAt}"` : 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stp-2027-candidate-evaluations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo<ColumnDef<ApplicationRowItem>[]>(
    () => [
      {
        accessorKey: 'refNo',
        header: t.reviewer.table.refNo,
        cell: (info) => (
          <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'applicantName',
        header: t.reviewer.table.applicant,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-100">
                {row.applicantName}
              </div>
              <div className="text-[11px] text-stone-500 truncate max-w-[180px]">
                {row.degree}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'subject',
        header: t.reviewer.table.subject,
        cell: (info) => {
          const val = String(info.getValue() || 'general').toLowerCase();
          const label =
            val === 'math'
              ? t.apply.sec5.subjectMath
              : val === 'english'
              ? t.apply.sec5.subjectEnglish
              : val === 'grade_teaching'
              ? t.apply.sec5.subjectGrade
              : val;
          return (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: 'stage',
        header: t.reviewer.table.stage,
        cell: (info) => {
          const stageCode = info.getValue() as string;
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              {t.stages[stageCode as keyof typeof t.stages] || stageCode}
            </span>
          );
        },
      },
      {
        id: 'allocation',
        header: locale === 'ne' ? 'कार्यभार' : 'Assignment',
        cell: ({ row }) => {
          const item = row.original;
          if (item.isAssignedToMe) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <UserCheck className="h-3 w-3 text-emerald-600" />
                <span>{locale === 'ne' ? 'तपाईंलाई तोकिएको' : 'Assigned to You'}</span>
              </span>
            );
          }
          if (item.assignedReviewers.length > 0) {
            return (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 max-w-[140px] truncate"
                title={item.assignedReviewers.map((r) => r.name).join(', ')}
              >
                <Users className="h-3 w-3 text-stone-400" />
                <span className="truncate">
                  {item.assignedReviewers[0].name}
                  {item.assignedReviewers.length > 1 ? ` +${item.assignedReviewers.length - 1}` : ''}
                </span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-50 dark:bg-stone-900 text-stone-400 border border-dashed border-stone-300 dark:border-stone-700">
              <Clock className="h-2.5 w-2.5" />
              <span>{locale === 'ne' ? 'तोकिएको छैन' : 'Unassigned'}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'myScore',
        header: t.reviewer.table.score,
        cell: (info) => {
          const score = info.getValue() as number | null;
          if (score === null) {
            return <span className="text-stone-400 text-xs">—</span>;
          }
          return (
            <div className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
              {score} <span className="text-[10px] text-stone-400">/ 40</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'myRecommendation',
        header: t.reviewer.table.recommendation,
        cell: (info) => {
          const rec = info.getValue() as string | null;
          if (!rec) {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                <span>—</span>
              </span>
            );
          }
          if (rec === 'ADVANCE') {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>{locale === 'ne' ? 'सिफारिस' : 'Advance'}</span>
              </span>
            );
          }
          if (rec === 'HOLD') {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                <span>{locale === 'ne' ? 'होल्ड' : 'Hold'}</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-bold">
              <span>{locale === 'ne' ? 'अस्वीकृत' : 'Reject'}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'submittedAt',
        header: t.reviewer.table.submittedAt,
        cell: (info) => {
          const val = info.getValue() as string | null;
          if (!val) return <span className="text-stone-400 text-xs">—</span>;
          const d = new Date(val);
          return (
            <span className="text-xs text-stone-600 dark:text-stone-400">
              {isNaN(d.getTime()) ? val : d.toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-CA')}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: t.reviewer.table.actions,
        cell: ({ row }) => {
          const item = row.original;

          // If assigned to current reviewer: allow evaluate/work
          if (item.isAssignedToMe) {
            return (
              <div className="text-right">
                <Link
                  href={`/review/${item.id}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition-all ${
                    item.reviewedByCurrentReviewer
                      ? 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow-sm'
                  }`}
                >
                  {item.reviewedByCurrentReviewer ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t.reviewer.table.viewBtn}</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{t.reviewer.table.evaluateBtn}</span>
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </Link>
              </div>
            );
          }

          // If unassigned: allow reviewer to review dossier & materials
          if (item.assignedReviewers.length === 0) {
            return (
              <div className="text-right">
                <Link
                  href={`/review/${item.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 shadow-2xs transition-all"
                  title={
                    locale === 'ne'
                      ? 'तोकिन बाँकी उम्मेदवारको आवेदन र कागजातहरूको अवलोकन गर्नुहोस्'
                      : 'Review unassigned candidate application & materials'
                  }
                >
                  <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{locale === 'ne' ? 'अवलोकन (Review)' : 'Review'}</span>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>
              </div>
            );
          }

          // If assigned to another reviewer: allow viewing dossier in read mode
          return (
            <div className="text-right">
              <Link
                href={`/review/${item.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-800 text-stone-600 hover:text-stone-900 dark:text-stone-300 transition-all"
                title={
                  locale === 'ne'
                    ? `अन्य समीक्षक (${item.assignedReviewers.map((r) => r.name).join(', ')}) लाई तोकिएको - विवरण हेर्नुहोस्`
                    : `Assigned to ${item.assignedReviewers.map((r) => r.name).join(', ')} - View candidate dossier`
                }
              >
                <Eye className="h-3.5 w-3.5 text-stone-400" />
                <span>{locale === 'ne' ? 'विवरण' : 'View'}</span>
              </Link>
            </div>
          );
        },
      },
    ],
    [t, locale]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Assignment Scope Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setAssignmentScope('ALL')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            assignmentScope === 'ALL'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300'
          }`}
        >
          <span>{locale === 'ne' ? 'सबै आवेदनहरू' : 'All Applications'}</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              assignmentScope === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
            }`}
          >
            {data.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAssignmentScope('ASSIGNED')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            assignmentScope === 'ASSIGNED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>{locale === 'ne' ? 'मलाई तोकिएका मात्र' : 'Assigned to Me'}</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              assignmentScope === 'ASSIGNED'
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
            }`}
          >
            {myAssignedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAssignmentScope('UNASSIGNED')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            assignmentScope === 'UNASSIGNED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{locale === 'ne' ? 'तोकिन बाँकी' : 'Unassigned'}</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              assignmentScope === 'UNASSIGNED'
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
            }`}
          >
            {unassignedCount}
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t.reviewer.table.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
          >
            <option value="ALL">{t.reviewer.table.allStages}</option>
            {availableStages.map((stg) => (
              <option key={stg.code} value={stg.code}>
                {stg.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
          >
            <option value="ALL">{t.reviewer.table.allStatus}</option>
            <option value="PENDING">{t.reviewer.table.pendingOnly}</option>
            <option value="REVIEWED">{t.reviewer.table.reviewedOnly}</option>
          </select>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-stone-500" />
            <span>{t.reviewer.table.exportCsvBtn}</span>
          </button>

          {/* Submit to Admin Button */}
          <button
            type="button"
            onClick={() => setIsBatchOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'व्यवस्थापकलाई बुझाउनुहोस्' : 'Submit to Admin'}</span>
          </button>
        </div>
      </div>

      {/* TanStack Table Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
            <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={`py-3.5 px-4 ${
                          canSort ? 'cursor-pointer select-none hover:text-stone-900 dark:hover:text-stone-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-stone-400">
                              {isSorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-emerald-600" />
                              ) : isSorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody ref={tableBodyRef} className="divide-y divide-stone-100 dark:divide-stone-800">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors ${
                      row.original.isAssignedToMe ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3 px-4">
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
                    {t.reviewer.table.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-500">
          <div>
            {t.reviewer.table.showing}{' '}
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{' '}
            {t.reviewer.table.to}{' '}
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            {t.reviewer.table.of}{' '}
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            {t.reviewer.table.results}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors font-medium text-xs"
            >
              {t.reviewer.table.prev}
            </button>
            <span className="font-mono text-xs">
              {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors font-medium text-xs"
            >
              {t.reviewer.table.next}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: Submit Batch to Admin */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900 dark:text-stone-50">
              <Send className="h-5 w-5 text-emerald-600" />
              <span>{locale === 'ne' ? 'मूल्याङ्कन ब्याच बुझाउने पुष्टि' : 'Submit Evaluation Batch to Admin'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500 pt-1">
              {locale === 'ne'
                ? 'के तपाईं आफ्ना सबै पूरा भएका मूल्याङ्कनहरू समीक्षाका लागि व्यवस्थापक (Admin) लाई बुझाउन निश्चित हुनुहुन्छ?'
                : 'Are you sure you want to officially submit your completed rubric evaluations to the Selection Committee Admin?'}
            </DialogDescription>
          </DialogHeader>

          {batchFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                batchFeedback.includes('successfully') || batchFeedback.includes('सफलतापूर्वक')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {batchFeedback}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchOpen(false)}
              disabled={isBatchSubmitting}
            >
              {locale === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitBatch}
              disabled={isBatchSubmitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {isBatchSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>{locale === 'ne' ? 'बुझाउँदै...' : 'Submitting...'}</span>
                </>
              ) : (
                <span>{locale === 'ne' ? 'बुझाउनुहोस्' : 'Confirm Submission'}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
