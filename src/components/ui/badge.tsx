import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/20',
    secondary: 'border-transparent bg-white/10 text-slate-200 hover:bg-white/15',
    outline: 'border-white/15 text-slate-300',
    destructive: 'border-transparent bg-red-500/15 text-red-300 hover:bg-red-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };