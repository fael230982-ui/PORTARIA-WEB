'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

type Props = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
};

export function MoradoresFilters({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
}: Props) {
  return (
    <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/50 p-4 lg:grid-cols-4">
      <div className="relative lg:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, unidade ou documento"
          className="border-white/10 bg-slate-800 pl-10 text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">Categoria</label>
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-10 w-full rounded-md border border-white/10 bg-slate-800 px-3 text-sm text-white outline-none"
        >
          <option value="todos">Todas as categorias</option>
          <option value="proprietario">Proprietário</option>
          <option value="inquilino">Inquilino</option>
          <option value="dependente">Dependente</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-10 w-full rounded-md border border-white/10 bg-slate-800 px-3 text-sm text-white outline-none"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="inativo">Inativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      <div className="flex items-end justify-end lg:col-span-4">
        <Button variant="outline" onClick={onClearFilters} className="border-white/10">
          <X className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
}