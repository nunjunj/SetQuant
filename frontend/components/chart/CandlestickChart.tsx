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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);

  // Create the chart once per symbol/container. Deliberately does NOT
  // depend on candles/markers — those are applied in the effect below so
  // the chart instance isn't torn down and recreated on every data refresh
  // (every SWR poll, every keystroke in a parent search box).
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    import('lightweight-charts').then(({ createChart, ColorType, CandlestickSeries }) => {
      if (cancelled || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
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
          timeVisible: false,
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

      chartRef.current = chart;
      seriesRef.current = series;

      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chart as any).__ro = ro;
    });

    return () => {
      cancelled = true;
      const chart = chartRef.current;
      if (chart) {
        if (chart.__ro) chart.__ro.disconnect();
        chart.remove();
      }
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // Apply data/markers whenever they change, without recreating the chart.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !candles.length) return;

    let cancelled = false;

    import('lightweight-charts').then(({ createSeriesMarkers }) => {
      if (cancelled || !chartRef.current || !seriesRef.current) return;

      series.setData(candles);

      const first = candles[0].time;
      const last = candles[candles.length - 1].time;
      const visibleMarkers = markers.filter((m) => m.time >= first && m.time <= last);

      if (markersRef.current) {
        markersRef.current.setMarkers(visibleMarkers);
      } else {
        markersRef.current = createSeriesMarkers(series, visibleMarkers);
      }

      chart.timeScale().fitContent();
    });

    return () => {
      cancelled = true;
    };
  }, [candles, markers]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height }}
    />
  );
}
