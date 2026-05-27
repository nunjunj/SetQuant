import useSWR from 'swr';

export interface MarketItem {
  label: string;
  value: number;
  changePct: number;
}

const FALLBACK: MarketItem[] = [
  { label: 'SET', value: 1504, changePct: 0 },
  { label: 'USD/THB', value: 33.85, changePct: 0 },
  { label: 'Gold', value: 2890, changePct: 0 },
];

async function fetcher(url: string): Promise<MarketItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export function useMarketData(): MarketItem[] {
  const { data } = useSWR<MarketItem[]>('/api/market', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300_000,
    fallbackData: FALLBACK,
  });
  return data ?? FALLBACK;
}
