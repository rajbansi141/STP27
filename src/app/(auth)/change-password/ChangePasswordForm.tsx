'use client';

import React, { useActionState, useState, useTransition } from 'react';
import { changePasswordAction, logoutAction, type ActionState } from '@/app/api/auth/actions';
import { useI18n } from '@/lib/i18n/context';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export function ChangePasswordForm() {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    changePasswordAction,
    null
  );

  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const handleBackToLogin = () => {
    startLogoutTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
        <button
          type="button"
          disabled={isPending || isLoggingOut}
          onClick={handleBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 px-2.5 py-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-50"
          title={t.auth.backToLogin}
        >
          {isLoggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-500" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5 text-stone-500" />
          )}
          <span>{t.auth.backToLogin}</span>
        </button>
        <span className="text-[11px] font-mono font-medium text-stone-400 dark:text-stone-500">
          Account Setup
        </span>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.message && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{state.message}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
            {t.auth.currentPasswordLabel}
          </label>
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
          />
          {state?.errors?.currentPassword && (
            <p className="mt-1 text-xs text-red-600">{state.errors.currentPassword[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
            {t.auth.newPasswordLabel}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="newPassword"
              required
              autoComplete="new-password"
              placeholder="Min 8 characters with letters & numbers"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {state?.errors?.newPassword && (
            <p className="mt-1 text-xs text-red-600">{state.errors.newPassword[0]}</p>
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
            autoComplete="new-password"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
          />
          {state?.errors?.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{state.errors.confirmPassword[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || isLoggingOut}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t.auth.changing}</span>
            </>
          ) : (
            <span>{t.auth.changeButton}</span>
          )}
        </button>

        <button
          type="button"
          disabled={isPending || isLoggingOut}
          onClick={handleBackToLogin}
          className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-stone-500" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          <span>{t.auth.cancelAndSignOut}</span>
        </button>
      </form>
    </div>
  );
}
