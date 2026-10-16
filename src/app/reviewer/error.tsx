'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';

interface ReviewerErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ReviewerError({ error, reset }: ReviewerErrorProps) {
  useEffect(() => {
    console.error('Reviewer Console Error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full p-8 rounded-3xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-stone-900 shadow-xl text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
            Review Portal Error
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            An issue occurred while retrieving the evaluation rubric or processing your review action.
          </p>
          {error.digest && (
            <p className="font-mono text-[11px] text-stone-400 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1 rounded-md inline-block">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/reviewer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Queue</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
