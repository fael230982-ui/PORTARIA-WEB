'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertsPanel } from '@/components/alerts/alerts-panel';
import { getPersonStatusBadgeClass } from '@/features/people/status-badges';
import { useOfflineOperationQueue } from '@/hooks/use-offline-operation-queue';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAllPeople } from '@/hooks/use-people';
import { useAlerts } from '@/hooks/use-alerts';
import { useCameras } from '@/hooks/use-cameras';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import { useVehicles } from '@/hooks/use-vehicles';
import { normalizeDeliveryStatus } from '@/features/deliveries/delivery-normalizers';
import { maskEmail } from '@/features/legal/data-masking';
import { getCondominiumEnabledModules, getCurrentCondominium } from '@/features/condominiums/condominium-contract';
import { brandClasses } from '@/config/brand-classes';
import type { Alert } from '@/types/alert';
import type { Camera } from '@/types/camera';
import type { Person } from '@/types/person';
import type { Vehicle } from '@/types/vehicle';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';

type AdminSnapshotCache = {
  people: Person[];
  alerts: Alert[];
  cameras: Camera[];
  deliveries: Array<{ id: string; status: string }>;
  vehicles: Vehicle[];
  cachedAt: string | null;
};

const EMPTY_ADMIN_SNAPSHOT: AdminSnapshotCache = {
  people: [],
  alerts: [],
  cameras: [],
  deliveries: [],
  vehicles: [],
  cachedAt: null,
};

function getAdminSnapshotKey(userId?: string | null) {
  return userId ? `admin-dashboard-snapshot:${userId}` : null;
}

function readAdminSnapshot(userId?: string | null): AdminSnapshotCache {
  if (typeof window === 'undefined') {
    return EMPTY_ADMIN_SNAPSHOT;
  }

  const key = getAdminSnapshotKey(userId);
  if (!key) {
    return EMPTY_ADMIN_SNAPSHOT;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY_ADMIN_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<AdminSnapshotCache>;
    return {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      cameras: Array.isArray(parsed.cameras) ? parsed.cameras : [],
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      cachedAt: typeof parsed.cachedAt === 'string' ? parsed.cachedAt : null,
    };
  } catch {
    return EMPTY_ADMIN_SNAPSHOT;
  }
}

function sanitizeSnapshotPeople(people: Person[]): Person[] {
  return people.slice(0, 40).map((person) => ({
    id: person.id,
    name: person.name,
    category: person.category,
    categoryLabel: person.categoryLabel,
    status: person.status,
    statusLabel: person.statusLabel,
  })) as Person[];
}

function sanitizeSnapshotAlerts(alerts: Alert[]): Alert[] {
  return alerts.slice(0, 20).map((alert) => ({
    id: alert.id,
    alertId: alert.alertId,
    title: alert.title,
    description: alert.description,
    type: alert.type,
    status: alert.status,
    severity: alert.severity,
    timestamp: alert.timestamp,
    cameraId: alert.cameraId,
    location: alert.location,
    readAt: alert.readAt,
    snapshotUrl: alert.snapshotUrl,
    thumbnailUrl: alert.thumbnailUrl,
    imageUrl: alert.imageUrl,
    replayUrl: alert.replayUrl,
    workflow: alert.workflow,
    payload: null,
  })) as Alert[];
}

function sanitizeSnapshotCameras(cameras: Camera[]): Camera[] {
  return cameras.slice(0, 20).map((camera) => ({
    id: camera.id,
    name: camera.name,
    location: camera.location,
    status: camera.status,
  })) as Camera[];
}

function sanitizeSnapshotVehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.slice(0, 20).map((vehicle) => ({
    id: vehicle.id,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    color: vehicle.color,
    type: vehicle.type,
    status: vehicle.status,
    condominiumName: vehicle.condominiumName,
    structureLabel: vehicle.structureLabel,
    unitLabel: vehicle.unitLabel,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  })) as Vehicle[];
}

