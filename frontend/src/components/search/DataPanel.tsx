import React from 'react';
import { User, Building2, AlertOctagon } from 'lucide-react';
import { useAllEntities } from '@/hooks/useGraphData';

interface DataPanelProps {
  onSelect: (label: string) => void;
}

export function DataPanel({ onSelect }: DataPanelProps) {
  const { data: nodes, isLoading, isError, error, refetch } = useAllEntities(true);

  if (isLoading) {
    return (
      <div className="space-y-1.5" aria-busy="true" aria-label="Loading case file directory">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 rounded border border-border bg-surface-raised animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-flagged/30 bg-surface rounded-md p-4 text-center">
        <AlertOctagon className="h-4 w-4 text-flagged mx-auto mb-2" strokeWidth={1.75} />
        <p className="text-xs text-text-secondary leading-relaxed mb-3">
          {(error as Error)?.message || 'Could not load the case file directory.'}
        </p>
        <button
          onClick={() => refetch()}
          className="text-xs font-semibold text-accent-gold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return <p className="text-xs text-text-muted leading-relaxed">No people or properties on file yet.</p>;
  }

  const people = nodes.filter((n) => n.type === 'person');
  const properties = nodes.filter((n) => n.type === 'property');

  return (
    <div className="space-y-5">
      <DataGroup title="People" count={people.length} icon={User} nodes={people} onSelect={onSelect} />
      <DataGroup title="Properties" count={properties.length} icon={Building2} nodes={properties} onSelect={onSelect} />
    </div>
  );
}

function DataGroup({
  title,
  count,
  icon: Icon,
  nodes,
  onSelect,
}: {
  title: string;
  count: number;
  icon: typeof User;
  nodes: { id: string; label: string; sublabel: string; isFlagged: boolean }[];
  onSelect: (label: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
        {title} <span className="font-mono normal-case tracking-normal">({count})</span>
      </h3>
      <div className="space-y-1">
        {nodes.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelect(node.label)}
            className="w-full flex items-center gap-3 px-2 py-2 hover:bg-surface-raised border border-transparent hover:border-border rounded transition-colors text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold"
          >
            <div
              className={`shrink-0 p-1.5 rounded-full ${node.isFlagged ? 'bg-flagged/10 text-flagged' : 'bg-surface text-text-muted'}`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-secondary group-hover:text-text-primary truncate">{node.label}</p>
              {node.sublabel && (
                <p className="text-[10px] font-mono text-text-muted truncate">{node.sublabel}</p>
              )}
            </div>
            {node.isFlagged && <div className="h-1.5 w-1.5 rounded-full bg-flagged shrink-0" aria-label="Flagged" />}
          </button>
        ))}
      </div>
    </div>
  );
}
