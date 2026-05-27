const BUY_PATTERNS = /ซื้อ|ได้มา|buy/i;
const SELL_PATTERNS = /ขาย|จำหน่าย|sell/i;

export function isBuy(transactionType: string): boolean {
  if (SELL_PATTERNS.test(transactionType)) return false;
  return BUY_PATTERNS.test(transactionType);
}

export function formatTHB(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `฿${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `฿${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `฿${(value / 1_000).toFixed(1)}K`;
  }
  return `฿${value.toFixed(2)}`;
}

// values are ratios (0.59 = 59%)
export function formatPct(value: number): string {
  const pct = value * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
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

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
