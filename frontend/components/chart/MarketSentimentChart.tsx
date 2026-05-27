'use client';

import { useEffect, useRef } from 'react';
import { useChartData } from '@/hooks/useChartData';

const CHART_HEIGHT = 400;

export default function MarketSentimentChart() {
  const { candles, isLoading } = useChartData('^SET');
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
        handleScroll: false,
        handleScale: false,
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
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          SET Index · 1Y
        </h2>
        <div className="w-full rounded-lg bg-slate-100 animate-pulse" style={{ height: CHART_HEIGHT }} />
      </div>
    );
  }

  if (!candles.length) return null;

  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
        SET Index · 1Y
      </h2>
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ height: CHART_HEIGHT }}
      />
    </div>
  );
}
