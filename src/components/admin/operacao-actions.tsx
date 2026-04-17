import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlayCircle, RotateCcw, Lock, Unlock } from 'lucide-react';

type ActionItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  variant?: 'default' | 'outline';
};

const actions: ActionItem[] = [
  {
    title: 'Reiniciar Monitoramento',
    description: 'Reinicia a camada de supervisão do sistema.',
    icon: RotateCcw,
    variant: 'outline',
  },
  {
    title: 'Ativar Modo Seguro',
    description: 'Bloqueia ações sensíveis e reforça vigilância.',
    icon: Lock,
    variant: 'outline',
  },
  {
    title: 'Liberar Operação',
    description: 'Retoma o fluxo normal da operação.',
    icon: Unlock,
    variant: 'default',
  },
  {
    title: 'Executar Rotina',
    description: 'Dispara a rotina padrão de checagem.',
    icon: PlayCircle,
    variant: 'outline',
  },
];

export function OperacaoActions() {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <Button
            key={action.title}
            type="button"
            variant={action.variant ?? 'outline'}
            className={cn(
              'h-auto flex-col items-start justify-start gap-2 rounded-2xl p-4 text-left',
              action.variant === 'default'
                ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                : 'border-white/10 bg-slate-950/50 text-slate-200 hover:bg-white/10'
            )}
          >
            <action.icon className="h-5 w-5" />
            <span className="font-medium">{action.title}</span>
            <span className="text-xs text-inherit/70">{action.description}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}