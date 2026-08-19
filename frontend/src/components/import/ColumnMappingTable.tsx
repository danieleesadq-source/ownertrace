import React from 'react';
import { TARGET_FIELDS, TARGET_FIELD_LABELS, REQUIRED_TARGET_FIELDS, type TargetField } from '@/lib/importTypes';
import { cn } from '@/lib/utils';

interface ColumnMappingTableProps {
  headers: string[];
  sampleRows: string[][];
  mapping: Record<string, TargetField | null>;
  onChange: (mapping: Record<string, TargetField | null>) => void;
}

export function ColumnMappingTable({ headers, sampleRows, mapping, onChange }: ColumnMappingTableProps) {
  const assignedFields = new Set(Object.values(mapping).filter(Boolean) as TargetField[]);
  const missingRequired = REQUIRED_TARGET_FIELDS.filter((f) => !assignedFields.has(f));

  const setFieldForHeader = (header: string, field: TargetField | null) => {
    onChange({ ...mapping, [header]: field });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-border rounded-md">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-surface-raised">
              <th className="px-3 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-widest border-b border-border">Detected column</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-widest border-b border-border">Maps to</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-widest border-b border-border">Preview</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header, colIndex) => {
              const field = mapping[header] ?? null;
              return (
                <tr key={header} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-mono text-xs text-text-primary align-top whitespace-nowrap">{header}</td>
                  <td className="px-3 py-2.5 align-top">
                    <select
                      value={field ?? ''}
                      onChange={(e) => setFieldForHeader(header, (e.target.value || null) as TargetField | null)}
                      className={cn(
                        'bg-surface border px-2 py-1.5 text-xs rounded focus:outline-none focus:border-accent-gold min-w-[160px]',
                        field ? 'border-border text-text-primary' : 'border-border text-text-muted',
                      )}
                    >
                      <option value="">— Ignore this column —</option>
                      {TARGET_FIELDS.map((f) => (
                        <option key={f} value={f} disabled={mapping[header] !== f && assignedFields.has(f)}>
                          {TARGET_FIELD_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-text-muted font-mono">
                    {sampleRows.slice(0, 3).map((row, i) => (
                      <div key={i} className="truncate max-w-[220px]">{row[colIndex] || <span className="opacity-40">—</span>}</div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {missingRequired.length > 0 && (
        <p className="text-xs text-amber">
          Still need a column for: {missingRequired.map((f) => TARGET_FIELD_LABELS[f]).join(', ')}. Rows missing these
          will be skipped.
        </p>
      )}
    </div>
  );
}
