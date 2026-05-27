import { formatTweetContent } from '@/lib/formatTweet';
import type { CeoScore } from '@/lib/types';

interface CeoInsightCardProps {
  score: CeoScore;
}

export default function CeoInsightCard({ score }: CeoInsightCardProps) {
  const content = formatTweetContent(score);
  const isBuying = content.header === 'INSIDER BUYING';
  const isSelling = content.header === 'INSIDER SELLING';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 flex-shrink-0">
      <span
        className={`inline-block text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
          isBuying
            ? 'bg-emerald-100 text-emerald-700'
            : isSelling
              ? 'bg-rose-100 text-rose-700'
              : 'bg-amber-100 text-amber-700'
        }`}
      >
        {content.header}
      </span>

      <div className="space-y-1.5 text-sm text-slate-700 font-mono">
        {content.roiLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <p>{content.latestAction}</p>
        {content.position6m && <p>{content.position6m}</p>}
        <p>{content.stock1y}</p>
      </div>

      <p className="text-xs text-slate-400 border-t border-slate-200 pt-2 leading-relaxed">
        {content.comment}
      </p>
    </div>
  );
}
