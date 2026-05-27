'use client';

import CeoCard from './CeoCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { CeoScore } from '@/lib/types';

interface CeoLeaderboardProps {
  scores: CeoScore[];
  isLoading?: boolean;
  selectedSymbol: string | null;
  selectedCeoName: string | null;
  onSelect: (symbol: string, name: string) => void;
}

export default function CeoLeaderboard({
  scores,
  isLoading,
  selectedSymbol,
  selectedCeoName,
  onSelect,
}: CeoLeaderboardProps) {
  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Top 1Y Performance
        </h2>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Mark-to-market return on each exec&apos;s own trades
        </p>
      </div>

      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        : scores.slice(0, 50).map((score, i) => (
            <CeoCard
              key={score.id}
              score={score}
              rank={i + 1}
              isSelected={selectedSymbol === score.symbol && selectedCeoName === score.name}
              onClick={() => onSelect(score.symbol, score.name)}
            />
          ))}
    </div>
  );
}
