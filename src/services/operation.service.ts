import { api } from '@/lib/axios';
import type { Person } from '@/types/person';
import type {
  OperationAction,
  OperationActionExecutePayload,
  OperationActionExecuteResponse,
  OperationDevice,
  OperationDeviceHeartbeatPayload,
  OperationDeviceHeartbeatResponse,
  OperationMessage,
  OperationMessagePayload,
  OperationMessagesResponse,
  OperationPhotoSearchAuditEntry,
  OperationPhotoSearchAuditParams,
  OperationPhotoSearchAuditResponse,
  OperationPhotoSearchMatch,
  OperationPhotoSearchRequest,
  OperationPhotoSearchResponse,
  OperationSearchResponse,
  OperationShiftChange,
  OperationShiftChangePayload,
  OperationUnitSearchResult,
  PersonAccessSummary,
} from '@/types/operation';

export type OperationSearchParams = {
  q: string;
  limit?: number;
};

export type OperationMessagesParams = {
  unitId?: string;
  personId?: string;
  limit?: number;
  unreadOnly?: boolean;
};

type ApiOperationAction = OperationAction & {
  category?: string;
  auditRequired?: boolean;
};

type ApiOperationActionExecuteResponse = OperationActionExecuteResponse & {
  executionId?: string;
  actorUserId?: string | null;
  actorUserName?: string | null;
  result?: Record<string, unknown> | null;
  failureReason?: string | null;
};

type ApiOperationMessage = OperationMessage & {
  unitName?: string | null;
  senderUserId?: string | null;
  senderUserName?: string | null;
  origin?: OperationMessage['channel'];
  body?: string;
};

type ApiOperationDevice = OperationDevice & {
  metadata?: Record<string, unknown>;
};

type ApiOperationPhotoSearchMatch = Omit<OperationPhotoSearchMatch, 'person' | 'residentUnit'> & {
  person: Record<string, unknown>;
  residentUnit?: Record<string, unknown> | null;
};

type ApiOperationPhotoSearchResponse = Omit<OperationPhotoSearchResponse, 'matches'> & {
  matches?: ApiOperationPhotoSearchMatch[];
};

type ApiOperationPhotoSearchAuditEntry = OperationPhotoSearchAuditEntry & {
  matchCount?: number | null;
};

type ApiOperationPhotoSearchAuditListPayload = {
  items?: ApiOperationPhotoSearchAuditEntry[];
  data?: ApiOperationPhotoSearchAuditEntry[];
  meta?: OperationPhotoSearchAuditResponse['meta'];
  total?: number;
  page?: number;
  limit?: number;
};

let heartbeatEndpointUnavailable = false;
let shiftChangeEndpointUnavailable = false;
let operationUnitsEndpointUnavailable = false;

function normalizeOperationAction(action: ApiOperationAction): OperationAction {
  return {
    ...action,
    kind: action.kind ?? action.category ?? 'ACTION',
    enabled: action.enabled ?? true,
    requiresConfirmation: action.requiresConfirmation ?? true,
    auditRequired: action.auditRequired ?? true,
  };
}

function normalizeActionExecution(response: ApiOperationActionExecuteResponse): OperationActionExecuteResponse {
  return {
    ...response,
    id: response.id ?? response.executionId ?? response.actionId,
    executedBy: response.executedBy ?? response.actorUserName ?? response.actorUserId ?? null,
    message: response.message ?? response.failureReason ?? null,
    status: response.status,
  };
}

function normalizeOperationMessage(message: ApiOperationMessage): OperationMessage {
  const direction = message.direction === 'PORTARIA_TO_RESIDENT' ? 'OUTBOUND' : message.direction === 'RESIDENT_TO_PORTARIA' ? 'INBOUND' : message.direction;

  return {
    ...message,
    unitLabel: message.unitLabel ?? message.unitName ?? null,
    senderId: message.senderId ?? message.senderUserId ?? null,
    senderName: message.senderName ?? message.senderUserName ?? null,
    channel: message.channel ?? message.origin ?? 'APP',
    direction,
    text: message.text ?? message.body ?? '',
  };
}

