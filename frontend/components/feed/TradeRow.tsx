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
}

export default function TradeRow({ filing, isSelected, onClick, insight, derivedTags }: TradeRowProps) {
  const value = filing.volume * filing.price;

  return (
    <button
      onClick={onClick}
      data-row-key={`${filing.symbol}|${filing.name}`}
      className={`group w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-slate-50 border-b border-slate-50 ${
        isSelected ? 'bg-slate-50 border-l-2 border-l-emerald-400' : ''
      }`}
    >
      {/* Symbol chip */}
      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono w-16 justify-center flex-shrink-0">
        {filing.symbol}
      </span>

      {/* Name + position + tags */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{filing.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs text-slate-400 truncate">{filing.position}</p>
          {insight && <InsightChip insight={insight} />}
          {derivedTags?.map((t) => <TagBadge key={`d-${t}`} tagId={t} />)}
          {filing.tags?.map((t) => <TagBadge key={t} tagId={t} />)}
        </div>
      </div>

      {/* Badge */}
      <TransactionBadge transactionType={filing.transaction_type} />

      {/* Value · volume @ per-share price */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-sm font-medium text-slate-700 tabular-nums">{formatTHB(value)}</p>
        <p className="text-xs text-slate-400 tabular-nums">
          {formatVolume(filing.volume)} @ {formatPrice(filing.price)}
        </p>
      </div>

      {/* Date */}
      <span className="text-xs text-slate-400 flex-shrink-0 hidden md:block tabular-nums">
        {formatDate(filing.trade_date)}
      </span>

      {/* Clickability cue */}
      <svg
        className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
