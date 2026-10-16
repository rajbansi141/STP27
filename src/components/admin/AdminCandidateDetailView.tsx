'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  FileText,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  UserCheck,
  UserMinus,
  Mail,
  Phone,
  PhoneCall,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Download,
  History,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Scale,
  HelpCircle,
  Send,
  MessageSquare,
  Loader2,
  X,
  RotateCcw,
  PauseCircle,
  CalendarCheck,
  Sliders,
  FileEdit,
} from 'lucide-react';
import {
  adminAdvanceStageAction,
  assignReviewerAction,
  unassignReviewerAction,
  requestCandidateClarificationAction,
  adminRejectApplicationAction,
  adminPlaceOnHoldAction,
  adminReopenApplicationAction,
  adminSchedulePhoneInterviewAction,
} from '@/app/api/admin/actions';
import {
  REJECTION_REASON_MAP,
  ON_HOLD_CATEGORY_MAP,
  PhoneInterviewSchedule,
  PHONE_CALL_OUTCOME_MAP,
} from '@/lib/constants/applicationReview';
import { PhoneInterviewCallWidget } from '@/components/review/PhoneInterviewCallWidget';
import { AscCandidateDecisionWidget } from '@/components/review/AscCandidateDecisionWidget';
import { AscConfigModal } from '@/components/admin/AscConfigModal';
import { CvActionButtons } from '@/components/common/CvActionButtons';
import { HoldResolutionWidget } from '@/components/review/HoldResolutionWidget';
import { countWords } from '@/lib/validations/application';
import { EditCandidateDossierModal } from '@/components/admin/EditCandidateDossierModal';

interface ReviewerItem {
  id: string;
  name: string;
  email: string;
}

interface StageItem {
  code: string;
  nameEn: string;
  nameNe: string;
}

interface ReviewItem {
  id: string;
  reviewerId: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  stage: string;
  totalScore: number | null;
  scores: unknown;
  recommendation: string;
  comment: string | null;
  status: string;
  submittedAt: Date | null;
  at: Date;
}

interface AssignmentItem {
  id: string;
  reviewerId: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  assignedAt: Date;
}

interface StageHistoryItem {
  id: string;
  fromStage: string;
  toStage: string;
  note: string | null;
  at: Date;
  actor: {
    name: string;
    email: string;
  } | null;
}

interface AdminCandidateDetailViewProps {
  application: {
    id: string;
    refNo: string;
    stage: string;
    status: string;
    submittedAt: Date | null;
    createdAt: Date;
    data: unknown;
    applicant: {
      id: string;
      name: string;
      email: string;
      username: string | null;
      locale: string;
    };
    reviews: ReviewItem[];
    assignments: AssignmentItem[];
    histories: StageHistoryItem[];
  };
  stages: StageItem[];
  availableReviewers: ReviewerItem[];
  locale?: string;
}

