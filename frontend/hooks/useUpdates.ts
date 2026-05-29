import useSWR from 'swr';
import { fetchUpdates } from '@/lib/api';
import { DUMMY_FILINGS } from '@/lib/dummy-data';
import type { InsiderTierFilter, SecFiling } from '@/lib/types';

export function useUpdates(tier: InsiderTierFilter = 'ALL') {
  const { data, error, isLoading } = useSWR<SecFiling[]>(
    ['updates', tier],
    () => fetchUpdates(tier),
    {
      refreshInterval: 60_000,
      fallbackData: DUMMY_FILINGS,
      // Hold the previous tier's rows while the new fetch is in flight so
      // toggling the filter doesn't blink the feed empty.
      keepPreviousData: true,
    },
  );

  return {
    filings: data ?? DUMMY_FILINGS,
    isLoading,
    error,
  };
}
