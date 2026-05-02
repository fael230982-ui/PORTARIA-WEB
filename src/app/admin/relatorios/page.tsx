'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
  ShieldAlert,
  Activity,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAllPeople } from '@/hooks/use-people';
import { useAlerts } from '@/hooks/use-alerts';
import { useCameras } from '@/hooks/use-cameras';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import { useReports } from '@/hooks/use-reports';
import { createReport, deleteReport, updateReport } from '@/services/reports.service';
import { getAlertTypeLabel } from '@/features/alerts/alert-normalizers';
import { normalizeDeliveryStatus } from '@/features/deliveries/delivery-normalizers';
import { parseShiftHandoverReportMetadata } from '@/features/reports/report-metadata';
import { CrudModal } from '@/components/admin/CrudModal';
import { ReportForm, ReportFormData } from '@/components/admin/ReportForm';
import type { Alert } from '@/types/alert';
import type { Camera } from '@/types/camera';
import type { Person } from '@/types/person';
import type { Report, ShiftHandoverReportMetadata } from '@/types/report';

type PeriodFilter = 'all' | 'today' | 'week' | 'month';

function toDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinPeriod(date: Date, period: PeriodFilter) {
  const now = new Date();

  if (period === 'all') return true;
  if (period === 'today') return date.toDateString() === now.toDateString();

  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo;
  }

  const monthAgo = new Date(now);
  monthAgo.setMonth(now.getMonth() - 1);
  return date >= monthAgo;
}

function normalizeFilterText(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getReportCategoryLabel(category: string) {
  const normalized = normalizeFilterText(category);

  if (normalized === 'access' || normalized === 'acessos') return 'Acessos';
  if (normalized === 'alerts' || normalized === 'alertas') return 'Alertas';
  if (normalized === 'deliveries' || normalized === 'encomendas') return 'Encomendas';
  if (normalized === 'people' || normalized === 'residents' || normalized === 'moradores') return 'Moradores';
  if (normalized === 'operation' || normalized === 'operacao') return 'Operação';
  if (normalized === 'troca de turno' || normalized === 'shift_handover' || normalized === 'operation_shift') return 'Troca de turno';
  if (normalized === 'general' || normalized === 'geral') return 'Geral';

  return category || 'Sem categoria';
}

function getStatusLabel(status: string) {
  const normalized = normalizeFilterText(status);

  if (normalized === 'active' || normalized === 'ativo') return 'Ativo';
  if (normalized === 'inactive' || normalized === 'inativo') return 'Inativo';
  if (normalized === 'blocked' || normalized === 'bloqueado') return 'Bloqueado';
  if (normalized === 'expired' || normalized === 'vencido') return 'Vencido';
  if (normalized === 'online') return 'Online';
  if (normalized === 'offline') return 'Offline';
  if (normalized === 'unread') return 'Novo';
  if (normalized === 'read') return 'Resolvido';

  return status || 'Sem status';
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-center text-3xl font-semibold tabular-nums text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500 text-justify">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
      <h3 className="text-base font-medium text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 text-justify">{description}</p>
    </div>
  );
}

