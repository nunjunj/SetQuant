import Header from './Header';

interface AppShellProps {
  leftSidebar?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function AppShell({ leftSidebar, sidebar, children }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Left filter sidebar */}
        {leftSidebar}
        {/* Main feed. overflow-hidden so an overlay panel (absolute inset-0)
            covers the whole area; page content scrolls in its own layer. */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
        {/* Right leaderboard sidebar */}
        <aside className="w-80 border-l border-slate-100 bg-slate-50 overflow-y-auto flex-shrink-0 hidden lg:block">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
