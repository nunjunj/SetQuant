'use client';

import TradeRow from './TradeRow';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { formatDate, formatTHB } from '@/lib/formatters';
import type { FilingInsight } from '@/lib/insight';
import type { SecFiling } from '@/lib/types';

interface TradeFeedProps {
  filings: SecFiling[];
  isLoading?: boolean;
  selectedSymbol: string | null;
  selectedCeoName: string | null;
  onSelect: (symbol: string, name: string) => void;
  insightMap?: Map<number, FilingInsight | null>;
  derivedTagsMap?: Map<number, string[]>;
}

export default function TradeFeed({ filings, isLoading, selectedSymbol, selectedCeoName, onSelect, insightMap, derivedTagsMap }: TradeFeedProps) {
  const totalValue = filings.reduce((sum, f) => sum + f.volume * f.price, 0);

  // Date range across the displayed rows so the header label matches what the
  // user sees. ISO YYYY-MM-DD strings compare lexically — `f.trade_date` is
  // RFC3339 from the backend, which keeps the date prefix sortable.
  const { minDate, maxDate } = filings.reduce(
    (acc, f) => ({
      minDate: !acc.minDate || f.trade_date < acc.minDate ? f.trade_date : acc.minDate,
      maxDate: !acc.maxDate || f.trade_date > acc.maxDate ? f.trade_date : acc.maxDate,
    }),
    { minDate: '', maxDate: '' },
  );

  const isEmpty = !isLoading && filings.length === 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Section heading */}
      <div className="px-4 pt-5 pb-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Recent Insider Filings
        </h2>
      </div>

      {/* Aggregate stats bar — hidden while loading or when there are no rows */}
      {!isLoading && filings.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 mb-1 border-y border-slate-100 bg-slate-50/60">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest tabular-nums">
            {filings.length} filings
          </span>
          <span className="text-slate-200 select-none">|</span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {formatDate(minDate)} – {formatDate(maxDate)}
          </span>
          <span className="text-slate-200 select-none">|</span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {formatTHB(totalValue)} total
          </span>
        </div>
      )}

      {isLoading ? (
        Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
      ) : isEmpty ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-slate-500">No recent filings from top-tier insiders.</p>
          <p className="text-xs text-slate-400 mt-1">Elite insiders trade rarely. Try widening the tier filter.</p>
        </div>
      ) : (
        filings.map((filing) => (
          <TradeRow
            key={filing.id}
            filing={filing}
            isSelected={selectedSymbol === filing.symbol && selectedCeoName === filing.name}
            onClick={() => onSelect(filing.symbol, filing.name)}
            insight={insightMap?.get(filing.id) ?? null}
            derivedTags={derivedTagsMap?.get(filing.id)}
          />
        ))
      )}
    </div>
  );
}