function normalizeSearchItem(type: OperationSearchResponse['data'][number]['type'], raw: Record<string, unknown>) {
  const id = String(raw.id ?? raw.personId ?? raw.deliveryId ?? raw.accessLogId ?? crypto.randomUUID());
  const title = String(raw.name ?? raw.title ?? raw.personName ?? raw.deliveryCompany ?? raw.unitLabel ?? raw.unitName ?? id);
  const subtitleSegments = [
    typeof raw.subtitle === 'string' ? raw.subtitle : null,
    typeof raw.categoryLabel === 'string' ? raw.categoryLabel : null,
    typeof raw.document === 'string' ? raw.document : null,
    typeof raw.trackingCode === 'string' ? raw.trackingCode : null,
    typeof raw.createdAt === 'string' ? raw.createdAt : null,
  ].filter((value): value is string => Boolean(value?.trim()));
  const subtitle = subtitleSegments[0] ?? null;
  const unitId = typeof raw.unitId === 'string' ? raw.unitId : typeof raw.recipientUnitId === 'string' ? raw.recipientUnitId : null;
  const unitLabel = typeof raw.unitLabel === 'string' ? raw.unitLabel : typeof raw.unitName === 'string' ? raw.unitName : null;
  const personId = typeof raw.personId === 'string' ? raw.personId : type === 'PERSON' ? id : null;

  return {
    id,
    type,
    title,
    subtitle,
    unitId,
    unitLabel,
    personId,
    category:
      type === 'PERSON' && typeof raw.category === 'string'
        ? (raw.category as OperationSearchResponse['data'][number]['category'])
        : null,
    status: typeof raw.status === 'string' ? raw.status : null,
    payload: raw,
  };
}

function normalizeOperationSearchResponse(response: OperationSearchResponse): OperationSearchResponse {
  if (Array.isArray(response.data)) return response;

  const people = Array.isArray(response.people) ? response.people : [];
  const deliveries = Array.isArray(response.deliveries) ? response.deliveries : [];
  const accessLogs = Array.isArray(response.accessLogs) ? response.accessLogs : [];

  return {
    ...response,
    data: [
      ...people.map((item) => normalizeSearchItem('PERSON', item)),
      ...deliveries.map((item) => normalizeSearchItem('DELIVERY', item)),
      ...accessLogs.map((item) => normalizeSearchItem('ACCESS_LOG', item)),
    ],
  };
}

function normalizePhotoSearchMatch(match: ApiOperationPhotoSearchMatch): OperationPhotoSearchMatch {
  const residentUnit = match.residentUnit
    ? {
        id: String(match.residentUnit.id ?? ''),
        label:
          typeof match.residentUnit.label === 'string'
            ? match.residentUnit.label
            : typeof match.residentUnit.name === 'string'
              ? match.residentUnit.name
              : null,
        condominiumId:
          typeof match.residentUnit.condominiumId === 'string' ? match.residentUnit.condominiumId : null,
        condominiumName:
          typeof match.residentUnit.condominiumName === 'string' ? match.residentUnit.condominiumName : null,
      }
    : null;

  return {
    ...match,
    person: match.person as Person,
    residentUnit,
    activeVisitForecasts: Array.isArray(match.activeVisitForecasts) ? match.activeVisitForecasts : [],
    possibleDestination: match.possibleDestination ?? null,
  };
}

function normalizePhotoSearchResponse(response: ApiOperationPhotoSearchResponse): OperationPhotoSearchResponse {
  return {
    matched: response.matched,
    matchStrategy: response.matchStrategy,
    capturedPhotoUrl: response.capturedPhotoUrl,
    matches: Array.isArray(response.matches) ? response.matches.map(normalizePhotoSearchMatch) : [],
  };
}

function normalizePhotoSearchAuditEntry(entry: ApiOperationPhotoSearchAuditEntry): OperationPhotoSearchAuditEntry {
  return {
    ...entry,
    condominiumIds: Array.isArray(entry.condominiumIds) ? entry.condominiumIds : [],
    sourceCameraId: entry.sourceCameraId ?? null,
    sourceFileName: entry.sourceFileName ?? null,
    matchStrategy: entry.matchStrategy ?? null,
    matchesCount: entry.matchesCount ?? entry.matchCount ?? null,
    topMatchConfidence: entry.topMatchConfidence ?? null,
  };
}

