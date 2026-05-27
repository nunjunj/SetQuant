import useSWR from 'swr';
import { fetchScores } from '@/lib/api';
import { DUMMY_CEO_SCORES } from '@/lib/dummy-data';
import type { CeoScore } from '@/lib/types';

export function useScores() {
  const { data, error, isLoading } = useSWR<CeoScore[]>(
    'scores',
    fetchScores,
    { refreshInterval: 60_000, fallbackData: DUMMY_CEO_SCORES }
  );

  return {
    scores: data ?? DUMMY_CEO_SCORES,
    isLoading,
    error,
  };
}
