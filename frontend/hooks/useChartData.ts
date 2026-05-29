import useSWR from 'swr';
import { DUMMY_CANDLES } from '@/lib/dummy-data';
import type { CandlestickBar } from '@/lib/types';

async function fetcher(url: string): Promise<CandlestickBar[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useChartData(symbol: string | null) {
  const hasDummy = symbol ? symbol in DUMMY_CANDLES : false;
  // Fall back to PTT's candles ONLY when the requested symbol has its own
  // dummy entry — otherwise the SET index (symbol `^SET`) and any non-dummy
  // ticker like SPALI/CRC would briefly render PTT's candles while the real
  // /api/chart/<symbol> response is in flight.
  const fallback = hasDummy && symbol ? DUMMY_CANDLES[symbol] : [];

  const { data, isLoading } = useSWR<CandlestickBar[]>(
    symbol ? `/api/chart/${symbol}` : null,
    fetcher,
    { revalidateOnFocus: false, ...(hasDummy ? { fallbackData: fallback } : {}) },
  );

  return {
    candles: data ?? fallback,
    isLoading,
  };
}
