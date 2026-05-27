'use client';

import dynamic from 'next/dynamic';
import TradeHistoryTable from './TradeHistoryTable';
import CeoInsightCard from '@/components/leaderboard/CeoInsightCard';
import { getMarkers } from '@/lib/api';
import { useChartData } from '@/hooks/useChartData';
import type { SecFiling, CeoScore } from '@/lib/types';

const CandlestickChart = dynamic(() => import('./CandlestickChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-slate-50 rounded-lg animate-pulse" style={{ height: 320 }} />
  ),
});

interface StockDetailPanelProps {
  symbol: string;
  filings: SecFiling[];
  ceoName?: string;
  ceoScore?: CeoScore;
  onClose: () => void;
}

export default function StockDetailPanel({
  symbol,
  filings,
  ceoName,
  ceoScore,
  onClose,
}: StockDetailPanelProps) {
  const { candles, isLoading: chartLoading } = useChartData(symbol);
  const symbolFilings = filings.filter((f) => f.symbol === symbol);
  const ceoFilings = ceoName ? symbolFilings.filter((f) => f.name === ceoName) : symbolFilings;
  // drop empty (zero-volume) filings
  const displayFilings = ceoFilings.filter((f) => f.volume > 0);
  const markers = getMarkers(symbol, displayFilings);

  return (
    <div className="absolute inset-0 z-10 bg-white flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-bold font-mono">
            {symbol}
          </span>
          {ceoName ? (
            <span className="text-slate-600 text-sm font-medium truncate max-w-[200px]">
              {ceoName}
            </span>
          ) : (
            <span className="text-slate-400 text-sm">
              {displayFilings.length} filing{displayFilings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div className="px-5 py-4 border-b border-slate-100">
        {chartLoading ? (
          <div className="w-full bg-slate-50 rounded-lg animate-pulse" style={{ height: 320 }} />
        ) : (
          <CandlestickChart candles={candles} markers={markers} symbol={symbol} />
        )}
      </div>

      {/* Lower section */}
      {ceoScore ? (
        <div className="flex flex-col md:flex-row gap-4 p-5">
          <div className="md:w-96 flex-shrink-0">
            <CeoInsightCard score={ceoScore} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="px-0 py-1 mb-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Filing History
              </h3>
            </div>
            <TradeHistoryTable filings={displayFilings} compact />
          </div>
        </div>
      ) : (
        <div>
          <div className="px-5 py-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Filing History
            </h3>
          </div>
          <TradeHistoryTable filings={displayFilings} />
        </div>
      )}
    </div>
  );
}
