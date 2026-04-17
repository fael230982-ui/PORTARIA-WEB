import { Badge } from '@/components/ui/badge';
import { Clock, Check, Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EncomendaStatus = 'pendente' | 'entregue' | 'retirada' | 'cancelada';

type Props = {
  status: EncomendaStatus;
  className?: string;
};

const statusConfig = {
  pendente: {
    label: 'Aguardando retirada',
    variant: 'default' as const,
    icon: Clock,
  },
  entregue: {
    label: 'Aviso enviado',
    variant: 'secondary' as const,
    icon: Check,
  },
  retirada: {
    label: 'Retirada',
    variant: 'outline' as const,
    icon: Truck,
  },
  cancelada: {
    label: 'Cancelada',
    variant: 'destructive' as const,
    icon: X,
  },
};

export function EncomendaStatusBadge({ status, className }: Props) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn('text-xs uppercase', className)}>
      <Icon className={cn('mr-1 h-3 w-3', config.variant === 'destructive' ? 'text-white' : 'text-current')} />
      {config.label}
    </Badge>
  );
}
