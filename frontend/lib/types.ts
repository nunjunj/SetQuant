export interface SecFiling {
  id: number;
  symbol: string;
  name: string;
  position: string;
  security_type: string;
  trade_date: string;
  volume: number;
  price: number;
  transaction_type: string;
  filing_date: string;
  tags?: string[];
}

export type TransactionFilter = 'ALL' | 'BUY' | 'SELL';
export type DateRangeFilter = 'ALL' | 'TODAY' | '7D' | '30D';
export type ValueFilter = 'ALL' | '1M' | '10M';
export type InsiderTierFilter = 'ALL' | 'TOP_50' | 'TOP_10';

export interface FilterState {
  search: string;
  transaction: TransactionFilter;
  dateRange: DateRangeFilter;
  minValue: ValueFilter;
  insiderTier: InsiderTierFilter;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  transaction: 'ALL',
  dateRange: 'ALL',
  minValue: 'ALL',
  insiderTier: 'ALL',
};

export interface CeoScore {
  id: number;
  name: string;
  symbol: string;
  total_bought_thb: number;
  total_sold_thb: number;
  buy_return_pct: number;
  sell_return_pct: number;
  combined_return_pct: number;
  stock_1y_pct: number;
  buy_count: number;
  sell_count: number;
  /** Backend may add new values (e.g. TRANSFER) — consumers normalise, never
   *  assume exhaustiveness. */
  latest_action: 'BOUGHT' | 'SOLD' | 'TRANSFER' | (string & {});
  latest_volume_thb: number;
  latest_price: number;
  net_position_6m: 'LONG' | 'SHORT' | 'NEUTRAL';
  net_volume_thb_6m: number;
  avg_price_6m: number;
  trade_count_6m: number;
  latest_trade_date: string;
  calculated_at: string;
}

export interface CandlestickBar {
  time: string; // 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradeMarker {
  time: string;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text: string;
  size?: number;
}