export function AdminCandidateDetailView({
  application,
  stages,
  availableReviewers,
  locale = 'en',
}: AdminCandidateDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'dossier' | 'reviews' | 'history'>('dossier');

  // Stage advancement state
  const [selectedNextStage, setSelectedNextStage] = useState(application.stage);
  const [stageNote, setStageNote] = useState('');

  // Reviewer assignment state
  const [selectedReviewerToAssign, setSelectedReviewerToAssign] = useState(
    availableReviewers[0]?.id || ''
  );

  // User feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState('');

  // Structured Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionCategory, setRejectionCategory] = useState<string>('ACADEMIC_CRITERIA');
  const [rejectionNote, setRejectionNote] = useState<string>(
    REJECTION_REASON_MAP.ACADEMIC_CRITERIA.defaultNote
  );
  const [sendRejectionEmail, setSendRejectionEmail] = useState<boolean>(true);

  // Structured Hold Placement Modal State
  const [isPlaceOnHoldModalOpen, setIsPlaceOnHoldModalOpen] = useState(false);
  const [holdCategory, setHoldCategory] = useState<string>('QUOTA_BALANCING');
  const [holdReasonInput, setHoldReasonInput] = useState<string>('');
  const [holdExpectedDate, setHoldExpectedDate] = useState<string>('');

  // Reopen Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenTargetStatus, setReopenTargetStatus] = useState<'UNDER_REVIEW' | 'SHORTLISTED'>('UNDER_REVIEW');
  const [reopenTargetStage, setReopenTargetStage] = useState<string>(application.stage);
  const [reopenReason, setReopenReason] = useState<string>('');

  const parsedData = application.data
    ? typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data
    : {};

  // Phone Interview Schedule State
  const [isPhoneScheduleModalOpen, setIsPhoneScheduleModalOpen] = useState(false);
  const [phoneStartDate, setPhoneStartDate] = useState(
    parsedData?.phoneInterviewSchedule?.startDate || ''
  );
  const [phoneEndDate, setPhoneEndDate] = useState(
    parsedData?.phoneInterviewSchedule?.endDate || ''
  );
  const [phoneTimeWindow, setPhoneTimeWindow] = useState(
    parsedData?.phoneInterviewSchedule?.timeWindow ||
      '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)'
  );
  const [phoneInstructions, setPhoneInstructions] = useState(
    parsedData?.phoneInterviewSchedule?.instructions ||
      'Please ensure your phone is switched on and kept with you in a quiet area during office hours.'
  );
  const [sendPhoneScheduleEmail, setSendPhoneScheduleEmail] = useState(true);
  // ASC Configuration Modal State
  const [isAscConfigModalOpen, setIsAscConfigModalOpen] = useState(false);
  // Edit Candidate Dossier Modal State
  const [isEditDossierOpen, setIsEditDossierOpen] = useState(false);

  const handleSchedulePhoneInterview = () => {
    if (!phoneStartDate || !phoneEndDate) {
      setFeedback({ type: 'error', text: 'Please specify both start date and end date.' });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await adminSchedulePhoneInterviewAction({
        applicationId: application.id,
        startDate: phoneStartDate,
        endDate: phoneEndDate,
        timeWindow: phoneTimeWindow,
        instructions: phoneInstructions.trim() || undefined,
        sendNotificationEmail: sendPhoneScheduleEmail,
      });

      if (res.success) {
        setIsPhoneScheduleModalOpen(false);
        setFeedback({
          type: 'success',
          text: res.message || 'Phone interview scheduled successfully!',
        });
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to schedule phone interview.',
        });
      }
    });
  };

  // Score statistics
  const validReviews = application.reviews.filter((r) => r.totalScore !== null);
  const avgScore =
    validReviews.length > 0
      ? (
          validReviews.reduce((sum, r) => sum + (r.totalScore || 0), 0) / validReviews.length
        ).toFixed(1)
      : null;

  const currentStageObj = stages.find((s) => s.code === application.stage);
  const currentStageName =
    locale === 'ne' ? currentStageObj?.nameNe || application.stage : currentStageObj?.nameEn || application.stage;

  // Handlers
  const handleAdvanceStage = () => {
    if (selectedNextStage === application.stage) {
      setFeedback({ type: 'error', text: 'Select a different destination stage to transition.' });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await adminAdvanceStageAction({
        applicationId: application.id,
        nextStageCode: selectedNextStage,
        note: stageNote.trim() || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: res.message || 'Stage updated successfully.' });
        setStageNote('');
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to update stage.' });
      }
    });
  };


  const handleAssignReviewer = () => {
    if (!selectedReviewerToAssign) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await assignReviewerAction({
        applicationId: application.id,
        reviewerId: selectedReviewerToAssign,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: res.message || 'Reviewer assigned successfully.' });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to assign reviewer.' });
      }
    });
  };

  const handleStructuredReject = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await adminRejectApplicationAction({
        applicationId: application.id,
        reasonCategory: rejectionCategory,
        feedbackNote: rejectionNote.trim() || undefined,
        sendNotificationEmail: sendRejectionEmail,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.message || 'Application concluded / rejected successfully.',
        });
        setIsRejectModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to reject application.' });
      }
    });
  };

  const handleStructuredPlaceOnHold = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await adminPlaceOnHoldAction({
        applicationId: application.id,
        holdCategory: holdCategory,
        reason: holdReasonInput.trim() || undefined,
        expectedResolutionDate: holdExpectedDate || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: res.message || 'Application placed on hold.' });
        setIsPlaceOnHoldModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to place application on hold.' });
      }
    });
  };

  const handleReopenApplication = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await adminReopenApplicationAction({
        applicationId: application.id,
        targetStatus: reopenTargetStatus,
        targetStageCode: reopenTargetStage || application.stage,
        reason: reopenReason.trim() || 'Application reconsidered by committee',
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.message || 'Application reopened and restored to active review!',
        });
        setIsReopenModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to reopen application.' });
      }
    });
  };

  const handleUnassignReviewer = (reviewerId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await unassignReviewerAction({
        applicationId: application.id,
        reviewerId,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: res.message || 'Reviewer unassigned.' });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to unassign reviewer.' });
      }
    });
  };


  const handleRequestClarification = () => {
    if (!clarificationMessage.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await requestCandidateClarificationAction({
        applicationId: application.id,
        message: clarificationMessage.trim(),
      });

      if (res.success) {
        setIsClarificationModalOpen(false);
        setClarificationMessage('');
        setFeedback({ type: 'success', text: res.message || 'Clarification request sent to applicant.' });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to send clarification inquiry.' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Back to Candidates Navigation & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/candidates"
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-600 dark:text-stone-300"
            title="Back to Admin Candidates Directory"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
                {application.applicant.name}
              </h1>
              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {application.refNo}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  application.status === 'SHORTLISTED' || application.status === 'FINAL_SELECTED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : application.status === 'ON_HOLD'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : application.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                {application.status}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {application.applicant.email} • Username: <span className="font-mono">{application.applicant.username || '—'}</span> • Submitted:{' '}
              {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : 'Draft'}
            </p>
          </div>
        </div>

        {/* Aggregate Score, Evaluation Rubrics Link & Stage Indicator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <CvActionButtons
            fileName={parsedData.cvFileName}
            fileUrl={parsedData.cvFileUrl}
            candidateName={application.applicant.name}
            refNo={application.refNo}
            subject={parsedData.teachingSubject}
          />
          <button
            type="button"
            onClick={() => setIsEditDossierOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white hover:bg-stone-50 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Edit & Correct Candidate Particulars (Name, Phone, Degree, Track, Slot)"
          >
            <FileEdit className="h-3.5 w-3.5 text-emerald-600" />
            <span>Edit / Correct Details</span>
          </button>
          <Link
            href={`/reviewer/${application.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs transition-all"
            title="Open Full Evaluation Scoring Rubric Sheet"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Open Scoring Rubrics</span>
          </Link>
          <div className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs text-right">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Cohort Score</span>
            <div className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-50">
              {avgScore !== null ? `${avgScore} / 40` : '—'}
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-right">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold block">
              Current Stage
            </span>
            <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
              {currentStageName}
            </div>
          </div>
        </div>
      </div>

      {/* User Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-900 dark:bg-red-950/70 dark:text-red-200 border border-red-300 dark:border-red-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* ================= ON-HOLD DIRECT ADMIN AUTHORITY RESOLUTION ================= */}
      {application.status === 'ON_HOLD' && (
        <HoldResolutionWidget
          applicationId={application.id}
          refNo={application.refNo}
          currentStage={application.stage}
          locale={locale}
          canManage={true}
        />
      )}

          {/* Clarification Inquiry Status / Responses */}
          {parsedData?.clarificationRequest && (
            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/80 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Sent Clarification Inquiry</span>
                </div>
                <span className="text-[10px] text-stone-400">
                  Requested on: {new Date(parsedData.clarificationRequest.requestedAt).toLocaleString()}
                </span>
              </div>
              <p className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200">
                {parsedData.clarificationRequest.message}
              </p>

              {parsedData.clarificationRequest.response ? (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Applicant Response Received</span>
                    </span>
                    {parsedData.clarificationRequest.respondedAt && (
                      <span className="text-[10px] font-normal text-stone-500">
                        {new Date(parsedData.clarificationRequest.respondedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                    {parsedData.clarificationRequest.response}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Awaiting applicant response via applicant portal.</span>
                </div>
              )}
            </div>
          )}

      {/* ================= REJECTED ARCHIVE DOSSIER PANEL ================= */}
      {application.status === 'REJECTED' && (
        <div className="bg-gradient-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-950/40 dark:via-rose-950/30 dark:to-red-950/40 border border-red-300 dark:border-red-800/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-500/20 text-red-800 dark:text-red-200">
                <XCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-red-950 dark:text-red-100 flex items-center gap-2">
                  <span>Application Concluded / Rejected (प्रक्रिया सम्पन्न / अस्वीकृत)</span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200/80 dark:bg-red-900/60 text-red-900 dark:text-red-200">
                    REJECTED
                  </span>
                </h3>
                <p className="text-xs text-red-900/80 dark:text-red-200/80 mt-0.5">
                  Selection concluded for STP 2027. Constructive future pathways and participation credentials have been provided to the applicant.
                </p>
              </div>
            </div>

            {/* Reopen Action Trigger */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setReopenTargetStatus('UNDER_REVIEW');
                  setReopenTargetStage(application.stage);
                  setReopenReason('');
                  setIsReopenModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-2xs transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                <span>Reopen / Reconsider Application</span>
              </button>
            </div>
          </div>

          {/* Rejection Details Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-red-200 dark:border-red-900/60 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Structured Reason</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {parsedData?.rejectionDetails?.category
                  ? (REJECTION_REASON_MAP[parsedData.rejectionDetails.category as keyof typeof REJECTION_REASON_MAP]?.en || parsedData.rejectionDetails.category)
                  : parsedData?.rejectionDetails?.reasonCode
                  ? (REJECTION_REASON_MAP[parsedData.rejectionDetails.reasonCode as keyof typeof REJECTION_REASON_MAP]?.en || parsedData.rejectionDetails.reasonCode)
                  : 'Academic / Quota Benchmark'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Milestone Stage Reached</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {parsedData?.rejectionDetails?.rejectedAtStage || application.stage}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Notification Email</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{parsedData?.rejectionDetails?.emailSent !== false ? 'Dispatched' : 'Internal Only'}</span>
              </span>
            </div>
            {parsedData?.rejectionDetails?.feedbackNote && (
              <div className="md:col-span-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Committee Observation Note:</span>
                <p className="text-stone-700 dark:text-stone-300 mt-0.5 italic">
                  &ldquo;{parsedData.rejectionDetails.feedbackNote}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= PHONE INTERVIEW CALLING DESK & SCHEDULE ================= */}
      {(application.stage === 'PHONE_INTERVIEW' || parsedData?.phoneInterviewSchedule) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              <span>Phone Screening Interview Management</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsPhoneScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-xs font-bold transition-all cursor-pointer"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>
                {parsedData?.phoneInterviewSchedule ? 'Edit Calling Schedule' : 'Schedule Calling Window'}
              </span>
            </button>
          </div>

          <PhoneInterviewCallWidget
            applicationId={application.id}
            candidateName={application.applicant.name}
            refNo={application.refNo}
            phoneNumber={parsedData?.contactNumber || parsedData?.phone || null}
            email={application.applicant.email}
            schedule={parsedData?.phoneInterviewSchedule || null}
            currentStage={application.stage}
            currentStatus={application.status}
            locale="en"
            userRole="ADMIN"
            onScheduleUpdate={() => router.refresh()}
          />
        </div>
      )}

      {/* ================= ASC (ASSESSMENT SAATHI CANDIDATES) CANDIDATE DESK ================= */}
      {(application.stage === 'ASC' || parsedData?.ascBooking) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
              <span>ASC Evaluation & Decision</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAscConfigModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Configure ASC Dates & Quota</span>
            </button>
          </div>

          <AscCandidateDecisionWidget
            applicationId={application.id}
            candidateName={application.applicant.name}
            refNo={application.refNo}
            booking={parsedData?.ascBooking || null}
            currentStage={application.stage}
            currentStatus={application.status}
            locale="en"
            userRole="ADMIN"
            onDecisionSuccess={() => router.refresh()}
          />
        </div>
      )}

      {/* ================= STAGE PROGRESSION & REVIEWER ALLOCATION CONSOLE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Stage Progression & Lifecycle Control */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                  {locale === 'ne' ? 'छनोट चरण नियन्त्रण' : 'Pipeline Stage Progression'}
                </h3>
                <p className="text-[11px] text-stone-500">
                  {locale === 'ne' ? 'हालको चरण:' : 'Current Stage:'}{' '}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{currentStageName}</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {application.stage}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                {locale === 'ne' ? 'नयाँ चरणमा सार्नुहोस्:' : 'Transition Candidate to Stage:'}
              </label>
              <select
                value={selectedNextStage}
                onChange={(e) => setSelectedNextStage(e.target.value)}
                disabled={isPending}
                aria-label="Move candidate to stage"
                className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-stone-900 dark:text-stone-100"
              >
                {stages.map((s) => (
                  <option key={s.code} value={s.code}>
                    {locale === 'ne' ? s.nameNe : s.nameEn} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="text"
                placeholder={locale === 'ne' ? 'चरण परिवर्तन टिप्पणी (वैकल्पिक)...' : 'Stage transition note (optional)...'}
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                disabled={isPending}
                className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-stone-400 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAdvanceStage}
                disabled={isPending || selectedNextStage === application.stage}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{locale === 'ne' ? 'चरण परिवर्तन गर्नुहोस्' : 'Transition Stage'}</span>
              </button>

              {application.status !== 'REJECTED' && application.status !== 'ON_HOLD' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setHoldCategory('QUOTA_BALANCING');
                      setHoldReasonInput('');
                      setHoldExpectedDate('');
                      setIsPlaceOnHoldModalOpen(true);
                    }}
                    disabled={isPending}
                    title="Place on Deliberation Hold"
                    className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>{locale === 'ne' ? 'होल्डमा राख्नुहोस्' : 'Place on Hold'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectionCategory('ACADEMIC_CRITERIA');
                      setRejectionNote(REJECTION_REASON_MAP.ACADEMIC_CRITERIA.defaultNote);
                      setSendRejectionEmail(true);
                      setIsRejectModalOpen(true);
                    }}
                    disabled={isPending}
                    title="Reject Candidate Application"
                    className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-800 dark:text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    <span>{locale === 'ne' ? 'अस्वीकृत' : 'Reject'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel 2: Selection Committee Reviewer Allocation */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                <UserCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                  {locale === 'ne' ? 'तोकिएका परीक्षकहरू' : 'Assigned Committee Reviewers'}
                </h3>
                <p className="text-[11px] text-stone-500">
                  {locale === 'ne' ? 'मूल्यांकनकर्ता व्यवस्थापन' : 'Manage evaluation reviewer allocations'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              {application.assignments.length} {locale === 'ne' ? 'तोकिएको' : 'Allocated'}
            </span>
          </div>

          <div className="space-y-3">
            {/* Assigned Reviewer Badges */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                {locale === 'ne' ? 'हालका परीक्षकहरू:' : 'Current Evaluators:'}
              </label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800">
                {application.assignments.length === 0 ? (
                  <span className="text-xs text-stone-400 italic flex items-center gap-1.5 py-1 px-2">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>{locale === 'ne' ? 'कुनै परीक्षक तोकिएको छैन।' : 'No reviewer currently assigned to this candidate.'}</span>
                  </span>
                ) : (
                  application.assignments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-2 pl-3 pr-2 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-stone-900 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-900 shadow-2xs group"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>{a.reviewer.name}</span>
                      <button
                        type="button"
                        onClick={() => handleUnassignReviewer(a.reviewerId)}
                        disabled={isPending}
                        title="Remove Reviewer Assignment"
                        className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/60 dark:hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 text-stone-400 group-hover:text-red-600" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Assign New Reviewer Input */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                {locale === 'ne' ? 'थप परीक्षक तोक्नुहोस्:' : 'Assign Additional Reviewer:'}
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedReviewerToAssign}
                  onChange={(e) => setSelectedReviewerToAssign(e.target.value)}
                  disabled={isPending || availableReviewers.length === 0}
                  aria-label="Select reviewer to assign"
                  className="flex-1 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-stone-900 dark:text-stone-100"
                >
                  {availableReviewers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignReviewer}
                  disabled={isPending || !selectedReviewerToAssign}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  {locale === 'ne' ? 'तोक्नुहोस्' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABS NAVIGATION ================= */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab('dossier')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'dossier'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Application Dossier & Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'reviews'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Committee Reviews ({application.reviews.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Stage Milestones & History ({application.histories.length})</span>
        </button>
      </div>

      {/* ================= TAB CONTENT 1: COMMITTEE REVIEWS (ADMIN OVERSIGHT) ================= */}
      {activeTab === 'reviews' && (
        <div className="space-y-5">
          {application.reviews.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center space-y-2">
              <Award className="h-8 w-8 text-stone-400 mx-auto" />
              <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">
                No Committee Reviews Submitted Yet
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Assigned reviewers have not yet submitted scoring rubrics for this candidate. Once evaluated in the Reviewer Portal, their breakdown and recommendations will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {application.reviews.map((r) => {
                const parsedScores = r.scores
                  ? typeof r.scores === 'string'
                    ? JSON.parse(r.scores)
                    : r.scores
                  : null;

                return (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                      <div>
                        <div className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-blue-600" />
                          <span>{r.reviewer.name}</span>
                        </div>
                        <p className="text-[11px] text-stone-500">{r.reviewer.email}</p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            r.recommendation === 'ADVANCE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : r.recommendation === 'HOLD'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          Recommendation: {r.recommendation}
                        </span>
                        <div className="font-heading font-black text-xl text-stone-900 dark:text-stone-50 mt-1">
                          {r.totalScore !== null ? `${r.totalScore} / 40` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Score Breakdown if rubrics available */}
                    {parsedScores && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
                          <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                            Academic Background
                          </span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {parsedScores.academic ?? '—'} / 10
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
                          <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                            Motivation & Aptitude
                          </span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {parsedScores.motivation ?? '—'} / 10
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
                          <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                            Communication & Lang
                          </span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {parsedScores.communication ?? '—'} / 10
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
                          <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                            Commitment & Leadership
                          </span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {parsedScores.commitment ?? '—'} / 10
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Qualitative Review Comments */}
                    {r.comment && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-500">
                          Reviewer Remarks & Notes:
                        </span>
                        <p className="text-stone-700 dark:text-stone-300 italic">
                          &ldquo;{r.comment}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                      <span>Evaluated for Stage: <strong>{r.stage}</strong></span>
                      <span>{new Date(r.at).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB CONTENT 2: APPLICATION DOSSIER ================= */}
      {activeTab === 'dossier' && (
        <div className="space-y-6">
          {/* Section 1: Personal & Contact Information */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <User className="h-4 w-4 text-emerald-600" />
              <span>Section 1: Personal & Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block">Full Name:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.fullName || application.applicant.name}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Email Address:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {application.applicant.email}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Contact Phone:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.contactNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Date of Birth:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.dob || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Gender:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200 capitalize">
                  {parsedData.gender || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Nationality:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.nationality || 'Nepali'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-stone-400 block">Current Address:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {[
                    parsedData.currentMunicipality,
                    parsedData.currentWard ? `Ward ${parsedData.currentWard}` : null,
                    parsedData.currentProvince,
                    parsedData.currentCountry || 'Nepal',
                  ]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-stone-400 block">Permanent Address:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {[
                    parsedData.permanentMunicipality,
                    parsedData.permanentWard ? `Ward ${parsedData.permanentWard}` : null,
                    parsedData.permanentProvince,
                    parsedData.permanentCountry || 'Nepal',
                  ]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Education & Academic Qualifications */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              <span>Section 2: Educational Background</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block">Highest Level:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.highestLevel || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Field / Major:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.fieldOfStudy || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">University / College:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.university || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Graduation Year:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.gradYear || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">SLC/SEE Division or GPA:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {parsedData.slcDivision || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Teaching Subject Preference:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  {parsedData.teachingSubject || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Work Experiences */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <Briefcase className="h-4 w-4 text-emerald-600" />
              <span>Section 3: Experience & Engagements</span>
            </h3>

            {parsedData.experiences && Array.isArray(parsedData.experiences) && parsedData.experiences.length > 0 ? (
              <div className="space-y-3">
                {parsedData.experiences.map((exp: Record<string, unknown>, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {String(exp.role || '')} @ {String(exp.organization || '')}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                        {String(exp.durationYears || '')}
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      {String(exp.description || '')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400">No prior formal experience listed.</p>
            )}
          </div>

          {/* Section 4: Motivation & Essays */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span>Section 4: Statement of Purpose & Selection Essays</span>
            </h3>

            <div className="space-y-4 text-xs">
              {parsedData.essay1 && (
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      Essay 1: Why do you want to join the Saathi Teachers Programme?
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      {countWords(parsedData.essay1)} words
                    </span>
                  </div>
                  <p className="text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                    {parsedData.essay1}
                  </p>
                </div>
              )}

              {parsedData.essay2 && (
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      Essay 2: Describe a challenging situation where you demonstrated leadership.
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      {countWords(parsedData.essay2)} words
                    </span>
                  </div>
                  <p className="text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                    {parsedData.essay2}
                  </p>
                </div>
              )}

              {parsedData.essay3 && (
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      Essay 3: How will you adapt to teaching in a rural government school community?
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      {countWords(parsedData.essay3)} words
                    </span>
                  </div>
                  <p className="text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                    {parsedData.essay3}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Commitments & Attached Documents */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Section 5: Commitment Agreements & Attachments</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800">
                <span className="text-stone-400 block">2-Year Fellowship Commitment:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  {parsedData.commitment2Years || 'yes'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800">
                <span className="text-stone-400 block">Pre-Service Residential Training:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  {parsedData.preServiceTraining || 'yes'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-stone-400 block text-xs">Attached CV / Resume:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 block mt-0.5">
                    {parsedData.cvFileName || 'Candidate_CV.pdf'}
                  </span>
                </div>
                <CvActionButtons
                  fileName={parsedData.cvFileName}
                  fileUrl={parsedData.cvFileUrl}
                  candidateName={application.applicant.name}
                  refNo={application.refNo}
                  subject={parsedData.teachingSubject}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB CONTENT 3: MILESTONES & AUDIT HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <History className="h-4 w-4 text-emerald-600" />
            <span>Selection Stage History & Administrative Milestones</span>
          </h3>

          {application.histories.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">
              No stage transitions recorded yet. The candidate is at initial submission.
            </p>
          ) : (
            <div className="space-y-3">
              {application.histories.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-xl bg-stone-50/70 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-stone-800 dark:text-stone-200">
                      {h.fromStage} → <span className="text-emerald-700 dark:text-emerald-400 font-bold">{h.toStage}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      {h.note || 'Milestone updated'}
                    </p>
                    {h.actor && (
                      <span className="text-[10px] text-stone-400">
                        Updated by: {h.actor.name} ({h.actor.email})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono whitespace-nowrap self-start sm:self-center">
                    {new Date(h.at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}



      {/* ================= MODAL: REQUEST APPLICANT CLARIFICATION ================= */}
      {isClarificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  Request Candidate Clarification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClarificationModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {application.applicant.name} ({application.refNo})
                </strong>
              </div>
              <div className="text-stone-500">
                Email: {application.applicant.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Clarification Inquiry / Required Information:
              </label>
              <textarea
                value={clarificationMessage}
                onChange={(e) => setClarificationMessage(e.target.value)}
                placeholder="e.g. Please clarify your rural school deployment availability or provide details regarding your grade teaching experience..."
                rows={4}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-stone-500 leading-relaxed">
                This message will be sent to the applicant via email and will appear prominently on their applicant portal.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsClarificationModalOpen(false)}
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

      {/* ================= MODAL: STRUCTURED REJECT ================= */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-red-200 dark:border-red-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  Conclude Selection / Reject Application
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {application.applicant.name} ({application.refNo})
                </strong>
              </div>
              <div>
                Current Stage:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">{application.stage}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Structured Rejection Reason / Category:
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
                    {val.en} — {val.ne}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Polite, Dignified Feedback to Candidate:
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
              <span>Dispatch respectful bilingual notification email to candidate (Recommended)</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleStructuredReject}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STRUCTURED PLACE ON HOLD ================= */}
      {isPlaceOnHoldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  <PauseCircle className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  Place Candidate On Hold
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlaceOnHoldModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {application.applicant.name} ({application.refNo})
                </strong>
              </div>
              <div>
                Current Stage:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">{application.stage}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Hold Reason Category:
              </label>
              <select
                value={holdCategory}
                onChange={(e) => setHoldCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {Object.entries(ON_HOLD_CATEGORY_MAP).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.en} — {val.ne}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Specific Hold Reason & Next Steps:
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
                Expected Resolution Date (Optional):
              </label>
              <input
                type="date"
                value={holdExpectedDate}
                onChange={(e) => setHoldExpectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsPlaceOnHoldModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleStructuredPlaceOnHold}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
                <span>Place On Hold</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REOPEN / RECONSIDER APPLICATION ================= */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <RotateCcw className="h-4 w-4" />
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  Reopen / Reconsider Candidate Application
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 text-xs space-y-1">
              <div>
                Applicant:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {application.applicant.name} ({application.refNo})
                </strong>
              </div>
              <div>
                Current Status:{' '}
                <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                  {application.status} • Stage: {application.stage}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                New Target Status:
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
                Destination Pipeline Stage:
              </label>
              <select
                value={reopenTargetStage}
                onChange={(e) => setReopenTargetStage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
              >
                {stages.map((stg) => (
                  <option key={stg.code} value={stg.code}>
                    {locale === 'ne' ? stg.nameNe : stg.nameEn} ({stg.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Reconsideration Rationale / Committee Justification:
              </label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={3}
                placeholder="e.g. Additional documentation verified, subject quota re-evaluated, or appeal reviewed..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleReopenApplication}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                <span>Reopen Application</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PHONE INTERVIEW SCHEDULE ================= */}
      {isPhoneScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  <PhoneCall className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                    Schedule Phone Interview Window
                  </h3>
                  <p className="text-xs text-stone-500">
                    {application.applicant.name} ({application.refNo})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhoneScheduleModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Calling Window Start Date:
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
                  Calling Window End Date:
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
                Office Hours Calling Window:
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
                Candidate Preparation Instructions:
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
                <span>Dispatch official bilingual schedule notification email to applicant</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsPhoneScheduleModalOpen(false)}
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
                <span>Save Schedule & Notify</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASC Session & Quotas Admin Config Modal */}
      <AscConfigModal
        isOpen={isAscConfigModalOpen}
        onClose={() => {
          setIsAscConfigModalOpen(false);
          router.refresh();
        }}
        onConfigUpdated={() => router.refresh()}
      />

      {/* Edit & Correct Candidate Dossier Modal */}
      <EditCandidateDossierModal
        isOpen={isEditDossierOpen}
        onClose={() => setIsEditDossierOpen(false)}
        applicationId={application.id}
        refNo={application.refNo}
        initialData={{
          fullName: parsedData.fullName || application.applicant.name,
          phone: parsedData.contactNumber || parsedData.mobileNumber || parsedData.phone || '',
          subject: parsedData.teachingSubject || parsedData.subject || '',
          degree: parsedData.highestLevel || parsedData.highestDegree || '',
          address: parsedData.permanentMunicipality
            ? `${parsedData.permanentMunicipality}, ${parsedData.permanentProvince || ''}`
            : parsedData.currentMunicipality
            ? `${parsedData.currentMunicipality}, ${parsedData.currentProvince || ''}`
            : parsedData.address || '',
          ascBookedDate: parsedData.ascBooking?.bookedDate,
          ascReportingTime: parsedData.ascBooking?.reportingTime,
          ascVenue: parsedData.ascBooking?.venue,
        }}
        locale={locale}
      />
    </div>
  );
}
