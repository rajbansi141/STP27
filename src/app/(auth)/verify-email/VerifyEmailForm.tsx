'use client';

import React, { useActionState, useState, useEffect } from 'react';
import { verifyEmailAction, type ActionState } from '@/app/api/auth/actions';
import { useI18n } from '@/lib/i18n/context';
import { Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react';

interface VerifyEmailFormProps {
  initialEmail: string;
}

export function VerifyEmailForm({ initialEmail }: VerifyEmailFormProps) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    verifyEmailAction,
    null
  );

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && !state?.success && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      {state?.success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
          {t.auth.applicantEmailLabel}
        </label>
        <div className="relative">
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
          />
          <Mail className="h-4 w-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
          {t.auth.codeLabel}
        </label>
        <input
          type="text"
          name="code"
          required
          maxLength={6}
          pattern="[0-9]{6}"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="••••••"
          className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-center tracking-[0.5em] text-2xl font-mono font-bold text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
        />
        {state?.errors?.code && (
          <p className="mt-1 text-xs text-red-600">{state.errors.code[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || code.length !== 6}
        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t.auth.verifySubmitting}</span>
          </>
        ) : (
          <span>{t.auth.verifyButton}</span>
        )}
      </button>

      <div className="pt-2 text-center">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Tip: In development without SMTP, 6-digit codes are printed in your console log and recorded in database <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">EmailLog</code> table.
        </p>
      </div>
    </form>
  );
}
