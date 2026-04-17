import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, BellRing, Package, Camera } from 'lucide-react';

type KpiItem = {
  title: string;
  value: string;
  icon: React.ElementType;
  badgeText?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  colorClass: string;
};

const kpis: KpiItem[] = [
  {
    title: 'Moradores Ativos',
    value: '128',
    icon: Users,
    colorClass: 'text-cyan-300',
  },
  {
    title: 'Alertas Hoje',
    value: '3',
    icon: BellRing,
    badgeText: '+1 novo',
    badgeVariant: 'destructive',
    colorClass: 'text-red-300',
  },
  {
    title: 'Encomendas Pendentes',
    value: '17',
    icon: Package,
    badgeText: '2 urgentes',
    badgeVariant: 'default',
    colorClass: 'text-amber-300',
  },
  {
    title: 'Câmeras Online',
    value: '24/24',
    icon: Camera,
    colorClass: 'text-green-300',
  },
];

export function DashboardKpis() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {kpi.title}
            </CardTitle>
            <kpi.icon className={cn('h-4 w-4', kpi.colorClass)} />
          </CardHeader>
          <CardContent>
            <div className="text-center text-2xl font-bold tabular-nums text-white">{kpi.value}</div>
            {kpi.badgeText && (
              <Badge variant={kpi.badgeVariant ?? 'default'} className="mt-2 text-xs">
                {kpi.badgeText}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
