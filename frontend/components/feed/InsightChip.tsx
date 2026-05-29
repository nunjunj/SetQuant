import type { FilingInsight } from '@/lib/insight';

interface InsightChipProps {
  insight: FilingInsight;
}

export default function InsightChip({ insight }: InsightChipProps) {
  const positive = insight.pct >= 0;
  const cls = positive
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-rose-50 text-rose-700';

  return (
    <span
      title={`Leaderboard ${insight.label} combined 1Y return`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 tabular-nums ${cls}`}
    >
      {insight.icon && <span aria-hidden>{insight.icon}</span>}
      <span>{insight.label}</span>
    </span>
  );
}
