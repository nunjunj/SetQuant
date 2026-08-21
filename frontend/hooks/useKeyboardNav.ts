import { useEffect, useCallback } from 'react';
import type { SecFiling } from '@/lib/types';

interface UseKeyboardNavOptions {
  items: SecFiling[];
  selectedSymbol: string | null;
  selectedCeoName: string | null;
  /** Selects a row outright (no toggle) — keyboard moves must never close the panel. */
  onSelect: (symbol: string, name: string) => void;
  onClose: () => void;
}

function rowKey(symbol: string, name: string): string {
  return `${symbol}|${name}`;
}

function scrollIntoView(symbol: string, name: string) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector<HTMLElement>(
    `[data-row-key="${CSS.escape(rowKey(symbol, name))}"]`,
  );
  el?.scrollIntoView({ block: 'nearest' });
}

export function useKeyboardNav({
  items,
  selectedSymbol,
  selectedCeoName,
  onSelect,
  onClose,
}: UseKeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't hijack keyboard when typing in an input or textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const down = e.key === 'j' || e.key === 'ArrowDown';
      const up = e.key === 'k' || e.key === 'ArrowUp';
      if (!down && !up) return;

      // Rows are identified by (symbol, name) — the same pair the page tracks —
      // so repeated symbols in the feed each get their own stop.
      const current =
        selectedSymbol !== null
          ? items.findIndex(
              (f) => f.symbol === selectedSymbol && f.name === (selectedCeoName ?? f.name),
            )
          : -1;

      let next: SecFiling | undefined;
      if (down) {
        next = items[current + 1];
      } else {
        // No selection yet: ArrowUp/k lands on the last row.
        next = current === -1 ? items[items.length - 1] : items[current - 1];
      }

      if (!next) return; // not handling — leave the event alone
      e.preventDefault();
      onSelect(next.symbol, next.name);
      scrollIntoView(next.symbol, next.name);
    },
    [items, selectedSymbol, selectedCeoName, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
