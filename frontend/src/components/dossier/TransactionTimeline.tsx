import React from 'react';
import { EntityDetails } from '@/lib/types';
import { Badge } from '../ui/Badge';
import { cn } from '@/lib/utils';

interface TransactionTimelineProps {
  entity: EntityDetails;
}

export function TransactionTimeline({ entity }: TransactionTimelineProps) {
  if (entity.type === 'person') {
    const txs = entity.transactions;
    if (!txs || txs.length === 0) return <p className="text-sm text-text-muted">No transactions found.</p>;

    return (
      <div className="space-y-5">
        {txs.map((tx) => (
          <div key={tx.id} className="relative pl-6 before:absolute before:left-[3px] before:top-2 before:bottom-[-20px] before:w-px before:bg-border last:before:hidden">
            <div className={cn('absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full border border-ink', tx.isFlagged ? 'bg-flagged' : 'bg-verified')} />

            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-text-muted">{tx.date}</span>
              <Badge variant={tx.isFlagged ? 'flagged' : 'verified'}>{tx.statusText || (tx.isFlagged ? 'Flagged' : 'Clean')}</Badge>
            </div>

            <div className="p-3 border border-border bg-ink rounded-md">
              <p className="font-mono text-sm text-text-primary mb-2">{tx.propertyId}</p>
              <div className="flex justify-between items-end gap-3">
                <span className="text-xs text-text-muted">{tx.role}</span>
                <span className="font-mono text-sm text-text-primary shrink-0">{tx.amount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Property
  const hist = entity.ownershipHistory;
  if (!hist || hist.length === 0) return <p className="text-sm text-text-muted">No history found.</p>;

  return (
    <div className="space-y-5">
      {hist.map((entry, idx) => (
        <div key={idx} className="relative pl-6 before:absolute before:left-[3px] before:top-2 before:bottom-[-20px] before:w-px before:bg-border last:before:hidden">
          <div className={cn('absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full border border-ink', entry.isFlagged ? 'bg-flagged' : 'bg-verified')} />

          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-xs text-text-muted">{entry.date}</span>
          </div>

          <div className="p-3 border border-border bg-ink rounded-md">
            <p className="font-display text-base text-text-primary mb-2">{entry.name}</p>
            <div className="flex justify-between items-end gap-3">
              <span className="text-xs text-text-muted">Purchased for</span>
              <span className="font-mono text-sm text-text-primary shrink-0">{entry.amount}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
