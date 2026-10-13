'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Copy, Check, Hash } from 'lucide-react';

interface ConfirmationCardProps {
  refNo: string;
}

export function ConfirmationCard({ refNo }: ConfirmationCardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(refNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-dashed border-emerald-400 dark:border-emerald-700 max-w-lg mx-auto space-y-3">
      <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider block">
        {t.apply.confirmation.refLabel}
      </span>

      <div className="flex items-center justify-center gap-2">
        <Hash className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        <span className="font-mono font-black text-2xl sm:text-3xl text-emerald-900 dark:text-emerald-100 tracking-[0.2em]">
          {refNo}
        </span>
      </div>

      <div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 shadow-xs transition-all"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>{t.apply.confirmation.copied}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-stone-500" />
              <span>{t.apply.confirmation.copyRef}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
