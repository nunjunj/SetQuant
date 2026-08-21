'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMarketData, type MarketItem } from '@/hooks/useMarketData';
import { useUpdates } from '@/hooks/useUpdates';
import { daysBetween, formatDate, todayKey, toDateKey } from '@/lib/formatters';

function formatValue(label: string, value: number): string {
  if (label === 'USD/THB') return value.toFixed(2);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function MarketChip({ item }: { item: MarketItem }) {
  const pos = item.changePct >= 0;
  const hasChange = Math.abs(item.changePct) > 0.001;

  return (
    <div className="flex items-center gap-1">
      <span className="text-slate-400 text-xs">{item.label}</span>
      <span className="text-slate-700 text-xs font-medium tabular-nums">
        {formatValue(item.label, item.value)}
      </span>
      {hasChange && (
        <span className={`text-xs tabular-nums ${pos ? 'text-emerald-500' : 'text-rose-500'}`}>
          {pos ? '+' : ''}{item.changePct.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export default function Header() {
  const market = useMarketData();
  // Same SWR key as the page's default feed request — deduped, not a second fetch.
  const { filings } = useUpdates();

  // The date is rendered only after mount: prerendering it at build time both
  // hydration-mismatches (React #418) and paints a stale, months-old date.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      }),
    );
  }, []);

  const newestTradeDate = useMemo(
    () =>
      filings.reduce((max, f) => {
        const key = toDateKey(f.trade_date);
        return key > max ? key : max;
      }, ''),
    [filings],
  );

  // Freshness is judged against the viewer's own calendar day, computed after
  // mount for the same reason as `today`.
  const isFresh = useMemo(() => {
    if (!today || !newestTradeDate) return false;
    const lag = daysBetween(todayKey(), newestTradeDate);
    return Number.isFinite(lag) && lag <= 3;
  }, [today, newestTradeDate]);

  return (
    <header className="h-14 border-b border-slate-100 flex items-center gap-4 px-6 flex-shrink-0 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
          <span className="text-white font-bold text-xs">SQ</span>
        </div>
        <span className="font-semibold text-slate-800 tracking-tight">SetQuant</span>
        <span className="text-slate-300 text-sm hidden sm:inline">·</span>
        <span className="text-slate-400 text-sm hidden sm:inline">Thai Insider Filings</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Market data */}
      <div className="hidden xl:flex items-center gap-4">
        {market.map((item, i) => (
          <div key={item.label} className="flex items-center gap-4">
            {i > 0 && <span className="text-slate-200 select-none">·</span>}
            <MarketChip item={item} />
          </div>
        ))}
      </div>

      {/* Date + data freshness */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-slate-400 text-sm hidden sm:block tabular-nums">
          {today ?? '\u00A0'}
        </span>
        {newestTradeDate && (
          <div className="flex items-center gap-1.5" title={`Newest filing trade date: ${formatDate(newestTradeDate)}`}>
            <span
              className={`w-2 h-2 rounded-full ${isFresh ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <span className="text-xs text-slate-400 tabular-nums">
              Updated {formatDate(newestTradeDate)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
