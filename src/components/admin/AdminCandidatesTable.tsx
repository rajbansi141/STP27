'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  requestCandidateClarificationAction,
  adminRejectApplicationAction,
  adminBatchRejectApplicationsAction,
  adminPlaceOnHoldAction,
  adminBatchPlaceOnHoldAction,
  adminReopenApplicationAction,
  adminSchedulePhoneInterviewAction,
  adminBatchSchedulePhoneInterviewAction,
} from '@/app/api/admin/actions';
import { resolveHoldApplicationAction } from '@/app/api/review/actions';
import {
  REJECTION_REASON_MAP,
  ON_HOLD_CATEGORY_MAP,
  PhoneInterviewSchedule,
  PHONE_CALL_OUTCOME_MAP,
  AscBooking,
} from '@/lib/constants/applicationReview';
import { AscConfigModal } from '@/components/admin/AscConfigModal';
import { CvPreviewModal } from '@/components/common/CvPreviewModal';
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
  FileText,
  Scale,
  MessageSquare,
  Send,
  XCircle,
  RotateCcw,
  PauseCircle,
  Archive,
  Phone,
  PhoneCall,
  Calendar,
  MoreHorizontal,
  ArrowRight,
  Ban,
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
  cvFileName?: string;
  cvFileUrl?: string;
  phoneInterviewSchedule?: PhoneInterviewSchedule | null;
  ascBooking?: AscBooking | null;
  cohortId?: string | null;
}

interface AdminCandidatesTableProps {
  candidates: AdminCandidateRow[];
  stages: { code: string; name: string }[];
  reviewers: { id: string; name: string; email: string }[];
  cohorts?: { id: string; code: string; year: number; isCurrent: boolean }[];
  initialStage?: string;
  initialSubject?: string;
  initialCohortId?: string;
  stageCounts?: Record<string, number>;
  totalCount?: number;
}

