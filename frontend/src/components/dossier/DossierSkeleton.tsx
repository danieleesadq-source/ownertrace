import React from 'react';

/**
 * Shown while a clicked node's dossier is being fetched — computing the live
 * risk score touches several graph-wide Cypher queries (see riskScoring.ts),
 * so this can take a few seconds. Without this, the panel/drawer either
 * doesn't appear at all (desktop) or appears empty (mobile) until the data
 * lands, which reads as broken rather than loading.
 */
export function DossierSkeleton() {
  return (
    <div className="flex flex-col h-full bg-surface animate-pulse" aria-busy="true" aria-label="Loading case file">
      <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
        <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-surface-raised" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-24 bg-surface-raised rounded" />
          <div className="h-5 w-40 bg-surface-raised rounded" />
          <div className="h-2.5 w-20 bg-surface-raised rounded" />
        </div>
      </div>

      <div className="flex-1 p-5 space-y-7">
        <div className="flex gap-1.5">
          <div className="h-5 w-20 bg-surface-raised rounded" />
          <div className="h-5 w-16 bg-surface-raised rounded" />
        </div>

        <div className="space-y-3">
          <div className="h-2.5 w-16 bg-surface-raised rounded" />
          <div className="h-2 w-full bg-surface-raised rounded-full" />
        </div>

        <div className="h-px w-full bg-border" />

        <div className="space-y-3">
          <div className="h-2.5 w-32 bg-surface-raised rounded" />
          <div className="h-14 w-full bg-surface-raised rounded" />
          <div className="h-14 w-full bg-surface-raised rounded" />
        </div>
      </div>
    </div>
  );
}
