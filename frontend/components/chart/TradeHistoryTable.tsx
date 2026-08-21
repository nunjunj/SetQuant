import TransactionBadge from '@/components/feed/TransactionBadge';
import { formatTHB, formatPrice, formatDate } from '@/lib/formatters';
import type { SecFiling } from '@/lib/types';

interface TradeHistoryTableProps {
  filings: SecFiling[];
  compact?: boolean;
}

export default function TradeHistoryTable({ filings, compact = false }: TradeHistoryTableProps) {
  if (!filings.length) {
    return <p className="text-sm text-slate-400 px-4 py-6 text-center">No filings found.</p>;
  }

  return (
    <div className="overflow-auto max-h-[460px] rounded-lg border border-slate-100">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-[1] bg-white">
          <tr className="border-b border-slate-100">
            {!compact && (
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Name
              </th>
            )}
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[1%] whitespace-nowrap">
              Price
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[1%] whitespace-nowrap">
              Volume
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[1%] whitespace-nowrap">
              Value
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[1%] whitespace-nowrap">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {filings.map((f) => (
            <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              {!compact && (
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-800 truncate max-w-[160px]">{f.name}</p>
                  <p className="text-xs text-slate-500 truncate">{f.position}</p>
                </td>
              )}
              <td className="px-4 py-2.5">
                <TransactionBadge transactionType={f.transaction_type} />
              </td>
              <td className="px-4 py-2.5 text-right text-slate-600 font-mono text-xs tabular-nums w-[1%] whitespace-nowrap">
                {formatPrice(f.price)}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-600 font-mono text-xs tabular-nums w-[1%] whitespace-nowrap">
                {f.volume.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-700 font-medium tabular-nums w-[1%] whitespace-nowrap">
                {formatTHB(f.volume * f.price)}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-500 text-xs whitespace-nowrap w-[1%]">
                {formatDate(f.trade_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