export function AdminCandidatesTable({
  candidates,
  stages,
  reviewers,
  cohorts = [],
  initialStage = 'ALL',
  initialSubject = 'ALL',
  initialCohortId = 'ALL',
  stageCounts = {},
  totalCount,
}: AdminCandidatesTableProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [stageFilter, setStageFilter] = useState(initialStage || 'ALL');
  const [subjectFilter, setSubjectFilter] = useState(initialSubject || 'ALL');
  const [cohortFilter, setCohortFilter] = useState(initialCohortId || 'ALL');
  const [showAllocationHub, setShowAllocationHub] = useState<boolean>(false);

  useEffect(() => {
    if (initialStage) {
      setStageFilter(initialStage);
    }
  }, [initialStage]);

  useEffect(() => {
    if (initialSubject) {
      setSubjectFilter(initialSubject);
    }
  }, [initialSubject]);

  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ]);

  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();
  const [isPending, startTransition] = useTransition();

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto');
  const [isAscConfigModalOpen, setIsAscConfigModalOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidateRow | null>(null);
  const [modalType, setModalType] = useState<
    | 'assign'
    | 'stage'
    | 'auto-assign'
    | 'manual-batch'
    | 'resolve-hold'
    | 'clarification'
    | 'reject'
    | 'batch-reject'
    | 'single-hold'
    | 'batch-hold'
    | 'reopen'
    | 'schedule-phone'
    | 'batch-schedule-phone'
    | null
  >(null);
  const [cvPreviewCandidate, setCvPreviewCandidate] = useState<AdminCandidateRow | null>(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>(reviewers[0]?.id || '');
  const [targetStageCode, setTargetStageCode] = useState<string>('');
  const [stageNote, setStageNote] = useState<string>('');
  const [autoOnlyUnassigned, setAutoOnlyUnassigned] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phone Interview Schedule Form State
  const [phoneStartDate, setPhoneStartDate] = useState<string>('');
  const [phoneEndDate, setPhoneEndDate] = useState<string>('');
  const [phoneTimeWindow, setPhoneTimeWindow] = useState<string>(
    '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)'
  );
  const [phoneInstructions, setPhoneInstructions] = useState<string>(
    'Please ensure your phone is switched on and kept with you in a quiet area during office hours.'
  );
  const [sendPhoneScheduleEmail, setSendPhoneScheduleEmail] = useState<boolean>(true);
  const [clarificationMessage, setClarificationMessage] = useState<string>('');

  // Structured Hold Form State
  const [holdCategory, setHoldCategory] = useState<string>('QUOTA_BALANCING');
  const [holdReasonInput, setHoldReasonInput] = useState<string>('');
  const [holdExpectedDate, setHoldExpectedDate] = useState<string>('');

  // Structured Rejection Form State
  const [rejectionCategory, setRejectionCategory] = useState<string>('ACADEMIC_CRITERIA');
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [sendRejectionEmail, setSendRejectionEmail] = useState<boolean>(true);

  // Reopen Form State
  const [reopenTargetStatus, setReopenTargetStatus] = useState<'UNDER_REVIEW' | 'SHORTLISTED'>('UNDER_REVIEW');
  const [reopenTargetStage, setReopenTargetStage] = useState<string>('');
  const [reopenReason, setReopenReason] = useState<string>('');

  // Queue counts
  const onHoldCount = useMemo(() => {
    return candidates.filter((c) => c.status === 'ON_HOLD').length;
  }, [candidates]);

  const rejectedCount = useMemo(() => {
    return candidates.filter((c) => c.status === 'REJECTED').length;
  }, [candidates]);

  const activeCandidatesCount = useMemo(() => {
    return candidates.filter((c) => c.status !== 'REJECTED' && c.status !== 'ON_HOLD').length;
  }, [candidates]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return candidates.filter((item) => {
      if (stageFilter !== 'ALL' && item.stage !== stageFilter) return false;
      if (statusFilter === 'ACTIVE') {
        if (item.status === 'REJECTED' || item.status === 'ON_HOLD') return false;
      } else if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
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
      if (assignmentFilter === 'ASSIGNED' && item.assignedReviewers.length === 0) return false;
      if (assignmentFilter === 'UNASSIGNED' && item.assignedReviewers.length > 0) return false;

      if (cohortFilter !== 'ALL' && item.cohortId !== cohortFilter) return false;

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
  }, [candidates, stageFilter, statusFilter, subjectFilter, assignmentFilter, cohortFilter, globalFilter]);

  // Quick statistics for current filter
  const currentStageName = useMemo(() => {
    if (stageFilter === 'ALL') return locale === 'ne' ? 'सबै चरणहरू' : 'All Stages';
    return stages.find((s) => s.code === stageFilter)?.name || stageFilter;
  }, [stageFilter, stages, locale]);

  const unassignedInCurrentStage = useMemo(() => {
    return filteredData.filter((c) => c.assignedReviewers.length === 0).length;
  }, [filteredData]);

  // Reviewer existing workload counts
  const reviewerWorkloads = useMemo(() => {
    const counts: Record<string, number> = {};
    candidates.forEach((c) => {
      c.assignedReviewers.forEach((r) => {
        counts[r.id] = (counts[r.id] || 0) + 1;
      });
    });
    return counts;
  }, [candidates]);

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
    const searchParamsObj = new URLSearchParams(window.location.search);
    if (code === 'ALL') {
      searchParamsObj.delete('stage');
    } else {
      searchParamsObj.set('stage', code);
    }
    const query = searchParamsObj.toString();
    const url = `/admin/candidates${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', url);
  };

  const handleSelectSubject = (val: string) => {
    setSubjectFilter(val);
    const searchParamsObj = new URLSearchParams(window.location.search);
    if (val === 'ALL') {
      searchParamsObj.delete('subject');
    } else {
      searchParamsObj.set('subject', val);
    }
    const query = searchParamsObj.toString();
    const url = `/admin/candidates${query ? `?${query}` : ''}`;
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

  // Handle CSV Export (Sanitized against CWE-1236 Formula Injection)
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
      c.refNo,
      c.applicantName,
      c.applicantEmail,
      c.applicantPhone,
      c.subject,
      c.degree,
      c.stage,
      c.status,
      c.submittedAt || 'N/A',
      c.reviewCount,
      c.avgScore !== null ? c.avgScore : 'N/A',
      c.assignedReviewers.map((r) => r.name).join('; '),
    ]);

    const csv = buildSanitizedCsv(headers, rows);
    downloadCsv('stp-2027-candidate-roster.csv', csv);
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
        router.refresh();
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

  // Hold Resolution Handler (Direct Admin Authority: Advance to Next Stage or Reject)
  const handleResolveHold = (decision: 'ADVANCE' | 'REJECT') => {
    if (!selectedCandidate) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await resolveHoldApplicationAction(selectedCandidate.id, decision);

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            decision === 'ADVANCE'
              ? (locale === 'ne'
                  ? 'उम्मेदवारलाई सफलतापूर्वक आगामी चरणमा स्तरोन्नति गरियो।'
                  : res.message || 'Candidate successfully advanced to next stage!')
              : (locale === 'ne'
                  ? 'उम्मेदवारलाई प्रक्रियाबाट अस्वीकृत गरियो।'
                  : res.message || 'Candidate marked as Rejected.'),
        });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error resolving hold status.' });
      }
    });
  };

  // Clarification Inquiry Handler
  const handleRequestClarification = () => {
    if (!selectedCandidate || !clarificationMessage.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await requestCandidateClarificationAction({
        applicationId: selectedCandidate.id,
        message: clarificationMessage.trim(),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'उम्मेदवारलाई थप स्पष्टीकरण अनुरोध सफलतापूर्वक पठाइयो!'
              : res.message || 'Clarification request sent to applicant!',
        });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1300);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error sending clarification inquiry.' });
      }
    });
  };

  // Structured Rejection Handler (Single)
  const handleSingleReject = () => {
    if (!selectedCandidate) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminRejectApplicationAction({
        applicationId: selectedCandidate.id,
        reasonCategory: rejectionCategory,
        feedbackNote: rejectionNote.trim() || undefined,
        sendNotificationEmail: sendRejectionEmail,
      });

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'उम्मेदवारी सफलतापूर्वक प्रक्रिया सम्पन्न (अस्वीकृत) गरियो।'
              : res.message || 'Application rejected successfully.',
        });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1300);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to reject application.' });
      }
    });
  };

  // Structured Batch Rejection Handler
  const handleBatchReject = () => {
    if (selectedIds.size === 0) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminBatchRejectApplicationsAction({
        applicationIds: Array.from(selectedIds),
        reasonCategory: rejectionCategory,
        feedbackNote: rejectionNote.trim() || undefined,
        sendNotificationEmail: sendRejectionEmail,
      });

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? `सफलतापूर्वक ${res.count || selectedIds.size} उम्मेदवारहरू अस्वीकृत सूचीमा थपियो।`
              : res.message || 'Batch rejection completed successfully.',
        });
        setSelectedIds(new Set());
        setTimeout(() => {
          setModalType(null);
          setFeedback(null);
        }, 1500);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to process batch rejection.' });
      }
    });
  };

  // Structured Hold Handler (Single)
  const handleSingleHold = () => {
    if (!selectedCandidate) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminPlaceOnHoldAction({
        applicationId: selectedCandidate.id,
        holdCategory: holdCategory,
        reason: holdReasonInput.trim() || undefined,
        expectedResolutionDate: holdExpectedDate || undefined,
      });

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'उम्मेदवारलाई सफलतापूर्वक प्रतिक्षारत सूचीमा राखियो।'
              : res.message || 'Candidate placed on hold successfully.',
        });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1300);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to place candidate on hold.' });
      }
    });
  };

  // Structured Batch Hold Handler
  const handleBatchHold = () => {
    if (selectedIds.size === 0) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminBatchPlaceOnHoldAction({
        applicationIds: Array.from(selectedIds),
        holdCategory: holdCategory,
        reason: holdReasonInput.trim() || undefined,
        expectedResolutionDate: holdExpectedDate || undefined,
      });

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? `सफलतापूर्वक ${res.count || selectedIds.size} उम्मेदवारहरू प्रतिक्षारत सूचीमा राखियो।`
              : res.message || 'Batch hold placement completed successfully.',
        });
        setSelectedIds(new Set());
        setTimeout(() => {
          setModalType(null);
          setFeedback(null);
        }, 1500);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to place candidates on hold.' });
      }
    });
  };

  // Reopen / Reconsider Handler
  const handleReopenCandidate = () => {
    if (!selectedCandidate) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminReopenApplicationAction({
        applicationId: selectedCandidate.id,
        targetStatus: reopenTargetStatus,
        targetStageCode: reopenTargetStage || selectedCandidate.stage || 'STG_APPL',
        reason: reopenReason.trim() || 'Application reconsidered by committee',
      });

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'उम्मेदवारी सफलतापूर्वक पुनर्विचार गरी पुन: सक्रिय गरियो!'
              : res.message || 'Candidate application reopened and restored to active review!',
        });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1400);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to reopen application.' });
      }
    });
  };

  // Single Phone Interview Schedule Handler
  const handleSchedulePhoneInterview = () => {
    if (!selectedCandidate || !phoneStartDate || !phoneEndDate) {
      setFeedback({
        type: 'error',
        text:
          locale === 'ne'
            ? 'कृपया सुरु र अन्त्य मिति चयन गर्नुहोस्।'
            : 'Please specify start and end dates.',
      });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await adminSchedulePhoneInterviewAction({
        applicationId: selectedCandidate.id,
        startDate: phoneStartDate,
        endDate: phoneEndDate,
        timeWindow: phoneTimeWindow,
        instructions: phoneInstructions.trim() || undefined,
        sendNotificationEmail: sendPhoneScheduleEmail,
      });

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'टेलिफोन अन्तर्वार्ता तालिका सफलतापूर्वक सिर्जना गरियो र उम्मेदवारलाई सूचित गरियो!'
              : res.message || 'Phone interview calling window scheduled successfully!',
        });
        setTimeout(() => {
          setModalType(null);
          setSelectedCandidate(null);
          setFeedback(null);
        }, 1300);
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Error scheduling phone interview.',
        });
      }
    });
  };

  // Batch Phone Interview Schedule Handler
  const handleBatchSchedulePhoneInterview = () => {
    if (!phoneStartDate || !phoneEndDate) {
      setFeedback({
        type: 'error',
        text:
          locale === 'ne'
            ? 'कृपया सुरु र अन्त्य मिति चयन गर्नुहोस्।'
            : 'Please specify start and end dates.',
      });
      return;
    }

    const targetIds =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : filteredData
            .filter((c) => c.stage === 'PHONE_INTERVIEW')
            .map((c) => c.id);

    if (targetIds.length === 0) {
      setFeedback({
        type: 'error',
        text:
          locale === 'ne'
            ? 'तालिका बनाउनका लागि कुनै उम्मेदवार फेला परेन।'
            : 'No candidates found in phone interview stage or selected.',
      });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await adminBatchSchedulePhoneInterviewAction({
        applicationIds: targetIds,
        startDate: phoneStartDate,
        endDate: phoneEndDate,
        timeWindow: phoneTimeWindow,
        instructions: phoneInstructions.trim() || undefined,
        sendNotificationEmail: sendPhoneScheduleEmail,
      });

      if (res.success) {
        router.refresh();
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? `सफलतापूर्वक ${res.count || targetIds.length} उम्मेदवारहरूको टेलिफोन अन्तर्वार्ता तालिका निर्धारण गरियो!`
              : res.message || 'Batch phone interview schedule dispatched successfully!',
        });
        setSelectedIds(new Set());
        setTimeout(() => {
          setModalType(null);
          setFeedback(null);
        }, 1500);
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to batch schedule phone interviews.',
        });
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
          const phoneSchedule = info.row.original.phoneInterviewSchedule;
          const stageLabel = stageCode === 'ASC' ? 'ASC' : (t.stages[stageCode as keyof typeof t.stages] || stageCode);

          return (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                {stageLabel}
              </span>

              {/* Show Phone screening outcome only while in phone interview stage */}
              {stageCode === 'PHONE_INTERVIEW' && phoneSchedule && (
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                      PHONE_CALL_OUTCOME_MAP[phoneSchedule?.callOutcome || 'PENDING']?.badgeClass ||
                      'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                    title={
                      phoneSchedule?.startDate && phoneSchedule?.endDate
                        ? `Calling Window: ${phoneSchedule.startDate} – ${phoneSchedule.endDate} (${phoneSchedule.timeWindow})`
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
                </div>
              )}

              {/* Show clean ASC booking slot only when in ASC stage */}
              {stageCode === 'ASC' && (
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
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
                    <span className="font-mono">
                      {info.row.original.ascBooking
                        ? info.row.original.ascBooking.bookedDate
                        : (locale === 'ne' ? 'छनोट बाँकी' : 'Slot Pending')}
                    </span>
                    {info.row.original.ascBooking && (
                      <a
                        href={`/api/asc/admit-pass/${info.row.original.id}`}
                        download={`ASC_Admit_Pass_${info.row.original.refNo}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-purple-700 hover:text-purple-950 dark:text-purple-300 dark:hover:text-purple-100 p-0.5 rounded hover:bg-purple-200/50 dark:hover:bg-purple-900/50 transition-colors ml-0.5"
                        title="Download Official ASC Admit Pass PDF"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </span>
                </div>
              )}
            </div>
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
        accessorKey: 'submittedAt',
        header: t.admin.candidates.table.submittedAt,
        cell: (info) => {
          const val = info.getValue() as string | null;
          if (!val) return <span className="text-stone-400 text-xs">—</span>;
          const d = new Date(val);
          return (
            <span className="text-xs text-stone-600 dark:text-stone-400 whitespace-nowrap">
              {isNaN(d.getTime()) ? val : d.toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-CA')}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: t.admin.candidates.table.actions,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1">
              {/* Primary Action 1: View Full Dossier */}
              <Link
                href={`/admin/candidates/${c.id}`}
                title="View Full Application & Dossier"
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
              </Link>

              {/* Primary Action 2: Open Rubrics */}
              <Link
                href={`/reviewer/${c.id}`}
                title="Open Evaluation Scoring Rubrics"
                className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
              </Link>

              {/* Managed Action Menu: All Candidate Management Operations */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer focus:outline-none"
                  title="More Candidate Operations"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs p-1">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2 py-1">
                    Candidate Operations
                  </DropdownMenuLabel>

                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCandidate(c);
                      setModalType('stage');
                      setTargetStageCode(stages.find((s) => s.code !== c.stage)?.code || stages[0]?.code || '');
                      setStageNote('');
                      setFeedback(null);
                    }}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <GitBranch className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Change Selection Stage</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCandidate(c);
                      setModalType('assign');
                      setSelectedReviewerId(c.assignedReviewers[0]?.id || reviewers[0]?.id || '');
                      setFeedback(null);
                    }}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>Assign Reviewer</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCandidate(c);
                      const existing = c.phoneInterviewSchedule;
                      setPhoneStartDate(existing?.startDate || '');
                      setPhoneEndDate(existing?.endDate || '');
                      setPhoneTimeWindow(
                        existing?.timeWindow || '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)'
                      );
                      setPhoneInstructions(
                        existing?.instructions ||
                          'Please ensure your phone is switched on and kept with you in a quiet area during office hours.'
                      );
                      setSendPhoneScheduleEmail(true);
                      setModalType('schedule-phone');
                      setFeedback(null);
                    }}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <Phone className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span>
                      {locale === 'ne' ? 'टेलिफोन अन्तर्वार्ता तालिका' : 'Phone Screening Call'}
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setCvPreviewCandidate(c)}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <FileText className="h-3.5 w-3.5 text-stone-600 shrink-0" />
                    <span>Preview / Download CV</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCandidate(c);
                      setModalType('clarification');
                      setClarificationMessage('');
                      setFeedback(null);
                    }}
                    className="cursor-pointer gap-2 px-2 py-1.5 font-medium"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Request Clarification</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  {/* Status Actions */}
                  {c.status === 'ON_HOLD' ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCandidate(c);
                          setModalType('resolve-hold');
                          setFeedback(null);
                        }}
                        className="cursor-pointer gap-2 px-2 py-1.5 font-medium text-amber-700 dark:text-amber-300"
                      >
                        <Scale className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>{locale === 'ne' ? 'प्रतिक्षारत आवेदन निर्णय (Advance / Reject)' : 'Resolve On-Hold (Advance / Reject)'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCandidate(c);
                          setReopenTargetStatus('UNDER_REVIEW');
                          setReopenTargetStage(c.stage || stages[0]?.code || 'STG_APPL');
                          setReopenReason('Restored to active pipeline from hold');
                          setModalType('reopen');
                          setFeedback(null);
                        }}
                        className="cursor-pointer gap-2 px-2 py-1.5 font-medium text-emerald-700 dark:text-emerald-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Restore to Active Roster</span>
                      </DropdownMenuItem>
                    </>
                  ) : c.status === 'REJECTED' ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedCandidate(c);
                        setReopenTargetStatus('UNDER_REVIEW');
                        setReopenTargetStage(c.stage || stages[0]?.code || 'STG_APPL');
                        setReopenReason('');
                        setModalType('reopen');
                        setFeedback(null);
                      }}
                      className="cursor-pointer gap-2 px-2 py-1.5 font-medium text-emerald-700 dark:text-emerald-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Reopen / Reconsider</span>
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCandidate(c);
                          setHoldCategory('QUOTA_BALANCING');
                          setHoldReasonInput('');
                          setHoldExpectedDate('');
                          setModalType('single-hold');
                          setFeedback(null);
                        }}
                        className="cursor-pointer gap-2 px-2 py-1.5 font-medium text-amber-700 dark:text-amber-400"
                      >
                        <PauseCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Place on Committee Hold</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCandidate(c);
                          setRejectionCategory('ACADEMIC_CRITERIA');
                          setRejectionNote(REJECTION_REASON_MAP.ACADEMIC_CRITERIA.defaultNote);
                          setSendRejectionEmail(true);
                          setModalType('reject');
                          setFeedback(null);
                        }}
                        className="cursor-pointer gap-2 px-2 py-1.5 font-medium text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40"
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        <span>Reject Application</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
            {(stageFilter !== 'ALL' || statusFilter !== 'ALL' || subjectFilter !== 'ALL' || assignmentFilter !== 'ALL' || globalFilter.trim()) && (
              <button
                type="button"
                onClick={() => {
                  handleSelectStage('ALL');
                  handleSelectSubject('ALL');
                  setStatusFilter('ALL');
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

            {/* Configure ASC Schedule & Quota Button */}
            <button
              type="button"
              onClick={() => setIsAscConfigModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer shadow-2xs"
              title="Configure Assessment Saathi Candidates (ASC) Schedule & Daily Quotas"
            >
              <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{locale === 'ne' ? 'ASC कोटा र मिति' : 'ASC Dates & Quota'}</span>
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

          {/* Active Roster Pill */}
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === 'ACTIVE' ? 'ALL' : 'ACTIVE'))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            <span>{locale === 'ne' ? 'सक्रिय सूची' : 'Active Roster'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-900 text-emerald-100'
                  : 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {activeCandidatesCount}
            </span>
          </button>

          {/* On-Hold Queue Deliberation Pill */}
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === 'ON_HOLD' ? 'ALL' : 'ON_HOLD'))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ON_HOLD'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60'
            }`}
          >
            <span>{locale === 'ne' ? 'प्रतिक्षारत (On Hold)' : 'On Hold Queue'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'ON_HOLD'
                  ? 'bg-amber-800 text-amber-100'
                  : 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
              }`}
            >
              {onHoldCount}
            </span>
          </button>

          {/* Rejected Archive Pill */}
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === 'REJECTED' ? 'ALL' : 'REJECTED'))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-red-700 text-white shadow-sm ring-2 ring-red-500/30'
                : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800/60'
            }`}
          >
            <span>{locale === 'ne' ? 'अस्वीकृत (Rejected Archive)' : 'Rejected Archive'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'REJECTED'
                  ? 'bg-red-900 text-red-100'
                  : 'bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-200'
              }`}
            >
              {rejectedCount}
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

        {/* ASC Dedicated Hub Callout Banner */}
        {stageFilter === 'ASC' && (
          <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex flex-wrap items-center gap-2">
                  <span>ASC Hub</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-750 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                    Interactive Quotas & Live Slots
                  </span>
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                  Manage date range quotas, monitor live seat occupancy histograms, download candidate admit passes, and advance qualified Saathi Teachers.
                </p>
              </div>
            </div>
            <Link
              href="/admin/asc"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              <span>Open ASC Hub</span>
              <Sparkles className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

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

          {/* Cohort Filter Dropdown */}
          {cohorts && cohorts.length > 0 && (
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="ALL">{locale === 'ne' ? 'सबै समूहहरू (All Cohorts)' : 'All Cohorts'}</option>
              {cohorts.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.code} ({ch.year}){ch.isCurrent ? ' • Current' : ''}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">{locale === 'ne' ? 'सबै स्थितिहरू (All Status)' : 'All Statuses'}</option>
            <option value="ON_HOLD">{locale === 'ne' ? 'प्रतिक्षारत (On Hold)' : 'On Hold'}</option>
            <option value="UNDER_REVIEW">{locale === 'ne' ? 'समीक्षामा (Under Review)' : 'Under Review'}</option>
            <option value="SHORTLISTED">{locale === 'ne' ? 'छनोट सूचीकृत (Shortlisted)' : 'Shortlisted'}</option>
            <option value="WAITLISTED">{locale === 'ne' ? 'प्रतीक्षा सूची (Waitlisted)' : 'Waitlisted'}</option>
            <option value="SUBMITTED">{locale === 'ne' ? 'पेश गरिएको (Submitted)' : 'Submitted'}</option>
            <option value="REJECTED">{locale === 'ne' ? 'अस्वीकृत (Rejected)' : 'Rejected'}</option>
          </select>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => handleSelectSubject(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">{t.admin.candidates.subjectFilter}</option>
            <option value="English">{locale === 'ne' ? 'अंग्रेजी (English)' : 'English'}</option>
            <option value="Math">{locale === 'ne' ? 'गणित (Math)' : 'Math'}</option>
            <option value="Grade Teaching">{locale === 'ne' ? 'कक्षा शिक्षण (Grade Teaching)' : 'Grade Teaching'}</option>
            <option value="Other">{locale === 'ne' ? 'अन्य विषयहरू (Other)' : 'Other Subjects'}</option>
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

      {/* ================= EXPANDABLE ADMINISTRATOR ALLOCATION HUB (EASY & BEAUTIFULLY ORGANIZED) ================= */}
      {showAllocationHub && (
        <div className="bg-gradient-to-b from-stone-50/90 via-white to-stone-50/50 dark:from-stone-900 dark:via-stone-900/90 dark:to-stone-950 border border-emerald-200/90 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 transition-all">
          {/* Header Row: Title, Stage Badge, Mode Switcher, and Close */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {locale === 'ne' ? 'प्रशासक बाँडफाँड हब' : 'Administrator Allocation Hub'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {currentStageName}
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {locale === 'ne'
                    ? 'उम्मेदवारहरूलाई सक्रिय समीक्षकहरूमा स्वचालित वा म्यानुअल रूपमा निष्पक्ष बाँडफाँड गर्नुहोस्।'
                    : 'Distribute candidates evenly or assign specific applicants to active committee reviewers.'}
                </p>
              </div>
            </div>

            {/* Mode Switcher Toggle + Close Button */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <div className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 shadow-inner">
                {/* Auto-Assign Option */}
                <button
                  type="button"
                  onClick={() => {
                    setAssignMode('auto');
                    setFeedback(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    assignMode === 'auto'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400/30'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <Sparkles className={`h-3.5 w-3.5 ${assignMode === 'auto' ? 'text-emerald-200' : 'text-stone-500 dark:text-stone-400'}`} />
                  <span>{locale === 'ne' ? 'स्वचालित वितरण' : 'Auto-Assign'}</span>
                </button>

                {/* Manual Assign Option */}
                <button
                  type="button"
                  onClick={() => {
                    setAssignMode('manual');
                    if (!selectedReviewerId && reviewers[0]) {
                      setSelectedReviewerId(reviewers[0].id);
                    }
                    setFeedback(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    assignMode === 'manual'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-blue-400/30'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <UserCheck className={`h-3.5 w-3.5 ${assignMode === 'manual' ? 'text-blue-200' : 'text-stone-500 dark:text-stone-400'}`} />
                  <span>{locale === 'ne' ? 'म्यानुअल बाँडफाँड' : 'Manual Assign'}</span>
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
                className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Collapse Allocation Hub"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Stat 1: Target Stage */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                  {locale === 'ne' ? 'लक्षित चरण' : 'Target Stage'}
                </span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate block">
                  {currentStageName}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                {filteredData.length} in view
              </span>
            </div>

            {/* Stat 2: Pending Allocation */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                  {locale === 'ne' ? 'बाँडफाँड बाँकी' : 'Needs Allocation'}
                </span>
                <span className={`text-sm font-bold ${unassignedInCurrentStage > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {unassignedInCurrentStage} {locale === 'ne' ? 'उम्मेदवार बाँकी' : 'Unassigned'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                unassignedInCurrentStage > 0
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}>
                {filteredData.length - unassignedInCurrentStage} assigned
              </span>
            </div>

            {/* Stat 3: Active Reviewers Pool */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                  {locale === 'ne' ? 'समीक्षक समिति' : 'Active Committee'}
                </span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100 block">
                  {reviewers.length} {locale === 'ne' ? 'समीक्षक उपलब्ध' : 'Reviewers'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalType('auto-assign');
                  setFeedback(null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
              >
                {locale === 'ne' ? 'सूची हेर्नुहोस्' : 'View Pool'}
              </button>
            </div>
          </div>

          {/* Mode 1: AUTO-ASSIGN WORKSPACE */}
          {assignMode === 'auto' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
              {/* Left Column: Strategy & Rules (7 cols) */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
                  <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{locale === 'ne' ? '१. वितरण नियम र रणनीति' : '1. Distribution Strategy'}</span>
                </div>

                {/* Scope Selection Options */}
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/50 hover:bg-stone-100/60 dark:hover:bg-stone-800/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="autoScope"
                      checked={autoOnlyUnassigned}
                      onChange={() => setAutoOnlyUnassigned(true)}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-stone-900 dark:text-stone-100">
                        {locale === 'ne' ? 'बाँकी उम्मेदवारहरू मात्र बाँड्नुहोस् (सिफारिस गरिएको)' : 'Distribute only unassigned candidates (Recommended)'}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {locale === 'ne'
                          ? `यस चरणका ${unassignedInCurrentStage} जना नयाँ उम्मेदवारहरूलाई मात्र समीक्षकहरूमा समान रूपमा बाँडिनेछ।`
                          : `Allocates the ${unassignedInCurrentStage} pending candidate(s) without altering existing reviewer assignments.`}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/50 hover:bg-stone-100/60 dark:hover:bg-stone-800/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="autoScope"
                      checked={!autoOnlyUnassigned}
                      onChange={() => setAutoOnlyUnassigned(false)}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-stone-900 dark:text-stone-100">
                        {locale === 'ne' ? 'यस चरणका सबै उम्मेदवारहरू पुनः सन्तुलन गर्नुहोस्' : 'Rebalance all candidates in this stage'}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {locale === 'ne'
                          ? `यस चरणमा रहेका कुल ${filteredData.length} जनालाई सबै समीक्षकहरूमा पूर्णतः नयाँ र बराबर बाँडफाँड गरिनेछ।`
                          : `Rebalances all ${filteredData.length} candidate(s) in this stage evenly across all ${reviewers.length} active reviewers.`}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Right Column: Execution & Summary (5 cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                    <span>{locale === 'ne' ? '२. वितरण पूर्वावलोकन' : '2. Execution Summary'}</span>
                    <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 font-mono">
                      ~{Math.ceil((autoOnlyUnassigned ? unassignedInCurrentStage : filteredData.length) / Math.max(1, reviewers.length))} / reviewer
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {autoOnlyUnassigned
                          ? `${unassignedInCurrentStage} candidate(s) to distribute`
                          : `${filteredData.length} candidate(s) to rebalance`}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                      {reviewers.length} active committee reviewers ready. Each reviewer will receive approximately ~{Math.ceil((autoOnlyUnassigned ? unassignedInCurrentStage : filteredData.length) / Math.max(1, reviewers.length))} candidate(s).
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isPending || reviewers.length === 0 || (autoOnlyUnassigned && unassignedInCurrentStage === 0)}
                    onClick={handleRunAutoAssign}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/10 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-emerald-200" />
                    )}
                    <span>
                      {isPending
                        ? (locale === 'ne' ? 'वितरण गरिँदैछ...' : 'Distributing...')
                        : (autoOnlyUnassigned && unassignedInCurrentStage === 0)
                        ? (locale === 'ne' ? 'सबै उम्मेदवार तोकिएका छन्' : 'All Candidates Already Assigned')
                        : (locale === 'ne' ? 'स्वचालित वितरण सुरु गर्नुहोस्' : 'Distribute Candidates Automatically')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: MANUAL ASSIGN WORKSPACE */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
              {/* Left Column: Scope Selection (6 cols) */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{locale === 'ne' ? '१. लक्षित उम्मेदवार छनोट' : '1. Target Candidates'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} Selected`
                      : `${unassignedInCurrentStage} Unassigned in Stage`}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 text-xs space-y-2">
                  <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                    {selectedIds.size > 0
                      ? `You have manually selected ${selectedIds.size} candidate(s) using the table checkboxes below.`
                      : `Currently targeting all ${unassignedInCurrentStage} unassigned candidate(s) in "${currentStageName}". Check table boxes below for custom subsets.`}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {unassignedInCurrentStage > 0 && selectedIds.size !== unassignedInCurrentStage && (
                      <button
                        type="button"
                        onClick={() => {
                          const unassignedIds = filteredData
                            .filter((c) => c.assignedReviewers.length === 0)
                            .map((c) => c.id);
                          setSelectedIds(new Set(unassignedIds));
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors cursor-pointer"
                      >
                        {locale === 'ne' ? 'सबै तोकिन बाँकी चयन गर्नुहोस्' : `Select All Unassigned (${unassignedInCurrentStage})`}
                      </button>
                    )}
                    {selectedIds.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer"
                      >
                        {locale === 'ne' ? 'चयन खाली गर्नुहोस्' : 'Clear selection'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Reviewer Picker & Action (6 cols) */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                    <span>{locale === 'ne' ? '२. समीक्षक छनोट गर्नुहोस्' : '2. Assign to Reviewer'}</span>
                    <span className="text-[11px] font-normal text-stone-500 dark:text-stone-400">
                      Current workload shown
                    </span>
                  </div>

                  <select
                    value={selectedReviewerId}
                    onChange={(e) => setSelectedReviewerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                  >
                    {reviewers.map((rev) => {
                      const load = reviewerWorkloads[rev.id] || 0;
                      return (
                        <option key={rev.id} value={rev.id}>
                          {rev.name} ({rev.email}) — {load} assigned
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={
                      isPending ||
                      !selectedReviewerId ||
                      (selectedIds.size === 0 && unassignedInCurrentStage === 0)
                    }
                    onClick={handleRunManualBatchAssign}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/10 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-blue-200" />
                    )}
                    <span>
                      {selectedIds.size > 0
                        ? `${locale === 'ne' ? 'चयन गरिएका' : 'Assign'} ${selectedIds.size} ${locale === 'ne' ? 'उम्मेदवार तोक्नुहोस्' : 'Candidate(s) to Selected Reviewer'}`
                        : unassignedInCurrentStage > 0
                        ? `${locale === 'ne' ? 'सबै' : 'Assign All'} ${unassignedInCurrentStage} ${locale === 'ne' ? 'तोकिन बाँकी उम्मेदवार तोक्नुहोस्' : 'Unassigned to Selected Reviewer'}`
                        : (locale === 'ne' ? 'तोक्न उम्मेदवार छैनन्' : 'No Candidates to Assign')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs p-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
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
              {locale === 'ne' ? 'समीक्षक तोक्नुहोस्' : 'Assign to Reviewer'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setPhoneStartDate('');
                setPhoneEndDate('');
                setPhoneTimeWindow('10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)');
                setPhoneInstructions(
                  'Please ensure your phone is switched on and kept with you in a quiet area during office hours.'
                );
                setSendPhoneScheduleEmail(true);
                setModalType('batch-schedule-phone');
                setFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-300 dark:border-teal-800 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <PhoneCall className="h-3.5 w-3.5 text-teal-600" />
              <span>
                {locale === 'ne' ? 'अन्तर्वार्ता तालिका (एकमुष्ट)' : 'Schedule Phone Calls'}
              </span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setHoldCategory('QUOTA_BALANCING');
                setHoldReasonInput('');
                setHoldExpectedDate('');
                setModalType('batch-hold');
                setFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>{locale === 'ne' ? 'प्रतिक्षारत राख्नुहोस्' : 'Place on Hold'}</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setRejectionCategory('ACADEMIC_CRITERIA');
                setRejectionNote(REJECTION_REASON_MAP.ACADEMIC_CRITERIA.defaultNote);
                setSendRejectionEmail(true);
                setModalType('batch-reject');
                setFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5 text-red-600" />
              <span>{locale === 'ne' ? 'अस्वीकृत गर्नुहोस्' : 'Batch Reject'}</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleBatchUnassign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs transition-colors cursor-pointer"
              title={locale === 'ne' ? 'चयन गरिएका उम्मेदवारहरूबाट समीक्षक हटाउनुहोस्' : 'Remove reviewer allocations for selected candidates'}
            >
              <UserMinus className="h-3.5 w-3.5" />
              <span>{locale === 'ne' ? 'समीक्षक हटाउनुहोस्' : 'Unassign'}</span>
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
                {reviewers.map((r) => {
                  const load = reviewerWorkloads[r.id] || 0;
                  return (
                    <div key={r.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700/60 shadow-2xs">
                      <div>
                        <span className="font-medium text-stone-900 dark:text-stone-100 mr-2">{r.name}</span>
                        <span className="text-[11px] text-stone-500 font-mono">{r.email}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {load} assigned
                      </span>
                    </div>
                  );
                })}
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

      {/* ================= MODAL: RESOLVE HOLD STATUS (DIRECT ADMIN AUTHORITY) ================= */}
      {modalType === 'resolve-hold' && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  <Clock className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {locale === 'ne' ? 'प्रतिक्षारत आवेदन निर्णय (Admin Authority)' : 'Resolve On-Hold Application'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 text-xs space-y-1.5">
              <div>
                Candidate:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedCandidate.applicantName} ({selectedCandidate.refNo})
                </strong>
              </div>
              <div>
                Current Stage:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {selectedCandidate.stage} • {selectedCandidate.subject}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 pt-1">
                {locale === 'ne'
                  ? 'प्रशासकको रूपमा तपाईंसँग यस उम्मेदवारलाई सिधै अर्को चरणमा सिफारिस गर्ने वा अस्वीकृत गर्ने अधिकार छ।'
                  : 'As Administrator, you have direct authority to advance this candidate to the next stage or reject the application.'}
              </p>
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

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleResolveHold('ADVANCE')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                <span>{locale === 'ne' ? 'अर्को चरणमा सिफारिस गर्नुहोस्' : 'Advance to Next Stage'}</span>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleResolveHold('REJECT')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                <span>{locale === 'ne' ? 'उम्मेदवार अस्वीकृत गर्नुहोस्' : 'Reject Candidate'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                {locale === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REQUEST APPLICANT CLARIFICATION ================= */}
      {modalType === 'clarification' && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {locale === 'ne' ? 'थप स्पष्टीकरण अनुरोध (Clarification Request)' : 'Request Candidate Clarification'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedCandidate.applicantName} ({selectedCandidate.refNo})
                </strong>
              </div>
              <div className="text-stone-500">
                Email: {selectedCandidate.applicantEmail}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'स्पष्टीकरण प्रश्न वा आवश्यक कागजात:' : 'Clarification Inquiry / Required Information:'}
              </label>
              <textarea
                value={clarificationMessage}
                onChange={(e) => setClarificationMessage(e.target.value)}
                placeholder="e.g. Please clarify your rural school deployment availability or provide details regarding your grade teaching experience..."
                rows={4}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-stone-500 leading-relaxed">
                {locale === 'ne'
                  ? 'यो सन्देश उम्मेदवारलाई इमेलद्वारा पठाइनेछ र उनीहरूको आवेदक ड्यासबोर्डमा तत्काल देखिनेछ।'
                  : 'This message will be sent to the applicant via email and will appear prominently on their applicant portal.'}
              </p>
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !clarificationMessage.trim()}
                onClick={handleRequestClarification}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Clarification Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STRUCTURED SINGLE REJECT ================= */}
      {modalType === 'reject' && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-red-200 dark:border-red-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {locale === 'ne' ? 'उम्मेदवारी प्रक्रिया सम्पन्न / अस्वीकृत गर्नुहोस्' : 'Conclude Selection / Reject Application'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedCandidate.applicantName} ({selectedCandidate.refNo})
                </strong>
              </div>
              <div>
                Subject / Stage:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {selectedCandidate.subject} • Current Stage: {selectedCandidate.stage}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'अस्वीकृतिको मुख्य कारण (श्रेणी):' : 'Structured Rejection Reason / Category:'}
              </label>
              <select
                value={rejectionCategory}
                onChange={(e) => {
                  const cat = e.target.value;
                  setRejectionCategory(cat);
                  const reasonInfo = REJECTION_REASON_MAP[cat as keyof typeof REJECTION_REASON_MAP];
                  if (reasonInfo) {
                    setRejectionNote(reasonInfo.defaultNote);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {Object.entries(REJECTION_REASON_MAP).map(([key, val]) => (
                  <option key={key} value={key}>
                    {locale === 'ne' ? `${val.ne} (${val.en})` : `${val.en} — ${val.ne}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'उम्मेदवारलाई पठाइने आदरयुक्त सन्देश (टिप्पणी):' : 'Polite, Dignified Feedback to Candidate:'}
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Constructive feedback or reason for this selection cycle..."
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-stone-300 pt-1">
              <input
                type="checkbox"
                checked={sendRejectionEmail}
                onChange={(e) => setSendRejectionEmail(e.target.checked)}
                className="rounded border-stone-300 text-red-600 focus:ring-red-500"
              />
              <span>
                {locale === 'ne'
                  ? 'उम्मेदवारलाई आदरयुक्त द्विभाषी इमेल सूचना पठाउनुहोस् (सिफारिस गरिएको)'
                  : 'Dispatch respectful bilingual notification email to candidate (Recommended)'}
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSingleReject}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STRUCTURED BATCH REJECT ================= */}
      {modalType === 'batch-reject' && selectedIds.size > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-red-200 dark:border-red-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {locale === 'ne' ? 'समूहगत अस्वीकृत गर्नुहोस् (Batch Reject)' : 'Batch Reject Applications'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200/80 text-xs">
              <span className="font-bold text-red-900 dark:text-red-200">
                {selectedIds.size} {locale === 'ne' ? 'उम्मेदवारहरू छनोट गरिएका छन्' : 'candidates selected for batch rejection'}
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Each selected applicant will have their application concluded with the reason below and will be provided future pathways.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'अस्वीकृतिको मुख्य कारण (श्रेणी):' : 'Structured Rejection Reason / Category:'}
              </label>
              <select
                value={rejectionCategory}
                onChange={(e) => {
                  const cat = e.target.value;
                  setRejectionCategory(cat);
                  const reasonInfo = REJECTION_REASON_MAP[cat as keyof typeof REJECTION_REASON_MAP];
                  if (reasonInfo) {
                    setRejectionNote(reasonInfo.defaultNote);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {Object.entries(REJECTION_REASON_MAP).map(([key, val]) => (
                  <option key={key} value={key}>
                    {locale === 'ne' ? `${val.ne} (${val.en})` : `${val.en} — ${val.ne}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'सामूहिक आदरयुक्त सन्देश (टिप्पणी):' : 'Polite Feedback Note for All Candidates:'}
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-stone-300 pt-1">
              <input
                type="checkbox"
                checked={sendRejectionEmail}
                onChange={(e) => setSendRejectionEmail(e.target.checked)}
                className="rounded border-stone-300 text-red-600 focus:ring-red-500"
              />
              <span>
                {locale === 'ne'
                  ? 'सबै छनोट भएका उम्मेदवारहरूलाई द्विभाषी इमेल सूचना पठाउनुहोस्'
                  : 'Send respectful bilingual decision emails to all selected candidates'}
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleBatchReject}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>Reject {selectedIds.size} Candidates</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STRUCTURED SINGLE HOLD ================= */}
      {modalType === 'single-hold' && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  <PauseCircle className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {locale === 'ne' ? 'उम्मेदवारलाई प्रतिक्षारत सूचीमा राख्नुहोस्' : 'Place Candidate On Hold'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedCandidate.applicantName} ({selectedCandidate.refNo})
                </strong>
              </div>
              <div>
                Subject / Stage:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {selectedCandidate.subject} • Stage: {selectedCandidate.stage}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'प्रतिक्षारत राख्नुको कारण (श्रेणी):' : 'Hold Reason Category:'}
              </label>
              <select
                value={holdCategory}
                onChange={(e) => setHoldCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {Object.entries(ON_HOLD_CATEGORY_MAP).map(([key, val]) => (
                  <option key={key} value={key}>
                    {locale === 'ne' ? `${val.ne} (${val.en})` : `${val.en} — ${val.ne}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'प्रतिक्षारत विवरण / टिप्पणी:' : 'Specific Hold Reason & Next Steps:'}
              </label>
              <textarea
                value={holdReasonInput}
                onChange={(e) => setHoldReasonInput(e.target.value)}
                rows={3}
                placeholder="e.g. Under quota balancing review or awaiting comparative evaluation against rural school needs..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'अपेक्षित निर्णय मिति (वैकल्पिक):' : 'Expected Resolution Date (Optional):'}
              </label>
              <input
                type="date"
                value={holdExpectedDate}
                onChange={(e) => setHoldExpectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSingleHold}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
                <span>Place On Hold</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STRUCTURED BATCH HOLD ================= */}
      {modalType === 'batch-hold' && selectedIds.size > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  <PauseCircle className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {locale === 'ne' ? 'समूहगत प्रतिक्षारत सूचीमा राख्नुहोस्' : 'Batch Place On Hold'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                {selectedIds.size} {locale === 'ne' ? 'उम्मेदवारहरू छनोट गरिएका छन्' : 'candidates selected to place on hold'}
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                All selected candidates will be moved to the on-hold deliberation queue.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'प्रतिक्षारत राख्नुको कारण (श्रेणी):' : 'Hold Reason Category:'}
              </label>
              <select
                value={holdCategory}
                onChange={(e) => setHoldCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {Object.entries(ON_HOLD_CATEGORY_MAP).map(([key, val]) => (
                  <option key={key} value={key}>
                    {locale === 'ne' ? `${val.ne} (${val.en})` : `${val.en} — ${val.ne}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'प्रतिक्षारत विवरण / टिप्पणी:' : 'Batch Hold Rationale:'}
              </label>
              <textarea
                value={holdReasonInput}
                onChange={(e) => setHoldReasonInput(e.target.value)}
                rows={3}
                placeholder="Details of committee hold reason..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'अपेक्षित निर्णय मिति (वैकल्पिक):' : 'Expected Resolution Date (Optional):'}
              </label>
              <input
                type="date"
                value={holdExpectedDate}
                onChange={(e) => setHoldExpectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleBatchHold}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
                <span>Hold {selectedIds.size} Candidates</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REOPEN / RECONSIDER CANDIDATE ================= */}
      {modalType === 'reopen' && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <RotateCcw className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {locale === 'ne' ? 'उम्मेदवारी पुनर्विचार / पुन: सक्रिय गर्नुहोस्' : 'Reopen / Reconsider Candidate'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {selectedCandidate.applicantName} ({selectedCandidate.refNo})
                </strong>
              </div>
              <div>
                Current Status:{' '}
                <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                  {selectedCandidate.status} • Stage: {selectedCandidate.stage}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'नयाँ स्थिति (New Target Status):' : 'New Target Status:'}
              </label>
              <select
                value={reopenTargetStatus}
                onChange={(e) => setReopenTargetStatus(e.target.value as 'UNDER_REVIEW' | 'SHORTLISTED')}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
              >
                <option value="UNDER_REVIEW">UNDER_REVIEW (Active Review)</option>
                <option value="SHORTLISTED">SHORTLISTED (Direct Shortlist)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'गन्तव्य चरण (Target Stage):' : 'Destination Pipeline Stage:'}
              </label>
              <select
                value={reopenTargetStage || selectedCandidate.stage}
                onChange={(e) => setReopenTargetStage(e.target.value)}
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
                {locale === 'ne' ? 'पुनर्विचारको आधार / निर्णय टिप्पणी:' : 'Reconsideration Rationale / Committee Justification:'}
              </label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={3}
                placeholder="e.g. Additional documentation verified, subject quota re-evaluated, or appeal reviewed..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleReopenCandidate}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                <span>Reopen Application</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SINGLE CANDIDATE PHONE INTERVIEW SCHEDULE ================= */}
      {modalType === 'schedule-phone' && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  <PhoneCall className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    {locale === 'ne' ? 'टेलिफोन अन्तर्वार्ता तालिका व्यवस्थापन' : 'Schedule Phone Interview'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {selectedCandidate.applicantName} ({selectedCandidate.refNo}) • Phone:{' '}
                    <strong>{selectedCandidate.applicantPhone}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {locale === 'ne' ? 'सुरु मिति (Start Date):' : 'Calling Window Start Date:'}
                </label>
                <input
                  type="date"
                  value={phoneStartDate}
                  onChange={(e) => setPhoneStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {locale === 'ne' ? 'अन्त्य मिति (End Date):' : 'Calling Window End Date:'}
                </label>
                <input
                  type="date"
                  value={phoneEndDate}
                  onChange={(e) => setPhoneEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'कार्यालय समय विन्डो (Office Hours Window):' : 'Office Hours Calling Window:'}
              </label>
              <input
                type="text"
                value={phoneTimeWindow}
                onChange={(e) => setPhoneTimeWindow(e.target.value)}
                placeholder="10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)"
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'समितिको विशेष निर्देशन (Instructions for Candidate):' : 'Candidate Preparation Instructions:'}
              </label>
              <textarea
                rows={3}
                value={phoneInstructions}
                onChange={(e) => setPhoneInstructions(e.target.value)}
                placeholder="Please ensure your phone is switched on and kept with you in a quiet area during office hours..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-teal-950 dark:text-teal-200">
                <input
                  type="checkbox"
                  checked={sendPhoneScheduleEmail}
                  onChange={(e) => setSendPhoneScheduleEmail(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>
                  {locale === 'ne'
                    ? 'उम्मेदवारलाई इमेल र पोर्टल सूचना पठाउनुहोस्'
                    : 'Dispatch official schedule email and portal notification'}
                </span>
              </label>
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !phoneStartDate || !phoneEndDate}
                onClick={handleSchedulePhoneInterview}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneCall className="h-3.5 w-3.5" />}
                <span>
                  {locale === 'ne' ? 'तालिका सुरक्षित गर्नुहोस्' : 'Schedule Calling Window'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BATCH PHONE INTERVIEW SCHEDULE ================= */}
      {modalType === 'batch-schedule-phone' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  <PhoneCall className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    {locale === 'ne' ? 'एकमुष्ट टेलिफोन अन्तर्वार्ता तालिका' : 'Batch Schedule Phone Interviews'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} ${locale === 'ne' ? 'चयन गरिएका उम्मेदवारहरू' : 'selected candidates'}`
                      : locale === 'ne'
                      ? 'टेलिफोन अन्तर्वार्ता चरणका सम्पूर्ण उम्मेदवारहरू'
                      : 'All candidates in Phone Interview Stage'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 text-xs text-teal-950 dark:text-teal-200">
              <p>
                {locale === 'ne'
                  ? 'चयन गरिएका सबै उम्मेदवारहरूलाई तोकिएको मिति विन्डो र कार्यालय समय तालिका पठाइनेछ र उनीहरूको पोर्टलमा प्रदर्शन हुनेछ।'
                  : 'The calling date window, office hours, and preparation checklist will be saved for all selected candidates and notified via bilingual email.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {locale === 'ne' ? 'सुरु मिति (Start Date):' : 'Start Date:'}
                </label>
                <input
                  type="date"
                  value={phoneStartDate}
                  onChange={(e) => setPhoneStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {locale === 'ne' ? 'अन्त्य मिति (End Date):' : 'End Date:'}
                </label>
                <input
                  type="date"
                  value={phoneEndDate}
                  onChange={(e) => setPhoneEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'कार्यालय समय विन्डो:' : 'Office Hours Calling Window:'}
              </label>
              <input
                type="text"
                value={phoneTimeWindow}
                onChange={(e) => setPhoneTimeWindow(e.target.value)}
                placeholder="10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)"
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {locale === 'ne' ? 'समितिको विशेष निर्देशन (वैकल्पिक):' : 'Candidate Instructions (Optional):'}
              </label>
              <textarea
                rows={3}
                value={phoneInstructions}
                onChange={(e) => setPhoneInstructions(e.target.value)}
                placeholder="Please ensure your phone is switched on and kept with you in a quiet area during office hours..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-teal-950 dark:text-teal-200">
                <input
                  type="checkbox"
                  checked={sendPhoneScheduleEmail}
                  onChange={(e) => setSendPhoneScheduleEmail(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>
                  {locale === 'ne'
                    ? 'सबै उम्मेदवारहरूलाई स्वचालित तालिका इमेल पठाउनुहोस्'
                    : 'Send automated bilingual schedule email to all candidates'}
                </span>
              </label>
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !phoneStartDate || !phoneEndDate}
                onClick={handleBatchSchedulePhoneInterview}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneCall className="h-3.5 w-3.5" />}
                <span>
                  {locale === 'ne' ? 'एकमुष्ट तालिका लागू गर्नुहोस्' : 'Apply Batch Schedule'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV Document Preview & Download Modal */}
      {cvPreviewCandidate && (
        <CvPreviewModal
          isOpen={Boolean(cvPreviewCandidate)}
          onClose={() => setCvPreviewCandidate(null)}
          fileName={cvPreviewCandidate.cvFileName}
          fileUrl={cvPreviewCandidate.cvFileUrl}
          candidateName={cvPreviewCandidate.applicantName}
          refNo={cvPreviewCandidate.refNo}
          subject={cvPreviewCandidate.subject}
        />
      )}

      {/* ASC Global Session & Quotas Config Modal */}
      <AscConfigModal
        isOpen={isAscConfigModalOpen}
        onClose={() => {
          setIsAscConfigModalOpen(false);
          router.refresh();
        }}
        onConfigUpdated={() => router.refresh()}
      />
    </div>
  );
}
