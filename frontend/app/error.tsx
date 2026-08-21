'use client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center bg-white">
      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
        <span className="text-rose-500 text-lg font-semibold" aria-hidden>!</span>
      </div>
      <div className="space-y-1">
        <h1 className="text-base font-semibold text-slate-800">Something went wrong</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          The page failed to load. This is usually temporary — try again.
        </p>
        {error.digest && (
          <p className="text-[10px] text-slate-400 font-mono tabular-nums pt-1">{error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-md bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
