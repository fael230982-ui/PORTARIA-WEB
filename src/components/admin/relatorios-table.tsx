import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Eye, Trash2, Clock, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Relatorio = {
  id: string;
  tipo: string;
  data: Date;
  descricao: string;
  status: 'completo' | 'em andamento';
  totalRegistros: number;
  alertas: number;
  tamanho: string;
  criadoPor: string;
};

type TableProps = {
  relatorios: Relatorio[];
};

export function RelatoriosTable({ relatorios }: TableProps) {
  const statusConfig = {
    completo: { label: 'Completo', color: 'bg-green-500/20 text-green-300', icon: CheckCircle },
    'em andamento': { label: 'Em andamento', color: 'bg-yellow-500/20 text-yellow-300', icon: Clock },
  } as const;

  if (relatorios.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Nenhum relatório encontrado</h3>
          <p className="text-sm text-slate-400">Ajuste os filtros ou crie um novo relatório</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-800/50">
          <tr>
            <th className="p-4 text-left text-sm font-medium text-white">Tipo</th>
            <th className="p-4 text-left text-sm font-medium text-white">Descrição</th>
            <th className="p-4 text-left text-sm font-medium text-white">Data</th>
            <th className="p-4 text-left text-sm font-medium text-white">Status</th>
            <th className="p-4 text-left text-sm font-medium text-white">Registros</th>
            <th className="p-4 text-left text-sm font-medium text-white">Alertas</th>
            <th className="p-4 text-left text-sm font-medium text-white">Tamanho</th>
            <th className="p-4 text-left text-sm font-medium text-white">Criado por</th>
            <th className="p-4 text-left text-sm font-medium text-white">Ações</th>
          </tr>
        </thead>
        <tbody>
          {relatorios.map((relatorio) => {
            const config = statusConfig[relatorio.status];
            const Icon = config.icon;
            
            return (
              <tr key={relatorio.id} className="border-b border-white/5 hover:bg-slate-800/50">
                <td className="p-4">
                  <Badge className={`capitalize ${relatorio.tipo === 'Acessos' ? 'bg-blue-500/20 text-blue-300' : relatorio.tipo === 'Encomendas' ? 'bg-green-500/20 text-green-300' : relatorio.tipo === 'Alertas' ? 'bg-red-500/20 text-red-300' : 'bg-purple-500/20 text-purple-300'}`}>
                    {relatorio.tipo}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="max-w-xs">
                    <p className="font-medium text-white">{relatorio.descricao}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm text-cyan-300">
                    {format(relatorio.data, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${relatorio.status === 'completo' ? 'text-green-400' : 'text-yellow-400'}`} />
                    <span className={`capitalize text-sm ${relatorio.status === 'completo' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {config.label}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className="bg-slate-800 text-white">
                    {relatorio.totalRegistros.toLocaleString()}
                  </Badge>
                </td>
                <td className="p-4">
                  {relatorio.alertas > 0 ? (
                    <Badge variant="destructive" className="animate-pulse">
                      {relatorio.alertas}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                      0
                    </Badge>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-sm text-slate-300">{relatorio.tamanho}</span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-white">{relatorio.criadoPor}</span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
