import React from 'react';
import { Clock } from 'lucide-react';

interface RecentSearchesProps {
  items: string[];
  onSelect: (query: string) => void;
}

export function RecentSearches({ items, onSelect }: RecentSearchesProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
        Recent searches
      </h3>

      {items.length === 0 ? (
        <p className="text-xs text-text-muted leading-relaxed">
          Your searches this session will show up here.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((query) => (
            <button
              key={query}
              onClick={() => onSelect(query)}
              className="w-full flex items-center gap-3 px-2 py-2 hover:bg-surface-raised border border-transparent hover:border-border rounded transition-colors text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold"
            >
              <Clock className="h-3.5 w-3.5 text-text-muted group-hover:text-accent-gold shrink-0 transition-colors" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary truncate">
                {query}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
