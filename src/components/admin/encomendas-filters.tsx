'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

type Props = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  transportadoraFilter: string;
  onTransportadoraChange: (value: string) => void;
  onClearFilters: () => void;
};

export function EncomendasFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  transportadoraFilter,
  onTransportadoraChange,
  onClearFilters,
}: Props) {
  return (
    <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/50 p-4 lg:grid-cols-4">
      <div className="relative lg:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por morador, remetente ou ID"
          className="border-white/10 bg-slate-800 pl-10 text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-10 w-full rounded-md border border-white/10 bg-slate-800 px-3 text-sm text-white outline-none"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Aguardando retirada</option>
          <option value="entregue">Aviso enviado</option>
          <option value="retirada">Retirada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">Transportadora</label>
        <select
          value={transportadoraFilter}
          onChange={(e) => onTransportadoraChange(e.target.value)}
          className="h-10 w-full rounded-md border border-white/10 bg-slate-800 px-3 text-sm text-white outline-none"
        >
          <option value="todas">Todas as transportadoras</option>
          <option value="correios">Correios</option>
          <option value="sedex">Sedex</option>
          <option value="jadlog">Jadlog</option>
          <option value="outros">Outros</option>
        </select>
      </div>

      <div className="flex items-end justify-end lg:col-span-4">
        <Button variant="outline" onClick={onClearFilters} className="border-white/10">
          <X className="mr-2 h-4 w-4" />
          Limpar Filtros
        </Button>
      </div>
    </div>
  );
}
