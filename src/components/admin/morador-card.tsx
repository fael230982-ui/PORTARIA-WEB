import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { maskDocument, maskPhone } from '@/features/legal/data-masking';
import { getPersonStatusBadgeClass } from '@/features/people/status-badges';
import { Eye, Edit, MapPin, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Morador = {
  id: string;
  nome: string;
  unidade: string;
  bloco: string;
  telefone: string;
  documento: string;
  categoria: 'proprietario' | 'inquilino' | 'dependente';
  status: 'ativo' | 'inativo' | 'pendente' | 'bloqueado' | 'vencido';
  avatarUrl?: string;
  faceRegistrada: boolean;
};

type MoradorCardProps = {
  morador: Morador;
  onView: (morador: Morador) => void;
  onEdit: (morador: Morador) => void;
  className?: string;
};

const categoriaLabel: Record<Morador['categoria'], string> = {
  proprietario: 'Proprietário',
  inquilino: 'Inquilino',
  dependente: 'Dependente',
};

export function MoradorCard({ morador, onView, onEdit, className }: MoradorCardProps) {
  return (
    <Card className={cn('border-white/10 bg-slate-900/50 text-white shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <Avatar className="h-14 w-14 border border-white/10">
          <AvatarImage src={morador.avatarUrl} alt={morador.nome} />
          <AvatarFallback className="bg-slate-700 text-white">
            {morador.nome.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-lg">{morador.nome}</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            Unidade {morador.unidade} • Bloco {morador.bloco}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className={getPersonStatusBadgeClass(morador.status)}>
            {morador.status}
          </Badge>
          <Badge variant="outline" className="bg-cyan-500/15 text-cyan-300">
            {categoriaLabel[morador.categoria]}
          </Badge>
        </div>

        <div className="space-y-1 text-sm text-slate-300">
          <p>
            <span className="text-slate-400">Telefone:</span> {maskPhone(morador.telefone)}
          </p>
          <p>
            <span className="text-slate-400">Documento:</span> {maskDocument(morador.documento)}
          </p>
        </div>

        {morador.faceRegistrada && (
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Face registrada
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onView(morador)}>
          <Eye className="mr-2 h-4 w-4" />
          Visualizar
        </Button>
        <Button size="sm" onClick={() => onEdit(morador)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </CardFooter>
    </Card>
  );
}
