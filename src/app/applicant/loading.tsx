import { Skeleton } from '@/components/ui/skeleton';

export default function ApplicantLoading() {
  return (
    <div className="flex-1 space-y-6 p-6 max-w-5xl mx-auto w-full">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-4 border-b border-stone-200 dark:border-stone-800">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>

      {/* Application Status Banner Skeleton */}
      <div className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Details & Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-4/5 rounded-sm" />
        </div>
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-3/5 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
