'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActiveUnitSelector } from '@/components/auth/active-unit-selector';
import { PageContainer } from '@/components/layout/page-container';
import { useAuth } from '@/hooks/use-auth';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import {
  useResidentLgpdConsent,
  useResidentLgpdConsentHistory,
  useResidentLgpdPolicy,
  useResidentNotificationPreferences,
  useResidentProfile,
  useResidentVisitForecasts,
  useUpdateResidentLgpdConsent,
  useUpdateResidentNotificationPreferences,
} from '@/hooks/use-resident';
import { getResidentDeviceId, RESIDENT_DEVICE_ID_PLACEHOLDER } from '@/features/resident/resident-device-id';
import type { UserScopeType, UserResponse } from '@/types/user';

function resolveLinkedUnitLabel(
  unitId: string | null | undefined,
  units: ReturnType<typeof useResidenceCatalog>['units']
) {
  const normalizedUnitId = String(unitId ?? '').trim();
  if (!normalizedUnitId) return 'Sem unidade principal definida';

  const matchedUnit =
    units.find((unit) => unit.id === normalizedUnitId) ||
    units.find((unit) => unit.legacyUnitId === normalizedUnitId);

  if (!matchedUnit) {
    return 'Unidade nao identificada';
  }

  return (
    [matchedUnit.condominium?.name, matchedUnit.structure?.label, matchedUnit.label]
      .filter(Boolean)
      .join(' / ') || matchedUnit.legacyUnitId || matchedUnit.label
  );
}

function formatMatchedUnitLabel(unit: NonNullable<ReturnType<typeof useResidenceCatalog>['units']>[number]) {
  return (
    [unit.condominium?.name, unit.structure?.label, unit.label]
      .filter(Boolean)
      .join(' / ') || unit.legacyUnitId || unit.label
  );
}

function resolveSelectedUnitLabel(
  user: Pick<UserResponse, 'selectedUnitId' | 'selectedUnitName' | 'unitIds' | 'unitNames'> | null | undefined,
  units: ReturnType<typeof useResidenceCatalog>['units']
) {
  if (!user?.selectedUnitId) {
    return user?.selectedUnitName || 'Nenhuma unidade ativa';
  }

  const matchedUnit =
    units.find((unit) => unit.id === user.selectedUnitId) ||
    units.find((unit) => unit.legacyUnitId === user.selectedUnitId);

  if (matchedUnit) {
    return formatMatchedUnitLabel(matchedUnit);
  }

  const selectedIndex = (user.unitIds ?? []).findIndex((item) => item === user.selectedUnitId);
  if (selectedIndex >= 0) {
    const mappedName = user.unitNames?.[selectedIndex]?.trim();
    if (mappedName) return mappedName;
  }

  return user.selectedUnitName || 'Unidade nao identificada';
}

