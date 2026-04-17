import type { Alert } from '@/types/alert';

export type AlertWorkflowStatus = 'NEW' | 'ON_HOLD' | 'RESOLVED';

export type AlertWorkflowRecord = {
  alertId: string;
  arrivedAt: string;
  openedAt?: string | null;
  openedByName?: string | null;
  resolvedAt?: string | null;
  resolvedByName?: string | null;
  lastReturnedToQueueAt?: string | null;
  workflowStatus: AlertWorkflowStatus;
  resolutionNote?: string | null;
  resolutionPreset?: string | null;
  draftNote?: string | null;
  draftPreset?: string | null;
  draftSavedAt?: string | null;
  lastUpdatedAt: string;
};

const STORAGE_KEY = 'portaria.alert-workflow.v1';
const EVENT_NAME = 'portaria-alert-workflow-updated';
const EMPTY_STORE: Record<string, AlertWorkflowRecord> = {};
let cachedStore: Record<string, AlertWorkflowRecord> | null = null;

export const alertResolutionPresets = [
  'Evento validado pela camera associada.',
  'Ocorrencia confirmada e tratada pela portaria.',
  'Disparo indevido confirmado apos conferencia.',
  'Morador contatado e situacao normalizada.',
  'Equipe acionada e ocorrencia encaminhada.',
];

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStore(): Record<string, AlertWorkflowRecord> {
  if (!isBrowser()) return EMPTY_STORE;
  if (cachedStore) return cachedStore;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedStore = EMPTY_STORE;
      return cachedStore;
    }
    const parsed = JSON.parse(raw) as Record<string, AlertWorkflowRecord>;
    cachedStore = parsed && typeof parsed === 'object' ? parsed : EMPTY_STORE;
    return cachedStore;
  } catch {
    cachedStore = EMPTY_STORE;
    return cachedStore;
  }
}

