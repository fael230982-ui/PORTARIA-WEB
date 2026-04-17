"use client";

import { Search } from "lucide-react";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
};

const categories = [
  { value: "ALL", label: "Tudo" },
  { value: "RESIDENT", label: "Moradores" },
  { value: "VISITOR", label: "Visitantes" },
  { value: "SERVICE_PROVIDER", label: "Prestadores" },
  { value: "RENTER", label: "Locatarios" },
  { value: "DELIVERER", label: "Entregadores" },
];

const statuses = [
  { value: "ALL", label: "Todos os status" },
  { value: "ACTIVE", label: "Ativos" },
  { value: "INACTIVE", label: "Inativos" },
  { value: "BLOCKED", label: "Bloqueados" },
  { value: "EXPIRED", label: "Vencidos" },
];

export function PeopleFilters({
  search,
  setSearch,
  category,
  setCategory,
  status,
  setStatus,
}: Props) {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900 p-5">
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, documento ou unidade..."
          className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => {
            const active = category === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-blue-500/30 bg-blue-500/15 text-white"
                    : "border-white/10 bg-slate-950 text-slate-300 hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="xl:ml-auto">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
