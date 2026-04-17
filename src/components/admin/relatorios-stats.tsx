import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BarChart3, AlertTriangle, PackageCheck, UserCheck } from 'lucide-react';

type StatItem = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
};

const stats: StatItem[] = [
  {
    title: 'Total de Eventos',
    value: '1.250',
    description: 'Eventos registrados no período',
    icon: BarChart3,
    colorClass: 'text-cyan-300',
  },
  {
    title: 'Alertas Críticos',
    value: '12',
    description: 'Alertas de alta prioridade',
    icon: AlertTriangle,
    colorClass: 'text-red-300',
  },
  {
    title: 'Entregas Concluídas',
    value: '85',
    description: 'Encomendas entregues hoje',
    icon: PackageCheck,
    colorClass: 'text-green-300',
  },
  {
    title: 'Acessos do Dia',
    value: '230',
    description: 'Entradas e saídas registradas',
    icon: UserCheck,
    colorClass: 'text-purple-300',
  },
];

export function RelatoriosStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {stat.title}
            </CardTitle>
            <stat.icon className={cn('h-4 w-4', stat.colorClass)} />
          </CardHeader>
          <CardContent>
            <div className="text-center text-2xl font-bold tabular-nums text-white">{stat.value}</div>
            <p className="text-xs text-slate-500">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
