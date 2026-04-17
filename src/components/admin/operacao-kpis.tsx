import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Activity, ShieldCheck, Camera, Wifi } from 'lucide-react';

type KpiItem = {
  title: string;
  value: string;
  icon: React.ElementType;
  helper: string;
  colorClass: string;
};

const kpis: KpiItem[] = [
  {
    title: 'Operações Hoje',
    value: '342',
    icon: Activity,
    helper: '+12% vs. ontem',
    colorClass: 'text-cyan-300',
  },
  {
    title: 'Eventos Seguros',
    value: '98.2%',
    icon: ShieldCheck,
    helper: 'Taxa de conformidade',
    colorClass: 'text-green-300',
  },
  {
    title: 'Câmeras Online',
    value: '24/24',
    icon: Camera,
    helper: 'Monitoramento ativo',
    colorClass: 'text-purple-300',
  },
  {
    title: 'Conectividade',
    value: 'Estável',
    icon: Wifi,
    helper: 'Última verificação há 2 min',
    colorClass: 'text-amber-300',
  },
];

export function OperacaoKpis() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((item) => (
        <Card key={item.title} className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{item.title}</CardTitle>
            <item.icon className={cn('h-4 w-4', item.colorClass)} />
          </CardHeader>
          <CardContent>
            <div className="text-center text-2xl font-semibold tabular-nums text-white">{item.value}</div>
            <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
