import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  EncomendaStatus,
  EncomendaStatusBadge,
} from '@/components/admin/encomenda-status-badge';
import { Clock, Home, MoreVertical, Package, Check, X, User } from 'lucide-react';

type Props = {
  id: string;
  remetente: string;
  destinatario: string;
  apartamento: string;
  bloco: string;
  status: EncomendaStatus;
  horarioRegistro: string;
  codigoRastreio?: string;
};

export function EncomendaCard({
  id,
  remetente,
  destinatario,
  apartamento,
  bloco,
  status,
  horarioRegistro,
  codigoRastreio,
}: Props) {
  return (
    <Card className="flex h-full flex-col border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white">Encomenda #{id}</CardTitle>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Registrada em {horarioRegistro}
            </p>
          </div>
          <EncomendaStatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-500" />
          <span>
            <span className="text-white">Remetente:</span> {remetente}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          <span>
            <span className="text-white">Destinatário:</span> {destinatario}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-slate-500" />
          <span>
            <span className="text-white">Local:</span> Bloco {bloco}, Ap. {apartamento}
          </span>
        </div>

        {codigoRastreio ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
            <span className="text-slate-200">Rastreio:</span> {codigoRastreio}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-2 pt-4">
        <div className="flex gap-2">
          {status === 'pendente' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10"
              >
                <Check className="mr-2 h-4 w-4" />
                Entregar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10"
              >
                <X className="mr-2 h-4 w-4" />
                Devolver
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10"
            >
              Ver detalhes
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
