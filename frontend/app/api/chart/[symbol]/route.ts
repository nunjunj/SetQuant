import { NextRequest, NextResponse } from 'next/server';
import type { CandlestickBar } from '@/lib/types';

const SYMBOL_ALLOWLIST = /^[A-Z0-9&.^-]{1,15}$/;
const MIN_VALID_CANDLES = 30;

function noStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function bangkokDate(unixSeconds: number): string {
  // Yahoo timestamps for Thai dailies are Bangkok-morning UTC instants;
  // format explicitly in the exchange's timezone rather than relying on
  // toISOString (which is only correct for that specific offset window).
  return new Date(unixSeconds * 1000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Bangkok',
  });
}

function parseCandles(data: unknown): CandlestickBar[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chart = (data as any)?.chart?.result?.[0];
  if (!chart) return [];

  const timestamps: number[] = chart.timestamp ?? [];
  const quote = chart.indicators?.quote?.[0] ?? {};
  const opens: number[] = quote.open ?? [];
  const highs: number[] = quote.high ?? [];
  const lows: number[] = quote.low ?? [];
  const closes: number[] = quote.close ?? [];

  const candles: CandlestickBar[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];

    if (o == null || h == null || l == null || c == null) continue;

    candles.push({
      time: bangkokDate(timestamps[i]),
      open: parseFloat(o.toFixed(2)),
      high: parseFloat(h.toFixed(2)),
      low: parseFloat(l.toFixed(2)),
      close: parseFloat(c.toFixed(2)),
    });
  }

  return candles;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  if (!SYMBOL_ALLOWLIST.test(symbol)) {
    return noStore({ error: 'Invalid symbol' }, 400);
  }

  const ticker = `${symbol}.BK`;
  const primaryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;

  try {
    const res = await fetch(primaryUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      const status = res.status === 404 ? 404 : 502;
      const error = status === 404 ? 'Unknown symbol' : 'Failed to fetch chart data';
      return noStore({ error }, status);
    }

    const data = await res.json();
    let candles = parseCandles(data);

    if (candles.length < MIN_VALID_CANDLES) {
      // Yahoo occasionally returns a near-empty payload (e.g. a single
      // candle) for a 1y range request; retry once against query2 with
      // explicit period1/period2 unix bounds before giving up.
      const nowSec = Math.floor(Date.now() / 1000);
      const period1 = nowSec - 365 * 86400;
      const retryUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&period1=${period1}&period2=${nowSec}`;

      const retryRes = await fetch(retryUrl, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const retryCandles = parseCandles(retryData);
        if (retryCandles.length > candles.length) {
          candles = retryCandles;
        }
      }

      if (candles.length < MIN_VALID_CANDLES) {
        return noStore({ error: 'Insufficient chart data' }, 502);
      }
    }

    return NextResponse.json(candles, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return noStore({ error: 'Failed to fetch chart data' }, 502);
  }
}
