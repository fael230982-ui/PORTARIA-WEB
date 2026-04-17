import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Clock, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export type ReportStatus = 'concluido' | 'pendente' | 'critico' | 'informativo';

export type ReportItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  status: ReportStatus;
};

type Props = {
  reports: ReportItem[];
};

const statusMap = {
  concluido: {
    icon: CheckCircle,
    color: 'text-green-400',
    badgeVariant: 'default' as const,
    label: 'Concluído',
  },
  pendente: {
    icon: Clock,
    color: 'text-amber-400',
    badgeVariant: 'outline' as const,
    label: 'Pendente',
  },
  critico: {
    icon: AlertTriangle,
    color: 'text-red-400',
    badgeVariant: 'destructive' as const,
    label: 'Crítico',
  },
  informativo: {
    icon: Info,
    color: 'text-cyan-400',
    badgeVariant: 'secondary' as const,
    label: 'Informativo',
  },
};

export function RelatoriosList({ reports }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatórios Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <FileText className="mb-4 h-14 w-14 text-slate-600" />
            <p className="text-lg font-semibold text-slate-200">Nenhum relatório encontrado</p>
            <p className="mt-1 text-sm">Ajuste os filtros ou aguarde novos eventos.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => {
              const { icon: Icon, color, badgeVariant, label } = statusMap[report.status];
              return (
                <div
                  key={report.id}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-cyan-500/30 hover:bg-white/10"
                >
                  <Icon className={cn('h-5 w-5 shrink-0', color)} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-base font-semibold text-white">{report.title}</h4>
                      <Badge variant={badgeVariant} className="text-[10px] uppercase">
                        {label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{report.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{report.date}</span>
                      <span className="mx-1 text-slate-600">•</span>
                      <span>{report.category}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}