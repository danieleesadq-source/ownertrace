import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface FlagExplanationProps {
  text: string;
}

export function FlagExplanation({ text }: FlagExplanationProps) {
  return (
    <div className="p-4 rounded-md bg-flagged/10 border border-flagged/30 text-sm font-sans flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-flagged shrink-0 mt-0.5" strokeWidth={1.75} />
      <div>
        <p className="font-semibold text-flagged mb-1 uppercase tracking-widest text-[11px]">Flag explanation</p>
        <p className="text-text-secondary leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
