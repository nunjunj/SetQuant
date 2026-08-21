import { SkeletonRow } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {/* Header placeholder */}
      <div className="h-14 border-b border-slate-100 flex items-center gap-3 px-6 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-slate-100 animate-pulse" />
        <div className="h-3.5 w-28 rounded bg-slate-100 animate-pulse" />
        <div className="flex-1" />
        <div className="h-3 w-32 rounded bg-slate-100 animate-pulse hidden sm:block" />
      </div>

      {/* Feed placeholder */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto pt-5">
          <div className="px-4 pb-3">
            <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
