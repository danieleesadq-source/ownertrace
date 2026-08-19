import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-ink animate-fade-in-up">
      <div className="flex flex-col items-center max-w-sm border border-flagged/30 bg-surface rounded-md p-6 shadow-[0_0_24px_-8px_rgba(193,80,46,0.35)]">
        <div className="p-2.5 rounded-full bg-flagged/10 mb-4">
          <AlertOctagon className="h-6 w-6 text-flagged" strokeWidth={1.75} />
        </div>
        <p className="text-xs font-semibold text-flagged uppercase tracking-widest mb-2">Connection error</p>
        <p className="text-sm font-sans text-text-secondary leading-relaxed mb-6">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="w-full">
            Retry connection
          </Button>
        )}
      </div>
    </div>
  );
}
