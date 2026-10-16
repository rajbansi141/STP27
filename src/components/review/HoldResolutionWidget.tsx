'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ArrowRight, Ban, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveHoldApplicationAction } from '@/app/api/review/actions';

interface HoldResolutionWidgetProps {
  applicationId: string;
  refNo: string;
  currentStage: string;
  locale?: string;
  canManage?: boolean;
}

export function HoldResolutionWidget({
  applicationId,
  refNo,
  currentStage,
  locale = 'en',
  canManage = true,
}: HoldResolutionWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDecision = (decision: 'ADVANCE' | 'REJECT') => {
    setFeedback(null);
    startTransition(async () => {
      const res = await resolveHoldApplicationAction(applicationId, decision);
      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            decision === 'ADVANCE'
              ? (locale === 'ne'
                  ? 'उम्मेदवारलाई सफलतापूर्वक आगामी चरणमा स्तरोन्नति गरियो।'
                  : 'Candidate successfully advanced to next stage.')
              : (locale === 'ne'
                  ? 'आवेदन अस्वीकृत गरियो।'
                  : 'Candidate marked as Rejected.'),
        });
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to update application status.',
        });
      }
    });
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200 dark:border-amber-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-950 dark:text-amber-100">
                {locale === 'ne' ? 'आवेदन स्थिति: होल्ड (On Hold)' : 'Application Status: On Hold'}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                {refNo}
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              {canManage
                ? (locale === 'ne'
                    ? 'यस उम्मेदवारलाई अर्को चरणमा अगाडि बढाउने वा अस्वीकृत गर्ने प्रत्यक्ष अधिकार व्यवस्थापक (Admin) सँग छ।'
                    : 'Administrator direct authority to advance this candidate to the next stage or reject.')
                : (locale === 'ne'
                    ? 'यो आवेदन हाल होल्डमा छ। यसलाई अर्को चरणमा लैजाने वा प्रक्रिया टुंग्याउने अधिकार केवल व्यवस्थापक (Admin) सँग सुरक्षित छ।'
                    : 'This application is on hold. Only Administrators have authority to advance or reject.')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canManage && (
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => handleDecision('ADVANCE')}
              className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span>{locale === 'ne' ? 'आगामी चरणमा लैजानुहोस्' : 'Advance to Next Stage'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleDecision('REJECT')}
              className="border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              <span>{locale === 'ne' ? 'अस्वीकृत गर्नुहोस्' : 'Reject Candidate'}</span>
            </Button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
