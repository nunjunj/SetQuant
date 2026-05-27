import { NextResponse } from 'next/server';

const SYMBOLS = [
  { key: '^SET.BK', label: 'SET' },
  { key: 'USDTHB=X', label: 'USD/THB' },
  { key: 'GC=F', label: 'Gold' },
];

const FALLBACK = [
  { label: 'SET', value: 1504, changePct: 0 },
  { label: 'USD/THB', value: 33.85, changePct: 0 },
  { label: 'Gold', value: 2890, changePct: 0 },
];

async function fetchQuote(key: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(key)}?interval=1d&range=2d`;
  const res = await fetch(url, {
    next: { revalidate: 300 },
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

export async function GET() {
  try {
    const quotes = await Promise.all(SYMBOLS.map((s) => fetchQuote(s.key)));

    const output = SYMBOLS.map((sym, i) => {
      const q = quotes[i];
      if (!q) return FALLBACK[i];
      return { label: sym.label, value: q.price, changePct: q.changePct };
    });

    return NextResponse.json(output);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
