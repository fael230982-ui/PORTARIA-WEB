'use client';

import Link from 'next/link';
import { AlertTriangle, Cctv, Car, ChevronRight, Clock3, Home, Package, RefreshCw, ScanFace } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { normalizeDeliveryStatus } from '@/features/deliveries/delivery-normalizers';
import { useCameras } from '@/hooks/use-cameras';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import { useAllPeople } from '@/hooks/use-people';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useVehicles } from '@/hooks/use-vehicles';
import type { Unit } from '@/types/condominium';
import type { Person } from '@/types/person';

type Tone = 'neutral' | 'warning' | 'danger' | 'success';

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatUnit(unit?: Unit | null) {
  if (!unit) return 'Unidade não identificada';
  return [unit.structure?.label, unit.label].filter(Boolean).join(' / ') || unit.label;
}

function compareText(left?: string | null, right?: string | null) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
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

function getToneClass(tone: Tone) {
  if (tone === 'danger') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (tone === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (tone === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  return 'border-white/10 bg-white/5 text-white';
}

function getItemToneClass(tone: Tone) {
  if (tone === 'danger') return 'border-red-500/25 bg-red-500/10 text-red-50';
  if (tone === 'warning') return 'border-amber-500/25 bg-amber-500/10 text-amber-50';
  if (tone === 'success') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-50';
  return 'border-white/10 bg-slate-950/45 text-slate-100';
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
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${getToneClass(tone)}`}>
      <div className="flex h-full min-h-[116px] flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="max-w-[11rem] text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{title}</p>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15">
            <Icon className="h-4 w-4 opacity-85" />
          </span>
        </div>
        <div>
          <p className="text-center text-3xl font-semibold leading-none tabular-nums">{value}</p>
          <p className="mt-2 min-h-[32px] text-xs leading-relaxed opacity-75">{description}</p>
        </div>
      </div>
    </div>
  );
}

function PendingList({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string;
  subtitle: string;
  items: Array<{ id: string; title: string; detail: string; href?: string; tone?: Tone; meta?: string }>;
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{subtitle}</p>
        </div>
        <span className="inline-flex min-w-10 justify-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => {
            const content = (
              <div className={`grid gap-3 rounded-2xl border px-4 py-3 text-sm transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${getItemToneClass(item.tone ?? 'neutral')}`}>
                <div className="min-w-0">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <p className="truncate font-medium">{item.title}</p>
                    {item.meta ? (
                      <span className="w-fit rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] opacity-80 sm:justify-self-end">
                        {item.meta}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-75">{item.detail}</p>
                </div>
                {item.href ? (
                  <span className="inline-flex items-center gap-1 justify-self-start text-xs font-semibold uppercase tracking-[0.14em] opacity-85 sm:justify-self-end">
                    Abrir
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                ) : null}
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
  const { user, canAccess, isChecking } = useProtectedRoute({ allowedRoles: ['ADMIN', 'GERENTE', 'MASTER', 'OPERADOR'] });
  const { data: deliveriesData, refetch: refetchDeliveries } = useAllDeliveries({ limit: 100, enabled: Boolean(user) });
  const { data: camerasData, refetch: refetchCameras } = useCameras({ enabled: Boolean(user) });
  const { data: peopleData, refetch: refetchPeople } = useAllPeople({ limit: 200, enabled: Boolean(user) });
  const { data: vehiclesData, refetch: refetchVehicles } = useVehicles(Boolean(user));
  const { units, refetchAll: refetchCatalog } = useResidenceCatalog(Boolean(user), ['ADMIN', 'GERENTE'].includes(user?.role ?? '') ? user?.condominiumId ?? undefined : undefined);
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando pendências...
      </div>
    );
  }

  if (!canAccess || !user) return null;

  return (
    <div className="space-y-5 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Operação</p>
            <h1 className="mt-2 text-2xl font-semibold">Pendências da portaria</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              Visão consolidada dos itens que precisam de revisão: encomendas atrasadas, câmeras, cadastros incompletos, unidades e veículos.
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
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar tudo
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Encomendas 24h+" value={delayed24.length} description="Aguardam reforço de aviso ao morador." icon={Package} tone={delayed24.length ? 'warning' : 'success'} />
        <StatCard title="Encomendas 48h+" value={delayed48.length} description="Prioridade alta para retirada." icon={Clock3} tone={delayed48.length ? 'danger' : 'success'} />
        <StatCard title="Câmeras offline" value={offlineCameras.length} description="Precisam de verificação técnica." icon={Cctv} tone={offlineCameras.length ? 'danger' : 'success'} />
        <StatCard title="Pessoas sem foto" value={peopleWithoutPhoto.length} description="Cadastro facial ou imagem incompleto." icon={ScanFace} tone={peopleWithoutPhoto.length ? 'warning' : 'success'} />
        <StatCard title="Permanência vencida" value={overduePeople.length} description="Visitantes ou prestadores fora do prazo." icon={AlertTriangle} tone={overduePeople.length ? 'danger' : 'success'} />
        <StatCard title="Unidades sem morador" value={unitsWithoutResidents.length} description="Estrutura sem residente vinculado." icon={Home} tone={unitsWithoutResidents.length ? 'warning' : 'success'} />
        <StatCard title="Veículos pendentes" value={invalidVehicles.length} description="Bloqueados ou sem unidade vinculada." icon={Car} tone={invalidVehicles.length ? 'warning' : 'success'} />
        <StatCard title="Câmeras sem imagem" value={camerasWithoutImage.length} description="Sem snapshot ou stream de imagem." icon={Cctv} tone={camerasWithoutImage.length ? 'warning' : 'success'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PendingList
          title="Encomendas atrasadas"
          subtitle="Itens que exigem contato ou acompanhamento de retirada."
          empty="Nenhuma encomenda acima de 24h."
          items={delayed24
            .map((delivery) => {
              const hours = hoursSince(delivery.receivedAt);
              return {
                id: delivery.id,
                title: delivery.deliveryCompany || 'Encomenda',
                detail: `${hours}h aguardando retirada`,
                meta: hours >= 48 ? '48h+' : '24h+',
                href: `/admin/encomendas/${encodeURIComponent(delivery.id)}`,
                tone: hours >= 48 ? 'danger' as const : 'warning' as const,
                sortHours: hours,
              };
            })
            .sort((left, right) => right.sortHours - left.sortHours)}
        />
        <PendingList
          title="Câmeras com atenção"
          subtitle="Equipamentos offline ou sem imagem para visualização."
          empty="Nenhuma pendência de câmera encontrada."
          items={[...offlineCameras, ...camerasWithoutImage]
            .filter((camera, index, list) => list.findIndex((item) => item.id === camera.id) === index)
            .sort((left, right) => Number(right.status === 'OFFLINE') - Number(left.status === 'OFFLINE') || compareText(left.name, right.name))
            .map((camera) => ({
              id: camera.id,
              title: camera.name || 'Câmera',
              detail: [camera.status, camera.location, camera.snapshotUrl || camera.imageStreamUrl ? null : 'sem imagem'].filter(Boolean).join(' | '),
              meta: camera.status === 'OFFLINE' ? 'offline' : 'imagem',
              href: '/admin/cameras',
              tone: camera.status === 'OFFLINE' ? 'danger' : 'warning',
            }))}
        />
        <PendingList
          title="Pessoas para revisar"
          subtitle="Cadastros sem foto ou com permanência vencida."
          empty="Nenhuma pessoa com pendência prioritária."
          items={[...overduePeople, ...peopleWithoutPhoto]
            .filter((person, index, list) => list.findIndex((item) => item.id === person.id) === index)
            .sort((left, right) => {
              const leftExpired = Boolean(left.endDate && new Date(left.endDate).getTime() < referenceNow);
              const rightExpired = Boolean(right.endDate && new Date(right.endDate).getTime() < referenceNow);
              return Number(rightExpired) - Number(leftExpired) || compareText(left.name, right.name);
            })
            .map((person) => {
              const expired = Boolean(person.endDate && new Date(person.endDate).getTime() < referenceNow);
              return {
                id: person.id,
                title: person.name,
                detail: [expired ? 'permanência vencida' : null, person.photoUrl ? null : 'sem foto'].filter(Boolean).join(' | '),
                meta: expired ? 'prazo' : 'foto',
                href: '/admin/moradores',
                tone: expired ? 'danger' : 'warning',
              };
            })}
        />
        <PendingList
          title="Unidades e veículos"
          subtitle="Vínculos cadastrais que precisam de conferência."
          empty="Nenhuma unidade ou veículo pendente."
          items={[
            ...unitsWithoutResidents.slice(0, 8).map((unit) => ({
              id: `unit-${unit.id}`,
              title: formatUnit(unit),
              detail: 'sem morador residente vinculado',
              meta: 'unidade',
              href: `/admin/unidades?unitId=${encodeURIComponent(unit.id)}`,
              tone: 'warning' as const,
            })).sort((left, right) => compareText(left.title, right.title)),
            ...invalidVehicles.slice(0, 8).map((vehicle) => ({
              id: `vehicle-${vehicle.id}`,
              title: vehicle.plate,
              detail: [vehicle.status === 'bloqueado' ? 'bloqueado' : null, !vehicle.unitId ? 'sem unidade' : null].filter(Boolean).join(' | '),
              meta: 'veículo',
              href: '/admin/veiculos',
              tone: vehicle.status === 'bloqueado' ? 'danger' as const : 'warning' as const,
            })).sort((left, right) => compareText(left.title, right.title)),
          ]}
        />
      </section>
    </div>
  );
}
