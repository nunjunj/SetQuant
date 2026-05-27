import { formatPct } from '@/lib/formatters';

interface ReturnBadgeProps {
  pct: number;
}

export default function ReturnBadge({ pct }: ReturnBadgeProps) {
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        positive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {formatPct(pct)}
    </span>
  );
}
