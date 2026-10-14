'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
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
  autoAssignReviewersAction,
  batchAssignReviewerAction,
  unassignReviewerAction,
  batchUnassignReviewersAction,
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
  UserMinus,
  GitBranch,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  Sparkles,
  Zap,
  CheckSquare,
  Square,
  MinusSquare,
  Users,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronUp,
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
  initialStage?: string;
  stageCounts?: Record<string, number>;
  totalCount?: number;
}

export function AdminCandidatesTable({
  candidates,
  stages,
  reviewers,
  initialStage = 'ALL',
  stageCounts = {},
  totalCount,
}: AdminCandidatesTableProps) {
  const { t, locale } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [stageFilter, setStageFilter] = useState(initialStage || 'ALL');
  const [showAllocationHub, setShowAllocationHub] = useState<boolean>(false);

  useEffect(() => {
    if (initialStage) {
      setStageFilter(initialStage);
    }
  }, [initialStage]);

  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ]);

  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();
  const [isPending, startTransition] = useTransition();

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states: 'assign' (single), 'stage' (transition), 'auto-assign', 'manual-batch'
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto');
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidateRow | null>(null);
  const [modalType, setModalType] = useState<'assign' | 'stage' | 'auto-assign' | 'manual-batch' | null>(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>(reviewers[0]?.id || '');
  const [targetStageCode, setTargetStageCode] = useState<string>('');
  const [stageNote, setStageNote] = useState<string>('');
  const [autoOnlyUnassigned, setAutoOnlyUnassigned] = useState<boolean>(true);
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

  // Quick statistics for current filter
  const currentStageName = useMemo(() => {
    if (stageFilter === 'ALL') return locale === 'ne' ? 'सबै चरणहरू' : 'All Stages';
    return stages.find((s) => s.code === stageFilter)?.name || stageFilter;
  }, [stageFilter, stages, locale]);

  const unassignedInCurrentStage = useMemo(() => {
    return filteredData.filter((c) => c.assignedReviewers.length === 0).length;
  }, [filteredData]);

  // Stage counts & total count calculations
  const calculatedStageCounts = useMemo(() => {
    if (Object.keys(stageCounts).length > 0) return stageCounts;
    const counts: Record<string, number> = {};
    candidates.forEach((c) => {
      counts[c.stage] = (counts[c.stage] || 0) + 1;
    });
    return counts;
  }, [stageCounts, candidates]);

  const totalCandidatesCount = totalCount || candidates.length;

  const handleSelectStage = (code: string) => {
    setStageFilter(code);
    const url = code === 'ALL' ? '/admin/candidates' : `/admin/candidates?stage=${code}`;
    window.history.replaceState(null, '', url);
  };

  // Checkbox toggle helpers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((d) => d.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

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

  // Button 1: Run Auto-Assignment
  const handleRunAutoAssign = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await autoAssignReviewersAction({
        stageCode: stageFilter,
        onlyUnassigned: autoOnlyUnassigned,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? `सफलतापूर्वक ${res.assignedCount || 0} उम्मेदवारहरू सक्रिय समीक्षकहरूमा स्वचालित रूपमा वितरण गरियो!`
              : res.message || 'Auto-assignment completed successfully!',
        });
        setTimeout(() => {
          setModalType(null);
          setFeedback(null);
          setSelectedIds(new Set());
        }, 1500);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error during auto-assignment.' });
      }
    });
  };

  // Button 2: Run Manual Batch Assign
  const handleRunManualBatchAssign = () => {
    if (!selectedReviewerId) return;
    const targetApplicationIds =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : filteredData.filter((c) => c.assignedReviewers.length === 0).map((c) => c.id);

    if (targetApplicationIds.length === 0) {
      setFeedback({
        type: 'error',
        text: locale === 'ne' ? 'तोक्नका लागि कुनै उम्मेदवार फेला परेन।' : 'No candidates to assign.',
      });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await batchAssignReviewerAction({
        applicationIds: targetApplicationIds,
        reviewerId: selectedReviewerId,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? `सफलतापूर्वक ${targetApplicationIds.length} उम्मेदवारहरू समीक्षकलाई तोकियो!`
              : res.message || 'Batch assignment completed!',
        });
        setTimeout(() => {
          setModalType(null);
          setSelectedIds(new Set());
          setFeedback(null);
        }, 1500);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error during manual assignment.' });
      }
    });
  };

  // Single Candidate: Assign Reviewer Handler
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

  // Single Reviewer or Candidate Unassign Handler
  const handleUnassignReviewer = (applicationId: string, reviewerId?: string, reviewerName?: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await unassignReviewerAction({
        applicationId,
        reviewerId,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? `${reviewerName ? `${reviewerName} लाई ` : ''}सफलतापूर्वक हटाइयो!`
              : res.message || 'Reviewer unassigned successfully.',
        });
        setTimeout(() => setFeedback(null), 2500);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error unassigning reviewer.' });
      }
    });
  };

  // Batch Unassign Handler
  const handleBatchUnassign = () => {
    if (selectedIds.size === 0) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await batchUnassignReviewersAction({
        applicationIds: Array.from(selectedIds),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? `सफलतापूर्वक ${selectedIds.size} उम्मेदवारहरूबाट समीक्षक हटाइयो!`
              : res.message || 'Assignments removed successfully.',
        });
        setSelectedIds(new Set());
        setTimeout(() => setFeedback(null), 2500);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error removing assignments.' });
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

  // TanStack Columns definition
  const columns = useMemo<ColumnDef<AdminCandidateRow>[]>(
    () => [
      {
        id: 'select',
        header: () => {
          const allSelected =
            filteredData.length > 0 && selectedIds.size === filteredData.length;
          const someSelected =
            selectedIds.size > 0 && selectedIds.size < filteredData.length;
          return (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title={allSelected ? 'Deselect all' : 'Select all visible'}
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-emerald-600" />
              ) : someSelected ? (
                <MinusSquare className="h-4 w-4 text-emerald-600" />
              ) : (
                <Square className="h-4 w-4 text-stone-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const isChecked = selectedIds.has(row.original.id);
          return (
            <button
              type="button"
              onClick={() => handleToggleRow(row.original.id)}
              className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
            >
              {isChecked ? (
                <CheckSquare className="h-4 w-4 text-emerald-600" />
              ) : (
                <Square className="h-4 w-4 text-stone-400" />
              )}
            </button>
          );
        },
      },
      {
        accessorKey: 'refNo',
        header: t.admin.candidates.table.refNo,
        cell: (info) => {
          const c = info.row.original;
          return (
            <Link
              href={`/admin/candidates/${c.id}`}
              className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 hover:underline"
            >
              {info.getValue() as string}
            </Link>
          );
        },
      },
      {
        accessorKey: 'applicantName',
        header: t.admin.candidates.table.name,
        cell: (info) => {
          const c = info.row.original;
          return (
            <div>
              <Link
                href={`/admin/candidates/${c.id}`}
                className="font-semibold text-stone-900 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                {c.applicantName}
              </Link>
              <div className="text-[11px] text-stone-500 truncate max-w-[180px]">
                {c.applicantEmail} • {c.applicantPhone}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'subject',
        header: t.admin.candidates.table.subject,
        cell: (info) => (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'stage',
        header: t.admin.candidates.table.stage,
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
        accessorKey: 'status',
        header: t.admin.candidates.table.status,
        cell: (info) => {
          const st = info.getValue() as string;
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                st === 'SHORTLISTED' || st === 'FINAL_SELECTED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : st === 'ON_HOLD'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : st === 'REJECTED'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              {st}
            </span>
          );
        },
      },
      {
        accessorKey: 'assignedReviewers',
        header: t.admin.candidates.table.assignedTo,
        cell: (info) => {
          const assigned = info.getValue() as { id: string; name: string }[];
          const candidateId = info.row.original.id;
          if (assigned.length === 0) {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                <Clock className="h-3 w-3" />
                <span>{locale === 'ne' ? 'तोकिएको छैन' : 'Unassigned'}</span>
              </span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[190px]">
              {assigned.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 group"
                >
                  <UserCheck className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[95px]">{r.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnassignReviewer(candidateId, r.id, r.name);
                    }}
                    title={locale === 'ne' ? `${r.name} लाई हटाउनुहोस्` : `Remove ${r.name} assignment`}
                    className="hover:bg-red-100 dark:hover:bg-red-950 text-stone-400 hover:text-red-600 rounded p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'avgScore',
        header: t.admin.candidates.table.avgScore,
        cell: (info) => {
          const score = info.getValue() as number | null;
          if (score === null) return <span className="text-stone-400 text-xs">—</span>;
          return (
            <div className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
              {score}{' '}
              <span className="text-[10px] text-stone-400 font-normal">/ 40</span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: t.admin.candidates.table.actions,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1.5">
              {/* View Full Application Dossier */}
              <Link
                href={`/admin/candidates/${c.id}`}
                title="View Full Application & Dossier"
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
              </Link>

              {/* Open Scoring Rubric */}
              <Link
                href={`/review/${c.id}`}
                title="Open Evaluation Scoring Rubrics"
                className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
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
    [t, reviewers, stages, selectedIds, filteredData, locale]
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
      {/* ================= COMMAND CENTER: SYSTEMATIC PIPELINE & CONTROLS ================= */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Top Header Row: Section Identity + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Layers className="h-4 w-4" />
              </span>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                {locale === 'ne' ? 'चयन पाइपलाइन चरणहरू' : 'Selection Pipeline Progression'}
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
              {filteredData.length === totalCandidatesCount
                ? `${totalCandidatesCount} ${locale === 'ne' ? 'कुल उम्मेदवार' : 'Total Applicants'}`
                : `${filteredData.length} ${locale === 'ne' ? 'देखाउँदै' : 'shown'} / ${totalCandidatesCount} ${locale === 'ne' ? 'कुल' : 'Total'}`}
            </span>
            {(stageFilter !== 'ALL' || subjectFilter !== 'ALL' || assignmentFilter !== 'ALL' || globalFilter.trim()) && (
              <button
                type="button"
                onClick={() => {
                  handleSelectStage('ALL');
                  setSubjectFilter('ALL');
                  setAssignmentFilter('ALL');
                  setGlobalFilter('');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>{locale === 'ne' ? 'सबै फिल्टर हटाउनुहोस्' : 'Reset Filters'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Allocation Hub Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAllocationHub((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                showAllocationHub
                  ? 'bg-stone-900 text-emerald-300 border border-stone-700 shadow-inner'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
              }`}
              title={showAllocationHub ? 'Collapse Allocation Hub' : 'Open Allocation Hub'}
            >
              <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{locale === 'ne' ? 'असाइनमेन्ट हब' : 'Allocation Hub'}</span>
              {unassignedInCurrentStage > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-600 text-white">
                  {unassignedInCurrentStage}
                </span>
              )}
              {showAllocationHub ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
              title="Export filtered candidate list as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.admin.candidates.exportCsvBtn}</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>

        {/* Pipeline Stage Pills Stepper */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {/* All Candidates Pill */}
          <button
            type="button"
            onClick={() => handleSelectStage('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              stageFilter === 'ALL'
                ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <span>{locale === 'ne' ? 'सबै उम्मेदवारहरू' : 'All Candidates'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                stageFilter === 'ALL'
                  ? 'bg-emerald-900/60 text-emerald-100'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {totalCandidatesCount}
            </span>
          </button>

          {/* Individual Stages */}
          {stages.map((stg) => {
            const isActive = stageFilter === stg.code;
            const count = calculatedStageCounts[stg.code] || 0;
            return (
              <button
                key={stg.code}
                type="button"
                onClick={() => handleSelectStage(stg.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
                }`}
              >
                <span>{stg.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? 'bg-emerald-900/60 text-emerald-100'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Refinement Filters Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={t.admin.candidates.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-900 dark:text-stone-100"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
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
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">{t.admin.candidates.allAssignments}</option>
            <option value="ASSIGNED">{t.admin.candidates.assignedOnly}</option>
            <option value="UNASSIGNED">{t.admin.candidates.unassignedOnly}</option>
          </select>
        </div>
      </div>

      {/* ================= EXPANDABLE ADMINISTRATOR ALLOCATION HUB ================= */}
      {showAllocationHub && (
        <div className="bg-stone-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-stone-800 space-y-4 transition-all">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                  {locale === 'ne' ? 'प्रशासक असाइनमेन्ट हब' : 'Administrator Allocation Hub'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                  Stage: {currentStageName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {unassignedInCurrentStage} {locale === 'ne' ? 'तोकिन बाँकी' : 'unassigned'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {locale === 'ne'
                  ? `यस चरणमा ${filteredData.length} उम्मेदवारहरू छन् (${unassignedInCurrentStage} जनालाई समीक्षक तोकिन बाँकी)।`
                  : `${filteredData.length} candidates in view (${unassignedInCurrentStage} unassigned). Allocate candidates to active committee reviewers.`}
              </p>
            </div>

            {/* BEAUTIFUL TOGGLE BUTTON: AUTO-ASSIGN vs MANUAL ASSIGN */}
            <div className="flex items-center gap-2">
              <div className="inline-flex p-1 rounded-2xl bg-stone-950 border border-stone-800 shadow-inner">
                {/* Option 1: Auto-Assign Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setAssignMode('auto');
                    setFeedback(null);
                  }}
                  className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    assignMode === 'auto'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/40'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                  }`}
                  title={locale === 'ne' ? 'स्वचालित वितरण मोड' : 'Automatic Distribution Mode'}
                >
                  <Sparkles className={`h-3.5 w-3.5 ${assignMode === 'auto' ? 'text-emerald-200 animate-pulse' : 'text-stone-400'}`} />
                  <span>{locale === 'ne' ? 'स्वचालित तोक्नुहोस् (Auto)' : 'Auto-Assign'}</span>
                </button>

                {/* Option 2: Manual Assign Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setAssignMode('manual');
                    if (!selectedReviewerId && reviewers[0]) {
                      setSelectedReviewerId(reviewers[0].id);
                    }
                    setFeedback(null);
                  }}
                  className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    assignMode === 'manual'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/60 ring-1 ring-blue-400/40'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                  }`}
                  title={locale === 'ne' ? 'म्यानुअल तोक्ने मोड' : 'Manual Allocation Mode'}
                >
                  <UserCheck className={`h-3.5 w-3.5 ${assignMode === 'manual' ? 'text-blue-200' : 'text-stone-400'}`} />
                  <span>{locale === 'ne' ? 'म्यानुअल तोक्नुहोस् (Manual)' : 'Manual Assign'}</span>
                  {selectedIds.size > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/25 text-white">
                      {selectedIds.size}
                    </span>
                  )}
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowAllocationHub(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-850 transition-colors cursor-pointer"
                title="Collapse Allocation Hub"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Dynamic Action Console depending on active toggle mode */}
          <div className="pt-3 border-t border-stone-800">
            {assignMode === 'auto' ? (
              /* AUTO-ASSIGN CONSOLE */
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs bg-stone-950/60 border border-stone-800/80 p-3.5 rounded-xl">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-white">
                      {locale === 'ne' ? 'सन्तुलित वितरण नियम:' : 'Balanced Distribution:'}
                    </span>
                    <span className="text-stone-400">
                      {locale === 'ne'
                        ? `प्रति समीक्षक ~${Math.ceil((autoOnlyUnassigned ? unassignedInCurrentStage : filteredData.length) / Math.max(1, reviewers.length))} उम्मेदवार`
                        : `~${Math.ceil((autoOnlyUnassigned ? unassignedInCurrentStage : filteredData.length) / Math.max(1, reviewers.length))} per reviewer across ${reviewers.length} active committee members`}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-stone-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={autoOnlyUnassigned}
                      onChange={(e) => setAutoOnlyUnassigned(e.target.checked)}
                      className="rounded border-stone-600 bg-stone-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>
                      {locale === 'ne' ? 'तोकिन बाँकी मात्र (Unassigned Only)' : 'Only unassigned candidates'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalType('auto-assign');
                      setFeedback(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-stone-700 hover:border-stone-600 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {locale === 'ne' ? 'विस्तृत विवरण' : 'Reviewer Pool'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending || reviewers.length === 0 || (autoOnlyUnassigned && unassignedInCurrentStage === 0)}
                    onClick={handleRunAutoAssign}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                    )}
                    <span>
                      {locale === 'ne' ? 'स्वचालित वितरण सुरु गर्नुहोस्' : 'Distribute Automatically'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* MANUAL ASSIGN CONSOLE */
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs bg-stone-950/60 border border-stone-800/80 p-3.5 rounded-xl">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-stone-300">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {locale === 'ne' ? 'लक्षित उम्मेदवार:' : 'Target Scope:'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-200 border border-stone-700 font-mono">
                      {selectedIds.size > 0
                        ? `${selectedIds.size} ${locale === 'ne' ? 'चयन गरिएको' : 'Selected'}`
                        : `${unassignedInCurrentStage} ${locale === 'ne' ? 'तोकिन बाँकी' : 'Unassigned in Stage'}`}
                    </span>
                  </div>

                  {/* Reviewer Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">
                      {locale === 'ne' ? 'समीक्षक:' : 'Reviewer:'}
                    </span>
                    <select
                      value={selectedReviewerId}
                      onChange={(e) => setSelectedReviewerId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs bg-stone-800 border border-stone-700 text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
                    >
                      {reviewers.map((rev) => (
                        <option key={rev.id} value={rev.id}>
                          {rev.name} ({rev.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedIds.size === 0 && unassignedInCurrentStage > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const unassignedIds = filteredData
                          .filter((c) => c.assignedReviewers.length === 0)
                          .map((c) => c.id);
                        setSelectedIds(new Set(unassignedIds));
                      }}
                      className="px-3 py-1.5 rounded-lg border border-stone-700 hover:border-stone-600 bg-stone-800 text-stone-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      {locale === 'ne' ? 'सबै तोकिन बाँकी चयन' : 'Select All Unassigned'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending || !selectedReviewerId || (selectedIds.size === 0 && unassignedInCurrentStage === 0)}
                    onClick={handleRunManualBatchAssign}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5 text-blue-200" />
                    )}
                    <span>
                      {selectedIds.size > 0
                        ? `${locale === 'ne' ? 'चयन गरिएका' : 'Assign'} (${selectedIds.size}) ${locale === 'ne' ? 'तोक्नुहोस्' : 'Candidates'}`
                        : locale === 'ne'
                        ? 'तोक्न पुष्टि गर्नुहोस्'
                        : 'Assign Candidates'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Feedback message banner if present */}
            {feedback && (
              <div
                className={`mt-2.5 p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/80 border border-red-500/50 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="text-stone-400 hover:text-white text-xs p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Selection Bar when rows are checked */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              {locale === 'ne'
                ? `${selectedIds.size} उम्मेदवारहरू चयन गरियो`
                : `${selectedIds.size} candidate(s) selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedReviewerId(reviewers[0]?.id || '');
                setModalType('manual-batch');
                setFeedback(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              {locale === 'ne' ? 'चयन गरिएकालाई समीक्षक तोक्नुहोस्' : 'Assign Selected to Reviewer'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleBatchUnassign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-semibold text-xs transition-colors cursor-pointer"
              title={locale === 'ne' ? 'चयन गरिएका उम्मेदवारहरूबाट समीक्षक हटाउनुहोस्' : 'Remove reviewer allocations for selected candidates'}
            >
              <UserMinus className="h-3.5 w-3.5" />
              <span>{locale === 'ne' ? 'समीक्षक हटाउनुहोस्' : 'Unassign Reviewer(s)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-xs transition-colors cursor-pointer"
            >
              {locale === 'ne' ? 'चयन हटाउनुहोस्' : 'Clear'}
            </button>
          </div>
        </div>
      )}

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
                table.getRowModel().rows.map((row) => {
                  const isChecked = selectedIds.has(row.original.id);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors text-xs ${
                        isChecked ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3.5">
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            candidate records
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

      {/* ================= MODAL: BUTTON 1 - AUTO-ASSIGN REVIEWERS ================= */}
      {modalType === 'auto-assign' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    {locale === 'ne' ? 'स्वचालित समीक्षक वितरण' : 'Auto-Assign Applications to Reviewers'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {locale === 'ne'
                      ? 'सन्तुलित राउन्ड-रोबिन विधिबाट सबै सक्रिय समीक्षकहरूमा कार्यभार बाँडफाँड गर्नुहोस्।'
                      : 'Distribute candidate applications evenly across all active reviewers in round-robin order.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stage Scope Info */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">{locale === 'ne' ? 'लक्षित चरण:' : 'Target Stage:'}</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {currentStageName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">
                  {locale === 'ne' ? 'तोकिन बाँकी उम्मेदवारहरू:' : 'Unassigned Candidates in Scope:'}
                </span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  {unassignedInCurrentStage}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">
                  {locale === 'ne' ? 'उपलब्ध सक्रिय समीक्षकहरू:' : 'Active Available Reviewers:'}
                </span>
                <span className="font-mono font-bold text-emerald-600">
                  {reviewers.length} Reviewers
                </span>
              </div>
            </div>

            {/* Active Reviewers List */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span>{locale === 'ne' ? 'कार्यभार पाउने समीक्षकहरू:' : 'Reviewers Receiving Assignments:'}</span>
                <span className="text-[11px] text-stone-400">({reviewers.length} active)</span>
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-xs">
                {reviewers.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white dark:bg-stone-800 shadow-2xs">
                    <span className="font-medium text-stone-900 dark:text-stone-100">{r.name}</span>
                    <span className="text-[11px] text-stone-500 font-mono">{r.email}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkbox: only unassigned */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-stone-300 pt-1">
              <input
                type="checkbox"
                checked={autoOnlyUnassigned}
                onChange={(e) => setAutoOnlyUnassigned(e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                {locale === 'ne'
                  ? 'अहिलेसम्म समीक्षक नतोकिएका उम्मेदवारहरू मात्र बाँडफाँड गर्नुहोस् (सिफारिस गरिएको)'
                  : 'Allocate only unassigned candidates in this stage (recommended)'}
              </span>
            </label>

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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || reviewers.length === 0}
                onClick={handleRunAutoAssign}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                <span>{locale === 'ne' ? 'स्वचालित वितरण सुरु गर्नुहोस्' : 'Run Auto-Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BUTTON 2 - MANUAL BATCH ASSIGN ================= */}
      {modalType === 'manual-batch' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    {locale === 'ne' ? 'म्यानुअल समीक्षक तोक्नुहोस्' : 'Manual Reviewer Assignment'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} selected candidate(s) will be assigned.`
                      : `All ${unassignedInCurrentStage} unassigned candidate(s) in ${currentStageName} will be assigned.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-1">
              <div>
                Target Scope:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} Selected Candidate(s)`
                    : `All Unassigned in ${currentStageName} (${unassignedInCurrentStage})`}
                </strong>
              </div>
              <div className="text-[11px] text-stone-500">
                {selectedIds.size === 0 && (
                  <span>
                    (Tip: Check specific boxes in the table to assign custom candidate subsets)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {t.admin.candidates.modal.selectReviewer}
              </label>
              <select
                value={selectedReviewerId}
                onChange={(e) => setSelectedReviewerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
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
                onClick={handleRunManualBatchAssign}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                <span>{locale === 'ne' ? 'तोक्न पुष्टि गर्नुहोस्' : 'Confirm Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SINGLE CANDIDATE ASSIGN ================= */}
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

      {/* ================= MODAL: TRANSITION STAGE ================= */}
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
