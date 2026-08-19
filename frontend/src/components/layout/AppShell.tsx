import React from 'react';
import { Search } from 'lucide-react';
import { MobileDrawer } from './MobileDrawer';

interface AppShellProps {
  sidebar: React.ReactNode;
  canvas: React.ReactNode;
  dossier?: React.ReactNode;
  isSidebarOpenMobile: boolean;
  setSidebarOpenMobile: (open: boolean) => void;
  isDossierOpenMobile: boolean;
  setDossierOpenMobile: (open: boolean) => void;
  mobileDossierContent: React.ReactNode;
}

export function AppShell({
  sidebar,
  canvas,
  dossier,
  isSidebarOpenMobile,
  setSidebarOpenMobile,
  isDossierOpenMobile,
  setDossierOpenMobile,
  mobileDossierContent,
}: AppShellProps) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-ink text-text-primary font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[300px] shrink-0 flex-col border-r border-border bg-surface z-10">
        {sidebar}
      </aside>

      {/* Main Canvas */}
      <main className="relative flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-14 border-b border-border bg-surface px-4 shrink-0 z-10">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display font-semibold text-lg text-text-primary leading-none">OwnerTrace</h1>
          </div>
          <button
            onClick={() => setSidebarOpenMobile(true)}
            className="p-2 -mr-2 text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold rounded transition-colors"
            aria-label="Open search"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-0 bg-ink z-0">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.18]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border-strong) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, var(--ink) 100%)',
            }}
          />
          {canvas}
        </div>
      </main>

      {/* Desktop Dossier Panel */}
      <div className="hidden md:block">{dossier}</div>

      {/* Mobile Sidebar Drawer */}
      <MobileDrawer open={isSidebarOpenMobile} onOpenChange={setSidebarOpenMobile}>
        <div className="h-full overflow-y-auto -mx-4 px-4">{sidebar}</div>
      </MobileDrawer>

      {/* Mobile Dossier Drawer */}
      <MobileDrawer open={isDossierOpenMobile} onOpenChange={setDossierOpenMobile}>
        <div className="h-full overflow-y-auto -mx-4 px-4 pb-12">{mobileDossierContent}</div>
      </MobileDrawer>
    </div>
  );
}
