import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CsvDropzoneProps {
  onFileRead: (content: string, fileName: string) => void;
  disabled?: boolean;
}

export function CsvDropzone({ onFileRead, disabled }: CsvDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        setError('That doesn’t look like a CSV file — please upload a .csv export.');
        return;
      }
      try {
        const content = await file.text();
        onFileRead(content, file.name);
      } catch {
        setError('Could not read that file. Try again or pick a different one.');
      }
    },
    [onFileRead],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) void readFile(file);
    },
    [disabled, readFile],
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click();
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
          isDragOver ? 'border-accent-gold bg-surface-raised' : 'border-border bg-surface hover:border-border-strong',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <div className="p-3 rounded-full bg-surface-raised">
          <UploadCloud className="w-6 h-6 text-text-muted" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm text-text-primary font-medium">Drag and drop a CSV file here</p>
          <p className="text-xs text-text-muted mt-1">or click to browse — one row per transaction</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p className="flex items-center gap-2 text-xs text-flagged">
          <FileText className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
