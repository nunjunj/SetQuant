import { NextResponse } from 'next/server';

const SYMBOLS = [
  { key: '^SET.BK', label: 'SET' },
  { key: 'USDTHB=X', label: 'USD/THB' },
  { key: 'GC=F', label: 'Gold' },
];

// Keyed by label (not position) so a reordering of SYMBOLS can't silently
// pair the wrong fallback with the wrong quote. Values are stale reference
// points only, used when the live fetch fails.
const FALLBACK_BY_LABEL: Record<string, { value: number; changePct: number }> = {
  SET: { value: 1504, changePct: 0 },
  'USD/THB': { value: 33.85, changePct: 0 },
  Gold: { value: 2890, changePct: 0 },
};

async function fetchQuote(key: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(key)}?interval=1d&range=2d`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price: number = meta.regularMarketPrice;
  const prev: number = meta.chartPreviousClose ?? meta.previousClose;
  const changePct = prev ? ((price - prev) / prev) * 100 : 0;
  return { price, changePct };
}

function fallbackFor(label: string) {
  const f = FALLBACK_BY_LABEL[label];
  return { label, value: f.value, changePct: f.changePct, stale: true };
}

export async function GET() {
  try {
    const quotes = await Promise.all(SYMBOLS.map((s) => fetchQuote(s.key)));

    const output = SYMBOLS.map((sym, i) => {
      const q = quotes[i];
      if (!q) return fallbackFor(sym.label);
      return { label: sym.label, value: q.price, changePct: q.changePct, stale: false };
    });

    const allStale = output.every((o) => o.stale);
    return NextResponse.json(output, {
      headers: {
        'Cache-Control': allStale
          ? 'no-store'
          : 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json(
      SYMBOLS.map((sym) => fallbackFor(sym.label)),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
