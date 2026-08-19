import React from 'react';
import { RiskScore } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RiskScoreBarProps {
  score: RiskScore;
}

export function RiskScoreBar({ score }: RiskScoreBarProps) {
  let riskLevel = 'Low';
  let fillColorClass = 'bg-verified';
  let textColorClass = 'text-verified';

  if (score > 70) {
    riskLevel = 'High';
    fillColorClass = 'bg-flagged';
    textColorClass = 'text-flagged';
  } else if (score > 30) {
    riskLevel = 'Moderate';
    fillColorClass = 'bg-amber';
    textColorClass = 'text-amber';
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
          Risk score
        </span>
        <span className="font-mono text-sm text-text-primary">
          {score}<span className="text-text-muted">/100</span>
        </span>
      </div>

      <div className="h-2 w-full bg-ink border border-border rounded-full relative overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500 rounded-full', fillColorClass)}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="text-xs text-text-muted">
        System assessed risk level: <strong className={cn('font-semibold', textColorClass)}>{riskLevel}</strong>
      </p>
    </div>
  );
}
