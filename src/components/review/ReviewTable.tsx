'use client';

import React, { useState, useMemo } from 'react';
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
  submittedAt: string | null;
  reviewedByCurrentReviewer: boolean;
  myScore: number | null;
  myRecommendation: string | null;
}

interface ReviewTableProps {
  data: ApplicationRowItem[];
  availableStages: { code: string; name: string }[];
}

export function ReviewTable({ data, availableStages }: ReviewTableProps) {
  const { t, locale } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ]);

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
  }, [data, stageFilter, statusFilter, globalFilter]);

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
      'Evaluated By Me',
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
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                <Clock className="h-3 w-3" />
                <span>{locale === 'ne' ? 'प्रतीक्षारत' : 'Pending'}</span>
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
          return (
            <div className="text-right">
              <Link
                href={`/review/${item.id}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition-all ${
                  item.reviewedByCurrentReviewer
                    ? 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {item.reviewedByCurrentReviewer ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>{t.reviewer.table.viewBtn}</span>
                  </>
                ) : (
                  <>
                    <span>{t.reviewer.table.evaluateBtn}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
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
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                    className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors"
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
                  <td colSpan={columns.length} className="py-12 text-center text-stone-400 text-xs">
                    {t.reviewer.table.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 text-xs text-stone-500">
          <div>
            <span>
              {t.reviewer.table.showing} {table.getState().pagination.pageIndex * 10 + 1}{' '}
              {t.reviewer.table.to}{' '}
              {Math.min((table.getState().pagination.pageIndex + 1) * 10, filteredData.length)}{' '}
              {t.reviewer.table.of} {filteredData.length} {t.reviewer.table.results}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {t.reviewer.table.prev}
            </button>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {t.reviewer.table.page} {table.getState().pagination.pageIndex + 1} {t.reviewer.table.of}{' '}
              {table.getPageCount() || 1}
            </span>
            <button
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {t.reviewer.table.next}
            </button>
          </div>
        </div>
      </div>

      {/* Submit to Admin Confirm Dialog */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mb-2">
              <Send className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center font-bold">
              {locale === 'ne'
                ? 'मूल्याङ्कन ब्याच व्यवस्थापकलाई पेश गर्नुहोस्'
                : 'Submit Evaluations to Admin'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm">
              {locale === 'ne' ? (
                <>
                  के तपाईं आफ्ना सबै सम्पन्न मूल्याङ्कनहरू व्यवस्थापन समितिलाई अन्तिम निर्णयका लागि पेश गर्न चाहनुहुन्छ? व्यवस्थापकले तत्काल इन-एप सूचना प्राप्त गर्नेछन्।
                </>
              ) : (
                <>
                  This will finalize and send your evaluation report batch to the selection committee coordinators. All admins will be notified in-app.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {batchFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{batchFeedback}</span>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchOpen(false)}
              disabled={isBatchSubmitting}
            >
              {locale === 'ne' ? 'रद्द' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitBatch}
              disabled={isBatchSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isBatchSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>{locale === 'ne' ? 'पेश गर्दै...' : 'Submitting...'}</span>
                </>
              ) : (
                locale === 'ne' ? 'पुष्टि र पेश गर्नुहोस्' : 'Confirm & Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
