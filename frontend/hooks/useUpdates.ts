import useSWR from 'swr';
import { fetchUpdates } from '@/lib/api';
import { DUMMY_FILINGS } from '@/lib/dummy-data';
import type { SecFiling } from '@/lib/types';

export function useUpdates() {
  const { data, error, isLoading } = useSWR<SecFiling[]>(
    'updates',
    fetchUpdates,
    { refreshInterval: 60_000, fallbackData: DUMMY_FILINGS }
  );

  return {
    filings: data ?? DUMMY_FILINGS,
    isLoading,
    error,
  };
}
