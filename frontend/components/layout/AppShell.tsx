'use client';

import { useState } from 'react';
import Header from './Header';
import FilterDrawer from './FilterDrawer';

interface AppShellProps {
  /** xl+ filter rail. */
  leftSidebar?: React.ReactNode;
  /** Leaderboard — the lg+ right rail, and the mobile "Top Insiders" tab. */
  sidebar: React.ReactNode;
  /** Same filter controls, rendered inside the mobile drawer. */
  mobileFilters?: React.ReactNode;
  /** Number of filters differing from the defaults; badges the Filters button. */
  activeFilterCount?: number;
  children: React.ReactNode;
}

type MobileTab = 'feed' | 'insiders';

export default function AppShell({
  leftSidebar,
  sidebar,
  mobileFilters,
  activeFilterCount = 0,
  children,
}: AppShellProps) {
  const [tab, setTab] = useState<MobileTab>('feed');
  const [filtersOpen, setFiltersOpen] = useState(false);

  function tabClass(value: MobileTab) {
    return `px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
      tab === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;
  }

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      <Header />

      {/* Mobile toolbar: section tabs + filter access. Hidden at lg, where the
          leaderboard has its own rail and the filters live in the xl sidebar. */}
      <div className="lg:hidden flex items-center gap-2 px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100" role="tablist" aria-label="Sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'feed'}
            onClick={() => setTab('feed')}
            className={tabClass('feed')}
          >
            Feed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'insiders'}
            onClick={() => setTab('insiders')}
            className={tabClass('insiders')}
          >
            Top Insiders
          </button>
        </div>

        <div className="flex-1" />

        {mobileFilters && (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M2 4h12M4 8h8M6.5 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left filter sidebar */}
        {leftSidebar}
        {/* Main feed. overflow-hidden so an overlay panel (absolute inset-0)
            covers the whole area; page content scrolls in its own layer. */}
        <main className="flex-1 overflow-hidden relative">
          {children}

          {/* Mobile "Top Insiders" tab. Sits above the feed but *below* the
              detail panel (z-10), so picking an insider here reveals the panel
              and closing it returns to the leaderboard. */}
          {tab === 'insiders' && (
            <div className="absolute inset-0 z-[5] overflow-y-auto bg-slate-50 lg:hidden">
              {sidebar}
            </div>
          )}
        </main>
        {/* Right leaderboard sidebar */}
        <aside className="w-80 border-l border-slate-100 bg-slate-50 overflow-y-auto flex-shrink-0 hidden lg:block">
          {sidebar}
        </aside>
      </div>

      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        {mobileFilters}
      </FilterDrawer>
    </div>
  );
}
