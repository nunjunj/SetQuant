import { isBuy } from '@/lib/formatters';

interface TransactionBadgeProps {
  transactionType: string;
}

export default function TransactionBadge({ transactionType }: TransactionBadgeProps) {
  const buy = isBuy(transactionType);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        buy
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {buy ? 'BUY' : 'SELL'}
    </span>
  );
}
