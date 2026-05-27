import { DUMMY_FILINGS, DUMMY_CEO_SCORES } from './dummy-data';
import type { SecFiling, CeoScore, TradeMarker } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const USE_REAL_API = Boolean(API_URL);

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  if (!USE_REAL_API) return fallback;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

export async function fetchUpdates(): Promise<SecFiling[]> {
  return safeFetch<SecFiling[]>(`${API_URL}/api/v1/updates`, DUMMY_FILINGS);
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
      const buy = f.transaction_type.match(/ซื้อ|ได้มา|buy/i);
      return {
        time: f.trade_date.slice(0, 10),
        position: (buy ? 'belowBar' : 'aboveBar') as TradeMarker['position'],
        color: buy ? '#10b981' : '#f43f5e',
        shape: (buy ? 'arrowUp' : 'arrowDown') as TradeMarker['shape'],
        text: buy ? 'B' : 'S',
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}
