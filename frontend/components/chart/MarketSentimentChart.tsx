'use client';

import { useEffect, useRef } from 'react';
import { useChartData } from '@/hooks/useChartData';

const CHART_HEIGHT = 400;
const MIN_CANDLES = 30;

function spanLabel(candles: { time: string }[]): string {
  if (candles.length >= 300) return '1Y';
  if (candles.length < 2) return `${candles.length}D`;

  const first = candles[0].time;
  const last = candles[candles.length - 1].time;
  const days = Math.round(
    (new Date(last).getTime() - new Date(first).getTime()) / 86_400_000,
  );

  if (days >= 300) return '1Y';
  if (days > 0) return `${days}D`;
  return `${candles.length}D`;
}

export default function MarketSentimentChart() {
  const { candles, isLoading, error } = useChartData('^SET');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !candles.length) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;
    let cancelled = false;

    import('lightweight-charts').then(({ createChart, ColorType, CandlestickSeries }) => {
      if (cancelled || !containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: CHART_HEIGHT,
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#64748b',
        },
        grid: {
          vertLines: { color: '#f1f5f9' },
          horzLines: { color: '#f1f5f9' },
        },
        rightPriceScale: { borderColor: '#e2e8f0' },
        timeScale: {
          borderColor: '#e2e8f0',
          timeVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
          lockVisibleTimeRangeOnResize: true,
        },
        handleScroll: true,
        handleScale: true,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderUpColor: '#10b981',
        borderDownColor: '#f43f5e',
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });
      candleSeries.setData(candles);

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (containerRef.current && chart) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chart as any).__ro = ro;
    });

    return () => {
      cancelled = true;
      if (chart) {
        if (chart.__ro) chart.__ro.disconnect();
        chart.remove();
        chart = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  if (isLoading && !candles.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          SET Index
        </h2>
        <div className="w-full rounded-lg bg-slate-100 animate-pulse" style={{ height: CHART_HEIGHT }} />
      </div>
    );
  }

  if (error && !candles.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          SET Index
        </h2>
        <p className="text-sm text-slate-400">Chart unavailable</p>
      </div>
    );
  }

  // Not enough data to render a meaningful chart (e.g. an upstream hiccup
  // that slipped past validation) — render nothing rather than a
  // misleading "1Y" label over a near-empty chart.
  if (candles.length < MIN_CANDLES) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 mb-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
        SET Index · {spanLabel(candles)}
      </h2>
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ height: CHART_HEIGHT }}
      />
    </div>
  );
}
