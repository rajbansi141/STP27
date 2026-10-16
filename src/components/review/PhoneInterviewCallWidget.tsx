'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  FileText,
  User,
  Loader2,
  ArrowRight,
  XCircle,
  PauseCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import {
  PhoneInterviewSchedule,
  PHONE_CALL_OUTCOME_MAP,
  REJECTION_REASON_MAP,
  ON_HOLD_CATEGORY_MAP,
} from '@/lib/constants/applicationReview';
import {
  logPhoneCallOutcomeAction,
  decidePhoneInterviewAction,
} from '@/app/api/review/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PhoneInterviewCallWidgetProps {
  applicationId: string;
  candidateName: string;
  refNo: string;
  phoneNumber?: string | null;
  email?: string;
  schedule?: PhoneInterviewSchedule | null;
  currentStage?: string;
  currentStatus?: string;
  locale?: string;
  userRole?: 'REVIEWER' | 'ADMIN';
  onScheduleUpdate?: () => void;
}

export function PhoneInterviewCallWidget({
  applicationId,
  candidateName,
  refNo,
  phoneNumber,
  email,
  schedule,
  currentStage = 'PHONE_INTERVIEW',
  currentStatus = 'UNDER_REVIEW',
  locale = 'en',
  userRole = 'REVIEWER',
  onScheduleUpdate,
}: PhoneInterviewCallWidgetProps) {
  const isNe = locale === 'ne';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCopied, setIsCopied] = useState(false);

  // Quick note state for call outcome
  const [quickNotes, setQuickNotes] = useState<string>(schedule?.callOutcomeNote || '');
  const [showNotesInput, setShowNotesInput] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(schedule?.callDurationMinutes || 15);

  // Decision Modal States
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState<boolean>(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState<boolean>(false);

  // Decision Form Inputs
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('INTERVIEW_PERFORMANCE');
  const [holdReason, setHoldReason] = useState<string>('BORDERLINE_SCORE');

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const currentOutcome = schedule?.callOutcome || 'PENDING';
  const outcomeMeta = PHONE_CALL_OUTCOME_MAP[currentOutcome] || {
    en: 'Call Pending',
    ne: 'सम्पर्क हुन बाँकी',
    color: 'amber',
    badgeClass:
      'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  };

  const isCallDone = currentOutcome === 'COMPLETED';
  const isUnreachable = currentOutcome.startsWith('UNREACHABLE');
  const isAlreadyAdvanced = currentStage !== 'PHONE_INTERVIEW' && currentStage !== 'APPLICATION';
  const isRejected = currentStatus === 'REJECTED';
  const isOnHold = currentStatus === 'ON_HOLD';

  const handleCopyPhone = () => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber.trim());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Quick 1-click update of call status
  const handleUpdateCallStatus = (
    newOutcome:
      | 'PENDING'
      | 'COMPLETED'
      | 'UNREACHABLE_ATTEMPT_1'
      | 'UNREACHABLE_ATTEMPT_2'
      | 'UNREACHABLE_ATTEMPT_3'
      | 'RESCHEDULE_REQUESTED',
    customNotes?: string
  ) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await logPhoneCallOutcomeAction({
        applicationId,
        outcome: newOutcome,
        callNotes: customNotes !== undefined ? customNotes : quickNotes.trim() || undefined,
        durationMinutes: newOutcome === 'COMPLETED' ? callDuration : undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text:
            isNe
              ? 'फोन अन्तर्वार्ताको अवस्था सफलतापूर्वक अद्यावधिक गरियो!'
              : res.message || 'Call status recorded successfully!',
        });
        setShowNotesInput(false);
        router.refresh();
        if (onScheduleUpdate) onScheduleUpdate();
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to update call status.',
        });
      }
    });
  };

  // Stage Progression / Rejection Decision
  const handleExecuteDecision = (decisionType: 'ADVANCE_ASC' | 'REJECT' | 'HOLD') => {
    setFeedback(null);
    startTransition(async () => {
      const res = await decidePhoneInterviewAction({
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
          text: res.message || 'Candidate decision processed successfully!',
        });
        setAdvanceDialogOpen(false);
        setRejectDialogOpen(false);
        setHoldDialogOpen(false);
        router.refresh();
        if (onScheduleUpdate) onScheduleUpdate();
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to process decision.',
        });
      }
    });
  };

  return (
    <div className="bg-gradient-to-br from-white via-stone-50/50 to-emerald-50/20 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/20 border border-emerald-200/90 dark:border-emerald-900/60 rounded-2xl p-5 shadow-sm space-y-4">
      {/* 1. Header & Clarification Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100">
                {isNe ? 'फोन अन्तर्वार्ता तथा निर्णय डेस्क' : 'Phone Screening & Decision Desk'}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${outcomeMeta.badgeClass}`}
              >
                {isNe ? outcomeMeta.ne : outcomeMeta.en}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isNe
                ? 'उम्मेदवारलाई आफ्नो फोनबाट सम्पर्क गरी कल सम्पन्न भए/नभएको रेकर्ड राख्नुहोस् र सोही आधारमा आगामी चरण वा अस्वीकार निर्णय गर्नुहोस्।'
                : 'Call candidate using regular phone outside system. Record call outcome below to advance or reject.'}
            </p>
          </div>
        </div>

        {/* Informational Role Chip */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
            {userRole === 'ADMIN'
              ? isNe
                ? 'प्रशासक डेस्क'
                : 'Admin Authority'
              : isNe
              ? 'मूल्याङ्कनकर्ता'
              : 'Reviewer Mode'}
          </span>
        </div>
      </div>

      {/* 2. Candidate Phone & Scheduled Calling Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Contact Phone Card with 1-Click Copy */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              {isNe ? 'उम्मेदवारको मोबाइल नम्बर' : 'Candidate Registered Mobile'}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              {isNe ? 'सिधै फोनमा डायल गर्नुहोस्' : 'Dial on your phone'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-stone-50 dark:bg-stone-900/60 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-700">
            <span className="font-mono text-base font-bold text-stone-900 dark:text-stone-100 select-all">
              {phoneNumber || (isNe ? 'नम्बर उपलब्ध छैन' : 'No phone listed')}
            </span>

            {phoneNumber && (
              <button
                type="button"
                onClick={handleCopyPhone}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                title="Copy phone number to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">
                      {isNe ? 'कपी भयो!' : 'Copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-stone-500" />
                    <span>{isNe ? 'नम्बर कपी' : 'Copy'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>{email ? `Email: ${email}` : ''}</span>
            <span className="text-[10px] text-stone-400">Ref: {refNo}</span>
          </p>
        </div>

        {/* Calling Date Window & Office Hours */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 space-y-1.5">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
            {isNe ? 'तोकिएको अन्तर्वार्ता तालिका' : 'Scheduled Office Hours Window'}
          </span>

          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold">
            <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              {schedule?.startDate && schedule?.endDate
                ? `${schedule.startDate} – ${schedule.endDate}`
                : isNe
                ? 'मिति तोक्न बाँकी (कार्यालय समय)'
                : 'Date window pending (Office Hours)'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-600 dark:text-stone-300">
            <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>
              {schedule?.timeWindow ||
                '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)'}
            </span>
          </div>

          {schedule?.instructions && (
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 italic pt-1 border-t border-stone-100 dark:border-stone-700/60 line-clamp-2">
              Note: "{schedule.instructions}"
            </p>
          )}
        </div>
      </div>

      {/* 3. Existing Call Outcome Summary (if already recorded) */}
      {schedule?.calledAt && (
        <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <span>{isNe ? 'रेकर्डकर्ता:' : 'Recorded by:'}</span>
              <strong className="text-stone-900 dark:text-stone-100">
                {schedule.calledBy || 'Reviewer/Staff'}
              </strong>
            </div>
            <div className="font-mono text-[10px]">
              {new Date(schedule.calledAt).toLocaleString(
                isNe ? 'ne-NP' : 'en-US'
              )}
            </div>
          </div>

          {schedule.callOutcomeNote && (
            <p className="text-[11px] text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/60 p-2 rounded-lg border border-stone-200/60 dark:border-stone-700/60">
              <span className="font-semibold text-stone-500 block text-[10px] mb-0.5">
                {isNe ? 'अन्तर्वार्ता टिप्पणी:' : 'Call Remarks:'}
              </span>
              "{schedule.callOutcomeNote}"
            </p>
          )}
        </div>
      )}

      {/* 4. Feedback Alert */}
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

      {/* 5. Fast 1-Click Call Outcome Tracking Buttons */}
      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {isNe ? '१. फोन सम्पर्क स्थिति रेकर्ड गर्नुहोस्:' : 'Step 1: Record Phone Call Status'}
          </span>
          <button
            type="button"
            onClick={() => setShowNotesInput(!showNotesInput)}
            className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {showNotesInput
              ? isNe
                ? 'टिप्पणी बन्द'
                : 'Hide Notes'
              : isNe
              ? '+ अन्तर्वार्ता टिप्पणी लेख्नुहोस्'
              : '+ Add Call Remarks'}
          </button>
        </div>

        {/* Optional Notes Input */}
        {showNotesInput && (
          <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
            <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300">
              {isNe
                ? 'अन्तर्वार्ताको संक्षिप्त अवलोकन (संचार शैली, प्रेरणा, २ वर्षे प्रतिबद्धता आदि):'
                : 'Observations & Notes (Fluency, dedication, rural willingness):'}
            </label>
            <textarea
              rows={2}
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder={
                isNe
                  ? 'उम्मेदवारसँग कुरा भयो, अंग्रेजी र नेपालीमा राम्रो संचार, दुर्गममा जान तयार...'
                  : 'Call went well. Passionate about community teaching, confirmed availability...'
              }
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>
        )}

        {/* Action Buttons: Mark Call Done / Mark Unreachable / Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Button A: Mark Call Done */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleUpdateCallStatus('COMPLETED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isCallDone
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-500 ring-offset-1'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {isCallDone
                ? isNe
                  ? '✓ फोन अन्तर्वार्ता सम्पन्न (रेकर्ड भएको)'
                  : '✓ Call Done (Recorded)'
                : isNe
                ? '✓ कल सम्पन्न भयो (Mark as Done)'
                : '✓ Mark Call as Done'}
            </span>
          </button>

          {/* Button B: Mark Unreachable */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleUpdateCallStatus('UNREACHABLE_ATTEMPT_1')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isUnreachable
                ? 'bg-orange-600 text-white ring-2 ring-orange-500 ring-offset-1'
                : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/60 dark:hover:bg-orange-900/60 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-700'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
              {isUnreachable
                ? isNe
                  ? '⚠️ सम्पर्क हुन सकेन (रेकर्ड भएको)'
                  : '⚠️ Unreachable (Recorded)'
                : isNe
                ? '⚠️ सम्पर्क भएन (Unreachable)'
                : '⚠️ Mark as Unreachable'}
            </span>
          </button>

          {/* Button C: Reset to Pending */}
          {currentOutcome !== 'PENDING' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleUpdateCallStatus('PENDING')}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
              title="Reset call status back to Pending"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{isNe ? 'पुनः बाँकी बनाउनुहोस्' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 6. Step 2: Direct Stage Promotion or Rejection Decision */}
      <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {isNe
              ? '२. अन्तर्वार्ताको आधारमा उम्मेदवारको चरण निर्णय गर्नुहोस्:'
              : 'Step 2: Determine Progression Based on Call'}
          </span>
          {isAlreadyAdvanced && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {isNe ? 'आगामी चरणमा बढुवा भइसकेको' : 'Already Advanced'}
            </span>
          )}
          {isRejected && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              {isNe ? 'अस्वीकृत गरिएको' : 'Rejected'}
            </span>
          )}
        </div>

        {/* Informational Guidance Hint */}
        <div className="p-2.5 rounded-xl bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-300 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
          <span>
            {isCallDone
              ? isNe
                ? 'फोन अन्तर्वार्ता सम्पन्न भइसकेको छ। उम्मेदवार उपयुक्त भए "ASC मा सिफारिस" गर्नुहोस्, वा नतिजा चित्तबुझ्दो नभए "अस्वीकार" गर्नुहोस्।'
                : 'Phone interview is completed. If candidate meets the benchmark, advance to ASC, or reject if unsatisfactory.'
              : isUnreachable
              ? isNe
                ? 'उम्मेदवार सम्पर्कमा नआएको रेकर्ड छ। यदि अन्तिम समयसम्म सम्पर्क नभए "अस्वीकार" गर्न सक्नुहुन्छ।'
                : 'Candidate was recorded as unreachable. If the calling window has passed without answer, you can reject the application.'
              : isNe
              ? 'उम्मेदवारलाई फोन गरेर अन्तर्वार्ता लिनुहोस्। त्यसपछि माथि कल सम्पन्न भएको रेकर्ड राखी यहाँबाट अर्को चरणमा सिफारिस वा अस्वीकार गर्नुहोस्।'
              : 'Call the candidate on your phone. Record completion above to activate candidate advancement or rejection.'}
          </span>
        </div>

        {/* Decision Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Decision A: Advance to Assessment Saathi Candidates (ASC) */}
          <button
            type="button"
            disabled={isPending || isAlreadyAdvanced}
            onClick={() => setAdvanceDialogOpen(true)}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
              isCallDone && !isAlreadyAdvanced
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
            }`}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>
              {isAlreadyAdvanced
                ? isNe
                  ? '✓ ASC चरणमा सिफारिस भइसकेको'
                  : '✓ Advanced to ASC'
                : isNe
                ? 'ASC चरणमा सिफारिस गर्नुहोस्'
                : 'Advance to Assessment (ASC)'}
            </span>
          </button>

          {/* Decision B: Reject Candidate */}
          <button
            type="button"
            disabled={isPending || isRejected}
            onClick={() => setRejectDialogOpen(true)}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
              isRejected
                ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-white hover:bg-rose-50 dark:bg-stone-900 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
            }`}
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

          {/* Decision C: Put On Hold */}
          <button
            type="button"
            disabled={isPending || isOnHold}
            onClick={() => setHoldDialogOpen(true)}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
              isOnHold
                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-white hover:bg-amber-50 dark:bg-stone-900 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}
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

      {/* ================= MODAL 1: ADVANCE TO ASC ================= */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>
                {isNe
                  ? 'ASC मा सिफारिस पुष्टि'
                  : 'Confirm Progression to ASC'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isNe
                ? `${candidateName} (दर्ता: ${refNo}) लाई फोन अन्तर्वार्तापछि अर्को चरण "ASC" मा सिफारिस गरिनेछ र बधाई सन्देश इमेल पठाइनेछ।`
                : `Candidate ${candidateName} (${refNo}) will be officially advanced to the ASC stage. A notification email will be dispatched.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isNe
                  ? 'समिति टिप्पणी / अवलोकन (ऐच्छिक):'
                  : 'Committee Note / Observational Justification (Optional):'}
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={
                  isNe
                    ? 'फोन अन्तर्वार्तामा राम्रो प्रस्तुति, २ वर्षे प्रतिबद्धता स्पष्ट, ASC चरणका लागि सिफारिस...'
                    : 'Candidate demonstrated exemplary passion for rural teaching and clear communication during the call. Recommended for ASC...'
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
              onClick={() => handleExecuteDecision('ADVANCE_ASC')}
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
                    {isNe
                      ? 'सिफारिस निश्चित गर्नुहोस्'
                      : 'Confirm & Advance to ASC'}
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
                {isNe
                  ? 'उम्मेदवार अस्वीकृत गर्ने निर्णय'
                  : 'Reject Candidate Application'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isNe
                ? `यस निर्णयले उम्मेदवारको आवेदनलाई 'REJECTED' स्थितिमा सुरक्षित गर्नेछ र सम्मानजनक निष्कर्ष सन्देश पठाउनेछ।`
                : `This action will conclude review for ${candidateName} (${refNo}) and mark the application status as REJECTED.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isNe
                  ? 'अस्वीकारको कारण (Reason Category):'
                  : 'Structured Rejection Reason:'}
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
                {isNe
                  ? 'विशिष्ट कारण वा टिप्पणी (Audit & Feedback Note):'
                  : 'Feedback & Evaluator Notes:'}
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={
                  isNe
                    ? 'अन्तर्वार्तामा उपयुक्त संचार सीप नपुगेको वा सम्पर्क हुन नसकेको टिप्पणी...'
                    : 'Detailed notes on why the candidate was not advanced...'
                }
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
                  <span>
                    {isNe
                      ? 'अस्वीकार पुष्टि गर्नुहोस्'
                      : 'Confirm Rejection'}
                  </span>
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
                {isNe
                  ? 'उम्मेदवारलाई होल्ड (प्रतिक्षारत) मा राख्ने'
                  : 'Place Candidate in On-Hold Queue'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isNe
                ? 'थप छलफल, कोटा सन्तुलन वा दोस्रो समीक्षाका लागि उम्मेदवारलाई अस्थायी रूपमा होल्डमा राखिनेछ।'
                : 'Application will be placed on hold for comparative deliberation, quota balancing, or secondary review.'}
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
                placeholder={
                  isNe
                    ? 'सीमावर्ती स्कोर भएकाले वरिष्ठ मूल्याङ्कनकर्तासँग छलफल आवश्यक...'
                    : 'Requires secondary committee review or quota balancing...'
                }
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
                  <span>{isNe ? 'प्रक्रिया हुँदैछ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <PauseCircle className="h-3.5 w-3.5" />
                  <span>
                    {isNe ? 'होल्डमा राख्नुहोस्' : 'Confirm Place on Hold'}
                  </span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
