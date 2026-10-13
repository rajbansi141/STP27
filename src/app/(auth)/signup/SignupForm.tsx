'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupAction, type ActionState } from '@/app/api/auth/actions';
import { useI18n } from '@/lib/i18n/context';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export function SignupForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    signupAction,
    null
  );

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state?.success && state?.data?.email) {
      router.push(`/verify-email?email=${encodeURIComponent(String(state.data.email))}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && !state?.success && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
          {t.auth.fullNameLabel}
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder={t.auth.fullNamePlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
        />
        {state?.errors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
          {t.auth.applicantEmailLabel}
        </label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={t.auth.applicantEmailPlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
        />
        {state?.errors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
          {t.auth.passwordLabel}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            placeholder="Min. 8 characters with letters & numbers"
            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {state?.errors?.password && (
          <p className="mt-1 text-xs text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
          {t.auth.confirmPasswordLabel}
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          name="confirmPassword"
          required
          placeholder={t.auth.confirmPasswordPlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
        />
        {state?.errors?.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t.auth.signupSubmitting}</span>
          </>
        ) : (
          <span>{t.auth.signupButton}</span>
        )}
      </button>
    </form>
  );
}
