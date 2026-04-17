'use client';

import { RelatoriosAcessosChart } from './relatorios-acessos-chart';
import { RelatoriosEncomendasChart } from './relatorios-encomendas-chart';
import { RelatoriosAlertasChart } from './relatorios-alertas-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, AlertTriangle } from 'lucide-react';

export function RelatoriosCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="bg-slate-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-blue-400" />
            Acessos por Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RelatoriosAcessosChart />
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5 text-green-400" />
            Encomendas por Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RelatoriosEncomendasChart />
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Alertas por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RelatoriosAlertasChart />
        </CardContent>
      </Card>
    </div>
  );
}