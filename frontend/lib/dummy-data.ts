import type { SecFiling, CeoScore, CandlestickBar, TradeMarker } from './types';

export const DUMMY_FILINGS: SecFiling[] = [
  {
    id: 1, symbol: 'PTT', name: 'Auttapol Rerkpiboon', position: 'ประธานเจ้าหน้าที่บริหาร',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-20', volume: 500000, price: 32.50,
    transaction_type: 'ซื้อ', filing_date: '2026-02-21',
    tags: ['whale', 'streak'],
  },
  {
    id: 2, symbol: 'KBANK', name: 'Kattiya Indaravijaya', position: 'กรรมการผู้จัดการ',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-19', volume: 200000, price: 138.00,
    transaction_type: 'ขาย', filing_date: '2026-02-20',
  },
  {
    id: 3, symbol: 'ADVANC', name: 'Somchai Lertsutiwong', position: 'Chief Executive Officer',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-19', volume: 150000, price: 218.00,
    transaction_type: 'ซื้อ', filing_date: '2026-02-20',
    tags: ['first-buy', 'whale'],
  },
  {
    id: 4, symbol: 'DELTA', name: 'Chanvit Assavapokee', position: 'กรรมการ',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-18', volume: 80000, price: 52.25,
    transaction_type: 'จำหน่าย', filing_date: '2026-02-19',
  },
  {
    id: 5, symbol: 'BDMS', name: 'Prasert Prasarttong-Osoth', position: 'ประธานกรรมการบริหาร',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-18', volume: 1200000, price: 24.10,
    transaction_type: 'ได้มา', filing_date: '2026-02-19',
    tags: ['whale', 'cluster-buy'],
  },
  {
    id: 6, symbol: 'AOT', name: 'Nitinai Sirismatthakarn', position: 'กรรมการผู้อำนวยการใหญ่',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-17', volume: 300000, price: 61.75,
    transaction_type: 'ซื้อ', filing_date: '2026-02-18',
    tags: ['contrarian'],
  },
  {
    id: 7, symbol: 'GULF', name: 'Sarath Ratanavadi', position: 'Chief Executive Officer',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-17', volume: 2000000, price: 38.50,
    transaction_type: 'ขาย', filing_date: '2026-02-18',
    tags: ['whale', 'exit-signal'],
  },
  {
    id: 8, symbol: 'CPALL', name: 'Korsak Chairasmisak', position: 'ประธานกรรมการบริหาร',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-14', volume: 400000, price: 56.00,
    transaction_type: 'ซื้อ', filing_date: '2026-02-17',
  },
  {
    id: 9, symbol: 'SCB', name: 'Arthid Nanthawithaya', position: 'Chief Executive Officer',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-14', volume: 250000, price: 102.50,
    transaction_type: 'จำหน่าย', filing_date: '2026-02-17',
  },
  {
    id: 10, symbol: 'PTT', name: 'Pairote Chearavanont', position: 'กรรมการ',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-13', volume: 750000, price: 31.75,
    transaction_type: 'ซื้อ', filing_date: '2026-02-14',
    tags: ['cluster-buy', 'streak'],
  },
];

