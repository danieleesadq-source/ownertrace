import React from 'react';
import { Search } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  examples?: string[];
  onExampleClick?: (query: string) => void;
}

export function EmptyState({ message, examples = [], onExampleClick }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-5 animate-fade-in-up">
      <div className="p-4 rounded-full border border-border bg-surface/70 pointer-events-none">
        <Search className="w-6 h-6 text-text-muted" strokeWidth={1.5} />
      </div>

      <div className="space-y-2 max-w-sm pointer-events-none">
        <h2 className="font-display text-xl text-text-primary">Start a trace</h2>
        <p className="text-sm text-text-muted leading-relaxed">{message}</p>
      </div>

      {examples.length > 0 && onExampleClick && (
        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {examples.map((example) => (
            <button
              key={example}
              onClick={() => onExampleClick(example)}
              className="px-3 py-1.5 text-xs font-mono border border-border rounded-full text-text-secondary hover:border-accent-gold hover:text-accent-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
