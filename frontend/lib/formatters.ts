const BUY_PATTERNS = /ซื้อ|ได้มา|buy/i;
const SELL_PATTERNS = /ขาย|จำหน่าย|sell/i;
// 'โอน' also matches 'รับโอน' (transfer in), so a single test covers both.
const TRANSFER_PATTERNS = /โอน/;

export type TxSide = 'BUY' | 'SELL' | 'OTHER';

/**
 * Classify a Thai-language transaction_type into BUY / SELL / OTHER.
 *
 * Transfers (โอน / รับโอน) are neither a buy nor a sell — they move shares
 * without a market transaction — so they classify as OTHER. If a string
 * mentions a transfer *and* a buy/sell verb, the buy/sell reading wins.
 */
export function getTxSide(transactionType: string): TxSide {
  const t = transactionType ?? '';
  const buy = BUY_PATTERNS.test(t);
  const sell = SELL_PATTERNS.test(t);

  if (TRANSFER_PATTERNS.test(t) && !buy && !sell) return 'OTHER';
  if (buy) return 'BUY';
  if (sell) return 'SELL';
  return 'OTHER';
}

/** @deprecated thin wrapper kept for compatibility — prefer getTxSide. */
export function isBuy(transactionType: string): boolean {
  return getTxSide(transactionType) === 'BUY';
}

export function formatTHB(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}฿${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}฿${(abs / 1_000).toFixed(1)}K`;
  return `${sign}฿${abs.toFixed(2)}`;
}

// values are ratios (0.59 = 59%)
export function formatPct(value: number): string {
  // Round first, then derive the sign, so -0.0004 renders "0.0%" not "-0.0%".
  const rounded = Number((value * 100).toFixed(1));
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}%`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 10_000) return `${(volume / 1_000).toFixed(0)}K`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toLocaleString();
}

export function formatPrice(price: number): string {
  return `฿${price.toFixed(2)}`;
}

/**
 * Extract the YYYY-MM-DD calendar prefix from an API date string.
 * The backend sends Bangkok calendar dates as "YYYY-MM-DDT00:00:00Z"; parsing
 * them with `new Date()` and rendering in local time shifts a day for viewers
 * west of UTC, so we only ever work with the string prefix.
 */
export function toDateKey(dateStr: string): string {
  return (dateStr ?? '').slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Timezone-safe "02 Mar 2026" from a YYYY-MM-DD(...) string. */
export function formatDate(dateStr: string): string {
  const key = toDateKey(dateStr);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return dateStr ?? '';
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1] ?? mo;
  return `${d} ${month} ${y}`;
}

/** Today's calendar date in the viewer's timezone as YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days between two YYYY-MM-DD keys (a - b), timezone-independent. */
export function daysBetween(a: string, b: string): number {
  const pa = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  const pb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
  if (!pa || !pb) return NaN;
  const ua = Date.UTC(Number(pa[1]), Number(pa[2]) - 1, Number(pa[3]));
  const ub = Date.UTC(Number(pb[1]), Number(pb[2]) - 1, Number(pb[3]));
  return Math.round((ua - ub) / 86_400_000);
}

/** Shift a YYYY-MM-DD key by N days, returning a YYYY-MM-DD key. */
export function shiftDateKey(key: string, days: number): string {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!p) return key;
  const d = new Date(Date.UTC(Number(p[1]), Number(p[2]) - 1, Number(p[3])));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
