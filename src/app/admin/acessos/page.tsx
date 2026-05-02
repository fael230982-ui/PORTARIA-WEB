'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, LogIn, LogOut, RefreshCw, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccessLogs } from '@/hooks/use-access-logs';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import type { AccessLog, AccessLogDirection, AccessLogResult } from '@/types/access-log';

type PeriodFilter = '1' | '7' | '30' | 'all';

function getInitialParam(name: string, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleString('pt-BR');
}

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isWithinPeriod(timestamp: string, period: PeriodFilter) {
  if (period === 'all') return true;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (Number(period) - 1));
  return date >= start;
}

function getDirectionLabel(direction: AccessLogDirection) {
  return direction === 'EXIT' ? 'Saída' : 'Entrada';
}

function getResultLabel(result: AccessLogResult) {
  return result === 'DENIED' ? 'Negado' : 'Liberado';
}

function getResultClass(result: AccessLogResult) {
  return result === 'DENIED'
    ? 'border-red-500/30 bg-red-500/10 text-red-100'
    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function matchesSearch(log: AccessLog, search: string) {
  if (!search) return true;
  return [
    log.personName,
    log.cameraName,
    log.userName,
    log.classificationLabel,
    log.classification,
    log.location,
    log.message,
  ]
    .filter(Boolean)
    .some((value) => normalize(value).includes(search));
}

export default function AdminAcessosPage() {
  const { canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'GERENTE', 'MASTER'],
  });

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>(() => {
    const raw = getInitialParam('period', '1');
    return raw === '7' || raw === '30' || raw === 'all' ? raw : '1';
  });
  const [result, setResult] = useState<'all' | AccessLogResult>(() => {
    const raw = getInitialParam('result', 'all').toUpperCase();
    return raw === 'ALLOWED' || raw === 'DENIED' ? raw : 'all';
  });
  const [direction, setDirection] = useState<'all' | AccessLogDirection>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAccessLogs({
    limit: 100,
    result: result === 'all' ? undefined : result,
    direction: direction === 'all' ? undefined : direction,
    enabled: canAccess,
  });

  const logs = data?.data ?? [];
  const filteredLogs = useMemo(() => {
    const normalizedSearch = normalize(search);
    return logs
      .filter((log) => isWithinPeriod(log.timestamp, period))
      .filter((log) => matchesSearch(log, normalizedSearch))
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  }, [logs, period, search]);

  const allowedCount = filteredLogs.filter((log) => log.result === 'ALLOWED').length;
  const deniedCount = filteredLogs.filter((log) => log.result === 'DENIED').length;
  const entryCount = filteredLogs.filter((log) => log.direction === 'ENTRY').length;
  const exitCount = filteredLogs.filter((log) => log.direction === 'EXIT').length;

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando acessos...
      </div>
    );
  }

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Controle de acesso</p>
            <h1 className="mt-2 text-2xl font-semibold">Histórico de acessos</h1>
            <p className="mt-2 text-sm text-slate-400">
              Consulta direta dos logs de entrada e saída registrados pelos equipamentos.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 bg-white text-slate-950 hover:bg-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">No recorte</p>
          <p className="mt-2 text-center text-3xl font-semibold tabular-nums">{isLoading ? '...' : filteredLogs.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-100">
          <p className="text-xs uppercase tracking-[0.16em]">Liberados</p>
          <p className="mt-2 text-center text-3xl font-semibold tabular-nums">{allowedCount}</p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
          <p className="text-xs uppercase tracking-[0.16em]">Negados</p>
          <p className="mt-2 text-center text-3xl font-semibold tabular-nums">{deniedCount}</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-100">
          <p className="text-xs uppercase tracking-[0.16em]">Entrada / saída</p>
          <p className="mt-2 text-center text-3xl font-semibold tabular-nums">{entryCount} / {exitCount}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por pessoa, equipamento, local ou mensagem..."
              className="border-0 bg-transparent p-0 text-white shadow-none placeholder:text-slate-500 focus-visible:ring-0"
            />
          </label>
          <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
            <option value="1">Hoje</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="all">Todos</option>
          </select>
          <select value={result} onChange={(event) => setResult(event.target.value as 'all' | AccessLogResult)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
            <option value="all">Todos os resultados</option>
            <option value="ALLOWED">Liberados</option>
            <option value="DENIED">Negados</option>
          </select>
          <select value={direction} onChange={(event) => setDirection(event.target.value as 'all' | AccessLogDirection)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
            <option value="all">Entrada e saída</option>
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Saída</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setPeriod('1');
              setResult('all');
              setDirection('all');
            }}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
          >
            Limpar
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Registros</h2>
          <p className="text-sm text-slate-400">{filteredLogs.length} acesso(s) exibido(s)</p>
        </div>

        {error ? (
          <div className="p-5 text-sm text-red-100">Não foi possível carregar os acessos agora.</div>
        ) : isLoading ? (
          <div className="p-5 text-sm text-slate-300">Carregando acessos...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-5 text-sm text-slate-300">Nenhum acesso encontrado para os filtros atuais.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredLogs.map((log) => {
              const DirectionIcon = log.direction === 'EXIT' ? LogOut : LogIn;
              const ResultIcon = log.result === 'DENIED' ? XCircle : CheckCircle2;
              return (
                <article key={log.id} className="grid gap-4 px-5 py-4 text-sm lg:grid-cols-[1.2fr_0.9fr_0.8fr_0.7fr] lg:items-center">
                  <div>
                    <p className="font-medium text-white">{log.personName || 'Pessoa não identificada'}</p>
                    <p className="mt-1 text-xs text-slate-400">{log.classificationLabel || log.classification || 'Classificação não informada'}</p>
                  </div>
                  <div className="text-slate-300">
                    <p>{log.cameraName || log.location || 'Equipamento não informado'}</p>
                    {log.userName ? <p className="mt-1 text-xs text-slate-500">Operador: {log.userName}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
                      <DirectionIcon className="h-3.5 w-3.5" />
                      {getDirectionLabel(log.direction)}
                    </span>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${getResultClass(log.result)}`}>
                      <ResultIcon className="h-3.5 w-3.5" />
                      {getResultLabel(log.result)}
                    </span>
                  </div>
                  <div className="text-right text-slate-300">
                    <p>{formatDateTime(log.timestamp)}</p>
                    {log.message ? <p className="mt-1 text-xs text-slate-500">{log.message}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
