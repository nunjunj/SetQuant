import useSWR from 'swr';
import { fetchStockFilings, IS_DEMO_MODE } from '@/lib/api';
import { DUMMY_FILINGS } from '@/lib/dummy-data';
import type { SecFiling } from '@/lib/types';

export function useStockDetail(symbol: string | null) {
  const { data, error, isLoading } = useSWR<SecFiling[]>(
    symbol ? ['stock', symbol] : null,
    () => fetchStockFilings(symbol!),
    { refreshInterval: 300_000 },
  );

  const fallback =
    IS_DEMO_MODE && symbol ? DUMMY_FILINGS.filter((f) => f.symbol === symbol) : [];

  return {
    filings: data ?? fallback,
    isLoading,
    error,
  };
}
