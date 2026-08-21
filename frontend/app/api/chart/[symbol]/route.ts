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

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/**
 * Yahoo's authenticated flow: hit fc.yahoo.com to obtain an A3 session
 * cookie, exchange it for a crumb, then request the chart with both.
 * Unauthenticated requests from datacenter IPs (Vercel) get degraded
 * payloads for index symbols; this path returns the full series.
 */
async function fetchWithCrumb(ticker: string): Promise<CandlestickBar[]> {
  try {
    const cookieRes = await fetch('https://fc.yahoo.com/', {
      cache: 'no-store',
      redirect: 'manual',
      headers: { 'User-Agent': UA },
    });
    const setCookie = cookieRes.headers.get('set-cookie') ?? '';
    const cookie = setCookie.split(';')[0];
    if (!cookie) return [];

    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      cache: 'no-store',
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    if (!crumbRes.ok) return [];
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes('<')) return [];

    const nowSec = Math.floor(Date.now() / 1000);
    const period1 = nowSec - 365 * 86400;
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
      `?interval=1d&period1=${period1}&period2=${nowSec}&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    if (!res.ok) return [];
    return parseCandles(await res.json());
  } catch {
    return [];
  }
}

/**
 * Last-resort source: index candles persisted in our own Postgres by the
 * daily pipeline (which fetches Yahoo from an IP it accepts) and served by
 * the Go API. Removes the runtime Yahoo dependency for ^-symbols entirely.
 */
async function fetchFromBackend(symbol: string): Promise<CandlestickBar[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    const res = await fetch(
      `${apiUrl}/api/v1/candles/${encodeURIComponent(symbol)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as CandlestickBar[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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
        // Final tier: Yahoo's cookie+crumb flow (what yfinance does). Index
        // symbols in particular get degraded payloads for anonymous
        // datacenter clients; an A3 cookie + crumb restores the full series.
        const crumbCandles = await fetchWithCrumb(ticker);
        if (crumbCandles.length > candles.length) {
          candles = crumbCandles;
        }
      }

      if (candles.length < MIN_VALID_CANDLES) {
        const dbCandles = await fetchFromBackend(symbol);
        if (dbCandles.length > candles.length) {
          candles = dbCandles;
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
