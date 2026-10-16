'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Loader2,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Info,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  AscBooking,
  REJECTION_REASON_MAP,
  ON_HOLD_CATEGORY_MAP,
} from '@/lib/constants/applicationReview';
import { decideAscCandidateAction } from '@/app/api/asc/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AscCandidateDecisionWidgetProps {
  applicationId: string;
  candidateName: string;
  refNo: string;
  booking?: AscBooking | null;
  currentStage?: string;
  currentStatus?: string;
  locale?: string;
  userRole?: 'REVIEWER' | 'ADMIN';
  onDecisionSuccess?: () => void;
}

export function AscCandidateDecisionWidget({
  applicationId,
  candidateName,
  refNo,
  booking,
  currentStage = 'ASC',
  currentStatus = 'UNDER_REVIEW',
  locale = 'en',
  userRole = 'REVIEWER',
  onDecisionSuccess,
}: AscCandidateDecisionWidgetProps) {
  const isNe = locale === 'ne';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [advanceDialogOpen, setAdvanceDialogOpen] = useState<boolean>(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState<boolean>(false);

  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('INTERVIEW_PERFORMANCE');
  const [holdReason, setHoldReason] = useState<string>('BORDERLINE_SCORE');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isAlreadyAdvanced = currentStage !== 'ASC' && currentStage !== 'PHONE_INTERVIEW' && currentStage !== 'APPLICATION';
  const isRejected = currentStatus === 'REJECTED';
  const isOnHold = currentStatus === 'ON_HOLD';

  const handleExecuteDecision = (decisionType: 'ADVANCE_PARENTS_MEET' | 'REJECT' | 'HOLD') => {
    setFeedback(null);
    startTransition(async () => {
      const res = await decideAscCandidateAction({
        applicationId,
        decision: decisionType,
        reasonCategory:
          decisionType === 'REJECT'
            ? rejectionReason
            : decisionType === 'HOLD'
            ? holdReason
            : undefined,
        notes: decisionNotes.trim() || undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.message || 'Candidate stage decision successfully recorded!',
        });
        setAdvanceDialogOpen(false);
        setRejectDialogOpen(false);
        setHoldDialogOpen(false);
        router.refresh();
        if (onDecisionSuccess) onDecisionSuccess();
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to process candidate decision.',
        });
      }
    });
  };

  return (
    <div className="bg-gradient-to-br from-white via-stone-50/50 to-teal-50/20 dark:from-stone-900 dark:via-stone-900 dark:to-teal-950/20 border border-teal-200/90 dark:border-teal-900/60 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-md shadow-teal-600/20">
            <CalendarCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100">
                {isNe
                  ? 'ASC मूल्याङ्कन तथा निर्णय डेस्क'
                  : 'ASC Decision Desk'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                Stage 3: ASC
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isNe
                ? 'उम्मेदवारको मूल्याङ्कन सत्र स्थिति अवलोकन गरी आगामी चरण (Parents’ Meet Event) मा सिफारिस वा अस्वीकार निर्णय गर्नुहोस्।'
                : 'Review candidate’s assessment attendance and decide progression to Parents’ Meet Event or rejection.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-stone-500 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 self-start sm:self-auto">
          {userRole === 'ADMIN' ? 'Admin Authority' : 'Evaluator Mode'}
        </span>
      </div>

      {/* Booked Slot Information Box */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 text-xs space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
          {isNe ? 'उम्मेदवारको ASC सिट विवरण:' : 'Candidate ASC Slot Reservation:'}
        </span>

        {booking?.bookedDate ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-stone-400 block">Booked Date:</span>
                <strong className="text-stone-900 dark:text-stone-100 font-mono text-sm">
                  {booking.bookedDate}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-600 shrink-0" />
              <div>
                <span className="text-[10px] text-stone-400 block">Reporting Time:</span>
                <strong className="text-stone-900 dark:text-stone-100">
                  {booking.reportingTime || '08:30 AM NPT'}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-stone-400 block">Assessment Center:</span>
                <span className="text-stone-800 dark:text-stone-200 text-[11px] line-clamp-2">
                  {booking.venue}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {isNe
                ? 'उम्मेदवारले हालसम्म आफ्नो ASC मूल्याङ्कन मिति छनोट गरिसकेका छैनन्।'
                : 'Candidate has not yet selected their ASC assessment date slot.'}
            </span>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
              : 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Decision Action Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {isNe ? 'ASC मूल्याङ्कनपछिको निर्णय:' : 'ASC Evaluation Outcome Decision:'}
          </span>
          {isAlreadyAdvanced && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {isNe ? 'Parents’ Meet मा पुगिसक्यो' : 'Advanced to Parents’ Meet'}
            </span>
          )}
          {isRejected && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              {isNe ? 'अस्वीकृत गरिएको' : 'Rejected'}
            </span>
          )}
          {isOnHold && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              {isNe ? 'होल्डमा राखिएको' : 'On Hold'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Action A: Advance to Parents' Meet Event */}
          <button
            type="button"
            disabled={isPending || isAlreadyAdvanced}
            onClick={() => setAdvanceDialogOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>
              {isAlreadyAdvanced
                ? isNe
                  ? '✓ Parents’ Meet मा सिफारिस भइसकेको'
                  : '✓ Advanced to Parents’ Meet'
                : isNe
                ? 'Parents’ Meet मा सिफारिस गर्नुहोस्'
                : 'Advance to Parents’ Meet'}
            </span>
          </button>

          {/* Action B: Reject Candidate */}
          <button
            type="button"
            disabled={isPending || isRejected}
            onClick={() => setRejectDialogOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-rose-50 dark:bg-stone-900 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>
              {isRejected
                ? isNe
                  ? '✕ अस्वीकृत भइसकेको'
                  : '✕ Rejected'
                : isNe
                ? '✕ उम्मेदवार अस्वीकृत गर्नुहोस्'
                : '✕ Reject Candidate'}
            </span>
          </button>

          {/* Action C: Put On Hold */}
          <button
            type="button"
            disabled={isPending || isOnHold}
            onClick={() => setHoldDialogOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-amber-50 dark:bg-stone-900 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>
              {isOnHold
                ? isNe
                  ? '⏸ होल्डमा राखिएको'
                  : '⏸ Placed on Hold'
                : isNe
                ? '⏸ प्रतिक्षारत (Hold)'
                : '⏸ Put on Hold'}
            </span>
          </button>
        </div>
      </div>

      {/* ================= MODAL 1: ADVANCE TO PARENTS_MEET ================= */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>
                {isNe
                  ? 'अभिभावक भेटघाट (Parents’ Meet Event) मा सिफारिस'
                  : 'Advance to Parents’ Meet Event'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isNe
                ? `उम्मेदवार ${candidateName} (${refNo}) लाई आगामी चरण 'Parents’ Meet Event' मा सिफारिस गरिनेछ र औपचारिक बधाई इमेल पठाइनेछ।`
                : `Candidate ${candidateName} (${refNo}) will be advanced to the next stage: Parents’ Meet Event. A notification email will be dispatched.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isNe ? 'समिति मूल्याङ्कन टिप्पणी:' : 'Evaluator Remarks / Justification:'}
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={
                  isNe
                    ? 'ASC सत्रमा उत्कृष्ट समूह कार्य, शिक्षण प्रस्तुति र सकारात्मक मनोवृत्ति देखाएको...'
                    : 'Candidate exhibited exceptional group collaboration, lesson delivery, and rural empathy during ASC...'
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setAdvanceDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleExecuteDecision('ADVANCE_PARENTS_MEET')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isNe ? 'प्रक्रिया हुँदैछ...' : 'Advancing...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {isNe ? 'सिफारिस निश्चित गर्नुहोस्' : 'Confirm & Advance'}
                  </span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 2: REJECT ================= */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <XCircle className="h-5 w-5 text-rose-600" />
              <span>
                {isNe ? 'उम्मेदवार अस्वीकृत गर्ने निर्णय' : 'Reject Candidate Application'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isNe
                ? `यस निर्णयले उम्मेदवारको आवेदनलाई 'REJECTED' स्थितिमा सुरक्षित गर्नेछ।`
                : `This action will mark ${candidateName} (${refNo}) as REJECTED and log formal feedback.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isNe ? 'अस्वीकारको कारण:' : 'Structured Reason Category:'}
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {Object.entries(REJECTION_REASON_MAP).map(([key, item]) => (
                  <option key={key} value={key}>
                    {isNe ? item.ne : item.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isNe ? 'समिति विस्तृत टिप्पणी:' : 'Feedback & Audit Remarks:'}
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Reason why the candidate did not advance following the ASC session..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setRejectDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleExecuteDecision('REJECT')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isNe ? 'प्रक्रिया हुँदैछ...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  <span>{isNe ? 'अस्वीकार पुष्टि गर्नुहोस्' : 'Confirm Rejection'}</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 3: PUT ON HOLD ================= */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <PauseCircle className="h-5 w-5 text-amber-600" />
              <span>
                {isNe ? 'उम्मेदवारलाई होल्ड (प्रतिक्षारत) मा राख्ने' : 'Place Candidate in On-Hold Queue'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isNe
                ? 'कोटा सन्तुलन वा दोस्रो समीक्षाका लागि उम्मेदवारलाई अस्थायी रूपमा होल्डमा राखिनेछ।'
                : 'Application will be placed in comparative deliberation queue for quota balancing or secondary review.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isNe ? 'होल्डको वर्गीकरण:' : 'Deliberation Category:'}
              </label>
              <select
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {Object.entries(ON_HOLD_CATEGORY_MAP).map(([key, item]) => (
                  <option key={key} value={key}>
                    {isNe ? item.ne : item.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isNe ? 'समिति छलफल टिप्पणी:' : 'Deliberation Note:'}
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Requires secondary committee deliberation or quota balancing..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setHoldDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleExecuteDecision('HOLD')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isNe ? 'सुरक्षित गर्दै...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <PauseCircle className="h-3.5 w-3.5" />
                  <span>{isNe ? 'होल्डमा राख्नुहोस्' : 'Confirm Place on Hold'}</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
