import React from 'react';
import { requireAuth } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { getServerTranslations } from '@/lib/i18n/server';
import { User, Mail, Shield, Calendar, KeyRound, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordForm } from '@/app/(auth)/change-password/ChangePasswordForm';

export default async function ProfilePage() {
  const currentUser = await requireAuth('/profile');
  const { t, locale } = await getServerTranslations();

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!user) {
    return null;
  }

  const roleBadgeColor =
    user.role === 'ADMIN'
      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      : user.role === 'REVIEWER'
      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {locale === 'ne' ? 'प्रयोगकर्ता प्रोफाइल' : 'Account Profile'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
          {locale === 'ne'
            ? 'तपाईंको खाता जानकारी र सुरक्षा सेटिङहरू प्रबन्ध गर्नुहोस्।'
            : 'Manage your account details and security credentials.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Details Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs">
            <div className="flex flex-col items-center text-center pb-6 border-b border-stone-100 dark:border-stone-800">
              <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold shadow-md mb-4">
                {user.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'U'}
              </div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {user.name}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">{user.email}</p>
              <div className="mt-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeColor}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <div className="pt-6 space-y-3.5 text-xs text-stone-600 dark:text-stone-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-500">
                  <Shield className="w-3.5 h-3.5" />
                  {locale === 'ne' ? 'खाता स्थिति' : 'Account Status'}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {locale === 'ne' ? 'सक्रिय' : 'Active'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {locale === 'ne' ? 'दर्ता मिति' : 'Member Since'}
                </span>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {new Date(user.createdAt).toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Password & Security */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100 dark:border-stone-800 mb-6">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {t.auth.changePasswordTitle}
                </h3>
                <p className="text-xs text-stone-500">
                  {t.auth.changePasswordDesc}
                </p>
              </div>
            </div>

            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
