import {
  formatTweetContent,
  formatTweetPct,
  formatTweetTHB,
  pluralize,
  type Tone,
} from '@/lib/formatTweet';
import type { CeoScore } from '@/lib/types';

interface CeoInsightCardProps {
  score: CeoScore;
}

const TONE_TEXT: Record<Tone, string> = {
  buy: 'text-emerald-600',
  sell: 'text-rose-600',
  neutral: 'text-slate-700',
};

const TONE_CHIP: Record<Tone, string> = {
  buy: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  sell: 'bg-rose-50 text-rose-700 border-rose-100',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Sign-driven colour for a return figure, independent of buy/sell framing. */
function pctTone(pct: number): string {
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.00005) return 'text-slate-600';
  return pct > 0 ? 'text-emerald-600' : 'text-rose-600';
}

function Row({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-[11px] text-slate-500 leading-tight">
        {label}
        {sub && <span className="block text-[10px] text-slate-400">{sub}</span>}
      </span>
      <span className="text-sm font-medium tabular-nums text-right">{children}</span>
    </div>
  );
}

export default function CeoInsightCard({ score }: CeoInsightCardProps) {
  const c = formatTweetContent(score);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex-shrink-0">
      {/* Status */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${TONE_CHIP[c.tone]}`}
        >
          {c.header}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          1Y
        </span>
      </div>

      {/* Headline: follower ROI vs the stock itself */}
      <div className="grid grid-cols-2 border-y border-slate-100 divide-x divide-slate-100">
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Insider Return
          </p>
          <p className={`text-xl font-semibold tabular-nums mt-0.5 ${pctTone(c.followerRoiPct)}`}>
            {formatTweetPct(c.followerRoiPct)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Stock 1Y
          </p>
          <p className={`text-xl font-semibold tabular-nums mt-0.5 ${pctTone(c.stock1yPct)}`}>
            {formatTweetPct(c.stock1yPct)}
          </p>
        </div>
      </div>

      {/* Detail rows */}
      <div className="px-4 divide-y divide-slate-100">
        {c.buyStat && (
          <Row label="Buy return" sub={pluralize(c.buyStat.count, 'buy')}>
            <span className={pctTone(c.buyStat.pct)}>{formatTweetPct(c.buyStat.pct)}</span>
          </Row>
        )}

        {c.sellStat && (
          <Row label="Sell return" sub={pluralize(c.sellStat.count, 'sell')}>
            <span className={pctTone(c.sellStat.pct)}>{formatTweetPct(c.sellStat.pct)}</span>
          </Row>
        )}

        {c.net6m && (
          <Row
            label="6M net position"
            sub={`${pluralize(c.net6m.tradeCount, 'trade')} · avg ${c.net6m.avgPrice.toFixed(2)} THB`}
          >
            <span className={TONE_TEXT[c.net6m.tone]}>
              {c.net6m.direction} {formatTweetTHB(c.net6m.valueThb)}
            </span>
          </Row>
        )}

        <Row label={c.latest.label} sub={c.latest.dateLabel}>
          <span className={TONE_TEXT[c.latest.tone]}>
            {c.latest.verb} {formatTweetTHB(c.latest.valueThb)}
          </span>
          <span className="block text-[10px] text-slate-500 font-normal">
            @ {c.latest.price.toFixed(2)} THB
          </span>
        </Row>
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-slate-500 leading-relaxed">{c.disclaimerTh}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-1">{c.disclaimerEn}</p>
      </div>
    </div>
  );
}
