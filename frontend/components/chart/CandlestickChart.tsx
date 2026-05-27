'use client';

import { useEffect, useRef } from 'react';
import type { CandlestickBar, TradeMarker } from '@/lib/types';

interface CandlestickChartProps {
  candles: CandlestickBar[];
  markers: TradeMarker[];
  symbol: string;
  height?: number;
  scaleMargins?: { top: number; bottom: number };
}

export default function CandlestickChart({ candles, markers, symbol, height = 320, scaleMargins }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !candles.length) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;
    let cancelled = false;

    import('lightweight-charts').then(({ createChart, ColorType, CandlestickSeries, createSeriesMarkers }) => {
      if (cancelled || !containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#64748b',
        },
        grid: {
          vertLines: { color: '#f1f5f9' },
          horzLines: { color: '#f1f5f9' },
        },
        rightPriceScale: { borderColor: '#e2e8f0', ...(scaleMargins ? { scaleMargins } : {}) },
        timeScale: {
          borderColor: '#e2e8f0',
          timeVisible: true,
          fixLeftEdge: true,
          fixRightEdge: true,
          lockVisibleTimeRangeOnResize: true,
        },
        handleScroll: false,
        handleScale: false,
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderUpColor: '#10b981',
        borderDownColor: '#f43f5e',
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });

      series.setData(candles);

      // only mark trades within the chart's date range
      const first = candles[0].time;
      const last = candles[candles.length - 1].time;
      const visibleMarkers = markers.filter((m) => m.time >= first && m.time <= last);
      if (visibleMarkers.length) {
        createSeriesMarkers(series, visibleMarkers);
      }

      chart.timeScale().fitContent();

      // Responsive resize
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chart) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);
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
  }, [symbol, candles, markers]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height }}
    />
  );
}
