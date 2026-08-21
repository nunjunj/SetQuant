import { DUMMY_FILINGS, DUMMY_CEO_SCORES } from './dummy-data';
import { getTxSide, toDateKey } from './formatters';
import type { SecFiling, CeoScore, TradeMarker, InsiderTierFilter } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * True when no backend is configured. In demo mode every fetcher resolves to
 * the bundled dummy dataset; in real mode failures throw so SWR can surface an
 * error instead of quietly showing fake data as if it were live.
 */
export const IS_DEMO_MODE = !API_URL;

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  if (IS_DEMO_MODE) return fallback;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchUpdates(tier: InsiderTierFilter = 'ALL'): Promise<SecFiling[]> {
  // Omit the querystring on ALL so we keep hitting the same Next.js cache key
  // the previous build used — avoids cold-cache after deploy.
  const qs = tier === 'ALL' ? '' : `?tier=${tier}`;
  return safeFetch<SecFiling[]>(`${API_URL}/api/v1/updates${qs}`, DUMMY_FILINGS);
}

export async function fetchScores(): Promise<CeoScore[]> {
  return safeFetch<CeoScore[]>(`${API_URL}/api/v1/scores`, DUMMY_CEO_SCORES);
}

export async function fetchStockFilings(symbol: string): Promise<SecFiling[]> {
  const fallback = DUMMY_FILINGS.filter((f) => f.symbol === symbol);
  return safeFetch<SecFiling[]>(`${API_URL}/api/v1/stock/${symbol}`, fallback);
}

export function getMarkers(symbol: string, filings: SecFiling[]): TradeMarker[] {
  return filings
    .filter((f) => f.symbol === symbol)
    .map((f) => {
      const side = getTxSide(f.transaction_type);
      const buy = side === 'BUY';
      const other = side === 'OTHER';
      return {
        time: toDateKey(f.trade_date),
        position: (buy ? 'belowBar' : 'aboveBar') as TradeMarker['position'],
        color: other ? '#94a3b8' : buy ? '#10b981' : '#f43f5e',
        shape: (other ? 'circle' : buy ? 'arrowUp' : 'arrowDown') as TradeMarker['shape'],
        text: other ? 'T' : buy ? 'B' : 'S',
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}
