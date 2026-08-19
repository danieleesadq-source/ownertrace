import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ImportSummary } from '@/lib/importTypes';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border rounded-md p-3 bg-ink">
      <p className="font-mono text-2xl text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

export function ImportResultSummary({ summary }: { summary: ImportSummary }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-verified">
        <CheckCircle2 className="w-5 h-5" />
        <p className="text-sm font-medium text-text-primary">
          Processed {summary.rowsProcessed} row{summary.rowsProcessed === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="People created" value={summary.personsCreated} />
        <Stat label="People merged" value={summary.personsMerged} />
        <Stat label="Properties created" value={summary.propertiesCreated} />
        <Stat label="Properties merged" value={summary.propertiesMerged} />
        <Stat label="Transactions created" value={summary.transactionsCreated} />
        <Stat label="Rows skipped" value={summary.skipped.length} />
      </div>

      {summary.skipped.length > 0 && (
        <div className="border border-flagged/30 bg-flagged/10 rounded-md p-4 space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-flagged uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" /> Skipped rows
          </p>
          <ul className="space-y-1 text-xs text-text-secondary font-mono">
            {summary.skipped.map((s) => (
              <li key={s.rowIndex}>Row {s.rowIndex}: {s.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
