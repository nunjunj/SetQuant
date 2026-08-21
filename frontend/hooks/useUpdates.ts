import useSWR from 'swr';
import { fetchUpdates, IS_DEMO_MODE } from '@/lib/api';
import { DUMMY_FILINGS } from '@/lib/dummy-data';
import type { InsiderTierFilter, SecFiling } from '@/lib/types';

export function useUpdates(tier: InsiderTierFilter = 'ALL') {
  const { data, error, isLoading } = useSWR<SecFiling[]>(
    ['updates', tier],
    () => fetchUpdates(tier),
    {
      // Filings land once a day; polling every minute was pure noise.
      refreshInterval: 300_000,
      // Only seed dummies when there is no backend — otherwise a real failure
      // would masquerade as live data.
      fallbackData: IS_DEMO_MODE ? DUMMY_FILINGS : undefined,
      // Hold the previous tier's rows while the new fetch is in flight so
      // toggling the filter doesn't blink the feed empty.
      keepPreviousData: true,
    },
  );

  return {
    filings: data ?? (IS_DEMO_MODE ? DUMMY_FILINGS : []),
    isLoading,
    error,
  };
}