export default function RelatoriosPage() {
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'GERENTE', 'MASTER'],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shiftQuickFilter, setShiftQuickFilter] = useState<'all' | 'with_alerts' | 'with_occurrences'>('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'recent' | 'alerts' | 'occurrences' | 'duration'>('recent');

  const {
    data: peopleData,
    isLoading: peopleLoading,
    error: peopleError,
    refetch: refetchPeople,
  } = useAllPeople({ limit: 100 });

  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useAlerts({ limit: 100 });

  const {
    data: camerasData,
    isLoading: camerasLoading,
    error: camerasError,
    refetch: refetchCameras,
  } = useCameras();
  const {
    data: deliveriesData,
    isLoading: deliveriesLoading,
    refetch: refetchDeliveries,
  } = useAllDeliveries({ limit: 100 });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    isFetching: reportsFetching,
    error: reportsError,
    refetch: refetchReports,
  } = useReports(canAccess);

  const people = useMemo(() => peopleData?.data ?? [], [peopleData]);
  const alerts = useMemo(() => alertsData?.data ?? [], [alertsData]);
  const cameras = useMemo(() => camerasData?.data ?? [], [camerasData]);
  const deliveries = useMemo(() => deliveriesData?.data ?? [], [deliveriesData?.data]);
  const reports = useMemo(() => reportsData?.data ?? [], [reportsData]);
  const reportCategories = useMemo(
    () => Array.from(new Set(reports.map((report) => report.category).filter(Boolean))).sort((a, b) => getReportCategoryLabel(a).localeCompare(getReportCategoryLabel(b), 'pt-BR')),
    [reports]
  );

  const filteredRows = useMemo(() => {
    const search = normalizeFilterText(searchTerm);
    const category = normalizeFilterText(categoryFilter);

    return reports
      .filter((row) => {
      const date = toDate(row.createdAt);
      const shiftMetadata = parseShiftHandoverReportMetadata(row);
      const matchesSearch =
        !search ||
        normalizeFilterText(row.title).includes(search) ||
        normalizeFilterText(row.description).includes(search) ||
        normalizeFilterText(row.category).includes(search) ||
        normalizeFilterText(JSON.stringify(row.metadata ?? {})).includes(search);

      const matchesCategory = category === 'all' || normalizeFilterText(row.category) === category;
      const matchesPeriod = !date ? periodFilter === 'all' : isWithinPeriod(date, periodFilter);
      const matchesShiftQuickFilter =
        shiftQuickFilter === 'all' ||
        (shiftQuickFilter === 'with_alerts' ? Boolean(shiftMetadata && shiftMetadata.summary.alerts > 0) : Boolean(shiftMetadata && shiftMetadata.summary.occurrences > 0));
      const matchesOperator =
        operatorFilter === 'all' ||
        normalizeFilterText(shiftMetadata?.operatorName || '') === normalizeFilterText(operatorFilter);

      return matchesSearch && matchesCategory && matchesPeriod && matchesShiftQuickFilter && matchesOperator;
    })
      .sort((left, right) => {
        if (sortMode === 'recent') {
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }

        const leftShift = parseShiftHandoverReportMetadata(left);
        const rightShift = parseShiftHandoverReportMetadata(right);

        const leftValue =
          sortMode === 'alerts'
            ? leftShift?.summary.alerts ?? -1
            : sortMode === 'occurrences'
              ? leftShift?.summary.occurrences ?? -1
              : leftShift?.durationMinutes ?? -1;
        const rightValue =
          sortMode === 'alerts'
            ? rightShift?.summary.alerts ?? -1
            : sortMode === 'occurrences'
              ? rightShift?.summary.occurrences ?? -1
              : rightShift?.durationMinutes ?? -1;

        if (rightValue !== leftValue) return rightValue - leftValue;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [reports, searchTerm, categoryFilter, periodFilter, shiftQuickFilter, operatorFilter, sortMode]);

  const overview = useMemo(() => {
    const activeCameras = cameras.filter((camera: Camera) => {
      const status = String(camera.status).toLowerCase();
      return ['online', 'active', 'ativo', 'on'].includes(status);
    }).length;

    return {
      totalPeople: people.length,
      externalContacts: people.filter((person) => ['VISITOR', 'SERVICE_PROVIDER', 'RENTER', 'DELIVERER'].includes(person.category)).length,
      totalAlerts: alerts.length,
      totalCameras: cameras.length,
      activeCameras,
      pendingDeliveries: deliveries.filter((delivery) => normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN').length,
    };
  }, [people, alerts, cameras, deliveries]);

  const alertsByCategory = useMemo(() => {
    return alerts.reduce<Record<string, number>>((acc, item: Alert) => {
      const key = String(item.type ?? 'geral');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [alerts]);

  const peopleByStatus = useMemo(() => {
    return people.reduce<Record<string, number>>((acc, item: Person) => {
      const key = String(item.status ?? 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [people]);

  const camerasByStatus = useMemo(() => {
    return cameras.reduce<Record<string, number>>((acc, item: Camera) => {
      const key = String(item.status ?? 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [cameras]);

  const isLoading = peopleLoading || alertsLoading || camerasLoading || deliveriesLoading || reportsLoading;
  const error = peopleError || alertsError || camerasError || reportsError;

  const handleRefresh = () => {
    refetchPeople();
    refetchAlerts();
    refetchCameras();
    refetchDeliveries();
    refetchReports();
  };

  const handleExportCsv = () => {
    if (filteredRows.length === 0 || typeof window === 'undefined') return;

    const headers = [
      'id',
      'titulo',
      'categoria',
      'status',
      'criado_em',
      'operador',
      'condominio',
      'inicio_turno',
      'fim_turno',
      'duracao_minutos',
      'alertas',
      'ocorrencias',
      'entradas',
      'saidas',
      'encomendas_recebidas',
      'encomendas_pendentes',
      'retiradas',
      'locais_alerta',
      'observacoes',
    ];

    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = filteredRows.map((row) => {
      const shiftMetadata = parseShiftHandoverReportMetadata(row);
      return [
        row.id,
        row.title,
        getReportCategoryLabel(row.category),
        getStatusLabel(row.status),
        toDate(row.createdAt)?.toLocaleString('pt-BR') || '',
        shiftMetadata?.operatorName || '',
        shiftMetadata?.condominiumName || '',
        shiftMetadata?.startedAt || '',
        shiftMetadata?.endedAt || '',
        shiftMetadata?.durationMinutes || '',
        shiftMetadata?.summary.alerts || '',
        shiftMetadata?.summary.occurrences || '',
        shiftMetadata?.summary.accessEntries || '',
        shiftMetadata?.summary.accessExits || '',
        shiftMetadata?.summary.receivedDeliveries || '',
        shiftMetadata?.summary.pendingDeliveries || '',
        shiftMetadata?.summary.withdrawnDeliveries || '',
        shiftMetadata?.summary.alertLocations.join(' | ') || '',
        shiftMetadata?.notes || '',
      ]
        .map(escapeCsv)
        .join(';');
    });

    const csv = [headers.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorios-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (filteredRows.length === 0 || typeof window === 'undefined') return;

    const payload = filteredRows.map((row) => ({
      ...row,
      shiftHandover: parseShiftHandoverReportMetadata(row),
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorios-admin-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSaveReport = async (data: ReportFormData) => {
    setSaving(true);

    try {
      if (selectedReport) {
        await updateReport(selectedReport.id, data);
      } else {
        await createReport(data);
      }

      setOpenCreate(false);
      setOpenEdit(false);
      setSelectedReport(null);
      refetchReports();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Report) => {
    setSelectedReport(item);
    setOpenEdit(true);
  };

  const viewedShiftMetadata = useMemo<ShiftHandoverReportMetadata | null>(
    () => (viewReport ? parseShiftHandoverReportMetadata(viewReport) : null),
    [viewReport]
  );
  const shiftReportsCount = useMemo(
    () => reports.filter((report) => Boolean(parseShiftHandoverReportMetadata(report))).length,
    [reports]
  );
  const shiftOverview = useMemo(() => {
    const shiftReports = reports
      .map((report) => parseShiftHandoverReportMetadata(report))
      .filter((item): item is ShiftHandoverReportMetadata => Boolean(item));

    const totalAlerts = shiftReports.reduce((sum, item) => sum + item.summary.alerts, 0);
    const totalOccurrences = shiftReports.reduce((sum, item) => sum + item.summary.occurrences, 0);
    const totalDuration = shiftReports.reduce((sum, item) => sum + item.durationMinutes, 0);
    const operators = new Set(
      shiftReports.map((item) => item.operatorName?.trim()).filter((value): value is string => Boolean(value))
    );

    return {
      totalAlerts,
      totalOccurrences,
      averageDuration: shiftReports.length ? Math.round(totalDuration / shiftReports.length) : 0,
      operators: operators.size,
    };
  }, [reports]);
  const topShiftOperators = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach((report) => {
      const metadata = parseShiftHandoverReportMetadata(report);
      if (!metadata?.operatorName?.trim()) return;
      counts.set(metadata.operatorName.trim(), (counts.get(metadata.operatorName.trim()) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 5);
  }, [reports]);
  const topShiftLocations = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach((report) => {
      const metadata = parseShiftHandoverReportMetadata(report);
      metadata?.summary.alertLocations.forEach((location) => {
        const normalized = location.trim();
        if (!normalized) return;
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 6);
  }, [reports]);
  const filteredShiftOverview = useMemo(() => {
    const shiftReports = filteredRows
      .map((report) => parseShiftHandoverReportMetadata(report))
      .filter((item): item is ShiftHandoverReportMetadata => Boolean(item));

    return {
      count: shiftReports.length,
      alerts: shiftReports.reduce((sum, item) => sum + item.summary.alerts, 0),
      occurrences: shiftReports.reduce((sum, item) => sum + item.summary.occurrences, 0),
      averageDuration: shiftReports.length
        ? Math.round(shiftReports.reduce((sum, item) => sum + item.durationMinutes, 0) / shiftReports.length)
        : 0,
    };
  }, [filteredRows]);
  const filteredReportsByDay = useMemo(() => {
    const counts = new Map<string, number>();

    filteredRows.forEach((report) => {
      const date = toDate(report.createdAt);
      if (!date) return;
      const key = date.toLocaleDateString('pt-BR');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a[0].split('/');
        const [dayB, monthB, yearB] = b[0].split('/');
        return new Date(`${yearB}-${monthB}-${dayB}`).getTime() - new Date(`${yearA}-${monthA}-${dayA}`).getTime();
      })
      .slice(0, 7);
  }, [filteredRows]);
  const activeFiltersSummary = useMemo(() => {
    const parts = [
      categoryFilter !== 'all' ? `categoria: ${getReportCategoryLabel(categoryFilter)}` : null,
      periodFilter !== 'all'
        ? `periodo: ${
            periodFilter === 'today'
              ? 'hoje'
              : periodFilter === 'week'
                ? 'esta semana'
                : 'este mês'
          }`
        : null,
      shiftQuickFilter !== 'all'
        ? `foco: ${shiftQuickFilter === 'with_alerts' ? 'turnos com alertas' : 'turnos com ocorrências'}`
        : null,
      operatorFilter !== 'all' ? `porteiro: ${operatorFilter}` : null,
      sortMode !== 'recent'
        ? `ordenação: ${
            sortMode === 'alerts'
              ? 'mais alertas'
              : sortMode === 'occurrences'
                ? 'mais ocorrências'
                : 'maior duração'
          }`
        : null,
    ].filter(Boolean);

    return parts.length ? parts.join(' | ') : 'Sem filtros adicionais';
  }, [categoryFilter, operatorFilter, periodFilter, shiftQuickFilter, sortMode]);

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Deseja excluir este relatório?');
    if (!confirmDelete) return;

    await deleteReport(id);
    refetchReports();
  };

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando relatórios...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Relatórios
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Visão operacional consolidada
          </h1>
          <p className="mt-2 text-sm text-slate-400 text-justify">
            Indicadores em tempo real para acompanhar a operação e apoiar decisões.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedReport(null);
              setOpenCreate(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar JSON
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Pessoas"
          value={isLoading ? '...' : String(overview.totalPeople)}
          subtitle="Base total carregada"
          icon={Activity}
        />
        <StatCard
          title="Visitantes e prestadores"
          value={isLoading ? '...' : String(overview.externalContacts)}
          subtitle="Cadastros temporários"
          icon={ShieldAlert}
        />
        <StatCard
          title="Encomendas pendentes"
          value={isLoading ? '...' : String(overview.pendingDeliveries)}
          subtitle="Aguardando retirada"
          icon={BarChart3}
        />
        <StatCard
          title="Alertas"
          value={isLoading ? '...' : String(overview.totalAlerts)}
          subtitle="Eventos monitorados"
          icon={CheckCircle2}
        />
        <StatCard
          title="Trocas de turno"
          value={reportsLoading ? '...' : String(shiftReportsCount)}
          subtitle="Relatórios de plantão"
          icon={ShieldAlert}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-100">Alertas em turnos</p>
          <p className="mt-3 text-center text-3xl font-semibold tabular-nums text-white">{shiftOverview.totalAlerts}</p>
          <p className="mt-2 text-center text-xs text-cyan-100/80">Somatório dos relatórios de troca de turno.</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-100">Ocorrências em turnos</p>
          <p className="mt-3 text-center text-3xl font-semibold tabular-nums text-white">{shiftOverview.totalOccurrences}</p>
          <p className="mt-2 text-center text-xs text-amber-100/80">Ocorrências registradas durante os plantões.</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Duração média</p>
          <p className="mt-3 text-center text-3xl font-semibold tabular-nums text-white">{shiftOverview.averageDuration} min</p>
          <p className="mt-2 text-center text-xs text-emerald-100/80">Média dos turnos fechados no histórico.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Porteiros no histórico</p>
          <p className="mt-3 text-center text-3xl font-semibold tabular-nums text-white">{shiftOverview.operators}</p>
          <p className="mt-2 text-center text-xs text-slate-500">Operadores identificados nas trocas de turno.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Turnos filtrados" value={String(filteredShiftOverview.count)} subtitle="Recorte atual" icon={ShieldAlert} />
        <StatCard title="Alertas filtrados" value={String(filteredShiftOverview.alerts)} subtitle="Somatório do recorte" icon={CheckCircle2} />
        <StatCard title="Ocorrências filtradas" value={String(filteredShiftOverview.occurrences)} subtitle="Somatório do recorte" icon={BarChart3} />
        <StatCard title="Duração média" value={`${filteredShiftOverview.averageDuration} min`} subtitle="Turnos no recorte" icon={Activity} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{activeFiltersSummary}</span>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setPeriodFilter('all');
              setCategoryFilter('all');
              setShiftQuickFilter('all');
              setOperatorFilter('all');
              setSortMode('recent');
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
          >
            Limpar todos os filtros
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Porteiros com mais turnos</h2>
          <div className="mt-4 space-y-3">
            {topShiftOperators.length === 0 ? (
              <p className="text-sm text-slate-400">Ainda não há trocas de turno suficientes para ranking.</p>
            ) : (
              topShiftOperators.map(([operator, count]) => (
                <div key={operator} className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3">
                  <span className="text-sm text-slate-200">{operator}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Locais com mais alertas em turnos</h2>
          <div className="mt-4 space-y-3">
            {topShiftLocations.length === 0 ? (
              <p className="text-sm text-slate-400">Ainda não há locais registrados nos relatórios de turno.</p>
            ) : (
              topShiftLocations.map(([location, count]) => (
                <div key={location} className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3">
                  <span className="text-sm text-slate-200">{location}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Volume por dia no recorte</h2>
          <div className="mt-4 space-y-3">
            {filteredReportsByDay.length === 0 ? (
              <p className="text-sm text-slate-400">Sem volume diário suficiente no recorte atual.</p>
            ) : (
              filteredReportsByDay.map(([day, count]) => (
                <div key={day} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-200">{day}</span>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (count / Math.max(filteredReportsByDay[0]?.[1] ?? 1, 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Leitura do recorte</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recorte ativo</p>
              <p className="mt-2 text-sm text-slate-200">{activeFiltersSummary}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Exportações prontas para BI</p>
              <p className="mt-2 text-sm text-emerald-50">
                CSV para uso rápido e JSON estruturado para análises, ETL ou futuro Power BI.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              categoryFilter === 'all' ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('Troca de turno')}
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              normalizeFilterText(categoryFilter) === normalizeFilterText('Troca de turno')
                ? 'bg-cyan-300 text-slate-950'
                : 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20'
            }`}
          >
            Troca de turno
          </button>
          <button
            type="button"
            onClick={() => setShiftQuickFilter('with_alerts')}
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              shiftQuickFilter === 'with_alerts'
                ? 'bg-amber-300 text-slate-950'
                : 'border border-amber-400/20 bg-amber-400/10 text-amber-50 hover:bg-amber-400/20'
            }`}
          >
            Turnos com alertas
          </button>
          <button
            type="button"
            onClick={() => setShiftQuickFilter('with_occurrences')}
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              shiftQuickFilter === 'with_occurrences'
                ? 'bg-rose-300 text-slate-950'
                : 'border border-rose-400/20 bg-rose-400/10 text-rose-50 hover:bg-rose-400/20'
            }`}
          >
            Turnos com ocorrências
          </button>
          <button
            type="button"
            onClick={() => setShiftQuickFilter('all')}
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              shiftQuickFilter === 'all'
                ? 'bg-white text-slate-950'
                : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            Limpar foco
          </button>
        </div>

        <div className="mb-4 max-w-sm">
          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="all">Todos os porteiros</option>
              {topShiftOperators.map(([operator]) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-5 grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar eventos..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>

          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="all">Todos os períodos</option>
              <option value="today">Hoje</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mês</option>
            </select>
          </label>

          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="all">Todas as categorias</option>
              {reportCategories.map((key) => (
                <option key={key} value={key}>
                  {getReportCategoryLabel(key)}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'recent' | 'alerts' | 'occurrences' | 'duration')}
              className="w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="recent">Mais recentes</option>
              <option value="alerts">Mais alertas</option>
              <option value="occurrences">Mais ocorrências</option>
              <option value="duration">Maior duração</option>
            </select>
          </label>
        </div>

        {reportsFetching ? (
          <EmptyState
            title="Atualizando relatórios"
            description="Aguarde a atualização mais recente para evitar dados antigos em tela."
          />
        ) : error ? (
          <EmptyState
            title="Não foi possível carregar os dados"
            description="Confira seu acesso e tente novamente em instantes."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="Nenhum relatório encontrado"
            description="Tente alterar os filtros ou cadastre um novo relatório."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-400">
              <div className="col-span-3">Título</div>
              <div className="col-span-4">Descrição</div>
              <div className="col-span-2">Data</div>
              <div className="col-span-2">Categoria</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>

            <div className="divide-y divide-white/10">
              {filteredRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 items-center px-4 py-4 text-sm">
                  <div className="col-span-3 font-medium text-white">{row.title}</div>
                  <div className="col-span-4 text-slate-300">
                    {(() => {
                      const shiftMetadata = parseShiftHandoverReportMetadata(row);
                      if (shiftMetadata) {
                        return `${shiftMetadata.operatorName || 'Operador'} | ${shiftMetadata.summary.alerts} alertas | ${shiftMetadata.summary.occurrences} ocorrências`;
                      }
                      return row.description;
                    })()}
                  </div>
                  <div className="col-span-2 text-slate-400">
                    {toDate(row.createdAt)?.toLocaleString('pt-BR') || '—'}
                  </div>
                  <div className="col-span-2">
                    <span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                      {getReportCategoryLabel(row.category)}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewReport(row)}
                        className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/15"
                        aria-label="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/15"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/15"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Alertas por categoria</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(alertsByCategory).length === 0 ? (
              <p className="text-sm text-slate-400">Sem categorias disponíveis.</p>
            ) : (
              Object.entries(alertsByCategory).map(([cat, count]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3"
                >
                  <span className="text-sm text-slate-200">{getAlertTypeLabel(cat)}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Pessoas por status</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(peopleByStatus).length === 0 ? (
              <p className="text-sm text-slate-400">Sem dados disponíveis.</p>
            ) : (
              Object.entries(peopleByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3"
                >
                  <span className="text-sm text-slate-200">{getStatusLabel(status)}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Câmeras por status</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(camerasByStatus).length === 0 ? (
              <p className="text-sm text-slate-400">Sem dados disponíveis.</p>
            ) : (
              Object.entries(camerasByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3"
                >
                  <span className="text-sm text-slate-200">{getStatusLabel(status)}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <CrudModal
        open={Boolean(viewReport)}
        title="Detalhes do relatório"
        description="Consulta administrativa e histórico operacional."
        onClose={() => setViewReport(null)}
        maxWidth="xl"
      >
        {viewReport ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Título</p>
                <p className="mt-2 text-sm font-medium text-white">{viewReport.title}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Categoria</p>
                <p className="mt-2 text-sm font-medium text-white">{getReportCategoryLabel(viewReport.category)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Criado em</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {toDate(viewReport.createdAt)?.toLocaleString('pt-BR') || '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                <p className="mt-2 text-sm font-medium text-white">{getStatusLabel(viewReport.status)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Descrição</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{viewReport.description}</p>
            </div>

            {viewedShiftMetadata ? (
              <div className="space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Troca de turno</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {viewedShiftMetadata.operatorName || 'Operador não identificado'} |{' '}
                      {viewedShiftMetadata.condominiumName || 'Base operacional'}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-50">
                    {viewedShiftMetadata.durationMinutes} min
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Início</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {toDate(viewedShiftMetadata.startedAt)?.toLocaleString('pt-BR') || '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Fim</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {toDate(viewedShiftMetadata.endedAt)?.toLocaleString('pt-BR') || '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Alertas</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.alerts}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Ocorrências</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.occurrences}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Entradas</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.accessEntries}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Saídas</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.accessExits}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Encomendas recebidas</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.receivedDeliveries}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Pendentes</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.pendingDeliveries}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Retiradas</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.withdrawnDeliveries}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Visitantes</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.visitors}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Prestadores</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.serviceProviders}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Moradores ativos</p>
                    <p className="mt-2 text-sm font-medium text-white">{viewedShiftMetadata.summary.activeResidents}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Locais dos alertas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {viewedShiftMetadata.summary.alertLocations.length > 0 ? (
                      viewedShiftMetadata.summary.alertLocations.map((location) => (
                        <span
                          key={location}
                          className="rounded-full border border-amber-400/25 bg-amber-400/12 px-3 py-1 text-xs text-amber-100"
                        >
                          {location}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">Sem local de alerta registrado.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Observações</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                    {viewedShiftMetadata.notes?.trim() || 'Sem observações registradas para a passagem.'}
                  </p>
                </div>
              </div>
            ) : viewReport.metadata ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Metadados</p>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(viewReport.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </CrudModal>

      <CrudModal
        open={openCreate}
        title="Novo relatório"
        description="Preencha os campos para salvar o relatório."
        onClose={() => setOpenCreate(false)}
        footer={null}
      >
        <ReportForm
          key="create-report"
          onSubmit={handleSaveReport}
          onCancel={() => setOpenCreate(false)}
          loading={saving}
        />
      </CrudModal>

      <CrudModal
        open={openEdit}
        title="Editar relatório"
        description="Atualize os dados e salve as alterações."
        onClose={() => setOpenEdit(false)}
        footer={null}
      >
        <ReportForm
          key={selectedReport?.id ?? 'edit-report'}
          initialData={
            selectedReport
              ? {
                  title: selectedReport.title,
                  description: selectedReport.description,
                  category: selectedReport.category,
                  status: selectedReport.status,
                  priority: selectedReport.priority,
                  visibility: selectedReport.visibility,
                }
              : undefined
          }
          onSubmit={handleSaveReport}
          onCancel={() => setOpenEdit(false)}
          loading={saving}
        />
      </CrudModal>
    </div>
  );
}
