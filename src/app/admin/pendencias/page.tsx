'use client';

import Link from 'next/link';
import { AlertTriangle, CameraOff, Car, Clock3, Home, Package, RefreshCw, ScanFace } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import { useCameras } from '@/hooks/use-cameras';
import { useAllPeople } from '@/hooks/use-people';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useVehicles } from '@/hooks/use-vehicles';
import { normalizeDeliveryStatus } from '@/features/deliveries/delivery-normalizers';
import type { Unit } from '@/types/condominium';
import type { Person } from '@/types/person';

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatUnit(unit?: Unit | null) {
  if (!unit) return 'Unidade não identificada';
  return [unit.condominium?.name, unit.structure?.label, unit.label].filter(Boolean).join(' / ') || unit.label;
}

function personBelongsToUnit(person: Person, unit: Unit) {
  const refs = [unit.id, unit.legacyUnitId, unit.label].map(normalize).filter(Boolean);
  return [person.unitId, person.unitName, person.unit?.id, person.unit?.legacyUnitId, person.unit?.label]
    .map(normalize)
    .some((value) => refs.includes(value));
}

function hoursSince(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 3_600_000));
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-500/30 bg-red-500/10 text-red-100'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
        : tone === 'success'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
          : 'border-white/10 bg-white/5 text-white';

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="mt-2 text-center text-3xl font-semibold tabular-nums">{value}</p>
          <p className="mt-2 text-xs opacity-75">{description}</p>
        </div>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
    </div>
  );
}