export const operationService = {
  async search(params: OperationSearchParams): Promise<OperationSearchResponse> {
    const response = await api.get<OperationSearchResponse>('/operation/search', { params });
    return normalizeOperationSearchResponse(response.data);
  },

  async searchPeopleByPhoto(payload: OperationPhotoSearchRequest): Promise<OperationPhotoSearchResponse> {
    const response = await api.post<ApiOperationPhotoSearchResponse>('/operation/people/search-by-photo', {
      photoUrl: payload.photoUrl ?? null,
      photoBase64: payload.photoBase64 ?? null,
      cameraId: payload.cameraId ?? null,
      fileName: payload.fileName ?? null,
      maxMatches: payload.maxMatches ?? 5,
    });
    return normalizePhotoSearchResponse(response.data);
  },

  async listPhotoSearchAudit(params?: OperationPhotoSearchAuditParams): Promise<OperationPhotoSearchAuditResponse> {
    const response = await api.get<OperationPhotoSearchAuditResponse | ApiOperationPhotoSearchAuditListPayload>('/operation/people/search-by-photo/audit', {
      params,
    });

    const payload = response.data;
    const items =
      'data' in payload && Array.isArray(payload.data)
        ? payload.data
        : 'items' in payload && Array.isArray(payload.items)
          ? payload.items
          : [];

    return {
      data: items.map(normalizePhotoSearchAuditEntry),
      meta:
        'meta' in payload && payload.meta
          ? payload.meta
          : {
              totalItems: 'total' in payload && typeof payload.total === 'number' ? payload.total : items.length,
              currentPage: 'page' in payload && typeof payload.page === 'number' ? payload.page : params?.page ?? 1,
              totalPages: 1,
              itemsPerPage: 'limit' in payload && typeof payload.limit === 'number' ? payload.limit : params?.limit ?? items.length,
            },
    };
  },

  async getPersonAccessSummary(personId: string): Promise<PersonAccessSummary> {
    const response = await api.get<PersonAccessSummary>(`/people/${personId}/access-summary`);
    return response.data;
  },

  async listActions(): Promise<OperationAction[]> {
    const response = await api.get<ApiOperationAction[]>('/actions');
    return response.data.map(normalizeOperationAction);
  },

  async executeAction(actionId: string, payload: OperationActionExecutePayload = {}): Promise<OperationActionExecuteResponse> {
    const { reason, unitId, personId, payload: extraPayload } = payload;
    const response = await api.post<ApiOperationActionExecuteResponse>(`/actions/${actionId}/execute`, {
      reason: reason ?? null,
      payload: {
        ...(extraPayload ?? {}),
        ...(unitId ? { unitId } : {}),
        ...(personId ? { personId } : {}),
      },
    });
    return normalizeActionExecution(response.data);
  },

  async listMessages(params?: OperationMessagesParams): Promise<OperationMessagesResponse> {
    const response = await api.get<OperationMessagesResponse | ApiOperationMessage[]>('/messages', { params });
    const messages = Array.isArray(response.data) ? response.data : response.data.data;
    return { data: messages.map(normalizeOperationMessage) };
  },

  async sendMessage(payload: OperationMessagePayload): Promise<OperationMessage> {
    const response = await api.post<ApiOperationMessage>('/messages', {
      unitId: payload.unitId,
      body: payload.text,
      origin: payload.channel === 'INTERNAL' ? 'PORTARIA' : payload.channel,
      direction: 'PORTARIA_TO_RESIDENT',
    });
    return normalizeOperationMessage(response.data);
  },

  async markMessageRead(messageId: string): Promise<OperationMessage> {
    const response = await api.patch<ApiOperationMessage>(`/messages/${messageId}/read`);
    return normalizeOperationMessage(response.data);
  },

  async searchUnits(query: string, limit = 10): Promise<OperationUnitSearchResult[]> {
    if (operationUnitsEndpointUnavailable) return [];

    try {
      const response = await api.get<OperationUnitSearchResult[]>('/operation/units', { params: { q: query, limit } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404 || status === 405 || status === 501) {
        operationUnitsEndpointUnavailable = true;
        return [];
      }
      throw error;
    }
  },

  async sendHeartbeat(payload: OperationDeviceHeartbeatPayload): Promise<OperationDeviceHeartbeatResponse | null> {
    if (heartbeatEndpointUnavailable) return null;

    try {
      const response = await api.post<OperationDeviceHeartbeatResponse>('/operation/devices/heartbeat', payload);
      return response.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404 || status === 405 || status === 501) {
        heartbeatEndpointUnavailable = true;
        return null;
      }
      throw error;
    }
  },

  async createShiftChange(payload: OperationShiftChangePayload): Promise<OperationShiftChange | null> {
    if (shiftChangeEndpointUnavailable) return null;

    try {
      const response = await api.post<OperationShiftChange>('/operation/shift-change', payload);
      return response.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404 || status === 405 || status === 501) {
        shiftChangeEndpointUnavailable = true;
        return null;
      }
      throw error;
    }
  },

  async listShiftChanges(limit = 20): Promise<OperationShiftChange[]> {
    const response = await api.get<OperationShiftChange[]>('/operation/shift-changes', { params: { limit } });
    return Array.isArray(response.data) ? response.data : [];
  },

  async listOperationDevices(): Promise<OperationDevice[]> {
    const response = await api.get<ApiOperationDevice[]>('/master/operation-devices');
    return Array.isArray(response.data) ? response.data : [];
  },
};
