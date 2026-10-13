'use client';

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import { loginAction, type ActionState } from '@/app/api/auth/actions';
import { useI18n } from '@/lib/i18n/context';
import { Eye, EyeOff, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface LoginFormProps {
  returnUrl?: string;
}

export function LoginForm({ returnUrl }: LoginFormProps) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    loginAction,
    null
  );

  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Quick fill demo credentials for quick tester convenience
  const fillCredentials = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
  };

  return (
    <form action={formAction} className="space-y-4">
      {returnUrl && <input type="hidden" name="returnUrl" value={returnUrl} />}

      {state?.message && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{state.message}</span>
            {Boolean(state.data?.needsVerification) && (
              <div className="mt-2">
                <Link
                  href={`/verify-email?email=${encodeURIComponent(String(state.data?.email || ''))}`}
                  className="font-bold underline hover:text-red-900"
                >
                  Verify your email now →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
          {t.auth.identifierLabel}
        </label>
        <input
          type="text"
          name="identifier"
          required
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t.auth.identifierPlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
        />
        {state?.errors?.identifier && (
          <p className="mt-1 text-xs text-red-600">{state.errors.identifier[0]}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            {t.auth.passwordLabel}
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            {t.auth.forgotPasswordLink}
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.passwordPlaceholder}
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

      <div className="flex items-center">
        <input
          id="rememberMe"
          name="rememberMe"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
        />
        <label htmlFor="rememberMe" className="ml-2 block text-xs text-stone-600 dark:text-stone-400">
          {t.auth.rememberMe}
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t.auth.loginSubmitting}</span>
          </>
        ) : (
          <span>{t.auth.loginButton}</span>
        )}
      </button>

      {/* Demo Credentials Helper for Quick Local Testing */}
      <div className="mt-4 p-3 rounded-xl bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Quick Test Accounts (Click to Fill):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => fillCredentials('admin@saathiteachers.org', 'AdminPassword123!')}
            className="px-2 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-[11px] hover:border-emerald-600 text-left truncate"
          >
            🛡️ <strong>Admin</strong>
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('reviewer1', 'ReviewerPassword123!')}
            className="px-2 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-[11px] hover:border-emerald-600 text-left truncate"
          >
            📋 <strong>Reviewer</strong>
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('applicant@example.com', 'ApplicantPass123!')}
            className="px-2 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-[11px] hover:border-emerald-600 text-left truncate"
          >
            🎓 <strong>Applicant</strong>
          </button>
        </div>
      </div>
    </form>
  );
}
