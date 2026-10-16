import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md w-full p-8 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl text-center space-y-6">
        <div className="h-20 w-20 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-heading font-black text-2xl">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
            Page Not Found
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            The page you are looking for does not exist or may have been relocated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Home className="h-4 w-4" />
            <span>Return to Homepage</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
