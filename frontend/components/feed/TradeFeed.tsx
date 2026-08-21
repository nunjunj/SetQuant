'use client';

import TradeRow from './TradeRow';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { formatDate, formatTHB, toDateKey } from '@/lib/formatters';
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
  /** True when the user's sidebar filters are narrowing the feed. */
  hasActiveFilters?: boolean;
  /** Resets every sidebar filter — shown in the filtered-empty state. */
  onClearFilters?: () => void;
}

export default function TradeFeed({
  filings,
  isLoading,
  selectedSymbol,
  selectedCeoName,
  onSelect,
  insightMap,
  derivedTagsMap,
  hasActiveFilters,
  onClearFilters,
}: TradeFeedProps) {
  const totalValue = filings.reduce((sum, f) => sum + f.volume * f.price, 0);

  // Date range across the displayed rows so the header label matches what the
  // user sees. YYYY-MM-DD keys compare lexically and carry no timezone.
  const { minDate, maxDate } = filings.reduce(
    (acc, f) => {
      const key = toDateKey(f.trade_date);
      return {
        minDate: !acc.minDate || key < acc.minDate ? key : acc.minDate,
        maxDate: !acc.maxDate || key > acc.maxDate ? key : acc.maxDate,
      };
    },
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

      {/* Aggregate stats bar — hidden while loading or when there are no rows.
          The feed is a capped "latest N" window, not the full universe, so the
          label says so rather than implying a total count. */}
      {!isLoading && filings.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 mb-1 border-y border-slate-100 bg-slate-50/60">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest tabular-nums">
            Latest {filings.length} filings
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
          {hasActiveFilters ? (
            <>
              <p className="text-sm text-slate-500">No filings match your filters.</p>
              <p className="text-xs text-slate-400 mt-1">
                Try a wider date range, a lower minimum value, or a different tier.
              </p>
              {onClearFilters && (
                <button
                  onClick={onClearFilters}
                  className="mt-3 px-3 py-1.5 rounded-md bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">No recent insider filings.</p>
              <p className="text-xs text-slate-400 mt-1">
                Elite insiders trade rarely — check back after the next filing batch.
              </p>
            </>
          )}
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
