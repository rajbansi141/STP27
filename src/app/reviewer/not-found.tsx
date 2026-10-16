import Link from 'next/link';
import { SearchX, ArrowLeft } from 'lucide-react';

export default function ReviewerNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full p-8 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-100 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-400">
          <SearchX className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
            Candidate Evaluation Not Found
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            The requested candidate application dossier could not be located or may have been unassigned.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Link
            href="/reviewer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Evaluation Queue</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
