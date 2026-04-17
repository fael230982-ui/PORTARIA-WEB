import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type UsuarioStatus = 'ativo' | 'inativo' | 'bloqueado' | 'suspenso' | 'pendente';

type Props = {
  status: UsuarioStatus;
  className?: string;
};

export function UsuarioStatusBadge({ status, className }: Props) {
  const map = {
    ativo: 'border-green-500/20 bg-green-500/15 text-green-300',
    inativo: 'border-slate-500/20 bg-slate-500/15 text-slate-300',
    bloqueado: 'border-red-500/20 bg-red-500/15 text-red-300',
    suspenso: 'border-red-500/20 bg-red-500/15 text-red-300',
    pendente: 'border-amber-500/20 bg-amber-500/15 text-amber-300',
  } as const;

  const labels = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    bloqueado: 'Bloqueado',
    suspenso: 'Suspenso',
    pendente: 'Pendente',
  } as const;

  return (
    <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', map[status], className)}>
      {labels[status]}
    </Badge>
  );
}
