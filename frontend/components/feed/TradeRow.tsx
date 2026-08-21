'use client';

import TransactionBadge from './TransactionBadge';
import TagBadge from './TagBadge';
import InsightChip from './InsightChip';
import { formatTHB, formatVolume, formatDate, formatPrice } from '@/lib/formatters';
import type { FilingInsight } from '@/lib/insight';
import type { SecFiling } from '@/lib/types';

interface TradeRowProps {
  filing: SecFiling;
  isSelected: boolean;
  onClick: () => void;
  insight?: FilingInsight | null;
  /** Tag ids derived from the insider's CeoScore (e.g. accumulator / distributor). */
  derivedTags?: string[];
  /** >1 when this row stands in for a run of consecutive identical filings. */
  count?: number;
  /** Summed value across the run (defaults to this filing's own value). */
  totalValue?: number;
  /** Summed volume across the run. */
  totalVolume?: number;
  /** Newest trade date in the run. */
  latestDate?: string;
}

export default function TradeRow({
  filing,
  isSelected,
  onClick,
  insight,
  derivedTags,
  count = 1,
  totalValue,
  totalVolume,
  latestDate,
}: TradeRowProps) {
  const value = totalValue ?? filing.volume * filing.price;
  const volume = totalVolume ?? filing.volume;
  const date = latestDate ?? filing.trade_date;
  // Volume-weighted average when the row aggregates several filings.
  const price = volume > 0 ? value / volume : filing.price;

  const chips = (
    <>
      {insight && <InsightChip insight={insight} />}
      {derivedTags?.map((t) => <TagBadge key={`d-${t}`} tagId={t} />)}
      {filing.tags?.map((t) => <TagBadge key={t} tagId={t} />)}
    </>
  );

  return (
    <button
      onClick={onClick}
      data-row-key={`${filing.symbol}|${filing.name}`}
      className={`group w-full px-4 py-3 text-left transition-colors cursor-pointer hover:bg-slate-50 border-b border-slate-50 ${
        isSelected ? 'bg-slate-50 border-l-2 border-l-emerald-400' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Symbol chip */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono w-16 justify-center flex-shrink-0">
          {filing.symbol}
        </span>

        {/* Name + position + tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{filing.name}</p>
            {count > 1 && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-semibold tabular-nums"
                title={`${count} consecutive filings collapsed`}
              >
                ×{count}
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-slate-500 truncate">{filing.position}</p>
            {chips}
          </div>
        </div>

        {/* Badge */}
        <TransactionBadge transactionType={filing.transaction_type} />

        {/* Value · volume @ per-share price */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-sm font-medium text-slate-700 tabular-nums">{formatTHB(value)}</p>
          <p className="text-xs text-slate-500 tabular-nums">
            {formatVolume(volume)} @ {formatPrice(price)}
          </p>
        </div>

        {/* Date */}
        <span className="text-xs text-slate-500 flex-shrink-0 hidden md:block tabular-nums">
          {formatDate(date)}
        </span>

        {/* Clickability cue */}
        <svg
          className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Second line — below sm the numeric columns have no room inline, so
          they move under the name instead of disappearing. */}
      <div className="sm:hidden mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-[4.75rem]">
        {chips}
        <span className="text-xs font-medium text-slate-700 tabular-nums">{formatTHB(value)}</span>
        <span className="text-slate-300" aria-hidden>·</span>
        <span className="text-xs text-slate-500 tabular-nums">
          {formatVolume(volume)} @ {formatPrice(price)}
        </span>
        <span className="text-slate-300" aria-hidden>·</span>
        <span className="text-xs text-slate-500 tabular-nums">{formatDate(date)}</span>
      </div>
    </button>
  );
}
