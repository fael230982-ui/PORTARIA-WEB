import * as React from 'react';
import { cn } from '@/lib/utils';

type StatusBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  status?: 'ativo' | 'inativo' | 'pendente' | 'bloqueado' | 'online' | 'offline';
};

const statusClasses: Record<string, string> = {
  ativo: 'bg-green-500/15 text-green-300 border border-green-500/30',
  inativo: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  pendente: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  bloqueado: 'bg-red-500/15 text-red-300 border border-red-500/30',
  online: 'bg-green-500/15 text-green-300 border border-green-500/30',
  offline: 'bg-red-500/15 text-red-300 border border-red-500/30',
};

export function StatusBadge({
  status = 'pendente',
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        statusClasses[status] ?? statusClasses.pendente,
        className
      )}
      {...props}
    >
      {children ?? status}
    </span>
  );
}