function getAccountLabel(scopeType?: UserScopeType | null) {
  switch (scopeType) {
    case 'GLOBAL':
      return 'Acesso completo';
    case 'ASSIGNED':
      return 'Conta vinculada';
    case 'RESIDENT':
      return 'Morador';
    case 'UNSCOPED':
      return 'Nao informado';
    default:
      return 'Nao informado';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Nao registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
}

function formatProfileSource(source?: string | null) {
  if (!source) return 'Conta sincronizada';
  if (source === 'CANONICAL_RESIDENT_PROFILE') return 'Conta principal do morador';
  return 'Conta sincronizada';
}

function formatVisitStatus(status?: string | null) {
  switch (status) {
    case 'PENDING_ARRIVAL':
      return 'Aguardando chegada';
    case 'ARRIVED':
      return 'Chegou';
    case 'EXPIRED':
      return 'Expirou';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status || 'Nao informado';
  }
}

export default function ProfilePage() {
  const { user } = useAuth();
  const residentEnabled = Boolean(user?.role === 'MORADOR' && user?.selectedUnitId);
  const { units } = useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);
  const [deviceId, setDeviceId] = useState(RESIDENT_DEVICE_ID_PLACEHOLDER);
  const [selectedChannel, setSelectedChannel] = useState('APP');
  const [selectedPriority, setSelectedPriority] = useState('IMPORTANT');

  const residentProfileQuery = useResidentProfile(user?.selectedUnitId, residentEnabled);
  const preferencesQuery = useResidentNotificationPreferences(residentEnabled);
  const lgpdPolicyQuery = useResidentLgpdPolicy(residentEnabled);
  const consentQuery = useResidentLgpdConsent(deviceId, residentEnabled);
  const consentHistoryQuery = useResidentLgpdConsentHistory(deviceId, residentEnabled);
  const visitForecastsQuery = useResidentVisitForecasts({
    enabled: residentEnabled,
    unitId: user?.selectedUnitId ?? undefined,
    limit: 6,
  });
  const updatePreferences = useUpdateResidentNotificationPreferences();
  const updateConsent = useUpdateResidentLgpdConsent();

  const effectiveProfile = residentProfileQuery.data ?? user;
  const linkedUnitLabel = resolveLinkedUnitLabel(effectiveProfile?.unitId, units);
  const selectedUnitLabel = resolveSelectedUnitLabel(effectiveProfile, units);
  const selectedUnitsCount = effectiveProfile?.unitIds?.length ?? 0;
  const consentHistoryCount = consentHistoryQuery.data?.length ?? 0;

  useEffect(() => {
    setDeviceId(getResidentDeviceId());
  }, []);

  const upcomingVisits = useMemo(() => {
    return (visitForecastsQuery.data?.data ?? []).slice(0, 4);
  }, [visitForecastsQuery.data]);
  const selectedChannelValue = preferencesQuery.data?.channel || selectedChannel;
  const selectedPriorityValue = preferencesQuery.data?.priority || selectedPriority;

  return (
    <PageContainer title="Perfil" description="Atualize seus dados, escolha a unidade e ajuste seus avisos.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Dados da conta</p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {effectiveProfile?.personName || effectiveProfile?.name || 'Morador'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">{formatProfileSource(effectiveProfile?.profileSource)}</p>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">E-mail</p>
              <p className="mt-1 text-white">{effectiveProfile?.email || 'Nao informado'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Tipo de acesso</p>
              <p className="mt-1 text-white">{effectiveProfile?.role || 'Nao informado'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Unidade atual</p>
              <p className="mt-1 text-white">{selectedUnitLabel}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Cadastro principal</p>
              <p className="mt-1 text-white">{linkedUnitLabel}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Situacao da conta</p>
              <p className="mt-1 text-white">{getAccountLabel(effectiveProfile?.scopeType)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Unidades disponiveis</p>
              <p className="mt-1 text-white">{selectedUnitsCount}</p>
              <p className="mt-2 text-xs text-slate-500">
                {effectiveProfile?.requiresUnitSelection
                  ? 'Escolha uma unidade para continuar usando a conta.'
                  : 'Sua conta ja esta pronta para uso.'}
              </p>
            </div>
          </div>

          {residentProfileQuery.isError ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Nao foi possivel atualizar seus dados agora. Estamos exibindo as informacoes mais recentes disponiveis.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Escolha a unidade que deseja acompanhar</h2>
          <p className="mt-2 text-sm text-slate-300 text-justify">
            Se a sua conta tiver mais de uma unidade vinculada, selecione abaixo a que deseja consultar agora.
          </p>
          <ActiveUnitSelector className="mt-5" forceSelection={Boolean(effectiveProfile?.requiresUnitSelection)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Avisos</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Como voce deseja receber avisos</h2>
          <p className="mt-2 text-sm text-slate-400 text-justify">Escolha como deseja receber os avisos mais importantes.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Canal principal</span>
              <select
                value={selectedChannelValue}
                onChange={(event) => setSelectedChannel(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="APP">App</option>
                <option value="PUSH">Push</option>
                <option value="EMAIL">E-mail</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Prioridade</span>
              <select
                value={selectedPriorityValue}
                onChange={(event) => setSelectedPriority(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="ALL">Todas</option>
                <option value="IMPORTANT">Importantes</option>
                <option value="CRITICAL">Criticas</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                updatePreferences.mutate({
                  channel: selectedChannelValue,
                  priority: selectedPriorityValue,
                })
              }
              disabled={updatePreferences.isPending || preferencesQuery.isLoading}
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatePreferences.isPending ? 'Salvando...' : 'Salvar preferencias'}
            </button>
          </div>

          {preferencesQuery.isError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Nao foi possivel carregar suas preferencias agora.
            </div>
          ) : null}
          {updatePreferences.isSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Preferencias atualizadas com sucesso.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Privacidade</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Consentimento e historico</h2>
          <p className="mt-2 text-sm text-slate-400 text-justify">
            Aqui voce acompanha o aceite atual e os registros mais recentes de privacidade da sua conta.
          </p>

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Situacao atual</p>
              <p className="mt-1 text-white">{consentQuery.data?.accepted ? 'Aceito' : 'Pendente'}</p>
              <p className="mt-2 text-xs text-slate-500">Versao: {consentQuery.data?.version || 'Nao registrada'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Aceite registrado em</p>
              <p className="mt-1 text-white">{formatDateTime(consentQuery.data?.acceptedAt)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Historico recente</p>
              <p className="mt-1 text-white">{consentHistoryCount} registro(s)</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-slate-500">Versao atual</p>
              <p className="mt-1 text-white">{lgpdPolicyQuery.data?.currentVersion || 'Nao informada'}</p>
            </div>
          </div>

          {consentHistoryCount ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-300">Ultimos registros</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {consentHistoryQuery.data?.slice(0, 3).map((entry, index) => (
                  <div key={entry.id || `${index}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-white">{entry.accepted ? 'Aceite registrado' : 'Revogacao registrada'}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Versao {entry.version || 'nao informada'} em {formatDateTime(entry.acceptedAt || entry.revokedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                updateConsent.mutate({
                  accepted: true,
                  version: lgpdPolicyQuery.data?.currentVersion || '2026-04-14',
                  deviceId,
                })
              }
              disabled={updateConsent.isPending || consentQuery.isLoading}
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateConsent.isPending ? 'Salvando...' : 'Registrar aceite'}
            </button>
          </div>

          {consentQuery.isError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Nao foi possivel carregar os dados de privacidade agora.
            </div>
          ) : null}
          {consentHistoryQuery.isError ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Nao foi possivel carregar o historico de privacidade agora.
            </div>
          ) : null}
          {lgpdPolicyQuery.isError ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Nao foi possivel carregar os detalhes de privacidade agora.
            </div>
          ) : null}
          {updateConsent.isSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Aceite registrado com sucesso.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Visitas previstas</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Proximas liberacoes da unidade</h2>
        <p className="mt-2 text-sm text-slate-400 text-justify">
          Acompanhe as visitas e acessos previstos para a unidade selecionada.
        </p>

        {visitForecastsQuery.isLoading ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            Carregando visitas previstas...
          </div>
        ) : null}

        {visitForecastsQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Nao foi possivel carregar as visitas previstas agora.
          </div>
        ) : null}

        {!visitForecastsQuery.isLoading && !visitForecastsQuery.isError && !upcomingVisits.length ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            Nao ha visitas previstas no momento.
          </div>
        ) : null}

        {upcomingVisits.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {upcomingVisits.map((visit) => (
              <div key={visit.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{visit.visitorName}</p>
                    <p className="mt-1 text-sm text-slate-400">{visit.categoryLabel || visit.category || 'Visita prevista'}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    {formatVisitStatus(visit.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                  <p>
                    <span className="text-slate-500">Unidade:</span> {visit.unitName || selectedUnitLabel}
                  </p>
                  <p>
                    <span className="text-slate-500">Entrada prevista:</span> {formatDateTime(visit.expectedAt || visit.startsAt || visit.expectedDate)}
                  </p>
                  <p>
                    <span className="text-slate-500">Saida prevista:</span> {formatDateTime(visit.endsAt)}
                  </p>
                  <p>
                    <span className="text-slate-500">Liberacao:</span> {visit.releaseMode || 'Nao informada'}
                  </p>
                </div>
                {visit.notes ? <p className="mt-3 text-sm text-slate-400 text-justify">{visit.notes}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
