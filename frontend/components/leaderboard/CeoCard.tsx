'use client';

import ReturnBadge from './ReturnBadge';
import type { CeoScore } from '@/lib/types';

interface CeoCardProps {
  score: CeoScore;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function CeoCard({ score, rank, isSelected, onClick }: CeoCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors hover:bg-white border-b border-slate-100 ${
        isSelected ? 'bg-white border-l-2 border-l-emerald-400' : ''
      }`}
    >
      {/* Rank */}
      <span className="text-xs text-slate-300 font-mono w-4 flex-shrink-0">{rank}</span>

      {/* Ticker badge */}
      <span className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold font-mono tracking-wide w-16 flex-shrink-0">
        {score.symbol}
      </span>

      {/* Name + micro stat */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-600 truncate">{score.name}</p>
        <p className="text-[10px] text-slate-400 tabular-nums">
          {score.buy_count + score.sell_count} trade{score.buy_count + score.sell_count !== 1 ? 's' : ''} · 1Y return
        </p>
      </div>

      {/* Return badge */}
      <ReturnBadge pct={score.combined_return_pct} />
    </button>
  );
}