function writeStore(store: Record<string, AlertWorkflowRecord>) {
  if (!isBrowser()) return;
  cachedStore = store;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function normalizeWorkflowStatus(alert: Alert, current?: AlertWorkflowRecord | null) {
  return alert.workflow?.workflowStatus ?? current?.workflowStatus ?? (alert.status === 'READ' ? 'RESOLVED' : 'NEW');
}

function buildAlertWorkflowRecord(
  alert: Alert,
  current?: AlertWorkflowRecord | null
): AlertWorkflowRecord {
  return {
    alertId: alert.id,
    arrivedAt: current?.arrivedAt ?? alert.timestamp,
    openedAt: alert.workflow?.openedAt ?? current?.openedAt ?? null,
    openedByName: alert.workflow?.openedByName ?? current?.openedByName ?? null,
    workflowStatus: normalizeWorkflowStatus(alert, current),
    resolvedAt:
      alert.workflow?.resolvedAt ??
      current?.resolvedAt ??
      (alert.status === 'READ' ? alert.readAt ?? alert.timestamp : null),
    resolvedByName: alert.workflow?.resolvedByName ?? current?.resolvedByName ?? null,
    lastReturnedToQueueAt: alert.workflow?.lastReturnedToQueueAt ?? current?.lastReturnedToQueueAt ?? null,
    resolutionNote: alert.workflow?.resolutionNote ?? current?.resolutionNote ?? null,
    resolutionPreset: alert.workflow?.resolutionPreset ?? current?.resolutionPreset ?? null,
    draftNote: current?.draftNote ?? null,
    draftPreset: current?.draftPreset ?? null,
    draftSavedAt: current?.draftSavedAt ?? null,
    lastUpdatedAt: current?.lastUpdatedAt ?? new Date().toISOString(),
  };
}

function recordsDiffer(left?: AlertWorkflowRecord | null, right?: AlertWorkflowRecord | null) {
  if (!left && !right) return false;
  if (!left || !right) return true;

  return (
    left.arrivedAt !== right.arrivedAt ||
    left.openedAt !== right.openedAt ||
    left.openedByName !== right.openedByName ||
    left.resolvedAt !== right.resolvedAt ||
    left.resolvedByName !== right.resolvedByName ||
    left.lastReturnedToQueueAt !== right.lastReturnedToQueueAt ||
    left.workflowStatus !== right.workflowStatus ||
    left.resolutionNote !== right.resolutionNote ||
    left.resolutionPreset !== right.resolutionPreset ||
    left.draftNote !== right.draftNote ||
    left.draftPreset !== right.draftPreset ||
    left.draftSavedAt !== right.draftSavedAt
  );
}

export function subscribeAlertWorkflow(listener: () => void) {
  if (!isBrowser()) return () => undefined;

  const handler = () => listener();
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function getAlertWorkflowStore() {
  return readStore();
}

export function ensureAlertWorkflowRecords(alerts: Alert[]) {
  const current = readStore();
  let changed = false;

  alerts.forEach((alert) => {
    if (!alert?.id) return;
    const existing = current[alert.id];
    if (existing && !alert.workflow) return;

    const nextRecord = buildAlertWorkflowRecord(alert, existing);
    if (!recordsDiffer(existing, nextRecord)) return;

    current[alert.id] = {
      ...nextRecord,
      lastUpdatedAt: new Date().toISOString(),
    };
    changed = true;
  });

  if (changed) writeStore(current);
  return current;
}

export function markAlertOpened(alert: Alert, actorName?: string | null) {
  if (!alert?.id) return readStore();
  const current = readStore();
  const existing = current[alert.id];
  if (existing?.openedAt || alert.workflow?.openedAt) return current;

  current[alert.id] = {
    alertId: alert.id,
    arrivedAt: existing?.arrivedAt ?? alert.timestamp,
    workflowStatus: existing?.workflowStatus ?? alert.workflow?.workflowStatus ?? (alert.status === 'READ' ? 'RESOLVED' : 'NEW'),
    openedAt: new Date().toISOString(),
    openedByName: actorName ?? existing?.openedByName ?? null,
    resolvedAt: existing?.resolvedAt ?? alert.workflow?.resolvedAt ?? null,
    resolvedByName: existing?.resolvedByName ?? alert.workflow?.resolvedByName ?? null,
    lastReturnedToQueueAt: existing?.lastReturnedToQueueAt ?? alert.workflow?.lastReturnedToQueueAt ?? null,
    resolutionNote: existing?.resolutionNote ?? alert.workflow?.resolutionNote ?? null,
    resolutionPreset: existing?.resolutionPreset ?? alert.workflow?.resolutionPreset ?? null,
    draftNote: existing?.draftNote ?? null,
    draftPreset: existing?.draftPreset ?? null,
    draftSavedAt: existing?.draftSavedAt ?? null,
    lastUpdatedAt: new Date().toISOString(),
  };

  writeStore(current);
  return current;
}

export function resolveAlertWorkflow(
  alert: Alert,
  options: { actorName?: string | null; note?: string | null; preset?: string | null }
) {
  if (!alert?.id) return readStore();
  const current = readStore();
  const existing = current[alert.id];

  current[alert.id] = {
    alertId: alert.id,
    arrivedAt: existing?.arrivedAt ?? alert.timestamp,
    openedAt: existing?.openedAt ?? new Date().toISOString(),
    openedByName: existing?.openedByName ?? options.actorName ?? null,
    resolvedAt: new Date().toISOString(),
    resolvedByName: options.actorName ?? null,
    lastReturnedToQueueAt: existing?.lastReturnedToQueueAt ?? null,
    workflowStatus: 'RESOLVED',
    resolutionNote: options.note ?? existing?.resolutionNote ?? null,
    resolutionPreset: options.preset ?? existing?.resolutionPreset ?? null,
    draftNote: null,
    draftPreset: null,
    draftSavedAt: existing?.draftSavedAt ?? null,
    lastUpdatedAt: new Date().toISOString(),
  };

  writeStore(current);
  return current;
}

export function holdAlertWorkflow(
  alert: Alert,
  options: { actorName?: string | null; note?: string | null; preset?: string | null }
) {
  if (!alert?.id) return readStore();
  const current = readStore();
  const existing = current[alert.id];

  current[alert.id] = {
    alertId: alert.id,
    arrivedAt: existing?.arrivedAt ?? alert.timestamp,
    openedAt: existing?.openedAt ?? new Date().toISOString(),
    openedByName: existing?.openedByName ?? options.actorName ?? null,
    resolvedAt: null,
    resolvedByName: null,
    lastReturnedToQueueAt: new Date().toISOString(),
    workflowStatus: 'ON_HOLD',
    resolutionNote: options.note ?? existing?.resolutionNote ?? null,
    resolutionPreset: options.preset ?? existing?.resolutionPreset ?? null,
    draftNote: null,
    draftPreset: null,
    draftSavedAt: existing?.draftSavedAt ?? null,
    lastUpdatedAt: new Date().toISOString(),
  };

  writeStore(current);
  return current;
}

export function saveAlertDraftWorkflow(
  alert: Alert,
  options: { actorName?: string | null; note?: string | null; preset?: string | null }
) {
  if (!alert?.id) return readStore();
  const current = readStore();
  const existing = current[alert.id];

  current[alert.id] = {
    alertId: alert.id,
    arrivedAt: existing?.arrivedAt ?? alert.timestamp,
    openedAt: existing?.openedAt ?? null,
    openedByName: existing?.openedByName ?? options.actorName ?? null,
    resolvedAt: existing?.resolvedAt ?? null,
    resolvedByName: existing?.resolvedByName ?? null,
    lastReturnedToQueueAt: existing?.lastReturnedToQueueAt ?? null,
    workflowStatus: existing?.workflowStatus ?? alert.workflow?.workflowStatus ?? (alert.status === 'READ' ? 'RESOLVED' : 'NEW'),
    resolutionNote: existing?.resolutionNote ?? alert.workflow?.resolutionNote ?? null,
    resolutionPreset: existing?.resolutionPreset ?? alert.workflow?.resolutionPreset ?? null,
    draftNote: options.note ?? null,
    draftPreset: options.preset ?? null,
    draftSavedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };

  writeStore(current);
  return current;
}

export function getAlertWorkflowRecord(
  alert: Alert | null | undefined,
  store: Record<string, AlertWorkflowRecord>
) {
  if (!alert?.id) return null;
  return store[alert.id] ?? null;
}

export function getAlertWorkflowStatus(alert: Alert, record?: AlertWorkflowRecord | null): AlertWorkflowStatus {
  if (record?.workflowStatus) return record.workflowStatus;
  return alert.status === 'READ' ? 'RESOLVED' : 'NEW';
}

export function getAlertWorkflowLabel(alert: Alert, record?: AlertWorkflowRecord | null) {
  const status = getAlertWorkflowStatus(alert, record);
  if (status === 'RESOLVED') return 'Resolvido';
  if (status === 'ON_HOLD') return 'Em espera';
  return 'Novo';
}

export function getAlertWorkflowClass(alert: Alert, record?: AlertWorkflowRecord | null) {
  const status = getAlertWorkflowStatus(alert, record);
  if (status === 'RESOLVED') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100';
  if (status === 'ON_HOLD') return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
  return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
}
