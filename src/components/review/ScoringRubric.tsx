'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import {
  submitReviewAction,
  adminDecisionAction,
  adminUnlockReviewAction,
} from '@/app/api/review/actions';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ScoringRubricProps {
  applicationId: string;
  applicantName: string;
  refNo: string;
  currentStage: string;
  existingReview: {
    id?: string;
    scores: {
      academic?: number;
      motivation?: number;
      communication?: number;
      leadership?: number;
      docChecks?: {
        citizenship?: boolean;
        degree?: boolean;
        slc?: boolean;
      };
    };
    totalScore?: number | null;
    comment?: string | null;
    recommendation?: string;
    isLocked?: boolean;
    status?: string;
    adminDecision?: string | null;
    returnReason?: string | null;
    unlockedReason?: string | null;
    submittedAt?: string | null;
    stage?: string;
  } | null;
  availableStages: { code: string; name: string }[];
  isReviewerOrAdmin: boolean;
  isAdmin?: boolean;
  isAssignedReviewer?: boolean;
}

export function ScoringRubric({
  applicationId,
  applicantName,
  refNo,
  currentStage,
  existingReview,
  availableStages,
  isReviewerOrAdmin,
  isAdmin = false,
  isAssignedReviewer = true,
}: ScoringRubricProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Evaluated Stage (defaults to existingReview stage, or currentStage)
  const [selectedStage, setSelectedStage] = useState<string>(
    existingReview?.stage || currentStage
  );

  // Rubric Dimensions
  const [academicScore, setAcademicScore] = useState<number>(
    existingReview?.scores?.academic ?? 8
  );
  const [motivationScore, setMotivationScore] = useState<number>(
    existingReview?.scores?.motivation ?? 8
  );
  const [communicationScore, setCommunicationScore] = useState<number>(
    existingReview?.scores?.communication ?? 8
  );
  const [leadershipScore, setLeadershipScore] = useState<number>(
    existingReview?.scores?.leadership ?? 8
  );

  // Document Checks
  const [docChecks, setDocChecks] = useState({
    citizenship: existingReview?.scores?.docChecks?.citizenship ?? true,
    degree: existingReview?.scores?.docChecks?.degree ?? true,
    slc: existingReview?.scores?.docChecks?.slc ?? true,
  });

  // Comments and Recommendation
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [recommendation, setRecommendation] = useState<'ADVANCE' | 'HOLD' | 'REJECT'>(
    (existingReview?.recommendation as any) || 'ADVANCE'
  );

  // Status message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Admin dialog states
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReasonInput, setReturnReasonInput] = useState('');
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockReasonInput, setUnlockReasonInput] = useState('');

  // Stage advance state
  const nextStageDefault = availableStages.find((s) => s.code !== currentStage)?.code || '';
  const [nextStage, setNextStage] = useState<string>(nextStageDefault);
  const [advanceNote, setAdvanceNote] = useState<string>('');

  // Is evaluation locked or in read-only review mode?
  const isReadOnlyReview = !isAssignedReviewer && !isAdmin;
  const isLocked = Boolean((existingReview?.isLocked && !isAdmin) || isReadOnlyReview);
  const isApproved = existingReview?.status === 'APPROVED' || existingReview?.adminDecision === 'APPROVED';
  const isReturned = existingReview?.status === 'RETURNED' || existingReview?.adminDecision === 'RETURNED';

  // Calculate live aggregate score
  const totalScore = academicScore + motivationScore + communicationScore + leadershipScore;
  const percentage = Math.round((totalScore / 40) * 100);

  // Handle Review Submit (locks upon submission)
  const handleSubmitReview = async () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await submitReviewAction({
        applicationId,
        stage: selectedStage,
        academicScore,
        motivationScore,
        communicationScore,
        leadershipScore,
        comment,
        recommendation,
        docChecks,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'मूल्याङ्कन सुरक्षित तथा लक गरिएको छ। व्यवस्थापकले यसलाई अन्तिम निर्णय गर्नेछन्।'
              : 'Evaluation submitted and locked. Submitted to admin for final decision.',
        });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to submit review.' });
      }
    });
  };

  // Admin: Approve
  const handleAdminApprove = () => {
    if (!existingReview?.id) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminDecisionAction({
        reviewId: existingReview.id!,
        decision: 'APPROVE',
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          text: locale === 'ne' ? 'मूल्याङ्कन स्वीकृत गरियो।' : 'Evaluation approved successfully.',
        });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to approve.' });
      }
    });
  };

  // Admin: Return to Reviewer
  const handleAdminReturn = () => {
    if (!existingReview?.id || !returnReasonInput.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminDecisionAction({
        reviewId: existingReview.id!,
        decision: 'RETURN',
        returnReason: returnReasonInput.trim(),
      });
      if (res.success) {
        setReturnDialogOpen(false);
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'मूल्याङ्कन पुनरावलोकनका लागि फिर्ता गरियो।'
              : 'Evaluation returned to reviewer for revision.',
        });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to return review.' });
      }
    });
  };

  // Admin: Unlock Review
  const handleAdminUnlock = () => {
    if (!existingReview?.id || !unlockReasonInput.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminUnlockReviewAction({
        reviewId: existingReview.id!,
        reason: unlockReasonInput.trim(),
      });
      if (res.success) {
        setUnlockDialogOpen(false);
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'मूल्याङ्कन सफलतापूर्वक अनलक गरियो।'
              : 'Evaluation unlocked for reviewer revision.',
        });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to unlock review.' });
      }
    });
  };

  // Admin: Advance Stage
  const handleAdminAdvance = () => {
    if (!existingReview?.id || !nextStage) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminDecisionAction({
        reviewId: existingReview.id!,
        decision: 'ADVANCE',
        nextStageCode: nextStage,
        note: advanceNote,
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            locale === 'ne'
              ? 'उम्मेदवार आगामी चरणमा सिफारिस गरियो र इमेल पठाइयो।'
              : 'Candidate advanced to next stage and notified.',
        });
        router.refresh();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to advance candidate.' });
      }
    });
  };

  const renderSlider = (
    label: string,
    desc: string,
    value: number,
    setValue: (v: number) => void
  ) => {
    return (
      <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
              {label}
            </h4>
            <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">{desc}</p>
          </div>
          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
            {value} / 10
          </span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            disabled={isLocked}
            onChange={(e) => setValue(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-600 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer disabled:opacity-50"
          />
          <div className="flex gap-1 shrink-0">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isLocked}
                onClick={() => setValue(num)}
                className={`h-6 w-6 rounded-md text-[10px] font-bold transition-all disabled:opacity-50 ${
                  value === num
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Rubric Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
        <div>
          <h3 className="text-base font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600" />
            <span>{t.reviewer.scoring.rubricTitle}</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {t.reviewer.scoring.rubricSubtitle}
          </p>
        </div>

        {/* Live Aggregate Score Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/80">
          <div>
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 block">
              {t.reviewer.scoring.aggregateScore}
            </span>
            <div className="font-mono font-black text-xl text-emerald-950 dark:text-emerald-100">
              {totalScore} <span className="text-xs font-normal text-stone-500">/ 40</span>
            </div>
          </div>
          <div className="text-right pl-2 border-l border-emerald-300 dark:border-emerald-700">
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Lock / Approval / Return Status Banners */}
      {isApproved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-medium">
            {locale === 'ne'
              ? 'यो मूल्याङ्कन व्यवस्थापकद्वारा आधिकारिक रूपमा स्वीकृत भइसकेको छ।'
              : 'This evaluation has been officially approved by the Admin committee.'}
          </span>
        </div>
      )}

      {isReturned && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <RotateCcw className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {locale === 'ne' ? 'व्यवस्थापकद्वारा फिर्ता गरिएको:' : 'Returned by Admin for Revision:'}
            </span>
          </div>
          <p className="text-xs pl-6">{existingReview?.returnReason}</p>
        </div>
      )}

      {isLocked && !isApproved && (
        <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-stone-500" />
            <span>
              {locale === 'ne'
                ? 'यो मूल्याङ्कन पेश भई लक गरिएको छ। व्यवस्थापकले मात्र अनलक गर्न सक्छन्।'
                : 'This evaluation is submitted and locked. Only an Admin can unlock.'}
            </span>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUnlockDialogOpen(true)}
              className="h-7 text-xs gap-1"
            >
              <Unlock className="h-3 w-3" />
              <span>{locale === 'ne' ? 'अनलक गर्नुहोस्' : 'Unlock'}</span>
            </Button>
          )}
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Stage Selection (Reviewers can evaluate across ALL stages) */}
      <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-1.5">
        <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
          {locale === 'ne' ? 'मूल्याङ्कन गरिने छनोट चरण:' : 'Evaluation Stage:'}
        </label>
        <select
          value={selectedStage}
          disabled={isLocked}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium text-stone-900 dark:text-stone-100 disabled:opacity-50"
        >
          {availableStages.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-stone-500">
          {locale === 'ne'
            ? 'तपाईं यस उम्मेदवारको लागि कुनै पनि चरणको मूल्याङ्कन रेकर्ड गर्न सक्नुहुन्छ।'
            : 'You can record and lock evaluations across all selection stages.'}
        </p>
      </div>

      {/* 4 Standardized Scoring Dimensions */}
      <div className="space-y-3">
        {renderSlider(
          t.reviewer.scoring.dim1Title,
          t.reviewer.scoring.dim1Desc,
          academicScore,
          setAcademicScore
        )}
        {renderSlider(
          t.reviewer.scoring.dim2Title,
          t.reviewer.scoring.dim2Desc,
          motivationScore,
          setMotivationScore
        )}
        {renderSlider(
          t.reviewer.scoring.dim3Title,
          t.reviewer.scoring.dim3Desc,
          communicationScore,
          setCommunicationScore
        )}
        {renderSlider(
          t.reviewer.scoring.dim4Title,
          t.reviewer.scoring.dim4Desc,
          leadershipScore,
          setLeadershipScore
        )}
      </div>

      {/* Document Checks */}
      <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2.5">
        <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <FileCheck className="h-4 w-4 text-emerald-600" />
          <span>{t.reviewer.scoring.docChecksTitle}</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={docChecks.citizenship}
              onChange={(e) => setDocChecks({ ...docChecks, citizenship: e.target.checked })}
              className="accent-emerald-600 rounded"
            />
            <span>{t.reviewer.scoring.docCitizenship}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={docChecks.degree}
              onChange={(e) => setDocChecks({ ...docChecks, degree: e.target.checked })}
              className="accent-emerald-600 rounded"
            />
            <span>{t.reviewer.scoring.docDegree}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={docChecks.slc}
              onChange={(e) => setDocChecks({ ...docChecks, slc: e.target.checked })}
              className="accent-emerald-600 rounded"
            />
            <span>{t.reviewer.scoring.docSlc}</span>
          </label>
        </div>
      </div>

      {/* Qualitative Notes */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
          {t.reviewer.scoring.commentsTitle}
        </label>
        <textarea
          rows={3}
          value={comment}
          disabled={isLocked}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.reviewer.scoring.commentsPlaceholder}
          className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50"
        />
      </div>

      {/* Recommendation Radio Options */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
          {t.reviewer.scoring.recommendationTitle}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              recommendation === 'ADVANCE'
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                : 'border-stone-200 dark:border-stone-800 text-stone-600'
            }`}
          >
            <input
              type="radio"
              name="recommendation"
              value="ADVANCE"
              disabled={isLocked}
              checked={recommendation === 'ADVANCE'}
              onChange={() => setRecommendation('ADVANCE')}
              className="accent-emerald-600"
            />
            <span>{t.reviewer.scoring.advanceOption}</span>
          </label>

          <label
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              recommendation === 'HOLD'
                ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-800 dark:text-amber-300'
                : 'border-stone-200 dark:border-stone-800 text-stone-600'
            }`}
          >
            <input
              type="radio"
              name="recommendation"
              value="HOLD"
              disabled={isLocked}
              checked={recommendation === 'HOLD'}
              onChange={() => setRecommendation('HOLD')}
              className="accent-amber-600"
            />
            <span>{t.reviewer.scoring.holdOption}</span>
          </label>

          <label
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              recommendation === 'REJECT'
                ? 'bg-red-50 dark:bg-red-950 border-red-500 text-red-800 dark:text-red-300'
                : 'border-stone-200 dark:border-stone-800 text-stone-600'
            }`}
          >
            <input
              type="radio"
              name="recommendation"
              value="REJECT"
              disabled={isLocked}
              checked={recommendation === 'REJECT'}
              onChange={() => setRecommendation('REJECT')}
              className="accent-red-600"
            />
            <span>{t.reviewer.scoring.rejectOption}</span>
          </label>
        </div>
      </div>

      {/* Reviewer Submit & Lock Action OR Dossier Review Mode Notice */}
      {isReadOnlyReview ? (
        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {locale === 'ne' ? 'अवलोकन मोड (Dossier Review Only)' : 'Review Mode (Unassigned Candidate)'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            {locale === 'ne'
              ? 'तपाईं यस उम्मेदवारको पूर्ण आवेदन तथा कागजातहरूको अध्ययन गर्न सक्नुहुन्छ। तर छनोट समिति नीति अनुसार, केवल तोकिएका समीक्षकले मात्र आधिकारिक मूल्याङ्कन दर्ता गरी व्यवस्थापकसमक्ष पेश गर्न सक्नुहुन्छ।'
              : 'You are reviewing this candidate’s application dossier. Only the officially assigned reviewer can score the rubric and submit the final evaluation to the administrator.'}
          </p>
        </div>
      ) : !isLocked ? (
        <button
          type="button"
          disabled={isPending || !comment.trim()}
          onClick={handleSubmitReview}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t.reviewer.scoring.savingReview}</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <span>
                {locale === 'ne' ? 'मूल्याङ्कन पेश तथा लक गर्नुहोस्' : 'Submit & Lock Evaluation'}
              </span>
            </>
          )}
        </button>
      ) : null}

      {/* Admin Decision Section */}
      {isAdmin && existingReview?.id && (
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>{locale === 'ne' ? 'व्यवस्थापक निर्णय:' : 'Admin Committee Decision:'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              disabled={isPending || isApproved}
              onClick={handleAdminApprove}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              <span>{locale === 'ne' ? 'मूल्याङ्कन स्वीकृत' : 'Approve Review'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setReturnDialogOpen(true)}
              className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs h-9"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              <span>{locale === 'ne' ? 'कारण सहित फिर्ता' : 'Return with Reason'}</span>
            </Button>
          </div>

          {/* Move to Next Stage */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
            <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block">
              {locale === 'ne' ? 'उम्मेदवारलाई आगामी चरणमा लैजानुहोस्:' : 'Advance Candidate to Next Stage:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={nextStage}
                onChange={(e) => setNextStage(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              >
                {availableStages.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                placeholder="Stage note (optional)"
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              />
            </div>

            <Button
              type="button"
              disabled={isPending || !nextStage}
              onClick={handleAdminAdvance}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white text-xs h-9"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              <span>{locale === 'ne' ? 'चरण अगाडि बढाउनुहोस्' : 'Advance to Next Stage'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Return to Reviewer Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {locale === 'ne' ? 'मूल्याङ्कन फिर्ता गर्ने कारण' : 'Return Evaluation to Reviewer'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {locale === 'ne'
                ? 'मूल्याङ्कनकर्तालाई पुनरावलोकन गर्न कारण खुलाउनुहोस्। उनीहरूले सूचना प्राप्त गर्नेछन्।'
                : 'Provide feedback or reason for returning this review. The reviewer will be notified.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              rows={3}
              value={returnReasonInput}
              onChange={(e) => setReturnReasonInput(e.target.value)}
              placeholder="e.g. Please re-check document authenticity and provide additional remarks on leadership."
              className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-background text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setReturnDialogOpen(false)}>
              {locale === 'ne' ? 'रद्द' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              disabled={isPending || !returnReasonInput.trim()}
              onClick={handleAdminReturn}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Review Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {locale === 'ne' ? 'मूल्याङ्कन अनलक गर्ने कारण' : 'Unlock Evaluation Submission'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {locale === 'ne'
                ? 'अनलक गर्दा अडिट लगमा कारण दर्ता हुनेछ।'
                : 'An audit log entry with this reason will be permanently recorded.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={unlockReasonInput}
              onChange={(e) => setUnlockReasonInput(e.target.value)}
              placeholder="Reason for unlocking (required)"
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setUnlockDialogOpen(false)}>
              {locale === 'ne' ? 'रद्द' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              disabled={isPending || !unlockReasonInput.trim()}
              onClick={handleAdminUnlock}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock Evaluation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
