import type { Unit } from '@/types/condominium';
import type { Person } from '@/types/person';
import type {
  AccessReportMetadata,
  OperationReportMetadata,
  Report,
  ReportPayload,
  ShiftHandoverReportMetadata,
} from '@/types/report';

const accessReportMarker = 'PORTARIA_ACCESS';
const operationReportMarker = 'PORTARIA_OPERATION';
const shiftHandoverMarker = 'PORTARIA_SHIFT';

function parseMarker<T>(description: string, marker: string): T | null {
  const markerLine = description
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(marker));

  if (!markerLine) return null;

  const payload = markerLine.slice(marker.length).trim();
  if (!payload) return null;

  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export function getPersonUnitLabel(person: Person, unitsMap: Map<string, Unit>) {
  const resolvedUnit = person.unit || (person.unitId ? unitsMap.get(person.unitId) ?? null : null);
  const resolvedLabel = [resolvedUnit?.condominium?.name, resolvedUnit?.structure?.label, resolvedUnit?.label]
    .filter(Boolean)
    .join(' / ');

  if (resolvedLabel) return resolvedLabel;
  if (person.unitName?.trim()) return person.unitName.trim();
  if (resolvedUnit?.legacyUnitId?.trim()) return resolvedUnit.legacyUnitId.trim();
  if (person.unit?.label?.trim()) return person.unit.label.trim();
  if (person.unit?.legacyUnitId?.trim()) return person.unit.legacyUnitId.trim();
  if (person.unitId?.trim()) return 'Unidade não identificada';
  return 'Sem unidade definida';
}

export function buildAccessReportPayload(
  person: Person,
  action: 'ENTRY' | 'EXIT',
  unitsMap: Map<string, Unit>
): ReportPayload {
  const humanDescription =
    action === 'ENTRY'
      ? `Entrada registrada pela portaria para ${person.name}. Destino: ${getPersonUnitLabel(person, unitsMap)}.`
      : `Saída registrada pela portaria para ${person.name}. Destino: ${getPersonUnitLabel(person, unitsMap)}.`;

  const metadata: AccessReportMetadata = {
    kind: 'access',
    action,
    personId: person.id,
    unitId: person.unitId ?? null,
    category: person.category,
  };

  return {
    title: `${action === 'ENTRY' ? 'Entrada liberada' : 'Saída registrada'} - ${person.name}`,
    description: `${humanDescription}\n\n${accessReportMarker} ${JSON.stringify(metadata)}`,
    category: 'Acesso',
    status: 'registrado',
    priority: 'low',
    visibility: 'interna',
    metadata,
  };
}

export function buildOperationOccurrencePayload(input: {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  context?: string | null;
  personId?: string | null;
  cameraId?: string | null;
  unitId?: string | null;
}): ReportPayload {
  const metadata: OperationReportMetadata = {
    kind: 'operation',
    context: input.context ?? null,
    personId: input.personId ?? null,
    cameraId: input.cameraId ?? null,
    unitId: input.unitId ?? null,
  };

  return {
    title: input.title.trim(),
    description: `${input.description.trim()}\n\n${operationReportMarker} ${JSON.stringify(metadata)}`,
    category: 'Operação',
    status: 'aberto',
    priority: input.priority,
    visibility: 'interna',
    metadata,
  };
}

export function buildShiftHandoverReportPayload(input: {
  operatorId?: string | null;
  operatorName?: string | null;
  condominiumId?: string | null;
  condominiumName?: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  summary: ShiftHandoverReportMetadata['summary'];
  notes?: string | null;
}): ReportPayload {
  const metadata: ShiftHandoverReportMetadata = {
    kind: 'shift_handover',
    operatorId: input.operatorId ?? null,
    operatorName: input.operatorName ?? null,
    condominiumId: input.condominiumId ?? null,
    condominiumName: input.condominiumName ?? null,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationMinutes: input.durationMinutes,
    summary: input.summary,
    notes: input.notes?.trim() || null,
  };

  const durationLabel =
    input.durationMinutes >= 60
      ? `${(input.durationMinutes / 60).toFixed(1)}h`
      : `${input.durationMinutes} min`;

  const humanDescription = [
    `Turno encerrado por ${input.operatorName || 'Operador não identificado'}.`,
    `Período: ${input.startedAt} até ${input.endedAt}.`,
    `Duração aproximada: ${durationLabel}.`,
    `Alertas: ${input.summary.alerts}. Encomendas recebidas: ${input.summary.receivedDeliveries}. Pendentes: ${input.summary.pendingDeliveries}. Ocorrências: ${input.summary.occurrences}.`,
    input.notes?.trim() ? `Observações: ${input.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: `Troca de turno - ${input.operatorName || 'Portaria'}`,
    description: `${humanDescription}\n\n${shiftHandoverMarker} ${JSON.stringify(metadata)}`,
    category: 'Troca de turno',
    status: 'registrado',
    priority: input.summary.alerts > 0 || input.summary.occurrences > 0 ? 'medium' : 'low',
    visibility: 'interna',
    metadata,
  };
}

export function parseAccessReportMetadata(report: Report): AccessReportMetadata | null {
  if (report.metadata && 'kind' in report.metadata && report.metadata.kind === 'access') {
    const metadata = report.metadata as AccessReportMetadata;
    if (metadata.personId && (metadata.action === 'ENTRY' || metadata.action === 'EXIT')) {
      return metadata;
    }
  }

  const parsed = parseMarker<AccessReportMetadata>(report.description, accessReportMarker);
  if (!parsed) return null;
  if (!parsed.personId) return null;
  if (parsed.action !== 'ENTRY' && parsed.action !== 'EXIT') return null;
  return parsed;
}

export function parseOperationReportMetadata(report: Report): OperationReportMetadata | null {
  if (report.metadata && 'kind' in report.metadata && report.metadata.kind === 'operation') {
    return report.metadata as OperationReportMetadata;
  }

  return parseMarker<OperationReportMetadata>(report.description, operationReportMarker);
}

export function parseShiftHandoverReportMetadata(report: Report): ShiftHandoverReportMetadata | null {
  if (report.metadata && 'kind' in report.metadata && report.metadata.kind === 'shift_handover') {
    return report.metadata as ShiftHandoverReportMetadata;
  }

  const parsed = parseMarker<ShiftHandoverReportMetadata>(report.description, shiftHandoverMarker);
  if (!parsed || !parsed.startedAt || !parsed.endedAt || !parsed.summary) return null;
  return parsed;
}