function PendingList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; title: string; detail: string; href?: string; tone?: 'warning' | 'danger' | 'neutral' }>;
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => {
            const content = (
              <div className={`rounded-2xl border px-4 py-3 text-sm transition ${
                item.tone === 'danger'
                  ? 'border-red-500/25 bg-red-500/10 text-red-50'
                  : item.tone === 'warning'
                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-50'
                    : 'border-white/10 bg-slate-950/45 text-slate-100'
              }`}>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-xs opacity-75">{item.detail}</p>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className="block hover:opacity-90">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function AdminPendenciasPage() {
  const { user, canAccess, isChecking } = useProtectedRoute({ allowedRoles: ['ADMIN', 'MASTER', 'OPERADOR'] });
  const { data: deliveriesData, refetch: refetchDeliveries } = useAllDeliveries({ limit: 100, enabled: Boolean(user) });
  const { data: camerasData, refetch: refetchCameras } = useCameras({ enabled: Boolean(user) });
  const { data: peopleData, refetch: refetchPeople } = useAllPeople({ limit: 200, enabled: Boolean(user) });
  const { data: vehiclesData, refetch: refetchVehicles } = useVehicles(Boolean(user));
  const { units, refetchAll: refetchCatalog } = useResidenceCatalog(Boolean(user), user?.role === 'ADMIN' ? user.condominiumId ?? undefined : undefined);
  const [referenceNow] = useState(() => Date.now());

  const deliveries = deliveriesData?.data ?? [];
  const cameras = camerasData?.data ?? [];
  const people = peopleData?.data ?? [];
  const vehicles = vehiclesData?.data ?? [];

  const pendingDeliveries = useMemo(
    () => deliveries.filter((delivery) => normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN'),
    [deliveries]
  );
  const delayed24 = useMemo(() => pendingDeliveries.filter((delivery) => hoursSince(delivery.receivedAt) >= 24), [pendingDeliveries]);
  const delayed48 = useMemo(() => pendingDeliveries.filter((delivery) => hoursSince(delivery.receivedAt) >= 48), [pendingDeliveries]);
  const offlineCameras = useMemo(() => cameras.filter((camera) => camera.status === 'OFFLINE'), [cameras]);
  const camerasWithoutImage = useMemo(() => cameras.filter((camera) => !camera.snapshotUrl && !camera.imageStreamUrl), [cameras]);
  const peopleWithoutPhoto = useMemo(() => people.filter((person) => !person.photoUrl?.trim()), [people]);
  const overduePeople = useMemo(
    () => people.filter((person) => person.status === 'ACTIVE' && person.endDate && new Date(person.endDate).getTime() < referenceNow),
    [people, referenceNow]
  );
  const unitsWithoutResidents = useMemo(
    () => units.filter((unit) => !people.some((person) => person.category === 'RESIDENT' && personBelongsToUnit(person, unit))),
    [people, units]
  );
  const invalidVehicles = useMemo(
    () => vehicles.filter((vehicle) => !vehicle.unitId || vehicle.status === 'bloqueado'),
    [vehicles]
  );

  if (isChecking) {
    return <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">Carregando pendências...</div>;
  }

  if (!canAccess || !user) return null;

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Operação</p>
            <h1 className="mt-2 text-2xl font-semibold">Pendências da portaria</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 text-justify">
              Visão única dos pontos que exigem atenção com base nos dados disponíveis.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refetchDeliveries();
              void refetchCameras();
              void refetchPeople();
              void refetchVehicles();
              void refetchCatalog();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar tudo
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Encomendas 24h+" value={delayed24.length} description="Aguardam reforço de aviso" icon={Package} tone={delayed24.length ? 'warning' : 'success'} />
        <StatCard title="Encomendas 48h+" value={delayed48.length} description="Prioridade alta para retirada" icon={Clock3} tone={delayed48.length ? 'danger' : 'success'} />
        <StatCard title="Câmeras offline" value={offlineCameras.length} description="Precisam de verificação" icon={CameraOff} tone={offlineCameras.length ? 'danger' : 'success'} />
        <StatCard title="Pessoas sem foto" value={peopleWithoutPhoto.length} description="Cadastro de imagem incompleto" icon={ScanFace} tone={peopleWithoutPhoto.length ? 'warning' : 'success'} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Permanência vencida" value={overduePeople.length} description="Visitantes/prestadores ativos fora do prazo" icon={AlertTriangle} tone={overduePeople.length ? 'danger' : 'success'} />
        <StatCard title="Unidades sem morador" value={unitsWithoutResidents.length} description="Cadastro residencial incompleto" icon={Home} tone={unitsWithoutResidents.length ? 'warning' : 'success'} />
        <StatCard title="Veículos pendentes" value={invalidVehicles.length} description="Bloqueados ou sem unidade" icon={Car} tone={invalidVehicles.length ? 'warning' : 'success'} />
        <StatCard title="Câmeras sem imagem" value={camerasWithoutImage.length} description="Sem imagem de visualização" icon={CameraOff} tone={camerasWithoutImage.length ? 'warning' : 'success'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PendingList
          title="Encomendas atrasadas"
          empty="Nenhuma encomenda acima de 24h."
          items={delayed24.map((delivery) => ({
            id: delivery.id,
            title: delivery.deliveryCompany || 'Encomenda',
            detail: `${hoursSince(delivery.receivedAt)}h aguardando retirada`,
            href: `/admin/encomendas/${encodeURIComponent(delivery.id)}`,
            tone: hoursSince(delivery.receivedAt) >= 48 ? 'danger' : 'warning',
          }))}
        />
        <PendingList
          title="Câmeras com atenção"
          empty="Nenhuma pendência de câmera encontrada."
          items={[...offlineCameras, ...camerasWithoutImage]
            .filter((camera, index, list) => list.findIndex((item) => item.id === camera.id) === index)
            .map((camera) => ({
              id: camera.id,
              title: camera.name || 'Câmera',
              detail: [camera.status, camera.location, camera.snapshotUrl || camera.imageStreamUrl ? null : 'sem imagem'].filter(Boolean).join(' | '),
              href: '/admin/cameras',
              tone: camera.status === 'OFFLINE' ? 'danger' : 'warning',
            }))}
        />
        <PendingList
          title="Pessoas para revisar"
          empty="Nenhuma pessoa com pendência prioritária."
          items={[...overduePeople, ...peopleWithoutPhoto]
            .filter((person, index, list) => list.findIndex((item) => item.id === person.id) === index)
            .map((person) => ({
              id: person.id,
              title: person.name,
              detail: [person.endDate && new Date(person.endDate).getTime() < referenceNow ? 'permanência vencida' : null, person.photoUrl ? null : 'sem foto'].filter(Boolean).join(' | '),
              href: '/admin/moradores',
              tone: person.endDate && new Date(person.endDate).getTime() < referenceNow ? 'danger' : 'warning',
            }))}
        />
        <PendingList
          title="Unidades e veículos"
          empty="Nenhuma unidade ou veículo pendente."
          items={[
            ...unitsWithoutResidents.slice(0, 8).map((unit) => ({
              id: `unit-${unit.id}`,
              title: formatUnit(unit),
              detail: 'sem morador residente vinculado',
              href: `/admin/unidades?unitId=${encodeURIComponent(unit.id)}`,
              tone: 'warning' as const,
            })),
            ...invalidVehicles.slice(0, 8).map((vehicle) => ({
              id: `vehicle-${vehicle.id}`,
              title: vehicle.plate,
              detail: [vehicle.status === 'bloqueado' ? 'bloqueado' : null, !vehicle.unitId ? 'sem unidade' : null].filter(Boolean).join(' | '),
              href: '/admin/veiculos',
              tone: vehicle.status === 'bloqueado' ? 'danger' as const : 'warning' as const,
            })),
          ]}
        />
      </section>
    </div>
  );
}
