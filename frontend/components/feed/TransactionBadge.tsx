import { getTxSide } from '@/lib/formatters';

interface TransactionBadgeProps {
  transactionType: string;
}

const STYLES: Record<string, { cls: string; label: string }> = {
  BUY: { cls: 'bg-emerald-50 text-emerald-700', label: 'BUY' },
  SELL: { cls: 'bg-rose-50 text-rose-700', label: 'SELL' },
  OTHER: { cls: 'bg-slate-100 text-slate-500', label: 'TRANSFER' },
};

export default function TransactionBadge({ transactionType }: TransactionBadgeProps) {
  const { cls, label } = STYLES[getTxSide(transactionType)];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
