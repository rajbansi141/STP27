'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import {
  Calendar,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Sliders,
  Eye,
  XCircle,
  PauseCircle,
  RotateCcw,
  Loader2,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { buildSanitizedCsv, downloadCsv } from '@/lib/csv';
import {
  AscSessionConfig,
  AscBooking,
  AscDateSlot,
  REJECTION_REASON_MAP,
  ON_HOLD_CATEGORY_MAP,
} from '@/lib/constants/applicationReview';
import {
  updateAscSessionConfigAction,
  decideAscCandidateAction,
} from '@/app/api/asc/actions';
import { AscConfigModal } from './AscConfigModal';
import { AscAdmitPassPreviewModal } from '@/components/applicant/AscAdmitPassPreviewModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface AscCandidateRosterItem {
  id: string;
  refNo: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  subject: string;
  degree: string;
  stage: string;
  status: string;
  booking?: AscBooking | null;
  assignedReviewers: { id: string; name: string }[];
}

interface AscManagementHubProps {
  initialConfig: AscSessionConfig;
  initialSlots: AscDateSlot[];
  candidates: AscCandidateRosterItem[];
  locale?: string;
}

export function AscManagementHub({
  initialConfig,
  initialSlots,
  candidates,
  locale = 'en',
}: AscManagementHubProps) {
  const isNe = locale === 'ne';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [config, setConfig] = useState<AscSessionConfig>(initialConfig);
  const [slots, setSlots] = useState<AscDateSlot[]>(initialSlots);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Filters & Search
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | 'BOOKED' | 'PENDING'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');

  // Sorting
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'bookedDate', desc: false },
  ]);

  // Modals for Decision
  const [selectedCandidate, setSelectedCandidate] = useState<AscCandidateRosterItem | null>(null);
  const [decisionModalType, setDecisionModalType] = useState<'ADVANCE' | 'REJECT' | 'HOLD' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [rejectionCategory, setRejectionCategory] = useState('INTERVIEW_PERFORMANCE');
  const [holdCategory, setHoldCategory] = useState('BORDERLINE_SCORE');
  const [previewPassCandidate, setPreviewPassCandidate] = useState<AscCandidateRosterItem | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();

  // Analytics Computations
  const totalAscCandidates = candidates.length;
  const bookedCandidates = useMemo(
    () => candidates.filter((c) => Boolean(c.booking?.bookedDate)),
    [candidates]
  );
  const pendingBookingCandidates = useMemo(
    () => candidates.filter((c) => !c.booking?.bookedDate),
    [candidates]
  );

  const totalCapacity = useMemo(
    () => slots.reduce((acc, s) => acc + s.totalQuota, 0),
    [slots]
  );
  const totalBookedSeats = useMemo(
    () => slots.reduce((acc, s) => acc + s.bookedCount, 0),
    [slots]
  );
  const overallOccupancyPercent = totalCapacity > 0 ? Math.round((totalBookedSeats / totalCapacity) * 100) : 0;

  // Subject breakdown for booked candidates
  const subjectBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    candidates.forEach((c) => {
      const sub = c.subject || 'General';
      counts[sub] = (counts[sub] || 0) + 1;
    });
    return counts;
  }, [candidates]);

  // Filtered Candidate Data for Table
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedDateFilter !== 'ALL') {
        if (c.booking?.bookedDate !== selectedDateFilter) return false;
      }
      if (bookingStatusFilter === 'BOOKED' && !c.booking?.bookedDate) return false;
      if (bookingStatusFilter === 'PENDING' && c.booking?.bookedDate) return false;
      if (subjectFilter !== 'ALL' && c.subject !== subjectFilter) return false;

      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase();
        const matchesRef = c.refNo.toLowerCase().includes(q);
        const matchesName = c.applicantName.toLowerCase().includes(q);
        const matchesEmail = c.applicantEmail.toLowerCase().includes(q);
        const matchesPhone = c.applicantPhone.toLowerCase().includes(q);
        if (!matchesRef && !matchesName && !matchesEmail && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [candidates, selectedDateFilter, bookingStatusFilter, subjectFilter, globalFilter]);

  // Execute Decisions
  const handleExecuteDecision = () => {
    if (!selectedCandidate || !decisionModalType) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await decideAscCandidateAction({
        applicationId: selectedCandidate.id,
        decision:
          decisionModalType === 'ADVANCE'
            ? 'ADVANCE_PARENTS_MEET'
            : decisionModalType === 'REJECT'
            ? 'REJECT'
            : 'HOLD',
        reasonCategory:
          decisionModalType === 'REJECT'
            ? rejectionCategory
            : decisionModalType === 'HOLD'
            ? holdCategory
            : undefined,
        notes: decisionNote.trim() || undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            decisionModalType === 'ADVANCE'
              ? `Candidate ${selectedCandidate.applicantName} (${selectedCandidate.refNo}) advanced to Parents' Meet!`
              : decisionModalType === 'REJECT'
              ? `Candidate ${selectedCandidate.applicantName} marked as Rejected.`
              : `Candidate ${selectedCandidate.applicantName} has been placed on hold.`,
        });
        setDecisionModalType(null);
        setSelectedCandidate(null);
        setDecisionNote('');
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Operation failed.',
        });
      }
    });
  };

  // Export CSV (Sanitized against CWE-1236 Formula Injection)
  const handleExportCsv = () => {
    const headers = [
      'Reference No',
      'Candidate Name',
      'Email',
      'Phone',
      'Subject',
      'Qualification',
      'Stage',
      'Booking Status',
      'Booked Date',
      'Venue',
      'Reporting Time',
    ];

    const rows = filteredCandidates.map((c) => [
      c.refNo,
      c.applicantName,
      c.applicantEmail,
      c.applicantPhone,
      c.subject,
      c.degree,
      c.stage,
      c.booking?.bookedDate ? 'CONFIRMED' : 'PENDING',
      c.booking?.bookedDate || 'N/A',
      c.booking?.venue || config.venue,
      c.booking?.reportingTime || config.reportingTime,
    ]);

    const csv = buildSanitizedCsv(headers, rows);
    downloadCsv(`ASC_Candidates_Roster_${config.startDate}_to_${config.endDate}.csv`, csv);
  };

  // TanStack Columns Definition
  const columns = useMemo<ColumnDef<AscCandidateRosterItem>[]>(
    () => [
      {
        accessorKey: 'refNo',
        header: 'Ref No & Candidate',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                  {c.refNo}
                </span>
                <Link
                  href={`/admin/candidates/${c.id}`}
                  className="font-bold text-xs text-stone-900 dark:text-stone-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  {c.applicantName}
                </Link>
              </div>
              <div className="text-[11px] text-stone-500 truncate max-w-[200px]">
                {c.applicantEmail} • {c.applicantPhone}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'subject',
        header: 'Subject & Degree',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <span className="inline-block font-semibold text-xs text-stone-800 dark:text-stone-200">
              {row.original.subject || 'Grade Teaching'}
            </span>
            <div className="text-[11px] text-stone-500 truncate max-w-[160px]">
              {row.original.degree || "Bachelor's Degree"}
            </div>
          </div>
        ),
      },
      {
        id: 'bookedDate',
        header: 'ASC Booked Slot & Venue',
        accessorFn: (row) => row.booking?.bookedDate || 'ZZZ',
        cell: ({ row }) => {
          const b = row.original.booking;
          if (!b?.bookedDate) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="h-3 w-3" />
                <span>Slot Booking Pending</span>
              </span>
            );
          }
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Calendar className="h-3 w-3" />
                  <span>{b.bookedDate}</span>
                </span>
                <span className="text-[11px] font-mono font-medium text-stone-500">
                  {b.reportingTime || config.reportingTime}
                </span>
              </div>
              <div className="text-[10px] text-stone-500 truncate max-w-[180px] flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 text-stone-400 shrink-0" />
                <span>{b.venue || config.venue}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'pass',
        header: 'Admit Pass',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1.5">
              {/* Direct Download PDF */}
              <a
                href={`/api/asc/admit-pass/${c.id}`}
                download={`ASC_Admit_Pass_${c.refNo}.pdf`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors shadow-2xs"
                title="Download Official PDF Admit Pass"
              >
                <Download className="h-3 w-3" />
                <span>PDF</span>
              </a>

              {/* View Pass Modal */}
              <button
                type="button"
                onClick={() => setPreviewPassCandidate(c)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Preview & Print Pass"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Stage Operations',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1">
              {/* Advance to Parents' Meet */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(c);
                  setDecisionModalType('ADVANCE');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                title="Advance Candidate to Parents' Meet"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Advance</span>
              </button>

              {/* Put on Hold */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(c);
                  setDecisionModalType('HOLD');
                }}
                className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                title="Place on Hold / Quota Balancing"
              >
                <PauseCircle className="h-3.5 w-3.5" />
              </button>

              {/* Reject Candidate */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(c);
                  setDecisionModalType('REJECT');
                }}
                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                title="Reject Candidate"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>

              {/* Candidate Dossier Link */}
              <Link
                href={`/admin/candidates/${c.id}`}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                title="View Candidate Dossier"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        },
      },
    ],
    [config]
  );

  const table = useReactTable({
    data: filteredCandidates,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Command Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20">
              <Layers className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
              ASC Command Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Standardized Assessment Stage • Date Range, Daily Quota Caps & Candidate Progression
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Configure Date Range & Quota Button */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-2xs transition-all cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5 text-emerald-600" />
            <span>Configure Schedule & Quotas</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
            title="Export filtered roster to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. TREMOR-STYLE ANALYTICS & OCCUPANCY OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total ASC Candidates */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Shortlisted</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-stone-100">
              {totalAscCandidates}
            </span>
            <span className="text-xs text-stone-500">candidates</span>
          </div>
          <p className="text-[11px] text-stone-500">Advanced from Phone Screening stage</p>
        </div>

        {/* Metric 2: Booked vs Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Booking Status</span>
            <Calendar className="h-4 w-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
              {bookedCandidates.length}
            </span>
            <span className="text-xs text-stone-500">
              booked / <strong className="text-amber-600">{pendingBookingCandidates.length}</strong> pending
            </span>
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{
                width: `${totalAscCandidates > 0 ? (bookedCandidates.length / totalAscCandidates) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 3: Total Seat Occupancy */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Quota Capacity</span>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-stone-100">
              {totalBookedSeats}
            </span>
            <span className="text-xs text-stone-500">/ {totalCapacity} seats</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-500">{overallOccupancyPercent}% overall capacity</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {totalCapacity - totalBookedSeats} remaining
            </span>
          </div>
        </div>

        {/* Metric 4: Venue & Reporting Time */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Venue & Window</span>
            <MapPin className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
            {config.venue}
          </div>
          <div className="text-[11px] text-stone-500 font-mono">
            {config.startDate} to {config.endDate} • {config.reportingTime}
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE DATE CAPACITY HISTOGRAM / BAR CHART */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span>Daily Assessment Slots & Seat Capacity Utilization</span>
            </h3>
            <p className="text-xs text-stone-500">
              Click on any day bar to filter the candidate roster below. Strict cap of {config.dailyQuota} seats/day.
            </p>
          </div>

          {selectedDateFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedDateFilter('ALL')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Date Filter ({selectedDateFilter})</span>
            </button>
          )}
        </div>

        {/* Visual Bar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {slots.map((slot) => {
            const isSelected = selectedDateFilter === slot.date;
            const fillPercent = Math.min(
              100,
              Math.round((slot.bookedCount / Math.max(1, slot.totalQuota)) * 100)
            );

            return (
              <button
                key={slot.date}
                type="button"
                onClick={() =>
                  setSelectedDateFilter((prev) => (prev === slot.date ? 'ALL' : slot.date))
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30'
                    : slot.isFull
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-400'
                    : 'bg-stone-50/80 dark:bg-stone-800/50 border-stone-200 dark:border-stone-750 hover:border-emerald-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span className="font-semibold uppercase">{slot.dayOfWeek.slice(0, 3)}</span>
                    <span className="font-mono text-[9px]">{slot.bookedCount}/{slot.totalQuota}</span>
                  </div>
                  <div className="text-xs font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                    {slot.date.slice(5)}
                  </div>
                </div>

                {/* Progress Fill */}
                <div className="space-y-1">
                  <div className="w-full bg-stone-200/80 dark:bg-stone-700/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        slot.isFull
                          ? 'bg-rose-600'
                          : fillPercent >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-bold">
                    {slot.isFull ? (
                      <span className="text-rose-600 dark:text-rose-400">Full</span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {slot.remainingSeats} left
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ROSTER FILTER TOOLBAR & TANSTACK TABLE */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search candidate name, ref, email..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Booking Status Filter Dropdown */}
            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Booking Status</option>
              <option value="BOOKED">Slot Booked ({bookedCandidates.length})</option>
              <option value="PENDING">Booking Pending ({pendingBookingCandidates.length})</option>
            </select>

            {/* Subject Filter Dropdown */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Subjects</option>
              {Object.keys(subjectBreakdown).map((sub) => (
                <option key={sub} value={sub}>
                  {sub} ({subjectBreakdown[sub]})
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-stone-500">
            Showing <strong>{filteredCandidates.length}</strong> of <strong>{candidates.length}</strong> ASC candidates
          </div>
        </div>

        {/* TanStack Table Rendering */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 dark:bg-stone-850 text-stone-600 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 uppercase tracking-wider font-semibold text-[10px]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
                    className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-stone-400 italic">
                    No candidate records match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="px-3 py-1 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="px-3 py-1 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Admin ASC Configuration Modal */}
      <AscConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigUpdated={() => {
          setIsConfigModalOpen(false);
          router.refresh();
        }}
      />

      {/* Candidate Admit Pass Preview Modal */}
      {previewPassCandidate && (
        <AscAdmitPassPreviewModal
          isOpen={Boolean(previewPassCandidate)}
          onClose={() => setPreviewPassCandidate(null)}
          applicationId={previewPassCandidate.id}
          refNo={previewPassCandidate.refNo}
          candidateName={previewPassCandidate.applicantName}
          email={previewPassCandidate.applicantEmail}
          phone={previewPassCandidate.applicantPhone}
          subject={previewPassCandidate.subject}
          degree={previewPassCandidate.degree}
          booking={
            previewPassCandidate.booking || {
              bookedDate: config.startDate,
              bookedAt: new Date().toISOString(),
              venue: config.venue,
              reportingTime: config.reportingTime,
              status: 'CONFIRMED',
            }
          }
          locale={locale}
        />
      )}

      {/* Decision Execution Dialog */}
      {decisionModalType && selectedCandidate && (
        <Dialog open={Boolean(decisionModalType)} onOpenChange={() => setDecisionModalType(null)}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-stone-900 dark:text-stone-100">
                {decisionModalType === 'ADVANCE' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Advance Candidate to Parents' Meet Event</span>
                  </>
                ) : decisionModalType === 'HOLD' ? (
                  <>
                    <PauseCircle className="h-5 w-5 text-amber-600" />
                    <span>Place Candidate on Deliberation Hold</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <span>Reject Candidate Application</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {decisionModalType === 'ADVANCE'
                  ? `Candidate ${selectedCandidate.applicantName} (${selectedCandidate.refNo}) will advance to the next pipeline stage: Parents' Meet.`
                  : decisionModalType === 'HOLD'
                  ? `Candidate will be retained on hold for quota balancing or committee deliberation.`
                  : `Candidate will be marked as rejected with automated email notification.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {decisionModalType === 'REJECT' && (
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 dark:text-stone-300">
                    Rejection Feedback Reason:
                  </label>
                  <select
                    value={rejectionCategory}
                    onChange={(e) => setRejectionCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    {Object.entries(REJECTION_REASON_MAP).map(([key, val]) => (
                      <option key={key} value={key}>
                        {isNe ? val.ne : val.en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {decisionModalType === 'HOLD' && (
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 dark:text-stone-300">
                    On-Hold Deliberation Category:
                  </label>
                  <select
                    value={holdCategory}
                    onChange={(e) => setHoldCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    {Object.entries(ON_HOLD_CATEGORY_MAP).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  Committee Decision Observation / Note:
                </label>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Optional observation note recorded into permanent application history..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDecisionModalType(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExecuteDecision}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 ${
                  decisionModalType === 'ADVANCE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decisionModalType === 'HOLD'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>
                  {decisionModalType === 'ADVANCE'
                    ? "Advance to Parents' Meet"
                    : decisionModalType === 'HOLD'
                    ? 'Place on Hold'
                    : 'Confirm Rejection'}
                </span>
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
