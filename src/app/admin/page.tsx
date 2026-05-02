'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOfflineOperationQueue } from '@/hooks/use-offline-operation-queue';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAccessLogs } from '@/hooks/use-access-logs';
import { useAllPeople } from '@/hooks/use-people';
import { useAlerts } from '@/hooks/use-alerts';
import { useCameras } from '@/hooks/use-cameras';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import { useVehicles } from '@/hooks/use-vehicles';
import { devicesService } from '@/services/devices.service';
import { normalizeDeliveryStatus } from '@/features/deliveries/delivery-normalizers';
import type { Alert } from '@/types/alert';
import type { Camera } from '@/types/camera';
import type { Device } from '@/types/device';
import type { Person } from '@/types/person';
import type { Vehicle } from '@/types/vehicle';
type AdminSnapshotCache = {
  people: Person[];
  alerts: Alert[];
  cameras: Camera[];
  deliveries: Array<{ id: string; status: string; createdAt?: string | null; receivedAt?: string | null }>;
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
      deliveries: Array.isArray(parsed.deliveries)
        ? parsed.deliveries.map((delivery) => ({
            id: String(delivery?.id ?? ''),
            status: String(delivery?.status ?? ''),
            createdAt: typeof delivery?.createdAt === 'string' ? delivery.createdAt : null,
            receivedAt: typeof delivery?.receivedAt === 'string' ? delivery.receivedAt : null,
          }))
        : [],
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
  deliveries: Array<{ id: string; status: string; createdAt?: string | null; receivedAt?: string | null }>;
  vehicles: Vehicle[];
}): AdminSnapshotCache {
  return {
    people: sanitizeSnapshotPeople(params.people),
    alerts: sanitizeSnapshotAlerts(params.alerts),
    cameras: sanitizeSnapshotCameras(params.cameras),
    deliveries: params.deliveries.slice(0, 40).map((delivery) => ({
      id: delivery.id,
      status: delivery.status,
      createdAt: delivery.createdAt ?? null,
      receivedAt: delivery.receivedAt ?? null,
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

function toTimestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isWithinDays(value?: string | null, days = 1) {
  const timestamp = toTimestamp(value);
  if (!timestamp) return false;
  const now = Date.now();
  return timestamp >= now - days * 24 * 60 * 60 * 1000;
}

function countWithinWindow<T>(items: T[], getDate: (item: T) => string | null | undefined, days: number) {
  return items.filter((item) => isWithinDays(getDate(item), days)).length;
}

function countPreviousWindow<T>(items: T[], getDate: (item: T) => string | null | undefined, days: number) {
  const now = Date.now();
  const currentWindowStart = now - days * 24 * 60 * 60 * 1000;
  const previousWindowStart = now - days * 2 * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    const timestamp = toTimestamp(getDate(item));
    if (!timestamp) return false;
    return timestamp >= previousWindowStart && timestamp < currentWindowStart;
  }).length;
}

function formatDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return 'Sem variação';
  if (previous === 0) return `+${current}`;

  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta === 0) return 'Estável';
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

function groupTopEntries(source: Record<string, number> | Array<{ label: string; value: number }>, limit = 5) {
  const items = Array.isArray(source)
    ? source
    : Object.entries(source).map(([label, value]) => ({ label, value }));

  return items
    .filter((item) => item.label && item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  onClick?: (() => void) | null;
};

function StatCard({ label, value, helper, onClick }: StatCardProps) {
  const content = (
    <>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-center text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-2 text-center text-xs text-slate-400">{helper}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur transition hover:bg-white/10"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      {content}
    </div>
  );
}

type InsightCardProps = {
  label: string;
  value: string;
  helper: string;
  period: string;
  tone?: 'default' | 'accent' | 'success' | 'warning';
  onClick?: (() => void) | null;
};

function InsightCard({ label, value, helper, period, tone = 'default', onClick }: InsightCardProps) {
  const toneClasses =
    tone === 'accent'
      ? 'border-cyan-400/30 bg-cyan-400/10'
      : tone === 'success'
        ? 'border-emerald-400/30 bg-emerald-400/10'
        : tone === 'warning'
          ? 'border-amber-400/30 bg-amber-400/10'
          : 'border-white/10 bg-white/5';

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{period}</p>
          <h3 className="mt-2 text-base font-medium text-white">{label}</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-slate-300">
          Abrir
        </span>
      </div>
      <p className="mt-5 text-center text-4xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-3 text-center text-sm text-slate-300">{helper}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-3xl border p-5 text-left backdrop-blur transition hover:bg-white/10 ${toneClasses}`}
      >
        {content}
      </button>
    );
  }

  return <div className={`rounded-3xl border p-5 backdrop-blur ${toneClasses}`}>{content}</div>;
}

type PeriodFilterProps = {
  active: number;
  label: string;
  value: number;
  onSelect: (value: number) => void;
};

function PeriodFilter({ active, label, value, onSelect }: PeriodFilterProps) {
  const selected = active === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-full px-3 py-2 text-xs font-medium transition ${
        selected
          ? 'bg-cyan-400 text-slate-950'
          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

type MetricTileProps = {
  label: string;
  value: string;
  delta: string;
  helper: string;
  tone?: 'neutral' | 'cyan' | 'emerald' | 'amber';
  onClick?: (() => void) | null;
  highlight?: boolean;
};

function MetricTile({ label, value, delta, helper, tone = 'neutral', onClick, highlight = false }: MetricTileProps) {
  const toneClass =
    tone === 'cyan'
      ? 'border-cyan-400/25 bg-cyan-400/10'
      : tone === 'emerald'
        ? 'border-emerald-400/25 bg-emerald-400/10'
        : tone === 'amber'
          ? 'border-amber-400/25 bg-amber-400/10'
          : 'border-white/10 bg-white/5';

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-300">{label}</p>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-slate-300">
          {delta}
        </span>
      </div>
      <p className="mt-3 text-center text-4xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-2 text-center text-xs text-slate-400">{helper}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-3xl border p-4 text-left transition hover:bg-white/10 ${toneClass} ${highlight ? 'ring-2 ring-cyan-300/70 shadow-[0_0_30px_rgba(34,211,238,0.22)]' : ''}`}
      >
        {content}
      </button>
    );
  }

  return <div className={`rounded-3xl border p-4 ${toneClass} ${highlight ? 'ring-2 ring-cyan-300/70 shadow-[0_0_30px_rgba(34,211,238,0.22)]' : ''}`}>{content}</div>;
}

