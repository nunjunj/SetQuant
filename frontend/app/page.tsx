'use client';

import { useState, useMemo, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import FilterSidebar from '@/components/layout/FilterSidebar';
import TradeFeed from '@/components/feed/TradeFeed';
import CeoLeaderboard from '@/components/leaderboard/CeoLeaderboard';
import StockDetailPanel from '@/components/chart/StockDetailPanel';
import MarketSentimentChart from '@/components/chart/MarketSentimentChart';
import { useUpdates } from '@/hooks/useUpdates';
import { useScores } from '@/hooks/useScores';
import { useStockDetail } from '@/hooks/useStockDetail';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { isBuy } from '@/lib/formatters';
import { DEFAULT_FILTERS, type FilterState } from '@/lib/types';

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedCeoName, setSelectedCeoName] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { filings, isLoading: feedLoading } = useUpdates();
  const { scores, isLoading: scoresLoading } = useScores();
  const { filings: detailFilings } = useStockDetail(selectedSymbol);

  const handleSelect = useCallback((symbol: string, name: string) => {
    if (selectedSymbol === symbol && selectedCeoName === name) {
      setSelectedSymbol(null);
      setSelectedCeoName(null);
    } else {
      setSelectedSymbol(symbol);
      setSelectedCeoName(name);
    }
  }, [selectedSymbol, selectedCeoName]);

  const handleClose = useCallback(() => {
    setSelectedSymbol(null);
    setSelectedCeoName(null);
  }, []);

  const filteredFilings = useMemo(() => {
    let result = filings;

    // Search
    const q = filters.search.toLowerCase();
    if (q) {
      result = result.filter(
        (f) => f.symbol.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
      );
    }

    // Transaction type
    if (filters.transaction !== 'ALL') {
      result = result.filter((f) =>
        filters.transaction === 'BUY' ? isBuy(f.transaction_type) : !isBuy(f.transaction_type),
      );
    }

    // Date range
    if (filters.dateRange !== 'ALL') {
      const cutoff = new Date();
      if (filters.dateRange === 'TODAY') cutoff.setHours(0, 0, 0, 0);
      else if (filters.dateRange === '7D') cutoff.setDate(cutoff.getDate() - 7);
      else if (filters.dateRange === '30D') cutoff.setDate(cutoff.getDate() - 30);
      result = result.filter((f) => new Date(f.trade_date) >= cutoff);
    }

    // Min value
    if (filters.minValue !== 'ALL') {
      const threshold = filters.minValue === '1M' ? 1_000_000 : 10_000_000;
      result = result.filter((f) => f.volume * f.price >= threshold);
    }

    return result;
  }, [filings, filters]);

  const selectedScore = selectedCeoName
    ? scores.find((s) => s.symbol === selectedSymbol && s.name === selectedCeoName)
    : undefined;

  useKeyboardNav({
    items: filteredFilings,
    selectedSymbol,
    onSelect: (symbol) => handleSelect(symbol, filteredFilings.find((f) => f.symbol === symbol)?.name ?? ''),
    onClose: handleClose,
  });

  return (
    <AppShell
      leftSidebar={<FilterSidebar filters={filters} onFiltersChange={setFilters} />}
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
        <MarketSentimentChart />

        <TradeFeed
          filings={filteredFilings}
          isLoading={feedLoading}
          selectedSymbol={selectedSymbol}
          selectedCeoName={selectedCeoName}
          onSelect={handleSelect}
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
