'use client';

import TradeRow from './TradeRow';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { formatTHB } from '@/lib/formatters';
import type { SecFiling } from '@/lib/types';

interface TradeFeedProps {
  filings: SecFiling[];
  isLoading?: boolean;
  selectedSymbol: string | null;
  selectedCeoName: string | null;
  onSelect: (symbol: string, name: string) => void;
}

export default function TradeFeed({ filings, isLoading, selectedSymbol, selectedCeoName, onSelect }: TradeFeedProps) {
  const totalValue = filings.reduce((sum, f) => sum + f.volume * f.price, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Section heading */}
      <div className="px-4 pt-5 pb-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Recent Insider Filings
        </h2>
      </div>

      {/* Aggregate stats bar */}
      {!isLoading && (
        <div className="flex items-center gap-3 px-4 py-1.5 mb-1 border-y border-slate-100 bg-slate-50/60">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest tabular-nums">
            {filings.length} filings
          </span>
          <span className="text-slate-200 select-none">|</span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {formatTHB(totalValue)} total value
          </span>
        </div>
      )}

      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        : filings.map((filing) => (
            <TradeRow
              key={filing.id}
              filing={filing}
              isSelected={selectedSymbol === filing.symbol && selectedCeoName === filing.name}
              onClick={() => onSelect(filing.symbol, filing.name)}
            />
          ))}
    </div>
  );
}
