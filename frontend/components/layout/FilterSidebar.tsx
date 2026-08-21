'use client';

import { useId } from 'react';
import type { FilterState, TransactionFilter, DateRangeFilter, ValueFilter, InsiderTierFilter } from '@/lib/types';

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The filter controls themselves, free of any layout chrome — rendered both in
 * the xl+ sidebar and inside the mobile filter drawer.
 */
export function FilterPanel({ filters, onFiltersChange }: FilterSidebarProps) {
  const searchId = useId();

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-4 pt-5 pb-4">
        <label htmlFor={searchId} className="sr-only">
          Search filings by symbol or insider name
        </label>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden
          >
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            id={searchId}
            type="text"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Symbol or name…"
            className="w-full h-9 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Transaction Type */}
      <div className="px-4 py-4 space-y-2.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Transaction</p>
        <PillGroup<TransactionFilter>
          label="Transaction type"
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'BUY', label: 'Buy' },
            { value: 'SELL', label: 'Sell' },
          ]}
          value={filters.transaction}
          onChange={(v) => set('transaction', v)}
        />
      </div>

      <div className="border-t border-slate-100" />

      {/* Insider Tier — filters to filings by top-ranked insiders only */}
      <div className="px-4 py-4 space-y-2.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Insider Tier</p>
        <PillGroup<InsiderTierFilter>
          label="Insider tier"
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'TOP_50', label: 'Top 50' },
            { value: 'TOP_10', label: 'Top 10' },
          ]}
          value={filters.insiderTier}
          onChange={(v) => set('insiderTier', v)}
        />
      </div>

      <div className="border-t border-slate-100" />

      {/* Date Range */}
      <div className="px-4 py-4 space-y-2.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date Range</p>
        <PillGroup<DateRangeFilter>
          label="Date range"
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'TODAY', label: 'Today' },
            { value: '7D', label: '7 Days' },
            { value: '30D', label: '30 Days' },
          ]}
          value={filters.dateRange}
          onChange={(v) => set('dateRange', v)}
        />
      </div>

      <div className="border-t border-slate-100" />

      {/* Min Value */}
      <div className="px-4 py-4 space-y-2.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Min Value</p>
        <PillGroup<ValueFilter>
          label="Minimum transaction value"
          options={[
            { value: 'ALL', label: 'All' },
            { value: '1M', label: '>฿1M' },
            { value: '10M', label: '>฿10M' },
          ]}
          value={filters.minValue}
          onChange={(v) => set('minValue', v)}
        />
      </div>
    </div>
  );
}

export default function FilterSidebar(props: FilterSidebarProps) {
  return (
    <aside
      aria-label="Filters"
      className="w-56 border-r border-slate-100 bg-white overflow-y-auto flex-shrink-0 hidden xl:block"
    >
      <FilterPanel {...props} />
    </aside>
  );
}
