import React from 'react';
import { EntityDetails } from '@/lib/types';
import { RiskScoreBar } from './RiskScoreBar';
import { TransactionTimeline } from './TransactionTimeline';
import { FlagExplanation } from './FlagExplanation';
import { Badge } from '../ui/Badge';
import { User, Building2, X } from 'lucide-react';

interface DossierContentProps {
  entity: EntityDetails;
  onClose?: () => void;
  hideHeaderClose?: boolean;
}

export function DossierContent({ entity, onClose, hideHeaderClose }: DossierContentProps) {
  const Icon = entity.type === 'person' ? User : Building2;

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`shrink-0 mt-0.5 p-2 rounded-full ${
              entity.isFlagged ? 'bg-flagged/10 text-flagged' : 'bg-surface-raised text-text-muted'
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">
              {entity.type === 'person' ? 'Person profile' : 'Property record'}
            </p>
            <h2 className="font-display text-xl text-text-primary leading-snug break-words">
              {entity.type === 'person' ? entity.name : entity.address}
            </h2>
            <p className="font-mono text-xs text-text-muted mt-1">
              {entity.type === 'person' ? entity.ssn : entity.propertyId}
            </p>
          </div>
        </div>
        {!hideHeaderClose && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 shrink-0 hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold rounded"
            aria-label="Close dossier"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        {/* Quick Stats / Meta */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{entity.type === 'person' ? entity.role : entity.propertyType}</Badge>
          {entity.type === 'property' && <Badge variant="outline">{entity.size}</Badge>}
          {entity.type === 'person' && (
            <Badge variant="outline">{entity.connectionsCount} connection{entity.connectionsCount === 1 ? '' : 's'}</Badge>
          )}
        </div>

        {/* Risk Score */}
        <section>
          <RiskScoreBar score={entity.riskScore} />
          {entity.isFlagged && entity.flagExplanation && (
            <div className="mt-4">
              <FlagExplanation text={entity.flagExplanation} />
            </div>
          )}
        </section>

        <div className="h-px w-full bg-border" />

        {/* Timeline */}
        <section>
          <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-4">
            {entity.type === 'person' ? 'Transaction history' : 'Ownership history'}
          </h3>
          <TransactionTimeline entity={entity} />
        </section>
      </div>
    </div>
  );
}
