import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { X, FileSpreadsheet, PenLine } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { CsvDropzone } from './CsvDropzone';
import { ColumnMappingTable } from './ColumnMappingTable';
import { ImportResultSummary } from './ImportResultSummary';
import { ManualEntryForm } from './ManualEntryForm';
import type { ImportPreview, ImportSummary, TargetField } from '@/lib/importTypes';

type Mode = 'csv' | 'manual';
type CsvStep = 'upload' | 'mapping' | 'result';

interface ImportDialogProps {
  trigger: React.ReactNode;
}

export function ImportDialog({ trigger }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('csv');
  const [step, setStep] = useState<CsvStep>('upload');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, TargetField | null>>({});
  const [commitSummary, setCommitSummary] = useState<ImportSummary | null>(null);
  const [manualSummary, setManualSummary] = useState<ImportSummary | null>(null);

  const previewMutation = useMutation({
    mutationFn: (content: string) => api.importPreview(content),
    onSuccess: (data) => {
      setPreview(data);
      setMapping(data.suggestedMapping);
      setStep('mapping');
    },
  });

  const commitMutation = useMutation({
    mutationFn: () => api.importCommit(csvContent ?? '', mapping),
    onSuccess: (data) => {
      setCommitSummary(data);
      setStep('result');
    },
  });

  const manualMutation = useMutation({
    mutationFn: api.importManual,
    onSuccess: (data) => setManualSummary(data),
  });

  const handleFileRead = (content: string, name: string) => {
    setCsvContent(content);
    setFileName(name);
    previewMutation.mutate(content);
  };

  const resetCsvFlow = () => {
    setStep('upload');
    setCsvContent(null);
    setFileName(null);
    setPreview(null);
    setMapping({});
    setCommitSummary(null);
    previewMutation.reset();
    commitMutation.reset();
  };

  // Reopening after a closed session should start clean rather than resuming
  // mid-way through a half-finished import from last time.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMode('csv');
      resetCsvFlow();
      setManualSummary(null);
      manualMutation.reset();
    }
  };

  const canCommit = preview
    ? ['buyerName', 'sellerName', 'propertyAddress', 'date', 'amount'].every((f) =>
        Object.values(mapping).includes(f as TargetField),
      )
    : false;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40 animate-fade-in-up" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex flex-col bg-surface border border-border rounded-md shadow-[0_0_48px_-12px_rgba(0,0,0,0.6)] focus:outline-none animate-fade-in-up"
        >
          <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
            <div>
              <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">Case file intake</p>
              <Dialog.Title className="font-display text-xl text-text-primary">Import ownership data</Dialog.Title>
              <Dialog.Description className="text-sm text-text-muted mt-1">
                Bring in new transactions from a CSV export, or add one by hand.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1.5 shrink-0 hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold rounded"
                aria-label="Close import dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="flex border border-border rounded-md overflow-hidden w-fit">
              <button
                onClick={() => setMode('csv')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                  mode === 'csv' ? 'bg-accent-gold text-ink font-semibold' : 'bg-surface text-text-muted hover:text-text-primary',
                )}
              >
                <FileSpreadsheet className="w-4 h-4" /> CSV upload
              </button>
              <button
                onClick={() => setMode('manual')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm transition-colors border-l border-border',
                  mode === 'manual' ? 'bg-accent-gold text-ink font-semibold' : 'bg-surface text-text-muted hover:text-text-primary',
                )}
              >
                <PenLine className="w-4 h-4" /> Manual entry
              </button>
            </div>

            {mode === 'csv' && (
              <div className="space-y-6">
                {step === 'upload' && (
                  <div className="space-y-4">
                    <CsvDropzone onFileRead={handleFileRead} disabled={previewMutation.isPending} />
                    {previewMutation.isPending && <p className="text-xs text-text-muted">Reading {fileName}…</p>}
                    {previewMutation.isError && (
                      <p className="text-xs text-flagged">{(previewMutation.error as Error).message}</p>
                    )}
                  </div>
                )}

                {step === 'mapping' && preview && (
                  <div className="space-y-5 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-primary font-medium">{fileName}</p>
                        <p className="text-xs text-text-muted">{preview.totalRows} row{preview.totalRows === 1 ? '' : 's'} detected. Confirm or fix the column mapping below.</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetCsvFlow}>Start over</Button>
                    </div>

                    <ColumnMappingTable headers={preview.headers} sampleRows={preview.sampleRows} mapping={mapping} onChange={setMapping} />

                    {commitMutation.isError && (
                      <p className="text-xs text-flagged">{(commitMutation.error as Error).message}</p>
                    )}

                    <Button onClick={() => commitMutation.mutate()} disabled={!canCommit || commitMutation.isPending}>
                      {commitMutation.isPending ? 'Importing…' : `Import ${preview.totalRows} row${preview.totalRows === 1 ? '' : 's'}`}
                    </Button>
                  </div>
                )}

                {step === 'result' && commitSummary && (
                  <div className="space-y-5 animate-fade-in-up">
                    <ImportResultSummary summary={commitSummary} />
                    <Button variant="outline" onClick={resetCsvFlow}>Import another file</Button>
                  </div>
                )}
              </div>
            )}

            {mode === 'manual' && (
              <div className="space-y-6">
                <ManualEntryForm
                  onSubmit={(row) => manualMutation.mutate(row)}
                  isSubmitting={manualMutation.isPending}
                />
                {manualMutation.isError && (
                  <p className="text-xs text-flagged">{(manualMutation.error as Error).message}</p>
                )}
                {manualSummary && (
                  <div className="animate-fade-in-up">
                    <ImportResultSummary summary={manualSummary} />
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
