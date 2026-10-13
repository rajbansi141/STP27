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
  assignReviewerAction,
  adminAdvanceStageAction,
} from '@/app/api/admin/actions';
import {
  Search,
  Download,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserPlus,
  GitBranch,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  X,
} from 'lucide-react';

export interface AdminCandidateRow {
  id: string;
  refNo: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  subject: string;
  degree: string;
  stage: string;
  status: string;
  submittedAt: string | null;
  reviewCount: number;
  avgScore: number | null;
  assignedReviewers: { id: string; name: string }[];
}

interface AdminCandidatesTableProps {
  candidates: AdminCandidateRow[];
  stages: { code: string; name: string }[];
  reviewers: { id: string; name: string; email: string }[];
}

export function AdminCandidatesTable({
  candidates,
  stages,
  reviewers,
}: AdminCandidatesTableProps) {
  const { t, locale } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ]);

  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidateRow | null>(null);
  const [modalType, setModalType] = useState<'assign' | 'stage' | null>(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
  const [targetStageCode, setTargetStageCode] = useState<string>('');
  const [stageNote, setStageNote] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return candidates.filter((item) => {
      if (stageFilter !== 'ALL' && item.stage !== stageFilter) return false;
      if (subjectFilter !== 'ALL' && item.subject !== subjectFilter) return false;
      if (assignmentFilter === 'ASSIGNED' && item.assignedReviewers.length === 0) return false;
      if (assignmentFilter === 'UNASSIGNED' && item.assignedReviewers.length > 0) return false;

      if (globalFilter.trim()) {
        const query = globalFilter.toLowerCase();
        const matchesRef = item.refNo.toLowerCase().includes(query);
        const matchesName = item.applicantName.toLowerCase().includes(query);
        const matchesEmail = item.applicantEmail.toLowerCase().includes(query);
        const matchesSub = item.subject.toLowerCase().includes(query);
        if (!matchesRef && !matchesName && !matchesEmail && !matchesSub) return false;
      }
      return true;
    });
  }, [candidates, stageFilter, subjectFilter, assignmentFilter, globalFilter]);

  // Handle CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Ref Number',
      'Applicant Name',
      'Email',
      'Phone',
      'Subject',
      'Degree',
      'Current Stage',
      'Status',
      'Submitted At',
      'Reviews Count',
      'Average Score (/40)',
      'Assigned Reviewers',
    ];

    const rows = filteredData.map((c) => [
      `"${c.refNo}"`,
      `"${c.applicantName.replace(/"/g, '""')}"`,
      `"${c.applicantEmail}"`,
      `"${c.applicantPhone}"`,
      `"${c.subject}"`,
      `"${c.degree}"`,
      `"${c.stage}"`,
      `"${c.status}"`,
      c.submittedAt ? `"${c.submittedAt}"` : 'N/A',
      c.reviewCount,
      c.avgScore !== null ? c.avgScore : 'N/A',
      `"${c.assignedReviewers.map((r) => r.name).join('; ')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stp-2027-candidate-roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Assign Reviewer Handler
  const handleAssignReviewer = () => {
    if (!selectedCandidate || !selectedReviewerId) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await assignReviewerAction({
        applicationId: selectedCandidate.id,
        reviewerId: selectedReviewerId,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: t.admin.candidates.modal.assignSuccess });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error assigning reviewer.' });
      }
    });
  };

  // Stage Transition Handler
  const handleStageTransition = () => {
    if (!selectedCandidate || !targetStageCode) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminAdvanceStageAction({
        applicationId: selectedCandidate.id,
        nextStageCode: targetStageCode,
        note: stageNote,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: t.admin.candidates.modal.stageSuccess });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error advancing stage.' });
      }
    });
  };

  const columns = useMemo<ColumnDef<AdminCandidateRow>[]>(
    () => [
      {
        accessorKey: 'refNo',
        header: t.admin.candidates.table.refNo,
        cell: (info) => (
          <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'applicantName',
        header: t.admin.candidates.table.name,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                {row.applicantName}
              </div>
              <div className="text-[11px] text-stone-500 font-mono">{row.applicantEmail}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'subject',
        header: t.admin.candidates.table.subject,
        cell: (info) => (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'stage',
        header: t.admin.candidates.table.stage,
        cell: (info) => (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            {t.stages[info.getValue() as keyof typeof t.stages] || (info.getValue() as string)}
          </span>
        ),
      },
      {
        accessorKey: 'avgScore',
        header: t.admin.candidates.table.avgScore,
        cell: (info) => {
          const val = info.getValue() as number | null;
          return val !== null ? (
            <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
              {val} <span className="text-[10px] text-stone-400 font-normal">/ 40</span>
            </span>
          ) : (
            <span className="text-stone-400 text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'assignedReviewers',
        header: t.admin.candidates.table.assignedTo,
        cell: (info) => {
          const list = info.getValue() as { id: string; name: string }[];
          return list.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {list.map((r) => (
                <span
                  key={r.id}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  {r.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
              Unassigned
            </span>
          );
        },
      },
      {
        accessorKey: 'submittedAt',
        header: t.admin.candidates.table.submittedAt,
        cell: (info) => (
          <span className="text-[11px] text-stone-500 font-mono">
            {(info.getValue() as string) || 'Draft'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t.admin.candidates.table.actions,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1.5">
              {/* Review Dossier Link */}
              <Link
                href={`/review/${c.id}`}
                title="View Full Evaluation Dossier"
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
              </Link>

              {/* Assign Reviewer Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(c);
                  setModalType('assign');
                  setSelectedReviewerId(c.assignedReviewers[0]?.id || reviewers[0]?.id || '');
                  setFeedback(null);
                }}
                title="Assign Reviewer"
                className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>

              {/* Transition Stage Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(c);
                  setModalType('stage');
                  setTargetStageCode(stages.find((s) => s.code !== c.stage)?.code || stages[0]?.code || '');
                  setStageNote('');
                  setFeedback(null);
                }}
                title="Change Selection Stage"
                className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <GitBranch className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [t, reviewers, stages]
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
      {/* Search and Filters Toolbar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t.admin.candidates.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-900 dark:text-stone-100"
          />
        </div>

        {/* Dropdown Filters & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="ALL">{t.admin.candidates.stageFilter}</option>
            {stages.map((stg) => (
              <option key={stg.code} value={stg.code}>
                {stg.name}
              </option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="ALL">{t.admin.candidates.subjectFilter}</option>
            <option value="English">English</option>
            <option value="Math">Math</option>
            <option value="Grade Teaching">Grade Teaching</option>
          </select>

          {/* Assignment Filter */}
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="ALL">{t.admin.candidates.allAssignments}</option>
            <option value="ASSIGNED">{t.admin.candidates.assignedOnly}</option>
            <option value="UNASSIGNED">{t.admin.candidates.unassignedOnly}</option>
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.admin.candidates.exportCsvBtn}</span>
          </button>
        </div>
      </div>

      {/* TanStack Table Container */}
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
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'flex items-center gap-1 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-stone-400">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-emerald-600" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
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
                    No candidate records matching current filters.
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
            candidates
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

      {/* Modal: Assign Reviewer */}
      {modalType === 'assign' && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                {t.admin.candidates.modal.assignTitle}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
              <div>
                Candidate:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedCandidate.applicantName} ({selectedCandidate.refNo})
                </strong>
              </div>
              <div>
                Subject:{' '}
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {selectedCandidate.subject}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {t.admin.candidates.modal.selectReviewer}
              </label>
              <select
                value={selectedReviewerId}
                onChange={(e) => setSelectedReviewerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              >
                {reviewers.map((rev) => (
                  <option key={rev.id} value={rev.id}>
                    {rev.name} ({rev.email})
                  </option>
                ))}
              </select>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !selectedReviewerId}
                onClick={handleAssignReviewer}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                <span>{t.admin.candidates.modal.assignBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transition Stage */}
      {modalType === 'stage' && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                {t.admin.candidates.modal.changeStageTitle}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
              <div>
                Candidate:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedCandidate.applicantName} ({selectedCandidate.refNo})
                </strong>
              </div>
              <div>
                Current Stage:{' '}
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {selectedCandidate.stage}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {t.admin.candidates.modal.targetStage}
              </label>
              <select
                value={targetStageCode}
                onChange={(e) => setTargetStageCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
              >
                {stages.map((stg) => (
                  <option key={stg.code} value={stg.code}>
                    {stg.name} ({stg.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {t.admin.candidates.modal.transitionNote}
              </label>
              <textarea
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                placeholder="Reason or criteria for stage change..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              />
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !targetStageCode}
                onClick={handleStageTransition}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitBranch className="h-3.5 w-3.5" />
                )}
                <span>{t.admin.candidates.modal.stageBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
