import { parseAccessReportMetadata } from '@/features/reports/report-metadata';
import type { Report } from '@/types/report';

export type AccessAction = 'ENTRY' | 'EXIT';

export type AccessEvent = {
  action: AccessAction;
  personId: string;
  createdAt: string;
};

export type PersonAccessSummary = {
  entryAt: string | null;
  exitAt: string | null;
};

export function parseAccessReport(report: Report): AccessEvent | null {
  const parsed = parseAccessReportMetadata(report);
  if (!parsed) return null;

  return {
    action: parsed.action,
    personId: parsed.personId,
    createdAt: report.createdAt,
  };
}

function isMoreRecent(nextValue: string, currentValue: string | null) {
  if (!currentValue) return true;
  return new Date(nextValue).getTime() > new Date(currentValue).getTime();
}

export function buildAccessEvents(reports: Report[]) {
  return reports
    .map((report) => parseAccessReport(report))
    .filter((event): event is AccessEvent => Boolean(event))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function buildLatestAccessByPerson(accessEvents: AccessEvent[]) {
  const map = new Map<string, AccessEvent>();

  accessEvents.forEach((event) => {
    if (!map.has(event.personId)) {
      map.set(event.personId, event);
    }
  });

  return map;
}

export function buildAccessSummaryByPerson(accessEvents: AccessEvent[]) {
  const summaries = new Map<string, PersonAccessSummary>();

  accessEvents.forEach((access) => {
    const current = summaries.get(access.personId) ?? {
      entryAt: null,
      exitAt: null,
    };

    if (access.action === 'ENTRY' && isMoreRecent(access.createdAt, current.entryAt)) {
      current.entryAt = access.createdAt;
    }

    if (access.action === 'EXIT' && isMoreRecent(access.createdAt, current.exitAt)) {
      current.exitAt = access.createdAt;
    }

    summaries.set(access.personId, current);
  });

  return summaries;
}

export function formatAccessDateTime(value: string | null | undefined) {
  if (!value) return 'Sem registro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem registro';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