type ComparisonBarProps = {
  label: string;
  value: number;
  total: number;
  helper: string;
  tone?: 'cyan' | 'emerald' | 'amber' | 'slate';
  onClick?: (() => void) | null;
  highlight?: boolean;
};

function ComparisonBar({ label, value, total, helper, tone = 'slate', onClick, highlight = false }: ComparisonBarProps) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 6 : 0) : 0;
  const barClass =
    tone === 'cyan'
      ? 'bg-cyan-400'
      : tone === 'emerald'
        ? 'bg-emerald-400'
        : tone === 'amber'
          ? 'bg-amber-400'
          : 'bg-slate-300';

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-400">{helper}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-white">{value}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${Math.min(width, 100)}%` }} />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10 ${highlight ? 'ring-2 ring-cyan-300/70 shadow-[0_0_24px_rgba(34,211,238,0.18)]' : ''}`}
      >
        {content}
      </button>
    );
  }

  return <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${highlight ? 'ring-2 ring-cyan-300/70 shadow-[0_0_24px_rgba(34,211,238,0.18)]' : ''}`}>{content}</div>;
}

export default function AdminPage() {
  const router = useRouter();
  const [selectedWindow, setSelectedWindow] = useState(7);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedKeys, setHighlightedKeys] = useState<string[]>([]);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const previousMetricsRef = useRef<Record<string, number> | null>(null);
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'GERENTE', 'MASTER'],
  });
  const snapshotSignatureRef = useRef(getAdminSnapshotSignature(EMPTY_ADMIN_SNAPSHOT));
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
    refetch: refetchPeople,
  } = useAllPeople({ limit: 100 });

  const {
    data: alertsData,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useAlerts({ limit: 30, refetchInterval: 10000 });

  const {
    data: camerasData,
    isLoading: camerasLoading,
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
  const { data: accessLogsData, isLoading: accessLogsLoading, refetch: refetchAccessLogs } = useAccessLogs({
    limit: 100,
    result: 'ALLOWED',
    enabled: Boolean(user),
  });
  const snapshotCache = useMemo(() => readAdminSnapshot(user?.id ?? null), [user?.id]);

  const people = peopleData?.data?.length ? peopleData.data : !isOnline ? snapshotCache.people : peopleData?.data ?? [];
  const alerts = alertsData?.data?.length ? alertsData.data : !isOnline ? snapshotCache.alerts : alertsData?.data ?? [];
  const cameras = camerasData?.data?.length ? camerasData.data : !isOnline ? snapshotCache.cameras : camerasData?.data ?? [];
  const deliveries = (deliveriesData?.data ?? []).length ? deliveriesData?.data ?? [] : !isOnline ? snapshotCache.deliveries : [];
  const vehicles = (vehiclesData?.data ?? []).length ? vehiclesData?.data ?? [] : !isOnline ? snapshotCache.vehicles : [];
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
  const accessLogs = accessLogsData?.data ?? [];
  const accessDevices = devices.filter((item) => item.type !== 'CAMERA' && item.type !== 'CAMERA_IA');
  const onlineDevices = accessDevices.filter((item) => item.status === 'ONLINE').length;
  const offlineCameras = Math.max(cameras.length - onlineCameras.length, 0);
  const unreadAlerts = alerts.filter((item: Alert) => String(item.status).toLowerCase() === 'unread').length;
  const residentsCount = peopleByCategory.RESIDENT ?? 0;
  const visitorsCount = peopleByCategory.VISITOR ?? 0;
  const serviceProvidersCount = peopleByCategory.SERVICE_PROVIDER ?? 0;
  const rentersCount = peopleByCategory.RENTER ?? 0;
  const peopleInWindow = countWithinWindow(people, (item) => item.createdAt, selectedWindow);
  const previousPeopleInWindow = countPreviousWindow(people, (item) => item.createdAt, selectedWindow);
  const accessesInWindow = countWithinWindow(accessLogs, (item) => item.timestamp, selectedWindow);
  const previousAccessesInWindow = countPreviousWindow(accessLogs, (item) => item.timestamp, selectedWindow);
  const alertsInWindow = countWithinWindow(alerts, (item) => item.timestamp, selectedWindow);
  const previousAlertsInWindow = countPreviousWindow(alerts, (item) => item.timestamp, selectedWindow);
  const deliveriesInWindow = countWithinWindow(deliveries, (item) => item.receivedAt ?? item.createdAt, selectedWindow);
  const previousDeliveriesInWindow = countPreviousWindow(deliveries, (item) => item.receivedAt ?? item.createdAt, selectedWindow);
  const vehiclesInWindow = countWithinWindow(vehicles, (item) => item.createdAt, selectedWindow);
  const previousVehiclesInWindow = countPreviousWindow(vehicles, (item) => item.createdAt, selectedWindow);
  const totalOperationalBase = Math.max(
    openAlerts.length,
    pendingDeliveries.length,
    people.length,
    vehicles.length,
    cameras.length
  );
  const rankingAlertsToday = groupTopEntries(
    alerts
      .filter((item) => isWithinDays(item.timestamp, 1))
      .reduce<Record<string, number>>((acc, item) => {
        const key = item.location?.trim() || 'Sem local informado';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    5
  );
  const rankingAccessToday = groupTopEntries(
    accessLogs
      .filter((item) => isWithinDays(item.timestamp, 1))
      .reduce<Record<string, number>>((acc, item) => {
        const key = item.location?.trim() || item.personName?.trim() || 'Sem referência';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    5
  );
  const rankingDeliveriesToday = groupTopEntries(
    deliveries
      .filter((item) => isWithinDays(item.receivedAt ?? item.createdAt, 1))
      .reduce<Record<string, number>>((acc, item) => {
        const deliveryUnit = item as { recipientUnitName?: string | null; unitLabel?: string | null };
        const key = deliveryUnit.recipientUnitName?.trim() || deliveryUnit.unitLabel?.trim() || 'Unidade não informada';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    5
  );
  const trackedMetricValues = useMemo(
    () => ({
      cadastros: peopleInWindow,
      acessos: accessesInWindow,
      alertas: alertsInWindow,
      encomendas: deliveriesInWindow,
      pessoas: people.length,
      alertas_abertos: openAlerts.length,
      encomendas_pendentes: pendingDeliveries.length,
      cameras_offline: offlineCameras,
      dispositivos_offline: Math.max(accessDevices.length - onlineDevices, 0),
    }),
    [accessDevices.length, accessesInWindow, alertsInWindow, deliveriesInWindow, offlineCameras, onlineDevices, openAlerts.length, pendingDeliveries.length, people.length, peopleInWindow]
  );

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadDevices = async () => {
      try {
        const data = await devicesService.list({
          condominiumId: user.condominiumId ?? undefined,
        });
        if (active) {
          setDevices(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setDevices([]);
        }
      }
    };

    void loadDevices();

    const timer = window.setInterval(() => {
      void refetchPeople();
      void refetchAlerts();
      void refetchCameras();
      void refetchDeliveries();
      void refetchVehicles();
      void refetchAccessLogs();
      void loadDevices();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refetchAccessLogs, refetchAlerts, refetchCameras, refetchDeliveries, refetchPeople, refetchVehicles, user]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    if (!previousMetricsRef.current) {
      previousMetricsRef.current = trackedMetricValues;
      return;
    }

    const changedKeys = Object.entries(trackedMetricValues)
      .filter(([key, value]) => previousMetricsRef.current?.[key] !== value)
      .map(([key]) => key);

    if (changedKeys.length) {
      setHighlightedKeys(changedKeys);
      const timeout = window.setTimeout(() => {
        setHighlightedKeys((current) => current.filter((key) => !changedKeys.includes(key)));
      }, 3200);

      previousMetricsRef.current = trackedMetricValues;
      return () => window.clearTimeout(timeout);
    }

    previousMetricsRef.current = trackedMetricValues;
  }, [trackedMetricValues]);

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
      <div className="app-shell flex min-h-screen items-center justify-center text-[color:var(--text-main)]">
        Carregando dashboard...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  const pushWithContext = (pathname: string, params?: Record<string, string>) => {
    const search = new URLSearchParams(params ?? {});
    router.push(search.size ? `${pathname}?${search.toString()}` : pathname);
  };

  const exportAsPdf = () => {
    window.print();
  };

  const exportAsCsv = () => {
    const rows = [
      ['Indicador', 'Valor'],
      ['Cadastros no período', String(peopleInWindow)],
      ['Acessos no período', String(accessesInWindow)],
      ['Alertas no período', String(alertsInWindow)],
      ['Encomendas no período', String(deliveriesInWindow)],
      ['Pessoas totais', String(people.length)],
      ['Alertas abertos', String(openAlerts.length)],
      ['Encomendas pendentes', String(pendingDeliveries.length)],
      ['Câmeras online', String(onlineCameras.length)],
      ['Dispositivos de acesso', String(accessDevices.length)],
    ];

    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `painel-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell min-h-screen text-[color:var(--text-main)]">
      <div ref={dashboardRef} className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
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

        <section className="app-panel-hero rounded-[2rem] border p-5 backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Painel analítico</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Visão executiva</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-300">
                Uma leitura direta do movimento, da operação e dos pontos que exigem atenção.
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!document.fullscreenElement) {
                    await dashboardRef.current?.requestFullscreen();
                    return;
                  }

                  await document.exitFullscreen();
                }}
                className="rounded-2xl border border-cyan-300/40 bg-cyan-300/20 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/30"
              >
                {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              </button>
              <div className="flex flex-wrap gap-2">
                <PeriodFilter active={selectedWindow} label="Hoje" value={1} onSelect={setSelectedWindow} />
                <PeriodFilter active={selectedWindow} label="7 dias" value={7} onSelect={setSelectedWindow} />
                <PeriodFilter active={selectedWindow} label="30 dias" value={30} onSelect={setSelectedWindow} />
                <button
                  type="button"
                  onClick={exportAsPdf}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={exportAsCsv}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Exportar CSV
                </button>
              </div>

            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Cadastros"
              value={peopleLoading ? '...' : String(peopleInWindow)}
              delta={formatDelta(peopleInWindow, previousPeopleInWindow)}
              helper={`Novos registros em ${selectedWindow === 1 ? '1 dia' : `${selectedWindow} dias`}`}
              tone="cyan"
              highlight={highlightedKeys.includes('cadastros')}
              onClick={() => {
                pushWithContext('/admin/moradores', { metric: 'cadastros', period: String(selectedWindow) });
              }}
            />
            <MetricTile
              label="Acessos"
              value={accessLogsLoading ? '...' : String(accessesInWindow)}
              delta={formatDelta(accessesInWindow, previousAccessesInWindow)}
              helper="Movimentações liberadas"
              tone="emerald"
              highlight={highlightedKeys.includes('acessos')}
              onClick={() => {
                pushWithContext('/admin/acessos', { metric: 'acessos', period: String(selectedWindow), result: 'ALLOWED' });
              }}
            />
            <MetricTile
              label="Alertas"
              value={alertsLoading ? '...' : String(alertsInWindow)}
              delta={formatDelta(alertsInWindow, previousAlertsInWindow)}
              helper="Ocorrências registradas"
              tone="amber"
              highlight={highlightedKeys.includes('alertas')}
              onClick={() => {
                pushWithContext('/admin/alertas', { metric: 'alertas', period: String(selectedWindow), status: 'open' });
              }}
            />
            <MetricTile
              label="Encomendas"
              value={deliveriesLoading ? '...' : String(deliveriesInWindow)}
              delta={formatDelta(deliveriesInWindow, previousDeliveriesInWindow)}
              helper="Recebimentos no período"
              tone="neutral"
              highlight={highlightedKeys.includes('encomendas')}
              onClick={() => {
                pushWithContext('/admin/encomendas', { metric: 'encomendas', period: String(selectedWindow), status: 'pending' });
              }}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Distribuição operacional</h3>
                  <p className="text-sm text-slate-400">
                    Onde está o maior volume do condomínio neste momento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    router.push('/admin/unidades');
                  }}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
                >
                  Abrir unidades
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <ComparisonBar
                  label="Base de moradores e cadastros"
                  value={people.length}
                  total={totalOperationalBase}
                  helper={`${activePeople.length} ativos`}
                  tone="cyan"
                  highlight={highlightedKeys.includes('pessoas')}
                  onClick={() => {
                    pushWithContext('/admin/moradores', { metric: 'base' });
                  }}
                />
                <ComparisonBar
                  label="Alertas em acompanhamento"
                  value={openAlerts.length}
                  total={totalOperationalBase}
                  helper={`${unreadAlerts} ainda não lidos`}
                  tone="amber"
                  highlight={highlightedKeys.includes('alertas_abertos')}
                  onClick={() => {
                    pushWithContext('/admin/alertas', { metric: 'alertas_abertos', status: 'open' });
                  }}
                />
                <ComparisonBar
                  label="Encomendas aguardando retirada"
                  value={pendingDeliveries.length}
                  total={totalOperationalBase}
                  helper={`${deliveriesInWindow} lançadas no período`}
                  tone="slate"
                  highlight={highlightedKeys.includes('encomendas_pendentes')}
                  onClick={() => {
                    pushWithContext('/admin/encomendas', { metric: 'encomendas_pendentes', status: 'pending' });
                  }}
                />
                <ComparisonBar
                  label="Câmeras em operação"
                  value={onlineCameras.length}
                  total={Math.max(cameras.length, totalOperationalBase)}
                  helper={`${offlineCameras} sem imagem`}
                  tone="cyan"
                  onClick={() => {
                    pushWithContext('/admin/cameras', { metric: 'cameras', status: 'online' });
                  }}
                />
                <ComparisonBar
                  label="Dispositivos de acesso"
                  value={accessDevices.length}
                  total={Math.max(accessDevices.length, totalOperationalBase)}
                  helper={`${onlineDevices} online`}
                  tone="emerald"
                  onClick={() => {
                    pushWithContext('/admin/dispositivos', { metric: 'devices', status: 'online' });
                  }}
                />
                <ComparisonBar
                  label="Veículos vinculados"
                  value={vehicles.length}
                  total={totalOperationalBase}
                  helper={`${blockedVehicles.length} bloqueados`}
                  tone="emerald"
                  onClick={() => {
                    pushWithContext('/admin/veiculos', { metric: 'veiculos' });
                  }}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Ranking do dia</h3>
                <p className="text-sm text-slate-400">
                  Pontos com maior movimento em alertas, acessos e encomendas.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Mais alertas</p>
                  <div className="mt-4 space-y-3">
                    {rankingAlertsToday.length ? rankingAlertsToday.map((item, index) => (
                      <ComparisonBar
                        key={`alert-ranking-${item.label}-${index}`}
                        label={item.label}
                        value={item.value}
                        total={rankingAlertsToday[0]?.value ?? item.value}
                        helper="Ocorrências hoje"
                        tone="amber"
                        onClick={() => {
                          pushWithContext('/admin/alertas', { location: item.label, period: '1' });
                        }}
                      />
                    )) : (
                      <p className="text-sm text-slate-400">Sem alertas hoje.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Mais acessos</p>
                  <div className="mt-4 space-y-3">
                    {rankingAccessToday.length ? rankingAccessToday.map((item, index) => (
                      <ComparisonBar
                        key={`access-ranking-${item.label}-${index}`}
                        label={item.label}
                        value={item.value}
                        total={rankingAccessToday[0]?.value ?? item.value}
                        helper="Movimentações hoje"
                        tone="emerald"
                        onClick={() => {
                          pushWithContext('/operacao', { location: item.label, period: '1' });
                        }}
                      />
                    )) : (
                      <p className="text-sm text-slate-400">Sem acessos hoje.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Mais encomendas</p>
                  <div className="mt-4 space-y-3">
                    {rankingDeliveriesToday.length ? rankingDeliveriesToday.map((item, index) => (
                      <ComparisonBar
                        key={`delivery-ranking-${item.label}-${index}`}
                        label={item.label}
                        value={item.value}
                        total={rankingDeliveriesToday[0]?.value ?? item.value}
                        helper="Recebimentos hoje"
                        tone="slate"
                        onClick={() => {
                          pushWithContext('/admin/encomendas', { unitLabel: item.label, period: '1' });
                        }}
                      />
                    )) : (
                      <p className="text-sm text-slate-400">Sem encomendas hoje.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Prioridades imediatas</h3>
                <p className="text-sm text-slate-400">
                  Os quatro pontos que mais pedem ação agora.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ComparisonBar
                  label="Alertas abertos"
                  value={openAlerts.length}
                  total={Math.max(openAlerts.length, 1)}
                  helper="Acompanhar e tratar ocorrências"
                  tone="amber"
                  highlight={highlightedKeys.includes('alertas_abertos')}
                  onClick={() => {
                    pushWithContext('/admin/alertas', { metric: 'alertas_abertos', status: 'open' });
                  }}
                />
                <ComparisonBar
                  label="Câmeras sem imagem"
                  value={offlineCameras}
                  total={Math.max(cameras.length, 1)}
                  helper="Validar conexão e publicação"
                  tone="cyan"
                  highlight={highlightedKeys.includes('cameras_offline')}
                  onClick={() => {
                    pushWithContext('/admin/cameras', { metric: 'cameras_offline', status: 'offline' });
                  }}
                />
                <ComparisonBar
                  label="Encomendas pendentes"
                  value={pendingDeliveries.length}
                  total={Math.max(deliveries.length, 1)}
                  helper="Aguardando retirada"
                  tone="slate"
                  highlight={highlightedKeys.includes('encomendas_pendentes')}
                  onClick={() => {
                    pushWithContext('/admin/encomendas', { metric: 'encomendas_pendentes', status: 'pending' });
                  }}
                />
                <ComparisonBar
                  label="Dispositivos offline"
                  value={Math.max(accessDevices.length - onlineDevices, 0)}
                  total={Math.max(accessDevices.length, 1)}
                  helper="Checar conexão e status"
                  tone="emerald"
                  highlight={highlightedKeys.includes('dispositivos_offline')}
                  onClick={() => {
                    pushWithContext('/admin/dispositivos', { metric: 'devices_offline', status: 'offline' });
                  }}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Composição dos cadastros</h3>
                <p className="text-sm text-slate-400">
                  Leitura por perfil para entender quem mais compõe a base atual.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <MetricTile
                  label="Moradores"
                  value={peopleLoading ? '...' : String(residentsCount)}
                  delta={`${people.length > 0 ? Math.round((residentsCount / people.length) * 100) : 0}% da base`}
                  helper="Base principal do condomínio"
                  tone="cyan"
                  onClick={() => {
                    router.push('/admin/moradores');
                  }}
                />
                <MetricTile
                  label="Visitantes"
                  value={peopleLoading ? '...' : String(visitorsCount)}
                  delta={`${people.length > 0 ? Math.round((visitorsCount / people.length) * 100) : 0}% da base`}
                  helper="Cadastros de visita"
                  tone="neutral"
                  onClick={() => {
                    router.push('/admin/moradores');
                  }}
                />
                <MetricTile
                  label="Prestadores"
                  value={peopleLoading ? '...' : String(serviceProvidersCount)}
                  delta={`${people.length > 0 ? Math.round((serviceProvidersCount / people.length) * 100) : 0}% da base`}
                  helper="Serviços autorizados"
                  tone="neutral"
                  onClick={() => {
                    router.push('/admin/moradores');
                  }}
                />
                <MetricTile
                  label="Locatários"
                  value={peopleLoading ? '...' : String(rentersCount)}
                  delta={`${people.length > 0 ? Math.round((rentersCount / people.length) * 100) : 0}% da base`}
                  helper="Unidades em locação"
                  tone="neutral"
                  onClick={() => {
                    router.push('/admin/moradores');
                  }}
                />
              </div>
            </section>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-slate-500">
          Painel analítico com foco em leitura rápida. Para detalhe completo, abra a área correspondente.
        </footer>
      </div>
    </div>
  );
}
