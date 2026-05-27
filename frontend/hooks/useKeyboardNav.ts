import { useEffect, useCallback } from 'react';
import type { SecFiling } from '@/lib/types';

interface UseKeyboardNavOptions {
  items: SecFiling[];
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

export function useKeyboardNav({ items, selectedSymbol, onSelect, onClose }: UseKeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't hijack keyboard when typing in an input or textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = selectedSymbol ? items.findIndex((f) => f.symbol === selectedSymbol) : -1;
        const next = items[idx + 1];
        if (next) onSelect(next.symbol);
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = selectedSymbol ? items.findIndex((f) => f.symbol === selectedSymbol) : items.length;
        const prev = items[idx - 1];
        if (prev) onSelect(prev.symbol);
      }
    },
    [items, selectedSymbol, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
