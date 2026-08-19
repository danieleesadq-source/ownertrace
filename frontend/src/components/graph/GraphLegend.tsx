import React from 'react';

export function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 p-4 border border-border bg-surface/90 backdrop-blur-sm z-10 flex flex-col gap-3 max-w-[15rem] shadow-xl rounded-md">
      <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Legend</h4>

      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-border-strong bg-surface shrink-0" />
          <span className="text-xs text-text-secondary">Person</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-[3px] border border-border-strong bg-surface shrink-0" />
          <span className="text-xs text-text-secondary">Property</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-verified/70 shrink-0" />
          <span className="text-xs text-text-secondary">Standard link</span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <div className="w-4 h-0.5 bg-flagged animate-pulse-flagged shrink-0" />
          <span className="text-xs text-text-secondary">Flagged / suspicious</span>
        </div>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="flex items-center gap-2">
        <div className="relative w-3 h-3 rounded-full border border-flagged bg-surface shrink-0">
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-flagged flex items-center justify-center">
            <span className="text-[6px] font-bold text-ink leading-none">!</span>
          </div>
        </div>
        <span className="text-xs text-text-secondary">Flagged entity</span>
      </div>
    </div>
  );
}
