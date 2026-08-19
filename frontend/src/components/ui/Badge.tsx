import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'verified' | 'flagged' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-gold",
        {
          "border-transparent bg-surface text-text-primary": variant === 'default',
          "border-transparent bg-verified/10 text-verified": variant === 'verified',
          "border-transparent bg-flagged/10 text-flagged": variant === 'flagged',
          "border-border text-text-primary": variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}
