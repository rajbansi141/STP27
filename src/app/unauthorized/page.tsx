import Link from 'next/link';
import { getServerTranslations } from '@/lib/i18n/server';
import { ShieldAlert } from 'lucide-react';

export default async function UnauthorizedPage() {
  const { locale } = await getServerTranslations();

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-stone-50/50 dark:bg-stone-950/50">
      <div className="max-w-md w-full text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-xl space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold font-heading text-stone-900 dark:text-stone-100">
          {locale === 'ne' ? 'पहुँच अस्वीकृत (४०३)' : 'Access Restricted (403)'}
        </h1>

        <p className="text-sm text-stone-600 dark:text-stone-400">
          {locale === 'ne'
            ? 'यो पृष्ठ हेर्न तपाईंसँग आवश्यक भूमिका वा अनुमति छैन। यदि यो त्रुटि हो भने कृपया प्रशासकलाई सम्पर्क गर्नुहोस्।'
            : 'You do not have the required role or permissions to access this page. Please sign in with an authorized account or return to your dashboard.'}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-800 transition-colors shadow-xs"
          >
            {locale === 'ne' ? 'ड्यासबोर्डमा जानुहोस्' : 'Go to Dashboard'}
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-sm hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            {locale === 'ne' ? 'अर्को खाताबाट लगइन' : 'Sign in as different user'}
          </Link>
        </div>
      </div>
    </div>
  );
}
