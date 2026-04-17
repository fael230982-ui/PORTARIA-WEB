import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { maskEmail } from '@/features/legal/data-masking';
import {
  UsuarioStatus,
  UsuarioStatusBadge,
} from '@/components/admin/usuario-status-badge';
import { Mail, Briefcase, Clock, MoreVertical, Eye, Edit } from 'lucide-react';

type Props = {
  id: string;
  nome: string;
  email: string;
  perfil: 'administrador' | 'gerente' | 'operador';
  status: UsuarioStatus;
  ultimaAtividade: string;
};

export function UsuarioCard({
  id,
  nome,
  email,
  perfil,
  status,
  ultimaAtividade,
}: Props) {
  const perfilLabel = {
    administrador: 'Administrador',
    gerente: 'Gerente',
    operador: 'Operador',
  };

  return (
    <Card className="flex h-full flex-col border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white">{nome}</CardTitle>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Ultima atividade: {ultimaAtividade}
            </p>
          </div>
          <UsuarioStatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-slate-300">
        <div className="text-xs uppercase tracking-wide text-slate-500">ID: {id}</div>

        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-500" />
          <span>
            <span className="text-white">Email:</span> {maskEmail(email)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-slate-500" />
          <span>
            <span className="text-white">Perfil:</span> {perfilLabel[perfil]}
          </span>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-2 pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10"
          >
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10"
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
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
