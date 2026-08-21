import type { SecFiling, CeoScore, CandlestickBar } from './types';

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
    // Paired with id 4 to demo the 📉 2nd sale streak chip (no score row exists
    // for Chanvit, so the rank/conviction priorities don't fire).
    id: 9, symbol: 'DELTA', name: 'Chanvit Assavapokee', position: 'กรรมการ',
    security_type: 'หุ้นสามัญ', trade_date: '2026-02-14', volume: 120000, price: 51.75,
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
    buy_return_pct: 0.342, sell_return_pct: 0, combined_return_pct: 0.342,
    stock_1y_pct: 0.185, buy_count: 12, sell_count: 0,
    latest_action: 'BOUGHT', latest_volume_thb: 28920000, latest_price: 24.10,
    net_position_6m: 'LONG', net_volume_thb_6m: 28920000, avg_price_6m: 22.30,
    trade_count_6m: 7, latest_trade_date: '2026-02-18', calculated_at: '2026-02-18T08:00:00Z',
  },
  {
    id: 2, name: 'Somchai Lertsutiwong', symbol: 'ADVANC',
    total_bought_thb: 32700000, total_sold_thb: 5000000,
    buy_return_pct: 0.285, sell_return_pct: 0.123, combined_return_pct: 0.248,
    stock_1y_pct: 0.221, buy_count: 8, sell_count: 2,
    latest_action: 'BOUGHT', latest_volume_thb: 32700000, latest_price: 218.00,
    net_position_6m: 'LONG', net_volume_thb_6m: 27700000, avg_price_6m: 205.50,
    trade_count_6m: 5, latest_trade_date: '2026-02-19', calculated_at: '2026-02-19T08:00:00Z',
  },
  {
    id: 3, name: 'Auttapol Rerkpiboon', symbol: 'PTT',
    total_bought_thb: 40250000, total_sold_thb: 12000000,
    buy_return_pct: 0.187, sell_return_pct: 0.082, combined_return_pct: 0.159,
    stock_1y_pct: 0.053, buy_count: 15, sell_count: 4,
    latest_action: 'BOUGHT', latest_volume_thb: 16250000, latest_price: 32.50,
    net_position_6m: 'LONG', net_volume_thb_6m: 22000000, avg_price_6m: 30.20,
    trade_count_6m: 9, latest_trade_date: '2026-02-20', calculated_at: '2026-02-20T08:00:00Z',
  },
  {
    id: 4, name: 'Nitinai Sirismatthakarn', symbol: 'AOT',
    total_bought_thb: 18525000, total_sold_thb: 0,
    buy_return_pct: 0.124, sell_return_pct: 0, combined_return_pct: 0.124,
    stock_1y_pct: 0.098, buy_count: 6, sell_count: 0,
    latest_action: 'BOUGHT', latest_volume_thb: 18525000, latest_price: 61.75,
    net_position_6m: 'LONG', net_volume_thb_6m: 18525000, avg_price_6m: 59.00,
    trade_count_6m: 4, latest_trade_date: '2026-02-17', calculated_at: '2026-02-17T08:00:00Z',
  },
  {
    id: 5, name: 'Korsak Chairasmisak', symbol: 'CPALL',
    total_bought_thb: 22400000, total_sold_thb: 8000000,
    buy_return_pct: 0.091, sell_return_pct: 0.055, combined_return_pct: 0.078,
    stock_1y_pct: 0.112, buy_count: 9, sell_count: 3,
    latest_action: 'BOUGHT', latest_volume_thb: 22400000, latest_price: 56.00,
    net_position_6m: 'LONG', net_volume_thb_6m: 14400000, avg_price_6m: 53.80,
    trade_count_6m: 6, latest_trade_date: '2026-02-14', calculated_at: '2026-02-14T08:00:00Z',
  },
  {
    id: 6, name: 'Sarath Ratanavadi', symbol: 'GULF',
    total_bought_thb: 10000000, total_sold_thb: 77000000,
    buy_return_pct: 0.042, sell_return_pct: -0.038, combined_return_pct: -0.015,
    stock_1y_pct: -0.084, buy_count: 3, sell_count: 11,
    latest_action: 'SOLD', latest_volume_thb: 77000000, latest_price: 38.50,
    net_position_6m: 'SHORT', net_volume_thb_6m: -67000000, avg_price_6m: 40.10,
    trade_count_6m: 8, latest_trade_date: '2026-02-17', calculated_at: '2026-02-17T08:00:00Z',
  },
  {
    id: 7, name: 'Kattiya Indaravijaya', symbol: 'KBANK',
    total_bought_thb: 5000000, total_sold_thb: 27600000,
    buy_return_pct: 0.021, sell_return_pct: -0.089, combined_return_pct: -0.054,
    stock_1y_pct: -0.032, buy_count: 2, sell_count: 7,
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
