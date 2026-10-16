import Link from 'next/link';
import { SearchX, ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function AdminNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full p-8 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
          <SearchX className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
            Admin Resource Not Found
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            The requested candidate dossier, cohort record, user profile, or configuration view could not be found.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Admin Dashboard</span>
          </Link>
          <Link
            href="/admin/candidates"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Candidates List</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
