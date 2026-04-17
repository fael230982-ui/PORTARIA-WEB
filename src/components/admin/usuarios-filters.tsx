'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export type UserProfile = 'todos' | 'administrador' | 'gerente' | 'operador';
export type UserStatus = 'todos' | 'ativo' | 'inativo' | 'bloqueado' | 'pendente';

type Filters = {
  search: string;
  status: UserStatus;
  profile: UserProfile;
};

type Props = {
  onChange?: (filters: Filters) => void;
};

export function UsuariosFilters({ onChange }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus>('todos');
  const [profile, setProfile] = useState<UserProfile>('todos');

  function emit(nextSearch = search, nextStatus = status, nextProfile = profile) {
    onChange?.({ search: nextSearch, status: nextStatus, profile: nextProfile });
  }

  function handleClear() {
    const cleared = { search: '', status: 'todos' as const, profile: 'todos' as const };
    setSearch('');
    setStatus('todos');
    setProfile('todos');
    onChange?.(cleared);
  }

  const statusOptions: Array<{ label: string; value: UserStatus }> = [
    { label: 'Todos os Status', value: 'todos' },
    { label: 'Ativo', value: 'ativo' },
    { label: 'Inativo', value: 'inativo' },
    { label: 'Bloqueado', value: 'bloqueado' },
    { label: 'Pendente', value: 'pendente' },
  ];

  const profileOptions: Array<{ label: string; value: UserProfile }> = [
    { label: 'Todos os Perfis', value: 'todos' },
    { label: 'Administrador', value: 'administrador' },
    { label: 'Gerente', value: 'gerente' },
    { label: 'Operador', value: 'operador' },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            emit(value, status, profile);
          }}
          placeholder="Buscar por nome, e-mail ou funcao..."
          className="border-white/10 bg-slate-950/60 pl-10 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="user-status" className="mb-1 block text-sm text-slate-400">
            Status
          </label>
          <select
            id="user-status"
            value={status}
            onChange={(e) => {
              const value = e.target.value as UserStatus;
              setStatus(value);
              emit(search, value, profile);
            }}
            className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="user-profile" className="mb-1 block text-sm text-slate-400">
            Perfil
          </label>
          <select
            id="user-profile"
            value={profile}
            onChange={(e) => {
              const value = e.target.value as UserProfile;
              setProfile(value);
              emit(search, status, value);
            }}
            className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          >
            {profileOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="rounded-full border-white/10 bg-slate-950/60 text-slate-300 hover:bg-white/10"
        >
          <X className="mr-2 h-4 w-4" />
          Limpar Filtros
        </Button>
      </div>
    </div>
  );
}
