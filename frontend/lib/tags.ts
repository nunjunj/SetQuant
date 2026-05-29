export interface TagDefinition {
  emoji: string;
  label: string;
  color: string;
}

export const TAG_REGISTRY: Record<string, TagDefinition> = {
  'first-buy':   { emoji: '🔥', label: 'First Buy',    color: 'text-orange-500' },
  'whale':       { emoji: '🐋', label: 'Whale',        color: 'text-blue-500'   },
  'streak':      { emoji: '⚡', label: 'Streak',       color: 'text-amber-500'  },
  'contrarian':  { emoji: '🎯', label: 'Contrarian',   color: 'text-purple-500' },
  'cluster-buy': { emoji: '👥', label: 'Cluster Buy',  color: 'text-emerald-600'},
  'exit-signal': { emoji: '🚪', label: 'Exit Signal',  color: 'text-rose-500'   },
  // Derived from CeoScore.net_position_6m + trade_count_6m. Self-explanatory
  // window (6M) is implied by the label; tooltip in the chip system clarifies.
  'accumulator': { emoji: '📈', label: 'Accumulator',  color: 'text-emerald-600'},
  'distributor': { emoji: '📉', label: 'Distributor',  color: 'text-rose-500'   },
};

export function getTag(id: string): TagDefinition | undefined {
  return TAG_REGISTRY[id];
}
