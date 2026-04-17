import type { AccessLog, AccessLogDirection } from '@/types/access-log';

export type AccessLogEvent = {
  personId: string;
  personName: string;
  action: AccessLogDirection;
  categoryLabel: string;
  unitLabel: string;
  createdAt: string;
  result: AccessLog['result'];
  source: 'access-log';
};

export function normalizeAccessLogs(data?: { data?: AccessLog[] } | AccessLog[] | null) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export function buildEventsFromAccessLogs(accessLogs: AccessLog[]): AccessLogEvent[] {
  return accessLogs
    .filter((log) => log.personId && log.result === 'ALLOWED')
    .map((log) => ({
      personId: log.personId as string,
      personName: log.personName || 'Pessoa nao identificada',
      action: log.direction,
      categoryLabel: log.classificationLabel || log.classification || 'Acesso',
      unitLabel: log.location || 'Local nao informado',
      createdAt: log.timestamp,
      result: log.result,
      source: 'access-log' as const,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function buildLatestAccessLogByPerson(events: AccessLogEvent[]) {
  const latest = new Map<string, AccessLogEvent>();

  events.forEach((event) => {
    const current = latest.get(event.personId);
    if (!current || new Date(event.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latest.set(event.personId, event);
    }
  });

  return latest;
}
