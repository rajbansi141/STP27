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
  Layers,
  X,
  Sparkles,
  FileText,
  Phone,
  PhoneCall,
  Calendar,
} from 'lucide-react';
import { submitBatchToAdminAction } from '@/app/api/review/actions';
import { buildSanitizedCsv, downloadCsv } from '@/lib/csv';
import {
  PhoneInterviewSchedule,
  PHONE_CALL_OUTCOME_MAP,
  AscBooking,
} from '@/lib/constants/applicationReview';
import { CvPreviewModal } from '@/components/common/CvPreviewModal';
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
  cvFileName?: string;
  cvFileUrl?: string;
  phoneInterviewSchedule?: PhoneInterviewSchedule | null;
  ascBooking?: AscBooking | null;
  rawDetails?: Record<string, any>;
}

interface ReviewTableProps {
  data: ApplicationRowItem[];
  availableStages: { code: string; name: string }[];
  initialStage?: string;
  currentReviewerId?: string;
  stageCounts?: Record<string, number>;
  totalCount?: number;
  myAssignedCount?: number;
  completedCount?: number;
  pendingCount?: number;
}

export function ReviewTable({
  data,
  availableStages,
  initialStage = 'ALL',
  stageCounts = {},
  totalCount,
  myAssignedCount: propMyAssignedCount,
  completedCount: propCompletedCount,
  pendingCount: propPendingCount,
}: ReviewTableProps) {
  const { t, locale } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [stageFilter, setStageFilter] = useState(initialStage || 'ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');

  // Count helper calculations
  const assignedToMeCount = propMyAssignedCount ?? data.filter((d) => d.isAssignedToMe).length;
  const pendingMyReviewCount =
    propPendingCount ??
    data.filter((d) => d.isAssignedToMe && !d.reviewedByCurrentReviewer).length;
  const reviewedByMeCount =
    propCompletedCount ??
    data.filter((d) => d.isAssignedToMe && d.reviewedByCurrentReviewer).length;
  const unassignedPoolCount = data.filter((d) => d.assignedReviewers.length === 0).length;
  const onHoldCount = data.filter((d) => d.status === 'ON_HOLD').length;
  const rejectedCount = data.filter((d) => d.status === 'REJECTED').length;

  type ReviewerScope = 'ASSIGNED' | 'PENDING' | 'REVIEWED' | 'ON_HOLD' | 'REJECTED' | 'ALL' | 'UNASSIGNED';
  const [assignmentScope, setAssignmentScope] = useState<ReviewerScope>(
    assignedToMeCount > 0 ? 'ASSIGNED' : 'ALL'
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ]);

  useEffect(() => {
    if (initialStage) {
      setStageFilter(initialStage);
    }
  }, [initialStage]);

  const calculatedStageCounts = useMemo(() => {
    if (Object.keys(stageCounts).length > 0) return stageCounts;
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      counts[d.stage] = (counts[d.stage] || 0) + 1;
    });
    return counts;
  }, [stageCounts, data]);

  const totalCandidatesCount = totalCount || data.length;

  const handleSelectStage = (code: string) => {
    setStageFilter(code);
    const url = code === 'ALL' ? '/review' : `/review?stage=${code}`;
    window.history.replaceState(null, '', url);
  };

  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  const [previewCvItem, setPreviewCvItem] = useState<ApplicationRowItem | null>(null);

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
      // Assignment scope filter
      if (assignmentScope === 'ASSIGNED' && !item.isAssignedToMe) {
        return false;
      }
      if (assignmentScope === 'PENDING' && (!item.isAssignedToMe || item.reviewedByCurrentReviewer)) {
        return false;
      }
      if (assignmentScope === 'REVIEWED' && (!item.isAssignedToMe || !item.reviewedByCurrentReviewer)) {
        return false;
      }
      if (assignmentScope === 'ON_HOLD' && item.status !== 'ON_HOLD') {
        return false;
      }
      if (assignmentScope === 'REJECTED' && item.status !== 'REJECTED') {
        return false;
      }
      if (assignmentScope === 'UNASSIGNED' && item.assignedReviewers.length > 0) {
        return false;
      }
      // Subject filter
      if (subjectFilter !== 'ALL') {
        const itemSub = (item.subject || '').toLowerCase().replace(/[\s_-]+/g, '');
        const targetSub = subjectFilter.toLowerCase().replace(/[\s_-]+/g, '');
        if (targetSub === 'other') {
          const isStandard = ['english', 'math', 'gradeteaching'].includes(itemSub);
          if (isStandard) return false;
        } else if (itemSub !== targetSub && !itemSub.includes(targetSub) && !targetSub.includes(itemSub)) {
          return false;
        }
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
  }, [data, stageFilter, assignmentScope, subjectFilter, globalFilter]);


  // Export to CSV (Sanitized against CWE-1236 Formula Injection)
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
      d.refNo,
      d.applicantName,
      d.applicantEmail,
      d.applicantPhone,
      d.degree,
      d.subject,
      d.stage,
      d.isAssignedToMe ? 'Yes' : 'No',
      d.reviewedByCurrentReviewer ? 'Yes' : 'No',
      d.myScore !== null ? d.myScore : 'N/A',
      d.myRecommendation || 'N/A',
      d.submittedAt || 'N/A',
    ]);

    const csv = buildSanitizedCsv(headers, rows);
    downloadCsv('stp-2027-candidate-evaluations.csv', csv);
  };

  const columns = useMemo<ColumnDef<ApplicationRowItem>[]>(
    () => [
      {
        accessorKey: 'refNo',
        header: t.reviewer.table.refNo,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              href={`/reviewer/${row.id}`}
              className="font-mono font-bold text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 hover:underline transition-colors cursor-pointer"
              title={
                row.reviewedByCurrentReviewer
                  ? (locale === 'ne' ? 'समीक्षा / मूल्याङ्कन हेर्नुहोस्' : 'View review / evaluation')
                  : (locale === 'ne' ? 'उम्मेदवार मूल्याङ्कन सुरु गर्नुहोस्' : 'Start candidate evaluation')
              }
            >
              {info.getValue() as string}
            </Link>
          );
        },
      },
      {
        accessorKey: 'applicantName',
        header: t.reviewer.table.applicant,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              href={`/reviewer/${row.id}`}
              className="block text-left group cursor-pointer focus:outline-hidden"
              title={
                row.reviewedByCurrentReviewer
                  ? (locale === 'ne' ? 'समीक्षा / मूल्याङ्कन हेर्नुहोस्' : 'View review / evaluation')
                  : (locale === 'ne' ? 'उम्मेदवार मूल्याङ्कन सुरु गर्नुहोस्' : 'Start candidate evaluation')
              }
            >
              <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:underline transition-colors">
                {row.applicantName}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                <div className="truncate max-w-[220px]">{row.applicantEmail || '—'}</div>
                {row.applicantPhone && row.applicantPhone !== '—' && (
                  <div className="font-mono text-[10.5px] text-stone-400 dark:text-stone-500">
                    {row.applicantPhone}
                  </div>
                )}
              </div>
            </Link>
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
          const status = info.row.original.status;
          const phoneSchedule = info.row.original.phoneInterviewSchedule;
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {t.stages[stageCode as keyof typeof t.stages] || stageCode}
              </span>
              {(stageCode === 'PHONE_INTERVIEW' || phoneSchedule) && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    PHONE_CALL_OUTCOME_MAP[phoneSchedule?.callOutcome || 'PENDING']?.badgeClass ||
                    'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                  title={
                    phoneSchedule?.startDate && phoneSchedule?.endDate
                      ? `Call Window: ${phoneSchedule.startDate} – ${phoneSchedule.endDate} (${phoneSchedule.timeWindow})`
                      : 'Phone Screening Call'
                  }
                >
                  <Phone className="h-2.5 w-2.5" />
                  <span>
                    {locale === 'ne'
                      ? PHONE_CALL_OUTCOME_MAP[phoneSchedule?.callOutcome || 'PENDING']?.ne
                      : PHONE_CALL_OUTCOME_MAP[phoneSchedule?.callOutcome || 'PENDING']?.en}
                  </span>
                </span>
              )}
              {(stageCode === 'ASC' || info.row.original.ascBooking) && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    info.row.original.ascBooking
                      ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                  title={
                    info.row.original.ascBooking
                      ? `Booked ASC Date: ${info.row.original.ascBooking.bookedDate} (${info.row.original.ascBooking.reportingTime || '09:30 AM'}) @ ${info.row.original.ascBooking.venue || 'Kathmandu'}`
                      : 'ASC Date Slot Booking Pending'
                  }
                >
                  <Calendar className="h-2.5 w-2.5" />
                  <span>
                    {info.row.original.ascBooking
                      ? `ASC: ${info.row.original.ascBooking.bookedDate}`
                      : (locale === 'ne' ? 'छनोट बाँकी' : 'Slot Pending')}
                  </span>
                </span>
              )}
              {status === 'ON_HOLD' && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  ⏸ {locale === 'ne' ? 'प्रतिक्षारत / होल्ड' : 'On Hold'}
                </span>
              )}
              {status === 'REJECTED' && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  ✕ {locale === 'ne' ? 'सम्पन्न / अस्वीकृत' : 'Concluded'}
                </span>
              )}
            </div>
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
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewCvItem(item)}
                  title="Preview & Download Candidate CV"
                  className="p-1.5 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
                <Link
                  href={`/reviewer/${item.id}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition-all ${
                    item.reviewedByCurrentReviewer
                      ? 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow-sm'
                  }`}
                >
                  {item.reviewedByCurrentReviewer ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
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
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewCvItem(item)}
                  title="Preview & Download Candidate CV"
                  className="p-1.5 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
                <Link
                  href={`/reviewer/${item.id}`}
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
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewCvItem(item)}
                title="Preview & Download Candidate CV"
                className="p-1.5 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
              <Link
                href={`/reviewer/${item.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-800 text-stone-600 hover:text-stone-900 dark:text-stone-300 transition-all"
                title={
                  locale === 'ne'
                    ? `अन्य समीक्षक (${item.assignedReviewers.map((r) => r.name).join(', ')}) लाई तोकिएको - विवरण हेर्नुहोस्`
                    : `Assigned to ${item.assignedReviewers.map((r) => r.name).join(', ')} - View candidate dossier`
                }
              >
                <BookOpen className="h-3.5 w-3.5 text-stone-400" />
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

  const hasActiveFilters = Boolean(
    stageFilter !== 'ALL' ||
    subjectFilter !== 'ALL' ||
    assignmentScope !== (assignedToMeCount > 0 ? 'ASSIGNED' : 'ALL') ||
    globalFilter.trim()
  );

  const handleResetFilters = () => {
    handleSelectStage('ALL');
    setSubjectFilter('ALL');
    setAssignmentScope(assignedToMeCount > 0 ? 'ASSIGNED' : 'ALL');
    setGlobalFilter('');
  };

  return (
    <div className="space-y-4">
      {/* ================= REVIEWER ASSESSMENT COMMAND CENTER ================= */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Top Header Row: Queue Identity & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Layers className="h-4 w-4" />
              </span>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                {locale === 'ne' ? 'समीक्षा कार्यसूची र पाइपलाइन' : 'Assessment Queue & Pipeline'}
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
              {filteredData.length === totalCandidatesCount
                ? `${totalCandidatesCount} ${locale === 'ne' ? 'कुल आवेदन' : 'Total Applications'}`
                : `${filteredData.length} ${locale === 'ne' ? 'देखाउँदै' : 'shown'} / ${totalCandidatesCount} ${locale === 'ne' ? 'कुल' : 'Total'}`}
            </span>

            {/* Reset Filters CTA if any filter is active */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>{locale === 'ne' ? 'फिल्टरहरू रिसेट गर्नुहोस्' : 'Reset Filters'}</span>
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
              title="Export candidate list and evaluations as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.reviewer.table.exportCsvBtn}</span>
              <span className="sm:hidden">CSV</span>
            </button>

            {/* Submit to Admin */}
            <button
              type="button"
              onClick={() => setIsBatchOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
              title="Submit completed review batch to administrator"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{locale === 'ne' ? 'व्यवस्थापकलाई पेश गर्नुहोस्' : 'Submit to Admin'}</span>
              {reviewedByMeCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-900/80 text-emerald-100">
                  {reviewedByMeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Primary Focus Scope Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {/* Assigned to Me Tab */}
          <button
            type="button"
            onClick={() => setAssignmentScope('ASSIGNED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              assignmentScope === 'ASSIGNED'
                ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'मलाई तोकिएका' : 'Assigned to Me'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                assignmentScope === 'ASSIGNED'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {assignedToMeCount}
            </span>
          </button>

          {/* Pending My Review Tab */}
          <button
            type="button"
            onClick={() => setAssignmentScope('PENDING')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              assignmentScope === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/30'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'स्कोर गर्न बाँकी' : 'Needs Evaluation'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                assignmentScope === 'PENDING'
                  ? 'bg-amber-800/80 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {pendingMyReviewCount}
            </span>
          </button>

          {/* Evaluated by Me Tab */}
          <button
            type="button"
            onClick={() => setAssignmentScope('REVIEWED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              assignmentScope === 'REVIEWED'
                ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-500/30'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'सम्पन्न भएका' : 'Evaluated by Me'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                assignmentScope === 'REVIEWED'
                  ? 'bg-teal-900/60 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {reviewedByMeCount}
            </span>
          </button>

          {/* On-Hold Queue Tab */}
          <button
            type="button"
            onClick={() => setAssignmentScope('ON_HOLD')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              assignmentScope === 'ON_HOLD'
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/30'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <span>⏸ {locale === 'ne' ? 'होल्ड / छलफलमा' : 'On-Hold Queue'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                assignmentScope === 'ON_HOLD'
                  ? 'bg-amber-900/60 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {onHoldCount}
            </span>
          </button>

          {/* Rejected Candidates Tab */}
          <button
            type="button"
            onClick={() => setAssignmentScope('REJECTED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              assignmentScope === 'REJECTED'
                ? 'bg-rose-700 text-white shadow-xs ring-2 ring-rose-500/30'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <span>✕ {locale === 'ne' ? 'अस्वीकृत सूची' : 'Rejected'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                assignmentScope === 'REJECTED'
                  ? 'bg-rose-950/80 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {rejectedCount}
            </span>
          </button>

          {/* All Cohort Tab */}
          <button
            type="button"
            onClick={() => setAssignmentScope('ALL')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              assignmentScope === 'ALL'
                ? 'bg-stone-800 text-white shadow-xs ring-2 ring-stone-600/30 dark:bg-stone-700'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'सबै आवेदनहरू' : 'All Cohort'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                assignmentScope === 'ALL'
                  ? 'bg-stone-950/80 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {data.length}
            </span>
          </button>

          {/* Unassigned Pool Tab */}
          <button
            type="button"
            onClick={() => setAssignmentScope('UNASSIGNED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              assignmentScope === 'UNASSIGNED'
                ? 'bg-stone-800 text-white shadow-xs ring-2 ring-stone-600/30 dark:bg-stone-700'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300'
            }`}
          >
            <span>{locale === 'ne' ? 'तोकिन बाँकी' : 'Unassigned Pool'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                assignmentScope === 'UNASSIGNED'
                  ? 'bg-stone-950/80 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {unassignedPoolCount}
            </span>
          </button>
        </div>

        {/* Row 3: Pipeline Stage Stepper Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          {/* All Stages */}
          <button
            type="button"
            onClick={() => handleSelectStage('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              stageFilter === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            <span>{locale === 'ne' ? 'सबै चरणहरू' : 'All Stages'}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                stageFilter === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {totalCandidatesCount}
            </span>
          </button>

          {/* Configured Stages */}
          {availableStages.map((stg) => {
            const isCurrent = stageFilter === stg.code;
            const count = calculatedStageCounts[stg.code] || 0;
            return (
              <button
                key={stg.code}
                type="button"
                onClick={() => handleSelectStage(stg.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <span>{stg.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 4: Search & Secondary Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={t.reviewer.table.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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

          {/* Subject Filter Dropdown */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium cursor-pointer"
          >
            <option value="ALL">{locale === 'ne' ? 'सबै विषयहरू' : 'All Subjects'}</option>
            <option value="English">English</option>
            <option value="Math">Math</option>
            <option value="Grade Teaching">Grade Teaching</option>
          </select>
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
                  <td colSpan={columns.length} className="py-14 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-3">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {t.reviewer.table.noResults}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                        {hasActiveFilters
                          ? (locale === 'ne'
                              ? 'हाल चयन गरिएका खोज मापदण्ड वा फिल्टरसँग मेल खाने कुनै उम्मेदवार फेला परेन।'
                              : 'No candidates match the active search criteria or queue filter.')
                          : (locale === 'ne'
                              ? 'तपाईंलाई हाल कुनै पनि उम्मेदवार तोकिएको छैन वा यो दृश्य खाली छ।'
                              : 'You do not have any applications in this queue view yet.')}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{locale === 'ne' ? 'सबै फिल्टर हटाउनुहोस्' : 'Clear Filters'}</span>
                        </button>
                      ) : (
                        assignmentScope !== 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setAssignmentScope('ALL')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{locale === 'ne' ? 'सबै समूह हेर्नुहोस्' : 'View All Cohort'}</span>
                          </button>
                        )
                      )}
                    </div>
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

      {/* CV Document Preview & Download Modal */}
      {previewCvItem && (
        <CvPreviewModal
          isOpen={Boolean(previewCvItem)}
          onClose={() => setPreviewCvItem(null)}
          fileName={previewCvItem.cvFileName}
          fileUrl={previewCvItem.cvFileUrl}
          candidateName={previewCvItem.applicantName}
          refNo={previewCvItem.refNo}
          subject={previewCvItem.subject}
        />
      )}
    </div>
  );
}
