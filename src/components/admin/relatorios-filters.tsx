'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Calendar } from 'lucide-react';

export type ReportCategory = 'todos' | 'acessos' | 'alertas' | 'encomendas' | 'moradores';

type Filters = {
  search: string;
  category: ReportCategory;
  dateFrom: string;
  dateTo: string;
};

type Props = {
  onChange?: (filters: Filters) => void;
};

export function RelatoriosFilters({ onChange }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ReportCategory>('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function emit(next: Filters) {
    onChange?.(next);
  }

  function handleClear() {
    const cleared = { search: '', category: 'todos' as const, dateFrom: '', dateTo: '' };
    setSearch('');
    setCategory('todos');
    setDateFrom('');
    setDateTo('');
    emit(cleared);
  }

  const categoryOptions: Array<{ label: string; value: ReportCategory }> = [
    { label: 'Todos os Tipos', value: 'todos' },
    { label: 'Acessos', value: 'acessos' },
    { label: 'Alertas', value: 'alertas' },
    { label: 'Encomendas', value: 'encomendas' },
    { label: 'Moradores', value: 'moradores' },
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
            emit({ search: value, category, dateFrom, dateTo });
          }}
          placeholder="Buscar por titulo, descricao ou ID..."
          className="border-white/10 bg-slate-950/60 pl-10 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="report-category" className="mb-1 block text-sm text-slate-400">
            Tipo de Relatorio
          </label>
          <select
            id="report-category"
            value={category}
            onChange={(e) => {
              const value = e.target.value as ReportCategory;
              setCategory(value);
              emit({ search, category: value, dateFrom, dateTo });
            }}
            className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date-from" className="mb-1 block text-sm text-slate-400">
            De
          </label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                const value = e.target.value;
                setDateFrom(value);
                emit({ search, category, dateFrom: value, dateTo });
              }}
              className="border-white/10 bg-slate-950/60 pl-10 text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="date-to" className="mb-1 block text-sm text-slate-400">
            Ate
          </label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                const value = e.target.value;
                setDateTo(value);
                emit({ search, category, dateFrom, dateTo: value });
              }}
              className="border-white/10 bg-slate-950/60 pl-10 text-white"
            />
          </div>
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
