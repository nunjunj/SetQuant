import type { CeoScore } from './types';

export interface TweetContent {
  header: string;
  roiLines: string[];
  latestAction: string;
  position6m: string | null;
  stock1y: string;
  comment: string;
}

function formatTHB(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B THB`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M THB`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K THB`;
  return `${v.toFixed(0)} THB`;
}

function formatPct(v: number): string {
  const p = v * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

function formatContextBlock(s: CeoScore): { latestAction: string; position6m: string | null } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dateStr = '?';
  let isToday = false;
  if (s.latest_trade_date) {
    const tradeDay = new Date(s.latest_trade_date);
    tradeDay.setHours(0, 0, 0, 0);
    isToday = tradeDay.getTime() === today.getTime();
    dateStr = tradeDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const label = isToday ? "Today's Action" : 'Latest Action';
  const latestAction = `⚡ ${label}: ${s.latest_action} ${formatTHB(s.latest_volume_thb)} @ ${s.latest_price.toFixed(2)} THB (${dateStr})`;

  const position6m =
    s.trade_count_6m >= 2
      ? `⏳ 6M Net Position: ${s.net_position_6m} ${formatTHB(s.net_volume_thb_6m)} @ ${s.avg_price_6m.toFixed(2)} THB Avg`
      : null;

  return { latestAction, position6m };
}

const COMMENT =
  '🤖 SetQuant Insight: ผลตอบแทนโดยประมาณหากคุณจัดพอร์ตตามผู้บริหารท่านนี้ในช่วง 1 ปีที่ผ่านมา (Long เมื่อผู้บริหารซื้อ, Short เมื่อผู้บริหารขาย) เทียบกับการเติบโตของราคาหุ้น';

export function formatTweetContent(score: CeoScore): TweetContent {
  const { latestAction, position6m } = formatContextBlock(score);
  const stock1y = `📊 $${score.symbol} Stock 1Y: ${formatPct(score.stock_1y_pct)}`;

  if (score.sell_count === 0) {
    return {
      header: 'INSIDER BUYING',
      roiLines: [
        `🎯 Follower ROI (1Y): ${formatPct(score.buy_return_pct)} (${score.buy_count} buys)`,
      ],
      latestAction,
      position6m,
      stock1y,
      comment: COMMENT,
    };
  }

  if (score.buy_count === 0) {
    return {
      header: 'INSIDER SELLING',
      roiLines: [
        `🎯 Follower ROI (1Y): ${formatPct(score.sell_return_pct)} (${score.sell_count} sells)`,
      ],
      latestAction,
      position6m,
      stock1y,
      comment: COMMENT,
    };
  }

  return {
    header: 'INSIDER ACTIVITY',
    roiLines: [
      `🎯 Follower ROI (1Y): ${formatPct(score.combined_return_pct)}`,
      `├ 📈 Buy Return: ${formatPct(score.buy_return_pct)} (${score.buy_count} buys)`,
      `└ 📉 Sell Return: ${formatPct(score.sell_return_pct)} (${score.sell_count} sells)`,
    ],
    latestAction,
    position6m,
    stock1y,
    comment: COMMENT,
  };
}
