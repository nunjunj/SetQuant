export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-14 h-6 bg-slate-100 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-slate-100 rounded w-2/3" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
      <div className="w-12 h-6 bg-slate-100 rounded-full" />
      <div className="w-16 h-3 bg-slate-100 rounded" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-10 h-10 bg-slate-100 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="w-14 h-6 bg-slate-100 rounded-full" />
    </div>
  );
}
