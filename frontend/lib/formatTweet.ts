import type { CeoScore } from './types';

/** Normalised latest-action kinds. Anything the backend sends that we don't
 *  recognise degrades to 'OTHER' rather than rendering a raw enum at the user. */
export type LatestActionKind = 'BOUGHT' | 'SOLD' | 'TRANSFER' | 'OTHER';

export type Tone = 'buy' | 'sell' | 'neutral';

export interface ReturnStat {
  pct: number;
  count: number;
}

export interface LatestActionInfo {
  kind: LatestActionKind;
  /** "Latest Action" / "Today's Action" */
  label: string;
  /** Human verb: Bought / Sold / Transferred / Filed */
  verb: string;
  tone: Tone;
  valueThb: number;
  price: number;
  dateLabel: string;
}

export interface NetPositionInfo {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  tone: Tone;
  /** Always positive — the direction already carries the sign. */
  valueThb: number;
  avgPrice: number;
  tradeCount: number;
}

export interface TweetContent {
  header: string;
  tone: Tone;
  /** Blended follower ROI over 1Y (fraction, e.g. 0.12 = +12%). */
  followerRoiPct: number;
  buyStat: ReturnStat | null;
  sellStat: ReturnStat | null;
  stock1yPct: number;
  latest: LatestActionInfo;
  net6m: NetPositionInfo | null;
  disclaimerTh: string;
  disclaimerEn: string;
}

export function formatTweetTHB(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B THB`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M THB`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K THB`;
  return `${sign}${abs.toFixed(0)} THB`;
}

export function formatTweetPct(v: number): string {
  const p = v * 100;
  if (!Number.isFinite(p)) return '—';
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

/** "1 buy" / "3 buys" — the old copy said "1 buys". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeAction(raw: string | undefined | null): LatestActionKind {
  const v = (raw ?? '').toUpperCase();
  if (v === 'BOUGHT' || v === 'BUY') return 'BOUGHT';
  if (v === 'SOLD' || v === 'SELL') return 'SOLD';
  if (v === 'TRANSFER' || v === 'TRANSFERRED') return 'TRANSFER';
  return 'OTHER';
}

const ACTION_VERB: Record<LatestActionKind, string> = {
  BOUGHT: 'Bought',
  SOLD: 'Sold',
  TRANSFER: 'Transferred',
  OTHER: 'Filed',
};

const ACTION_TONE: Record<LatestActionKind, Tone> = {
  BOUGHT: 'buy',
  SOLD: 'sell',
  TRANSFER: 'neutral',
  OTHER: 'neutral',
};

function buildLatest(s: CeoScore): LatestActionInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dateLabel = '—';
  let isToday = false;
  if (s.latest_trade_date) {
    const tradeDay = new Date(s.latest_trade_date);
    if (!Number.isNaN(tradeDay.getTime())) {
      tradeDay.setHours(0, 0, 0, 0);
      isToday = tradeDay.getTime() === today.getTime();
      dateLabel = tradeDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  const kind = normalizeAction(s.latest_action);

  return {
    kind,
    label: isToday ? "Today's Action" : 'Latest Action',
    verb: ACTION_VERB[kind],
    tone: ACTION_TONE[kind],
    valueThb: s.latest_volume_thb,
    price: s.latest_price,
    dateLabel,
  };
}

function buildNet6m(s: CeoScore): NetPositionInfo | null {
  if (s.trade_count_6m < 2) return null;
  const direction =
    s.net_position_6m === 'LONG' || s.net_position_6m === 'SHORT' ? s.net_position_6m : 'NEUTRAL';
  return {
    direction,
    tone: direction === 'LONG' ? 'buy' : direction === 'SHORT' ? 'sell' : 'neutral',
    // The LONG/SHORT label already carries direction — showing "SHORT -22.6M"
    // double-negates it, so the magnitude is always absolute here.
    valueThb: Math.abs(s.net_volume_thb_6m),
    avgPrice: s.avg_price_6m,
    tradeCount: s.trade_count_6m,
  };
}

const DISCLAIMER_TH =
  'ผลตอบแทนโดยประมาณหากคุณจัดพอร์ตตามผู้บริหารท่านนี้ในช่วง 1 ปีที่ผ่านมา (Long เมื่อผู้บริหารซื้อ, Short เมื่อผู้บริหารขาย) เทียบกับการเติบโตของราคาหุ้น';
const DISCLAIMER_EN = 'Not investment advice.';

export function formatTweetContent(score: CeoScore): TweetContent {
  const latest = buildLatest(score);
  const net6m = buildNet6m(score);

  const base = {
    latest,
    net6m,
    stock1yPct: score.stock_1y_pct,
    disclaimerTh: DISCLAIMER_TH,
    disclaimerEn: DISCLAIMER_EN,
  };

  if (score.sell_count === 0) {
    return {
      ...base,
      header: 'INSIDER BUYING',
      tone: 'buy',
      followerRoiPct: score.buy_return_pct,
      buyStat: { pct: score.buy_return_pct, count: score.buy_count },
      sellStat: null,
    };
  }

  if (score.buy_count === 0) {
    return {
      ...base,
      header: 'INSIDER SELLING',
      tone: 'sell',
      followerRoiPct: score.sell_return_pct,
      buyStat: null,
      sellStat: { pct: score.sell_return_pct, count: score.sell_count },
    };
  }

  return {
    ...base,
    header: 'INSIDER ACTIVITY',
    tone: 'neutral',
    followerRoiPct: score.combined_return_pct,
    buyStat: { pct: score.buy_return_pct, count: score.buy_count },
    sellStat: { pct: score.sell_return_pct, count: score.sell_count },
  };
}
