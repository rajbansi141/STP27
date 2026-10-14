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
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Download,
  History,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  adminAdvanceStageAction,
  adminUpdateStatusAction,
  assignReviewerAction,
  unassignReviewerAction,
} from '@/app/api/admin/actions';
import { countWords } from '@/lib/validations/application';

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
  scores: any;
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
    data: any;
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

  // Status decision state
  const [selectedStatus, setSelectedStatus] = useState(application.status);
  const [statusNote, setStatusNote] = useState('');

  // Reviewer assignment state
  const [selectedReviewerToAssign, setSelectedReviewerToAssign] = useState(
    availableReviewers[0]?.id || ''
  );

  // User feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const parsedData = application.data
    ? typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data
    : {};

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

  const handleUpdateStatus = (newStatus: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await adminUpdateStatusAction({
        applicationId: application.id,
        status: newStatus,
        note: statusNote.trim() || undefined,
      });

      if (res.success) {
        setSelectedStatus(newStatus);
        setFeedback({ type: 'success', text: res.message || 'Status updated successfully.' });
        setStatusNote('');
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to update status.' });
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
        setFeedback({ type: 'success', text: res.message || 'Reviewer assigned.' });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to assign reviewer.' });
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
        <div className="flex items-center gap-3">
          <Link
            href={`/review/${application.id}`}
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

      {/* ================= EXECUTIVE DECISION & CONTROL CONSOLE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panel 1: Stage Progression (Advance to next stage) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              <span>Pipeline Stage Progression</span>
            </h3>
            <span className="text-[10px] text-stone-400 font-mono">Stage Control</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-stone-600 dark:text-stone-300 font-medium block">
              Move Candidate to Stage:
            </label>
            <select
              value={selectedNextStage}
              onChange={(e) => setSelectedNextStage(e.target.value)}
              disabled={isPending}
              aria-label="Move candidate to stage"
              className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {stages.map((s) => (
                <option key={s.code} value={s.code}>
                  {locale === 'ne' ? s.nameNe : s.nameEn} ({s.code})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Stage transition note (optional)..."
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              disabled={isPending}
              className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-stone-400"
            />

            <button
              type="button"
              onClick={handleAdvanceStage}
              disabled={isPending || selectedNextStage === application.stage}
              className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Transition Stage</span>
            </button>
          </div>
        </div>

        {/* Panel 2: Final Selection Status Decision */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Executive Selection Decision</span>
            </h3>
            <span className="text-[10px] text-stone-400 font-mono">Status</span>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus('SHORTLISTED')}
                disabled={isPending}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                  application.status === 'SHORTLISTED'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                }`}
              >
                ✓ Shortlist
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('ON_HOLD')}
                disabled={isPending}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                  application.status === 'ON_HOLD'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                }`}
              >
                ⏸ On Hold
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('FINAL_SELECTED')}
                disabled={isPending}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                  application.status === 'FINAL_SELECTED'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900'
                }`}
              >
                ★ Final Selected
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('REJECTED')}
                disabled={isPending}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                  application.status === 'REJECTED'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-red-50 text-red-800 hover:bg-red-100 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                }`}
              >
                ✕ Reject
              </button>
            </div>

            <input
              type="text"
              placeholder="Administrative note (optional)..."
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              disabled={isPending}
              className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Panel 3: Selection Committee Reviewer Allocation */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Assigned Reviewers</span>
            </h3>
            <span className="text-[10px] text-stone-400 font-mono">
              {application.assignments.length} Allocated
            </span>
          </div>

          {/* Assigned Reviewer Badges with Removal */}
          <div className="flex flex-wrap gap-1.5 min-h-[34px]">
            {application.assignments.length === 0 ? (
              <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                No reviewer currently assigned.
              </span>
            ) : (
              application.assignments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 group"
                >
                  <UserCheck className="h-3 w-3 text-blue-600 shrink-0" />
                  <span>{a.reviewer.name}</span>
                  <button
                    type="button"
                    onClick={() => handleUnassignReviewer(a.reviewerId)}
                    disabled={isPending}
                    title="Remove Reviewer Assignment"
                    className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/60 dark:hover:text-red-300 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5 text-stone-400 group-hover:text-red-600" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Assign New Reviewer Input */}
          <div className="flex items-center gap-2 pt-1">
            <select
              value={selectedReviewerToAssign}
              onChange={(e) => setSelectedReviewerToAssign(e.target.value)}
              disabled={isPending || availableReviewers.length === 0}
              aria-label="Select reviewer to assign"
              className="flex-1 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
              className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs transition-colors shrink-0"
            >
              Assign
            </button>
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
                          "{r.comment}"
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
                {parsedData.experiences.map((exp: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {exp.role} @ {exp.organization}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                        {exp.durationYears}
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      {exp.description}
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
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800">
                <span className="text-stone-400 block">Attached CV / Resume:</span>
                {parsedData.cvFileUrl ? (
                  <a
                    href={parsedData.cvFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    <span>{parsedData.cvFileName || 'Download CV Document'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-stone-500 font-medium">None attached</span>
                )}
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
    </div>
  );
}