function buildAdminSnapshot(params: {
  people: Person[];
  alerts: Alert[];
  cameras: Camera[];
  deliveries: Array<{ id: string; status: string }>;
  vehicles: Vehicle[];
}): AdminSnapshotCache {
  return {
    people: sanitizeSnapshotPeople(params.people),
    alerts: sanitizeSnapshotAlerts(params.alerts),
    cameras: sanitizeSnapshotCameras(params.cameras),
    deliveries: params.deliveries.slice(0, 40).map((delivery) => ({
      id: delivery.id,
      status: delivery.status,
    })),
    vehicles: sanitizeSnapshotVehicles(params.vehicles),
    cachedAt: new Date().toISOString(),
  };
}

function getAdminSnapshotSignature(snapshot: AdminSnapshotCache) {
  return JSON.stringify({
    people: snapshot.people,
    alerts: snapshot.alerts,
    cameras: snapshot.cameras,
    deliveries: snapshot.deliveries,
    vehicles: snapshot.vehicles,
  });
}

function persistAdminSnapshot(userId: string, snapshot: AdminSnapshotCache) {
  if (typeof window === 'undefined') return false;

  const key = getAdminSnapshotKey(userId);
  if (!key) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        window.localStorage.removeItem(key);
        window.localStorage.setItem(key, JSON.stringify(snapshot));
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

function getPersonCategoryLabel(category?: string | null, categoryLabel?: string | null) {
  if (categoryLabel && categoryLabel !== category) return categoryLabel;

  switch (category) {
    case 'RESIDENT':
      return 'Morador';
    case 'VISITOR':
      return 'Visitante';
    case 'SERVICE_PROVIDER':
      return 'Prestador';
    case 'DELIVERER':
      return 'Entregador';
    case 'RENTER':
      return 'Locatário';
    default:
      return category || 'Pessoa';
  }
}

function getCameraStatusLabel(status?: string | null) {
  return String(status ?? '').toLowerCase() === 'online' ? 'Online' : 'Offline';
}

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
};

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-center text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400 text-justify">{helper}</p>
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
      <h3 className="text-base font-medium text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 text-justify">{description}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN'],
  });
  const [peopleCategoryFilter, setPeopleCategoryFilter] = useState('all');
  const snapshotSignatureRef = useRef(getAdminSnapshotSignature(EMPTY_ADMIN_SNAPSHOT));
  const { condominiums } = useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);
  const {
    pendingCount: offlinePendingCount,
    failedCount: offlineFailedCount,
    isOnline,
    isFlushing: offlineSyncing,
    flushNow: flushOfflineNow,
  } = useOfflineOperationQueue(Boolean(user));

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
  } = useAlerts({ limit: 20 });

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
    data: vehiclesData,
    isLoading: vehiclesLoading,
    refetch: refetchVehicles,
  } = useVehicles(Boolean(user));
  const snapshotCache = useMemo(() => readAdminSnapshot(user?.id ?? null), [user?.id]);

  const people = peopleData?.data?.length ? peopleData.data : !isOnline ? snapshotCache.people : peopleData?.data ?? [];
  const alerts = alertsData?.data?.length ? alertsData.data : !isOnline ? snapshotCache.alerts : alertsData?.data ?? [];
  const cameras = camerasData?.data?.length ? camerasData.data : !isOnline ? snapshotCache.cameras : camerasData?.data ?? [];
  const deliveries = (deliveriesData?.data ?? []).length ? deliveriesData?.data ?? [] : !isOnline ? snapshotCache.deliveries : [];
  const vehicles = (vehiclesData?.data ?? []).length ? vehiclesData?.data ?? [] : !isOnline ? snapshotCache.vehicles : [];
  const peopleCategories = useMemo(
    () =>
      Array.from(new Set(people.map((person) => person.category).filter(Boolean))).sort((a, b) =>
        getPersonCategoryLabel(a).localeCompare(getPersonCategoryLabel(b), 'pt-BR')
      ),
    [people]
  );
  const filteredPeople = useMemo(
    () =>
      peopleCategoryFilter === 'all'
        ? people
        : people.filter((person) => person.category === peopleCategoryFilter),
    [people, peopleCategoryFilter]
  );
  const peopleByCategory = useMemo(
    () =>
      people.reduce<Record<string, number>>((acc, person) => {
        const key = person.category || 'OTHER';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [people]
  );
  const pendingDeliveries = deliveries.filter((delivery) => normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN');
  const blockedVehicles = vehicles.filter((vehicle) => vehicle.status === 'bloqueado');
  const currentCondominium = getCurrentCondominium(condominiums, user?.condominiumId);
  const enabledModules = getCondominiumEnabledModules(currentCondominium);
  const residentManagementFlags = Object.entries(currentCondominium?.residentManagementSettings ?? {}).filter(([, value]) => Boolean(value)).length;

  const activePeople = people.filter((item: Person) => {
    const status = String(item.status).toLowerCase();
    return status === 'ativo' || status === 'active';
  });

  const openAlerts = alerts.filter((item: Alert) => {
    const status = String(item.status).toLowerCase();
    return status === 'aberto' || status === 'open' || status === 'pendente' || status === 'unread';
  });

  const onlineCameras = cameras.filter((item: Camera) => {
    const status = String(item.status).toLowerCase();
    return status === 'online' || status === 'ativo' || status === 'active';
  });

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      void refetchPeople();
      void refetchAlerts();
      void refetchCameras();
      void refetchDeliveries();
      void refetchVehicles();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [refetchAlerts, refetchCameras, refetchDeliveries, refetchPeople, refetchVehicles, user]);

  useEffect(() => {
    snapshotSignatureRef.current = getAdminSnapshotSignature(snapshotCache);
  }, [snapshotCache]);

  useEffect(() => {
    if (!user || typeof window === 'undefined' || (people.length === 0 && alerts.length === 0 && cameras.length === 0 && deliveries.length === 0 && vehicles.length === 0)) {
      return;
    }

    const key = getAdminSnapshotKey(user.id);
    if (!key) return;

    const nextSnapshot = buildAdminSnapshot({
      people,
      alerts,
      cameras,
      deliveries,
      vehicles,
    });
    const nextSnapshotSignature = getAdminSnapshotSignature(nextSnapshot);

    if (nextSnapshotSignature === snapshotSignatureRef.current) {
      return;
    }

    if (persistAdminSnapshot(user.id, nextSnapshot)) {
      snapshotSignatureRef.current = nextSnapshotSignature;
    }
  }, [alerts, cameras, deliveries, people, user, vehicles]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando dashboard...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Painel administrativo
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Dashboard do Admin
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Visão consolidada para gestão de moradores, alertas, câmeras e operação,
                com base na API real e pronta para evolução por perfil de usuário.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs text-slate-400">Sessão ativa</p>
              <p className="mt-1 text-sm font-medium text-white">
                {user.name}
              </p>
              <p className="text-xs text-slate-400">{maskEmail(user.email)}</p>
            </div>
          </div>
        </header>

        {!isOnline ? (
          <section className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Modo degradado do painel administrativo</p>
                <p className="mt-1 text-xs opacity-90">
                  O dashboard está usando o último snapshot salvo{snapshotCache.cachedAt ? ` em ${new Date(snapshotCache.cachedAt).toLocaleString('pt-BR')}` : ''}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void flushOfflineNow()}
                disabled={!isOnline || offlineSyncing || offlinePendingCount === 0}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {offlineSyncing ? 'Sincronizando...' : 'Sincronizar fila'}
              </button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Rede"
            value={isOnline ? 'Online' : 'Offline'}
            helper="Conectividade do navegador"
          />
          <StatCard
            label="Fila offline"
            value={`${offlinePendingCount}`}
            helper={offlineFailedCount ? `${offlineFailedCount} com falha definitiva` : 'Sem falhas definitivas'}
          />
          <StatCard
            label="Último snapshot"
            value={snapshotCache.cachedAt ? new Date(snapshotCache.cachedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            helper="Base local usada em modo degradado"
          />
        </section>

        {currentCondominium ? (
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Módulos habilitados"
              value={String(enabledModules.size)}
              helper="Lidos diretamente do contrato canônico do condomínio"
            />
            <StatCard
              label="Modo do cliente"
              value={currentCondominium.slimMode ? 'Slim' : 'Completo'}
              helper="Slim mode canônico vindo do backend"
            />
            <StatCard
              label="Regras do morador"
              value={String(residentManagementFlags)}
              helper="Flags ativas em residentManagementSettings"
            />
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard
            label="Moradores / Pessoas"
            value={peopleLoading ? '...' : String(people.length)}
            helper="Total carregado da API"
          />
          <StatCard
            label="Ativos"
            value={peopleLoading ? '...' : String(activePeople.length)}
            helper="Com status ativo"
          />
          <StatCard
            label="Alertas abertos"
            value={alertsLoading ? '...' : String(openAlerts.length)}
            helper="Pendências de monitoramento"
          />
          <StatCard
            label="Câmeras online"
            value={camerasLoading ? '...' : String(onlineCameras.length)}
            helper="Disponíveis para operação"
          />
          <StatCard
            label="Encomendas pendentes"
            value={deliveriesLoading ? '...' : String(pendingDeliveries.length)}
            helper="Aguardando retirada"
          />
          <StatCard
            label="Veículos"
            value={vehiclesLoading ? '...' : String(vehicles.length)}
            helper={`${blockedVehicles.length} bloqueado(s)`}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Resumo operacional
                  </h2>
                  <p className="text-sm text-slate-400">
                    Indicadores principais para decisão rápida.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Base
                  </p>
                  <p className="mt-2 text-center text-2xl font-semibold tabular-nums text-white">
                    {peopleLoading ? 'Carregando...' : `${people.length} registros`}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Pessoas e vínculos sob gestão.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Ocorrências
                  </p>
                  <p className="mt-2 text-center text-2xl font-semibold tabular-nums text-white">
                    {alertsLoading ? 'Carregando...' : `${alerts.length} eventos`}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Alertas e eventos recebidos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => { router.push('/admin/cameras'); }}
                  className={`rounded-2xl border bg-slate-950/60 p-4 text-left transition hover:bg-white/10 ${brandClasses.softAccentPanel}`}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Monitoramento
                  </p>
                  <p className="mt-2 text-center text-2xl font-semibold tabular-nums text-white">
                    {camerasLoading ? 'Carregando...' : `${cameras.length} câmeras`}
                  </p>
                  <p className="mt-2 text-sm text-slate-400 text-justify">
                    Cobertura visual e status técnico.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => { router.push('/admin/veiculos'); }}
                  className={`rounded-2xl border bg-slate-950/60 p-4 text-left transition hover:bg-white/10 ${brandClasses.softAccentPanel}`}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Frota vinculada
                  </p>
                  <p className="mt-2 text-center text-2xl font-semibold tabular-nums text-white">
                    {vehiclesLoading ? 'Carregando...' : `${vehicles.length} veículos`}
                  </p>
                  <p className="mt-2 text-sm text-slate-400 text-justify">
                    Placas, tags e vínculos por unidade.
                  </p>
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Pessoas por categoria</h2>
                <p className="text-sm text-slate-400 text-justify">Distribuição real da base carregada da API.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {peopleCategories.length ? (
                  peopleCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setPeopleCategoryFilter(category)}
                      className={`rounded-2xl border bg-slate-950/60 p-4 text-left transition hover:bg-white/10 ${peopleCategoryFilter === category ? brandClasses.activeCard : 'border-white/10'}`}
                    >
                      <p className="text-sm text-slate-400">{getPersonCategoryLabel(category)}</p>
                      <p className="mt-2 text-center text-2xl font-semibold tabular-nums text-white">{peopleByCategory[category] ?? 0}</p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                    Nenhuma categoria retornada pela API.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Pessoas</h2>
                  <p className="text-sm text-slate-400">
                    Lista consolidada da API por categoria.
                  </p>
                </div>
                <select
                  value={peopleCategoryFilter}
                  onChange={(event) => setPeopleCategoryFilter(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none"
                >
                  <option value="all">Todas as categorias</option>
                  {peopleCategories.map((category) => (
                    <option key={category} value={category}>
                      {getPersonCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>

              {peopleError ? (
                <EmptyState
                  title="Não foi possível carregar pessoas"
                  description="Verifique a API, autenticação e formato da resposta."
                />
              ) : filteredPeople.length === 0 ? (
                <EmptyState
                  title="Nenhum registro encontrado"
                  description="Altere o filtro ou aguarde a API retornar dados dessa categoria."
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                    <div className="col-span-4">Nome</div>
                    <div className="col-span-3">Categoria</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-2">ID</div>
                  </div>

                  <div className="divide-y divide-white/10">
                    {filteredPeople.slice(0, 12).map((person: Person) => (
                      <div
                        key={person.id}
                        className="grid grid-cols-12 items-center px-4 py-4 text-sm"
                      >
                        <div className="col-span-4 font-medium text-white">
                          {person.name || 'Sem nome'}
                        </div>
                        <div className="col-span-3 text-slate-300">
                          {getPersonCategoryLabel(person.category, person.categoryLabel)}
                        </div>
                        <div className="col-span-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPersonStatusBadgeClass(person.statusLabel || person.status)}`}>
                            {person.statusLabel || person.status || 'ATIVO'}
                          </span>
                        </div>
                        <div className="col-span-2 truncate text-xs text-slate-400">
                          {person.id}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Alertas recentes</h2>
                <p className="text-sm text-slate-400">
                  Ocorrências e pendências mais recentes.
                </p>
              </div>

              {alertsError ? (
                <EmptyState
                  title="Não foi possível carregar alertas"
                  description="Verifique o endpoint de alertas."
                />
              ) : alerts.length === 0 ? (
                <EmptyState
                  title="Sem alertas"
                  description="A lista aparecerá aqui quando houver eventos."
                />
              ) : (
                <AlertsPanel
                  alerts={alerts.slice(0, 6)}
                  title="Alertas recentes"
                  description="Ocorrências consolidadas para acompanhamento rápido."
                  limit={6}
                  showRealtimeStatus={false}
                />
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Atividade recente</h2>
                <p className="text-sm text-slate-400">Movimentações mais recentes vindas da API.</p>
              </div>

              <div className="space-y-3">
                {people.slice(0, 3).map((person: Person) => (
                  <div key={`person-${person.id}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{person.name || 'Pessoa'}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {getPersonCategoryLabel(person.category, person.categoryLabel)}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPersonStatusBadgeClass(person.statusLabel || person.status)}`}>
                        {person.statusLabel || person.status || 'ATIVO'}
                      </span>
                    </div>
                  </div>
                ))}
                {alerts.slice(0, 2).map((alert: Alert) => (
                  <div key={`alert-${alert.id}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm font-medium text-white">{alert.title || 'Alerta'}</p>
                    <p className="mt-1 text-sm text-slate-400">{alert.description || 'Sem descrição disponível.'}</p>
                  </div>
                ))}
                {people.length === 0 && alerts.length === 0 ? (
                  <EmptyState title="Sem atividade" description="Quando a API retornar dados, a atividade aparecerá aqui." />
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Veículos vinculados</h2>
                  <p className="text-sm text-slate-400">Placas recentes por unidade.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { router.push('/admin/veiculos'); }}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
                >
                  Ver todos
                </button>
              </div>

              {vehicles.length === 0 ? (
                <EmptyState
                  title="Sem veículos"
                  description="Cadastre veículos para vincular placas, responsáveis e unidades."
                />
              ) : (
                <div className="grid gap-3">
                  {vehicles.slice(0, 6).map((vehicle: Vehicle) => (
                    <div key={vehicle.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{vehicle.plate}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {[vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' / ') || 'Sem detalhes'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[vehicle.condominiumName, vehicle.structureLabel, vehicle.unitLabel].filter(Boolean).join(' / ') || 'Sem unidade vinculada'}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${vehicle.status === 'bloqueado' ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
                          {vehicle.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Câmeras online</h2>
                  <p className="text-sm text-slate-400">
                    Estado atual do parque de câmeras.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { router.push('/admin/cameras'); }}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
                >
                  Ver gestão de câmeras
                </button>
              </div>

              {camerasError ? (
                <EmptyState
                  title="Não foi possível carregar câmeras"
                  description="Confira o endpoint e a resposta da API."
                />
              ) : cameras.length === 0 ? (
                <EmptyState
                  title="Sem câmeras"
                  description="Os dispositivos aparecerão aqui quando a API responder."
                />
              ) : (
                <div className="grid gap-3">
                  {cameras.slice(0, 6).map((camera: Camera) => (
                    <button
                      key={camera.id}
                      type="button"
                      onClick={() => { router.push('/admin/cameras'); }}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left transition hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-medium text-white">
                          {camera.name || 'Câmera'}
                        </h3>
                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                          {getCameraStatusLabel(camera.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {camera.location || 'Local não informado'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>

        <footer className="pb-2 text-center text-xs text-slate-500">
          Dashboard preparado para evolução por perfis: MASTER, ADMIN, OPERADOR e CENTRAL.
        </footer>
      </div>
    </div>
  );
}
