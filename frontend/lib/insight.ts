import { formatPct } from './formatters';
import type { CeoScore, SecFiling } from './types';

export type InsightKind = 'rank';

export interface FilingInsight {
  kind: InsightKind;
  label: string;
  icon?: string;
  /** raw ratio (e.g. 0.159 = 15.9%). Matches the backend shape. */
  pct: number;
  /** insider's rank in the leaderboard (1 = best). */
  rank: number;
}

const STAR_LIMIT = 10;

function key(symbol: string, name: string): string {
  return `${symbol}|${name}`;
}

/**
 * Build (symbol, name) → 1-based rank from a scores array. Scores arrive sorted
 * DESC by combined_return_pct from the backend, so rank = index + 1.
 */
export function buildRankLookup(scores: CeoScore[]): Map<string, number> {
  const out = new Map<string, number>();
  scores.forEach((s, i) => out.set(key(s.symbol, s.name), i + 1));
  return out;
}

/**
 * Compute a rank+return credential for every filing whose insider is in the
 * leaderboard. No return threshold — even negative ranks are shown so users see
 * the warning ("this insider has historically lost money").
 *
 * The chip is a *persistent credential*, not a signal marker, so it renders on
 * every row by a scored insider — not just the most recent one. If SPALI's
 * Achra has 11 visible filings, all 11 rows display "#43 +3.3%". The repetition
 * is the truth: same person, same track record, repeated trades.
 */
export function buildInsights(
  filings: SecFiling[],
  scores: CeoScore[],
): Map<number, FilingInsight | null> {
  const out = new Map<number, FilingInsight | null>();
  const scoreByKey = new Map<string, { rank: number; score: CeoScore }>();
  scores.forEach((s, i) => {
    scoreByKey.set(key(s.symbol, s.name), { rank: i + 1, score: s });
  });

  for (const f of filings) {
    const entry = scoreByKey.get(key(f.symbol, f.name));
    if (!entry) {
      out.set(f.id, null);
      continue;
    }
    const pct = entry.score.combined_return_pct;
    const star = entry.rank <= STAR_LIMIT;
    const fmt = formatPct(pct); // formatPct multiplies by 100 — matches leaderboard
    out.set(f.id, {
      kind: 'rank',
      label: star ? `#${entry.rank} ${fmt}` : `#${entry.rank} · ${fmt}`,
      icon: star ? '⭐' : undefined,
      pct,
      rank: entry.rank,
    });
  }

  return out;
}

/**
 * Derive activity-pattern tags ("Accumulator" / "Distributor") per insider
 * using the 6-month net position the scraper already computes. Returns a map
 * filing id → tag ids. Like the rank chip, this is an insider-level property —
 * rendered on every qualifying row, not just the newest, so users don't have to
 * remember "row 1 said Accumulator, so the rest must be too."
 *
 * Thresholds:
 *   Accumulator: net_position_6m === 'LONG'  AND trade_count_6m >= 3
 *   Distributor: net_position_6m === 'SHORT' AND trade_count_6m >= 3
 *
 * The 3-trade floor avoids labeling a single buy as "accumulating."
 */
export function buildDerivedTags(
  filings: SecFiling[],
  scores: CeoScore[],
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const scoreByKey = new Map<string, CeoScore>();
  scores.forEach((s) => scoreByKey.set(key(s.symbol, s.name), s));

  for (const f of filings) {
    const s = scoreByKey.get(key(f.symbol, f.name));
    if (!s) continue;
    const tags: string[] = [];
    if (s.trade_count_6m >= 3) {
      if (s.net_position_6m === 'LONG') tags.push('accumulator');
      else if (s.net_position_6m === 'SHORT') tags.push('distributor');
    }
    if (tags.length) out.set(f.id, tags);
  }

  return out;
}
