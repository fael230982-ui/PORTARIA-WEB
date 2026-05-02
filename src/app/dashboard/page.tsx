'use client';

import Link from 'next/link';
import { Bell, Cctv, Package, RefreshCw, UserCircle2 } from 'lucide-react';
import { ResidentUnitGate } from '@/components/auth/resident-unit-gate';
import { brandClasses, getBrandEyebrowClassName } from '@/config/brand-classes';
import { getCurrentCondominium } from '@/features/condominiums/condominium-contract';
import { useAuth } from '@/hooks/use-auth';
import { useCameras } from '@/hooks/use-cameras';
import { useResidentDeliveries, useResidentNotifications } from '@/hooks/use-resident';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import type { DeliveryStatus } from '@/types/delivery';

export default function DashboardPage() {
  const { user } = useAuth();
  const activeUnitId = user?.selectedUnitId ?? user?.unitId ?? null;
  const activeUnitLabel = user?.selectedUnitName || user?.unitName || 'Nenhuma unidade selecionada';
  const isResident = user?.role === 'MORADOR';
  const residentQueriesEnabled = Boolean(isResident && activeUnitId);
  const { condominiums } = useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);
  const currentCondominium = getCurrentCondominium(condominiums, user?.condominiumId);
  const residentManagementFlags = Object.entries(currentCondominium?.residentManagementSettings ?? {}).filter(([, value]) => Boolean(value)).length;
  const residentManagementSummary =
    residentManagementFlags > 0
      ? `${residentManagementFlags} configuracao(oes) ativa(s)`
      : 'Nenhuma configuracao especial ativa';

  const {
    data: deliveriesResponse,
    isLoading: deliveriesLoading,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useResidentDeliveries({
    page: 1,
    limit: 5,
    recipientUnitId: activeUnitId ?? undefined,
    enabled: residentQueriesEnabled,
  });

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useResidentNotifications({
    unreadOnly: false,
    enabled: residentQueriesEnabled,
  });

  const {
    data: camerasResponse,
    isLoading: camerasLoading,
    error: camerasError,
    refetch: refetchCameras,
  } = useCameras({
    unitId: activeUnitId ?? undefined,
    enabled: Boolean(activeUnitId),
  });

  const deliveries = deliveriesResponse?.data ?? [];
  const pendingDeliveries = deliveries.filter((delivery) => delivery.status !== 'WITHDRAWN');
  const withdrawnDeliveries = deliveries.filter((delivery) => delivery.status === 'WITHDRAWN');
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const readNotifications = notifications.filter((notification) => notification.readAt);
  const cameras = camerasResponse?.data ?? [];
  const onlineCameras = cameras.filter((camera) => camera.status === 'ONLINE');
  const offlineCameras = cameras.filter((camera) => camera.status !== 'ONLINE');

  const stats = [
    {
      title: 'Encomendas',
      value: String(deliveriesResponse?.meta?.totalItems ?? deliveries.length),
      detail: 'Resumo rápido das suas encomendas',
      primaryStatLabel: 'Aguardando retirada',
      primaryStatValue: pendingDeliveries.length,
      secondaryStatLabel: 'Já retiradas',
      secondaryStatValue: withdrawnDeliveries.length,
      icon: Package,
      href: '/dashboard/encomendas',
    },
    {
      title: 'Notificações',
      value: String(notifications.length),
      detail: 'Avisos recentes para acompanhamento',
      primaryStatLabel: 'Não lidas',
      primaryStatValue: unreadNotifications.length,
      secondaryStatLabel: 'Lidas',
      secondaryStatValue: readNotifications.length,
      icon: Bell,
      href: '/dashboard/alerts',
    },
    {
      title: 'Câmeras',
      value: String(cameras.length),
      detail: 'Câmeras disponíveis para a unidade',
      primaryStatLabel: 'Online',
      primaryStatValue: onlineCameras.length,
      secondaryStatLabel: 'Offline',
      secondaryStatValue: offlineCameras.length,
      icon: Cctv,
      href: '/dashboard/cameras',
    },
  ];

  return (
    <div className="space-y-6">
      <ResidentUnitGate />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.18em] ${getBrandEyebrowClassName()}`}>Painel do morador</p>
            <h1 className="mt-2 text-2xl font-semibold">Minha unidade</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Aqui você acompanha encomendas, avisos e câmeras da unidade selecionada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              <UserCircle2 className="h-4 w-4" />
              Meu perfil
            </Link>
            <button
              type="button"
              onClick={() => {
                refetchDeliveries();
                refetchNotifications();
                refetchCameras();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>

        {!activeUnitId ? (
          <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Selecione uma unidade ativa para consultar encomendas, notificacoes e cameras.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Morador logado</p>
              <p className="mt-2 text-white">{user?.personName || user?.name || 'Morador'}</p>
              <p className="mt-1 text-xs text-slate-400">{user?.email || 'E-mail não informado'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade ativa</p>
              <p className={`mt-2 ${brandClasses.accentTextSoft}`}>{activeUnitLabel}</p>
              <p className="mt-1 text-xs text-slate-400">Use o perfil para atualizar seus dados e preferencias.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Acesso rapido</p>
              <p className="mt-2 text-white">Perfil e configurações pessoais</p>
              <Link href="/dashboard/profile" className={`mt-2 inline-flex text-sm ${brandClasses.accentTextSoft}`}>
                Abrir perfil
              </Link>
            </div>
          </div>
        )}

        {currentCondominium ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Contrato do condomínio</p>
              <p className="mt-2 text-white">{currentCondominium.name}</p>
              <p className="mt-1 text-xs text-slate-400">Informações gerais da sua conta.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recursos disponíveis</p>
              <p className="mt-2 text-white">Informações atualizadas</p>
              <p className="mt-1 text-xs text-slate-400">Os dados desta tela são atualizados conforme o que estiver liberado para a sua unidade.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Configurações</p>
              <p className="mt-2 text-white">{residentManagementSummary}</p>
              <p className="mt-1 text-xs text-slate-400">
                Recebimento por entregador: {currentCondominium.visitForecastSettings?.allowDeliverer ? 'permitido' : 'não informado'}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white transition hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{item.title}</p>
                <Icon className={`h-5 w-5 ${brandClasses.accentTextSoft}`} />
              </div>
              <p className="mt-3 text-center text-3xl font-semibold tabular-nums">{item.value}</p>
              <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{item.primaryStatLabel}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.primaryStatValue}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{item.secondaryStatLabel}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.secondaryStatValue}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
