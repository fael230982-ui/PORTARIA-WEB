import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Info, Clock } from 'lucide-react';

type LogStatus = 'success' | 'warning' | 'info';

type LogItem = {
  time: string;
  title: string;
  description: string;
  status: LogStatus;
};

type Props = {
  logs: LogItem[];
};

const statusMap = {
  success: {
    icon: CheckCircle2,
    color: 'text-green-400',
    badge: 'default' as const,
    label: 'ok',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    badge: 'destructive' as const,
    label: 'atenção',
  },
  info: {
    icon: Info,
    color: 'text-cyan-400',
    badge: 'secondary' as const,
    label: 'info',
  },
};

export function OperacaoLog({ logs }: Props) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Logs Recorrentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.map((log, index) => {
          const meta = statusMap[log.status];
          const Icon = meta.icon;

          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', meta.color)} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-medium text-white">{log.title}</h4>
                  <Badge variant={meta.badge} className="text-[10px] uppercase">
                    {meta.label}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-400">{log.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{log.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}