'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, PlayCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CrudModal } from '@/components/admin/CrudModal';
import {
  alertResolutionPresets,
  getAlertWorkflowClass,
  getAlertWorkflowLabel,
  getAlertWorkflowRecord,
} from '@/features/alerts/alert-workflow';
import {
  getAlertEvidenceLabel,
  getAlertEvidenceUrl,
  getAlertReplayUrl,
  getAlertTone,
  getAlertTypeLabel,
} from '@/features/alerts/alert-normalizers';
import { useAlertWorkflow } from '@/hooks/use-alert-workflow';
import { useAlerts } from '@/hooks/use-alerts';
import { useAuth } from '@/hooks/use-auth';
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts';
import { updateAlertStatus, updateAlertWorkflow } from '@/services/alerts.service';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types/alert';

type AlertsPanelProps = {
  alerts?: Alert[];
  title?: string;
  description?: string;
  limit?: number;
  showRealtimeStatus?: boolean;
  onSelectAlert?: (alert: Alert) => void;
};

type OperationalFilter = 'ALL' | 'NEW' | 'ON_HOLD' | 'RESOLVED';

function formatDateTime(value?: string | null) {
  if (!value) return 'Não registrado';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
}

export function AlertsPanel({
  alerts: providedAlerts,
  title = 'Alertas em tempo real',
  description = 'Ocorrências e pendências mais recentes.',
  limit = 10,
  showRealtimeStatus = true,
  onSelectAlert,
}: AlertsPanelProps) {
  const { user } = useAuth();
  const isResidentView = user?.role === 'MORADOR';
  const shouldUseRealtimeAlerts = !providedAlerts;
  const { connectionStatus, alerts: liveAlerts } = useRealTimeAlerts(shouldUseRealtimeAlerts);
  const { data: fetchedAlerts, isLoading, refetch, isFetching } = useAlerts({
    limit,
    enabled: !providedAlerts,
  });
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionPreset, setResolutionPreset] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [operationalFilter, setOperationalFilter] = useState<OperationalFilter>('NEW');
  const [search, setSearch] = useState('');
  const [savingResolution, setSavingResolution] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [failedEvidenceUrls, setFailedEvidenceUrls] = useState<string[]>([]);
  const resolutionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  const alerts = useMemo(() => {
    const baseAlerts = providedAlerts ?? fetchedAlerts?.data ?? [];
    const merged = [...liveAlerts, ...baseAlerts];
    const unique = new Map<string, Alert>();

    merged.forEach((alert) => {
      if (!unique.has(alert.id)) {
        unique.set(alert.id, alert);
      }
    });

    return Array.from(unique.values())
      .map((alert) => (readAlertIds.includes(alert.id) ? { ...alert, status: 'READ' as const } : alert))
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, limit);
  }, [fetchedAlerts?.data, limit, liveAlerts, providedAlerts, readAlertIds]);

  const { store, markOpened, resolve, hold, saveDraft } = useAlertWorkflow(alerts);

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      const record = getAlertWorkflowRecord(alert, store);
      const currentStatus =
        record?.workflowStatus ?? (alert.status === 'READ' ? 'RESOLVED' : 'NEW');
      const matchesFilter =
        operationalFilter === 'ALL' ? true : currentStatus === operationalFilter;

      if (!matchesFilter) return false;
      if (!normalizedSearch) return true;

      return [
        alert.title,
        alert.description,
        getAlertTypeLabel(alert.type),
        alert.location,
        record?.resolutionNote,
        record?.draftNote,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [alerts, operationalFilter, search, store]);

  const summary = useMemo(
    () =>
      alerts.reduce(
        (acc, alert) => {
          const record = getAlertWorkflowRecord(alert, store);
          const status = record?.workflowStatus ?? (alert.status === 'READ' ? 'RESOLVED' : 'NEW');
          if (status === 'RESOLVED') acc.resolved += 1;
          else if (status === 'ON_HOLD') acc.onHold += 1;
          else acc.newItems += 1;
          return acc;
        },
        { newItems: 0, onHold: 0, resolved: 0 }
      ),
    [alerts, store]
  );

  const selectedRecord = useMemo(
    () => getAlertWorkflowRecord(selectedAlert, store),
    [selectedAlert, store]
  );
  const selectedEvidenceUrl = useMemo(
    () => getAlertEvidenceUrl(selectedAlert),
    [selectedAlert]
  );
  const selectedReplayUrl = useMemo(
    () => getAlertReplayUrl(selectedAlert),
    [selectedAlert]
  );
  const resolutionValue = `${resolutionPreset} ${resolutionText}`.trim();
  const safeSelectedEvidenceUrl =
    selectedEvidenceUrl && !failedEvidenceUrls.includes(selectedEvidenceUrl)
      ? selectedEvidenceUrl
      : null;

  function markEvidenceAsFailed(url?: string | null) {
    if (!url) return;
    setFailedEvidenceUrls((current) => (current.includes(url) ? current : [...current, url]));
  }

  useEffect(() => {
    if (!selectedAlert) return;
    markOpened(selectedAlert, user?.name ?? null);
  }, [markOpened, selectedAlert, user?.name]);

  useEffect(() => {
    if (!selectedAlert || !isResidentView || readAlertIds.includes(selectedAlert.id)) return;

    setReadAlertIds((current) => (current.includes(selectedAlert.id) ? current : [...current, selectedAlert.id]));
    void updateAlertStatus(selectedAlert.id, 'READ').catch(() => undefined);
  }, [isResidentView, readAlertIds, selectedAlert]);

  useEffect(() => {
    if (!selectedAlert) {
      setResolutionPreset('');
      setResolutionText('');
      setResolutionError(null);
      return;
    }

    setResolutionPreset(selectedRecord?.draftPreset ?? selectedRecord?.resolutionPreset ?? '');
    setResolutionText(selectedRecord?.draftNote ?? selectedRecord?.resolutionNote ?? '');
    setResolutionError(null);
  }, [selectedAlert?.id, selectedRecord?.draftNote, selectedRecord?.draftPreset, selectedRecord?.resolutionNote, selectedRecord?.resolutionPreset]);

  async function handleResolveAlert() {
    if (!selectedAlert) return;
    if (!resolutionValue) {
      setResolutionError('Preencha a resolução antes de encerrar a ocorrência.');
      resolutionTextareaRef.current?.focus();
      return;
    }

    setSavingResolution(true);
    setResolutionError(null);

    try {
      await updateAlertWorkflow(selectedAlert.id, {
        workflowStatus: 'RESOLVED',
        resolutionNote: resolutionText.trim() || resolutionPreset || null,
        resolutionPreset: resolutionPreset || null,
      });
      await updateAlertStatus(selectedAlert.id, 'READ');
    } catch {
      // Mantém o fluxo operacional local mesmo se a persistência remota falhar.
    } finally {
      resolve(selectedAlert, {
        actorName: user?.name ?? null,
        note: resolutionText.trim() || resolutionPreset || null,
        preset: resolutionPreset || null,
      });
      setSavingResolution(false);
    }
  }

  function handleHoldAlert() {
    if (!selectedAlert) return;
    void updateAlertWorkflow(selectedAlert.id, {
      workflowStatus: 'ON_HOLD',
      resolutionNote: resolutionText.trim() || resolutionPreset || null,
      resolutionPreset: resolutionPreset || null,
    }).catch(() => undefined);
    hold(selectedAlert, {
      actorName: user?.name ?? null,
      note: resolutionText.trim() || resolutionPreset || null,
      preset: resolutionPreset || null,
    });
    setResolutionError(null);
  }

  function handleSaveDraft() {
    if (!selectedAlert) return;
    saveDraft(selectedAlert, {
      actorName: user?.name ?? null,
      note: resolutionText.trim() || null,
      preset: resolutionPreset || null,
    });
    setResolutionError(null);
    setSelectedAlert(null);
  }

  return (
    <>
      <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                {title}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-400 text-justify">{description}</p>
            </div>

            <div className="flex items-center gap-2">
              {showRealtimeStatus ? (
                <Badge
                  variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
                  className={cn(
                    connectionStatus === 'connected'
                      ? 'border-emerald-500/30 bg-emerald-500/20'
                      : 'border-red-500/30 bg-red-500/20'
                  )}
                >
                  {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                </Badge>
              ) : null}
              {!providedAlerts ? (
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setOperationalFilter('ALL')}
              className={`rounded-xl border p-3 text-left ${operationalFilter === 'ALL' ? 'border-white/15 bg-white/10' : 'border-white/10 bg-black/20'}`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Todos</p>
              <p className="mt-1 text-center text-lg font-semibold text-white">{alerts.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setOperationalFilter('NEW')}
              className={`rounded-xl border p-3 text-left ${operationalFilter === 'NEW' ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-white/10 bg-black/20'}`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100">Novos</p>
              <p className="mt-1 text-center text-lg font-semibold text-white">{summary.newItems}</p>
            </button>
            <button
              type="button"
              onClick={() => setOperationalFilter('ON_HOLD')}
              className={`rounded-xl border p-3 text-left ${operationalFilter === 'ON_HOLD' ? 'border-amber-500/20 bg-amber-500/10' : 'border-white/10 bg-black/20'}`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber-100">Em espera</p>
              <p className="mt-1 text-center text-lg font-semibold text-white">{summary.onHold}</p>
            </button>
            <button
              type="button"
              onClick={() => setOperationalFilter('RESOLVED')}
              className={`rounded-xl border p-3 text-left ${operationalFilter === 'RESOLVED' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-white/10 bg-black/20'}`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-100">Resolvidos</p>
              <p className="mt-1 text-center text-lg font-semibold text-white">{summary.resolved}</p>
            </button>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título, descrição, unidade ou tipo da ocorrência"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />

          {isLoading && !providedAlerts ? (
            <div className="flex items-center justify-center space-x-2 py-6 text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Carregando alertas...</span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
              Nenhum alerta nesta fila.
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const record = getAlertWorkflowRecord(alert, store);
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => {
                    onSelectAlert?.(alert);
                    setSelectedAlert(alert);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 flex-shrink-0 text-slate-300" />
                        <p className="truncate text-sm font-medium text-white">{alert.title}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-400 text-justify">
                        {alert.description || 'Sem descrição disponível.'}
                      </p>
                      {(() => {
                        const evidenceUrl = getAlertEvidenceUrl(alert);
                        if (!evidenceUrl || failedEvidenceUrls.includes(evidenceUrl)) return null;
                        return (
                        <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                          <img
                            src={evidenceUrl}
                            alt={alert.title}
                            className="h-28 w-full object-cover"
                            onError={() => markEvidenceAsFailed(evidenceUrl)}
                          />
                        </div>
                        );
                      })()}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Chegou em {formatDateTime(record?.arrivedAt ?? alert.timestamp)}</span>
                        {record?.openedAt ? <span>Aberto em {formatDateTime(record.openedAt)}</span> : null}
                        {record?.resolvedAt ? <span>Resolvido em {formatDateTime(record.resolvedAt)}</span> : null}
                        {alert.location ? <span>Origem: {alert.location}</span> : null}
                        <span>Evidência: {getAlertEvidenceLabel(alert)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={getAlertTone(alert.type)}>
                        {getAlertTypeLabel(alert.type)}
                      </Badge>
                      <Badge variant="outline" className={getAlertWorkflowClass(alert, record)}>
                        {getAlertWorkflowLabel(alert, record)}
                      </Badge>
                      <span className="text-xs font-medium text-slate-300">Detalhar</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <CrudModal
        open={Boolean(selectedAlert)}
        title="Tratamento da ocorrência"
        description="Registre a ocorrência sem perder o rascunho e finalize somente após a validação."
        onClose={() => setSelectedAlert(null)}
        maxWidth="xl"
      >
        {selectedAlert ? (
          <div className="space-y-4">
            <div className={`rounded-2xl border p-4 ${getAlertTone(selectedAlert.type)}`}>
              <p className="font-medium">{selectedAlert.title || 'Alerta'}</p>
              <p className="mt-2 text-sm opacity-90 text-justify">
                {selectedAlert.description || 'Sem descrição complementar.'}
              </p>
            </div>

            {resolutionError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                Não foi possível encerrar a ocorrência: {resolutionError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Chegada</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatDateTime(selectedRecord?.arrivedAt ?? selectedAlert.timestamp)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Abertura</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatDateTime(selectedRecord?.openedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Resolução</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatDateTime(selectedRecord?.resolvedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {getAlertWorkflowLabel(selectedAlert, selectedRecord)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tipo</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {getAlertTypeLabel(selectedAlert.type)}
                </p>
              </div>
              {selectedRecord?.openedByName ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Aberto por</p>
                  <p className="mt-2 text-sm font-medium text-white">{selectedRecord.openedByName}</p>
                </div>
              ) : null}
              {selectedRecord?.resolvedByName ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Resolvido por</p>
                  <p className="mt-2 text-sm font-medium text-white">{selectedRecord.resolvedByName}</p>
                </div>
              ) : null}
            </div>

            {safeSelectedEvidenceUrl ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <img
                  src={safeSelectedEvidenceUrl}
                  alt={selectedAlert.title}
                  className="h-72 w-full object-cover"
                  onError={() => markEvidenceAsFailed(safeSelectedEvidenceUrl)}
                />
              </div>
            ) : null}

            {selectedReplayUrl ? (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Pré-alarme</p>
                <p className="mt-2 text-sm text-slate-100 text-justify">
                  Replay curto associado ao disparo para validação operacional.
                </p>
                <a
                  href={selectedReplayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/20"
                >
                  <PlayCircle className="h-4 w-4" />
                  Abrir pré-alarme
                </a>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Respostas sugeridas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alertResolutionPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setResolutionPreset(preset);
                      setResolutionText((current) => (current.trim() ? current : preset));
                      setResolutionError(null);
                      window.requestAnimationFrame(() => resolutionTextareaRef.current?.focus());
                    }}
                    className={`rounded-full border px-3 py-2 text-xs transition ${resolutionPreset === preset ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/10'}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">
                Resolução da ocorrência <span className="text-red-300">*</span>
              </span>
              <textarea
                ref={resolutionTextareaRef}
                value={resolutionText}
                onChange={(event) => {
                  setResolutionText(event.target.value);
                  if (`${resolutionPreset} ${event.target.value}`.trim()) {
                    setResolutionError(null);
                  }
                }}
                rows={5}
                placeholder="Descreva o que aconteceu, o que foi verificado e como a ocorrência foi tratada."
                className={`w-full rounded-2xl border bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 ${resolutionError ? 'border-red-500/40' : 'border-white/10'}`}
              />
              <p className="text-xs text-slate-500">
                Esse preenchimento é obrigatório para encerrar a ocorrência.
              </p>
            </label>

            {selectedRecord?.draftSavedAt ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                Rascunho salvo em {formatDateTime(selectedRecord.draftSavedAt)}.
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={handleSaveDraft}
              >
                Salvar rascunho
              </Button>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={handleHoldAlert}
              >
                Colocar em espera
              </Button>
              <Button
                onClick={() => void handleResolveAlert()}
                disabled={savingResolution}
                className="bg-white text-slate-950 hover:bg-slate-200"
              >
                {savingResolution ? 'Salvando...' : 'Resolver ocorrência'}
              </Button>
            </div>
          </div>
        ) : null}
      </CrudModal>
    </>
  );
}
