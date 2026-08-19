import React from 'react';
import { cn } from '@/lib/utils';

export type RiskFilter = 'all' | 'flagged' | 'clean';

interface FilterPanelProps {
  value: RiskFilter;
  onChange: (value: RiskFilter) => void;
  disabled?: boolean;
}

const OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'clean', label: 'Clean' },
];

export function FilterPanel({ value, onChange, disabled }: FilterPanelProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-widest">
        Risk level
      </label>
      <div
        role="radiogroup"
        aria-label="Filter by risk level"
        className={cn(
          'flex border border-border rounded-md overflow-hidden divide-x divide-border',
          disabled && 'opacity-40 pointer-events-none',
        )}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 px-2 py-1.5 text-[11px] font-mono uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold focus-visible:z-10',
              value === opt.value
                ? 'bg-accent-gold text-ink font-semibold'
                : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-raised',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-text-muted leading-relaxed">
        {value === 'all'
          ? 'Showing the full traced network.'
          : value === 'flagged'
            ? 'Showing only flagged entities and their direct links.'
            : 'Hiding flagged entities and their links.'}
      </p>
    </div>
  );
}
