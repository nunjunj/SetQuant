import useSWR from 'swr';
import { fetchScores, IS_DEMO_MODE } from '@/lib/api';
import { DUMMY_CEO_SCORES } from '@/lib/dummy-data';
import type { CeoScore } from '@/lib/types';

export function useScores() {
  const { data, error, isLoading } = useSWR<CeoScore[]>('scores', fetchScores, {
    refreshInterval: 300_000,
    fallbackData: IS_DEMO_MODE ? DUMMY_CEO_SCORES : undefined,
  });

  return {
    scores: data ?? (IS_DEMO_MODE ? DUMMY_CEO_SCORES : []),
    isLoading,
    error,
  };
}
