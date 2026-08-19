import React, { useState } from 'react';
import { UploadCloud, Search, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchBar } from '../search/SearchBar';
import { FilterPanel, type RiskFilter } from '../search/FilterPanel';
import { RecentSearches } from '../search/RecentSearches';
import { DataPanel } from '../search/DataPanel';
import { ImportDialog } from '../import/ImportDialog';

interface SidebarProps {
  onSearch: (query: string) => void;
  riskFilter: RiskFilter;
  onRiskFilterChange: (value: RiskFilter) => void;
  filterDisabled: boolean;
  recentSearches: string[];
}

type Tab = 'search' | 'data';

export function Sidebar({ onSearch, riskFilter, onRiskFilterChange, filterDisabled, recentSearches }: SidebarProps) {
  const [tab, setTab] = useState<Tab>('search');

  return (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex flex-col gap-1 p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-flagged animate-pulse-flagged shrink-0" aria-hidden />
          <p className="text-[10px] text-text-muted font-mono uppercase tracking-[0.2em]">Case File</p>
        </div>
        <h1 className="font-display text-2xl tracking-tight text-text-primary leading-tight">OwnerTrace</h1>
        <p className="text-xs text-text-muted">Property due-diligence &amp; ownership tracing</p>
      </div>

      {/* Primary nav: switch sidebar content, or open the import dialog */}
      <div className="flex items-stretch border-b border-border px-5 pt-3 gap-1">
        <NavTab active={tab === 'search'} icon={Search} label="Search" onClick={() => setTab('search')} />
        <NavTab active={tab === 'data'} icon={Database} label="Data" onClick={() => setTab('data')} />
        <ImportDialog
          trigger={
            <button
              className="flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-xs text-text-muted hover:text-accent-gold transition-colors ml-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold rounded-t"
              aria-label="Import new data"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Import
            </button>
          }
        />
      </div>

      {/* scrollable content, swapped by the tab above */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {tab === 'search' ? (
          <>
            <section>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">
                Search property or person
              </label>
              <SearchBar onSearch={onSearch} />
            </section>

            <div className="h-px w-full bg-border" />

            <section>
              <FilterPanel value={riskFilter} onChange={onRiskFilterChange} disabled={filterDisabled} />
            </section>

            <div className="h-px w-full bg-border" />

            <section>
              <RecentSearches items={recentSearches} onSelect={onSearch} />
            </section>
          </>
        ) : (
          <section>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3">
              Everyone and everything on file
            </label>
            <DataPanel onSelect={onSearch} />
          </section>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest leading-relaxed">
          Data traced via CognoDB graph queries &middot; 2 hops
        </p>
      </div>
    </div>
  );
}

function NavTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Search;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-xs font-semibold border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold rounded-t',
        active ? 'border-accent-gold text-accent-gold' : 'border-transparent text-text-muted hover:text-text-primary',
      )}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
