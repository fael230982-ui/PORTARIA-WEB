import type { ReportPayload, Report } from '../../../../types/report';

const memoryStore = globalThis as unknown as {
  __reports?: Report[];
};

export function getReportsStore() {
  if (!memoryStore.__reports) {
    memoryStore.__reports = [];
  }

  return memoryStore.__reports;
}

export function resetReportsStore(nextReports: Report[] = []) {
  memoryStore.__reports = [...nextReports];
  return memoryStore.__reports;
}

function normalizeText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

export function createReportRecord(payload: ReportPayload): Report {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: normalizeText(payload.title, 'Sem titulo'),
    description: normalizeText(payload.description, ''),
    category: normalizeText(payload.category, 'geral'),
    status: normalizeText(payload.status, 'ativo'),
    priority: normalizeText(payload.priority, 'normal'),
    visibility: normalizeText(payload.visibility, 'interno'),
    createdAt: now,
    updatedAt: now,
    metadata: payload.metadata ?? null,
  };
}

export function updateReportRecord(current: Report, payload: Partial<ReportPayload>): Report {
  return {
    ...current,
    title: normalizeText(payload.title, current.title),
    description: normalizeText(payload.description, current.description),
    category: normalizeText(payload.category, current.category),
    status: normalizeText(payload.status, current.status),
    priority: normalizeText(payload.priority, current.priority),
    visibility: normalizeText(payload.visibility, current.visibility),
    metadata: payload.metadata === undefined ? current.metadata ?? null : payload.metadata ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export function insertReport(report: Report) {
  const store = getReportsStore();
  store.unshift(report);
  return report;
}

export function removeReportById(id: string) {
  const store = getReportsStore();
  const index = store.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  return store.splice(index, 1)[0];
}
