'use client';

import { useState, useMemo, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import FilterSidebar, { FilterPanel } from '@/components/layout/FilterSidebar';
import TradeFeed from '@/components/feed/TradeFeed';
import CeoLeaderboard from '@/components/leaderboard/CeoLeaderboard';
import StockDetailPanel from '@/components/chart/StockDetailPanel';
import MarketSentimentChart from '@/components/chart/MarketSentimentChart';
import { useUpdates } from '@/hooks/useUpdates';
import { useScores } from '@/hooks/useScores';
import { useStockDetail } from '@/hooks/useStockDetail';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { IS_DEMO_MODE } from '@/lib/api';
import { getTxSide, shiftDateKey, toDateKey } from '@/lib/formatters';
import { buildDerivedTags, buildInsights } from '@/lib/insight';
import { DEFAULT_FILTERS, type FilterState } from '@/lib/types';

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedCeoName, setSelectedCeoName] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { filings: rawFilings, isLoading: feedLoading, error: feedError } = useUpdates(filters.insiderTier);
  const { scores, isLoading: scoresLoading, error: scoresError } = useScores();
  const { filings: detailFilings } = useStockDetail(selectedSymbol);

  // Rows with a zero/absent volume or price carry no economic information and
  // would poison the aggregate totals — drop them before anything else.
  const filings = useMemo(
    () => rawFilings.filter((f) => f.volume > 0 && f.price > 0),
    [rawFilings],
  );

  const handleSelect = useCallback((symbol: string, name: string) => {
    if (selectedSymbol === symbol && selectedCeoName === name) {
      setSelectedSymbol(null);
      setSelectedCeoName(null);
    } else {
      setSelectedSymbol(symbol);
      setSelectedCeoName(name);
    }
  }, [selectedSymbol, selectedCeoName]);

  // Keyboard navigation must never toggle the panel shut when it lands on the
  // currently selected row — it selects outright.
  const handleKeyboardSelect = useCallback((symbol: string, name: string) => {
    setSelectedSymbol(symbol);
    setSelectedCeoName(name);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedSymbol(null);
    setSelectedCeoName(null);
  }, []);

  const handleClearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  // Date filters are anchored to the newest trade date actually present in the
  // data, not the browser clock: the dataset refreshes daily and routinely lags
  // "today", which would otherwise empty the feed. All comparisons are on
  // YYYY-MM-DD prefixes, so no timezone can shift a row across a boundary.
  const latestDateKey = useMemo(
    () => filings.reduce((max, f) => {
      const key = toDateKey(f.trade_date);
      return key > max ? key : max;
    }, ''),
    [filings],
  );

  const filteredFilings = useMemo(() => {
    let result = filings;

    // Search
    const q = filters.search.toLowerCase();
    if (q) {
      result = result.filter(
        (f) => f.symbol.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
      );
    }

    // Transaction type — transfers are neither buy nor sell, so they are
    // excluded from both sides and only visible under "All".
    if (filters.transaction !== 'ALL') {
      result = result.filter((f) => getTxSide(f.transaction_type) === filters.transaction);
    }

    // Date range, relative to the newest filing in the feed
    if (filters.dateRange !== 'ALL' && latestDateKey) {
      const days = filters.dateRange === 'TODAY' ? 0 : filters.dateRange === '7D' ? 7 : 30;
      const cutoff = days === 0 ? latestDateKey : shiftDateKey(latestDateKey, -days);
      result = result.filter((f) => toDateKey(f.trade_date) >= cutoff);
    }

    // Min value
    if (filters.minValue !== 'ALL') {
      const threshold = filters.minValue === '1M' ? 1_000_000 : 10_000_000;
      result = result.filter((f) => f.volume * f.price >= threshold);
    }

    // Insider tier is applied server-side via useUpdates(filters.insiderTier),
    // so filteredFilings only handles client-only criteria (search, transaction,
    // date range, min value).

    return result;
  }, [filings, filters, latestDateKey]);

  // One count for the mobile Filters badge; `hasActiveFilters` is the same
  // question asked as a boolean.
  const activeFilterCount =
    (filters.search.trim() !== '' ? 1 : 0) +
    (filters.transaction !== DEFAULT_FILTERS.transaction ? 1 : 0) +
    (filters.dateRange !== DEFAULT_FILTERS.dateRange ? 1 : 0) +
    (filters.minValue !== DEFAULT_FILTERS.minValue ? 1 : 0) +
    (filters.insiderTier !== DEFAULT_FILTERS.insiderTier ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Computed off the *unfiltered* feed so dedup decisions ("show on newest
  // filing per insider") don't shift when the user toggles sidebar filters.
  const insightMap = useMemo(() => buildInsights(filings, scores), [filings, scores]);
  const derivedTagsMap = useMemo(() => buildDerivedTags(filings, scores), [filings, scores]);

  const selectedScore = selectedCeoName
    ? scores.find((s) => s.symbol === selectedSymbol && s.name === selectedCeoName)
    : undefined;

  useKeyboardNav({
    items: filteredFilings,
    selectedSymbol,
    selectedCeoName,
    onSelect: handleKeyboardSelect,
    onClose: handleClose,
  });

  // In demo mode there is no live source to fail, so never claim one did.
  const showError = !IS_DEMO_MODE && Boolean(feedError || scoresError);

  return (
    <AppShell
      leftSidebar={<FilterSidebar filters={filters} onFiltersChange={setFilters} />}
      mobileFilters={<FilterPanel filters={filters} onFiltersChange={setFilters} />}
      activeFilterCount={activeFilterCount}
      sidebar={
        <CeoLeaderboard
          scores={scores}
          isLoading={scoresLoading}
          selectedSymbol={selectedSymbol}
          selectedCeoName={selectedCeoName}
          onSelect={handleSelect}
        />
      }
    >
      {/* Scroll layer for the page content — sits behind the detail panel. */}
      <div className="absolute inset-0 overflow-y-auto">
        {showError && (
          <div
            role="status"
            className="flex items-center gap-2 px-4 py-2 border-b border-amber-100 bg-amber-50/70"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-800">Live data unavailable — retrying</span>
          </div>
        )}

        <MarketSentimentChart />

        <TradeFeed
          filings={filteredFilings}
          isLoading={feedLoading}
          selectedSymbol={selectedSymbol}
          selectedCeoName={selectedCeoName}
          onSelect={handleSelect}
          insightMap={insightMap}
          derivedTagsMap={derivedTagsMap}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      </div>

      {selectedSymbol && (
        <StockDetailPanel
          symbol={selectedSymbol}
          filings={detailFilings}
          ceoName={selectedCeoName ?? undefined}
          ceoScore={selectedScore}
          onClose={handleClose}
        />
      )}
    </AppShell>
  );
}
