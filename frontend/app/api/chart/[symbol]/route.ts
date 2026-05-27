import { NextRequest, NextResponse } from 'next/server';
import type { CandlestickBar } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const ticker = `${symbol}.BK`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }

    const data = await res.json();
    const chart = data?.chart?.result?.[0];

    if (!chart) {
      return NextResponse.json({ error: 'No data' }, { status: 500 });
    }

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

      const date = new Date(timestamps[i] * 1000);
      const time = date.toISOString().slice(0, 10);

      candles.push({
        time,
        open: parseFloat(o.toFixed(2)),
        high: parseFloat(h.toFixed(2)),
        low: parseFloat(l.toFixed(2)),
        close: parseFloat(c.toFixed(2)),
      });
    }

    return NextResponse.json(candles);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
