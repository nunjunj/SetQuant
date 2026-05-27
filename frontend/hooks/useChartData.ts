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
  const fallback = symbol ? (DUMMY_CANDLES[symbol] ?? DUMMY_CANDLES['PTT']) : DUMMY_CANDLES['PTT'];

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
