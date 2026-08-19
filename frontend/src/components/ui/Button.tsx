import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-surface text-text-primary border border-border hover:bg-border": variant === 'primary',
            "bg-transparent border border-border text-text-primary hover:bg-surface": variant === 'outline',
            "bg-transparent text-text-primary hover:bg-surface": variant === 'ghost',
            "h-8 px-3 text-xs": size === 'sm',
            "h-10 px-4 py-2 text-sm": size === 'md',
            "h-12 px-6 py-3 text-base": size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