export const DUMMY_CEO_SCORES: CeoScore[] = [
  {
    id: 1, name: 'Prasert Prasarttong-Osoth', symbol: 'BDMS',
    total_bought_thb: 28920000, total_sold_thb: 0,
    buy_return_pct: 34.2, sell_return_pct: 0, combined_return_pct: 34.2,
    stock_1y_pct: 18.5, buy_count: 12, sell_count: 0,
    latest_action: 'BOUGHT', latest_volume_thb: 28920000, latest_price: 24.10,
    net_position_6m: 'LONG', net_volume_thb_6m: 28920000, avg_price_6m: 22.30,
    trade_count_6m: 7, latest_trade_date: '2026-02-18', calculated_at: '2026-02-18T08:00:00Z',
  },
  {
    id: 2, name: 'Somchai Lertsutiwong', symbol: 'ADVANC',
    total_bought_thb: 32700000, total_sold_thb: 5000000,
    buy_return_pct: 28.5, sell_return_pct: 12.3, combined_return_pct: 24.8,
    stock_1y_pct: 22.1, buy_count: 8, sell_count: 2,
    latest_action: 'BOUGHT', latest_volume_thb: 32700000, latest_price: 218.00,
    net_position_6m: 'LONG', net_volume_thb_6m: 27700000, avg_price_6m: 205.50,
    trade_count_6m: 5, latest_trade_date: '2026-02-19', calculated_at: '2026-02-19T08:00:00Z',
  },
  {
    id: 3, name: 'Auttapol Rerkpiboon', symbol: 'PTT',
    total_bought_thb: 40250000, total_sold_thb: 12000000,
    buy_return_pct: 18.7, sell_return_pct: 8.2, combined_return_pct: 15.9,
    stock_1y_pct: 5.3, buy_count: 15, sell_count: 4,
    latest_action: 'BOUGHT', latest_volume_thb: 16250000, latest_price: 32.50,
    net_position_6m: 'LONG', net_volume_thb_6m: 22000000, avg_price_6m: 30.20,
    trade_count_6m: 9, latest_trade_date: '2026-02-20', calculated_at: '2026-02-20T08:00:00Z',
  },
  {
    id: 4, name: 'Nitinai Sirismatthakarn', symbol: 'AOT',
    total_bought_thb: 18525000, total_sold_thb: 0,
    buy_return_pct: 12.4, sell_return_pct: 0, combined_return_pct: 12.4,
    stock_1y_pct: 9.8, buy_count: 6, sell_count: 0,
    latest_action: 'BOUGHT', latest_volume_thb: 18525000, latest_price: 61.75,
    net_position_6m: 'LONG', net_volume_thb_6m: 18525000, avg_price_6m: 59.00,
    trade_count_6m: 4, latest_trade_date: '2026-02-17', calculated_at: '2026-02-17T08:00:00Z',
  },
  {
    id: 5, name: 'Korsak Chairasmisak', symbol: 'CPALL',
    total_bought_thb: 22400000, total_sold_thb: 8000000,
    buy_return_pct: 9.1, sell_return_pct: 5.5, combined_return_pct: 7.8,
    stock_1y_pct: 11.2, buy_count: 9, sell_count: 3,
    latest_action: 'BOUGHT', latest_volume_thb: 22400000, latest_price: 56.00,
    net_position_6m: 'LONG', net_volume_thb_6m: 14400000, avg_price_6m: 53.80,
    trade_count_6m: 6, latest_trade_date: '2026-02-14', calculated_at: '2026-02-14T08:00:00Z',
  },
  {
    id: 6, name: 'Sarath Ratanavadi', symbol: 'GULF',
    total_bought_thb: 10000000, total_sold_thb: 77000000,
    buy_return_pct: 4.2, sell_return_pct: -3.8, combined_return_pct: -1.5,
    stock_1y_pct: -8.4, buy_count: 3, sell_count: 11,
    latest_action: 'SOLD', latest_volume_thb: 77000000, latest_price: 38.50,
    net_position_6m: 'SHORT', net_volume_thb_6m: -67000000, avg_price_6m: 40.10,
    trade_count_6m: 8, latest_trade_date: '2026-02-17', calculated_at: '2026-02-17T08:00:00Z',
  },
  {
    id: 7, name: 'Kattiya Indaravijaya', symbol: 'KBANK',
    total_bought_thb: 5000000, total_sold_thb: 27600000,
    buy_return_pct: 2.1, sell_return_pct: -8.9, combined_return_pct: -5.4,
    stock_1y_pct: -3.2, buy_count: 2, sell_count: 7,
    latest_action: 'SOLD', latest_volume_thb: 27600000, latest_price: 138.00,
    net_position_6m: 'SHORT', net_volume_thb_6m: -22600000, avg_price_6m: 142.00,
    trade_count_6m: 5, latest_trade_date: '2026-02-19', calculated_at: '2026-02-19T08:00:00Z',
  },
];

// Generate random-walk OHLCV candles for a symbol
function generateCandles(symbol: string, basePrice: number, count = 60): CandlestickBar[] {
  const candles: CandlestickBar[] = [];
  let price = basePrice;
  const startDate = new Date('2025-12-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    // skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) { count++; continue; }

    const change = (Math.random() - 0.48) * price * 0.025;
    const open = price;
    price = Math.max(price + change, 1);
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.012);
    const low = Math.min(open, close) * (1 - Math.random() * 0.012);

    candles.push({
      time: date.toISOString().slice(0, 10),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
  }
  return candles;
}

const BASE_PRICES: Record<string, number> = {
  PTT: 31.0, KBANK: 140.0, ADVANC: 210.0, DELTA: 50.0,
  BDMS: 22.5, AOT: 59.0, GULF: 41.0, CPALL: 53.0, SCB: 105.0, SCC: 380.0,
};

export const DUMMY_CANDLES: Record<string, CandlestickBar[]> = Object.fromEntries(
  Object.entries(BASE_PRICES).map(([sym, price]) => [sym, generateCandles(sym, price)])
);

export function getDummyMarkers(symbol: string, filings: SecFiling[]): TradeMarker[] {
  const candles = DUMMY_CANDLES[symbol];
  if (!candles || !candles.length) return [];

  const symbolFilings = filings.filter((f) => f.symbol === symbol).slice(0, 4);
  const markers: TradeMarker[] = [];

  symbolFilings.forEach((filing, i) => {
    // place marker on a candle near index (candles.length - 10 + i*3)
    const idx = Math.min(candles.length - 1, Math.max(0, candles.length - 12 + i * 3));
    const candle = candles[idx];
    const buy = filing.transaction_type.match(/ซื้อ|ได้มา|buy/i);
    markers.push({
      time: candle.time,
      position: buy ? 'belowBar' : 'aboveBar',
      color: buy ? '#10b981' : '#f43f5e',
      shape: buy ? 'arrowUp' : 'arrowDown',
      text: buy ? 'B' : 'S',
    });
  });

  return markers.sort((a, b) => a.time.localeCompare(b.time));
}
