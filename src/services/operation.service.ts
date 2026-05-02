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
  OperationWhatsAppConnection,
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
  recipientPersonId?: string | null;
  recipientPhone?: string | null;
  origin?: OperationMessage['channel'];
  body?: string;
};

type ApiOperationWhatsAppConnection = OperationWhatsAppConnection;

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

function normalizeAssetUrl(value?: string | null) {
  const url = String(value ?? '').trim();
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/api/proxy/')) return url;
  if (url.startsWith('/api/v1/')) return `/api/proxy/${url.slice('/api/v1/'.length)}`;
  if (url.startsWith('api/v1/')) return `/api/proxy/${url.slice('api/v1/'.length)}`;
  if (url.startsWith('/people/') || url.startsWith('/uploads/') || url.startsWith('/files/') || url.startsWith('/storage/')) {
    return `/api/proxy${url}`;
  }

  try {
    const parsed = new URL(url);
    const pathWithQuery = `${parsed.pathname}${parsed.search}`;
    if (parsed.pathname.startsWith('/api/v1/')) return `/api/proxy/${pathWithQuery.slice('/api/v1/'.length)}`;
    if (
      parsed.pathname.startsWith('/people/') ||
      parsed.pathname.startsWith('/uploads/') ||
      parsed.pathname.startsWith('/files/') ||
      parsed.pathname.startsWith('/storage/')
    ) {
      return `/api/proxy${pathWithQuery}`;
    }
  } catch {
    // Keep original value when it is not a URL we know how to proxy.
  }

  return url;
}

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
    recipientPersonId: message.recipientPersonId ?? null,
    recipientPhone: message.recipientPhone ?? null,
    senderId: message.senderId ?? message.senderUserId ?? null,
    senderName: message.senderName ?? message.senderUserName ?? null,
    channel: message.channel ?? message.origin ?? 'APP',
    direction,
    text: message.text ?? message.body ?? '',
  };
}

function parseOperationMessagesPayload(payload: OperationMessagesResponse | ApiOperationMessage[] | ApiOperationMessage): ApiOperationMessage[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as OperationMessagesResponse).data)) return (payload as OperationMessagesResponse).data as ApiOperationMessage[];
  const payloadWithItems = payload as unknown as { items?: ApiOperationMessage[] };
  if (Array.isArray(payloadWithItems.items)) return payloadWithItems.items;
  if (payload && typeof payload === 'object' && 'id' in payload) return [payload as ApiOperationMessage];
  return [];
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
    person: {
      ...(match.person as Person),
      photoUrl: normalizeAssetUrl((match.person as Person).photoUrl),
    },
    residentUnit,
    activeVisitForecasts: Array.isArray(match.activeVisitForecasts) ? match.activeVisitForecasts : [],
    possibleDestination: match.possibleDestination ?? null,
  };
}

function normalizePhotoSearchResponse(response: ApiOperationPhotoSearchResponse): OperationPhotoSearchResponse {
  return {
    matched: response.matched,
    matchStrategy: response.matchStrategy,
    capturedPhotoUrl: normalizeAssetUrl(response.capturedPhotoUrl),
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
    const photoBase64 = payload.photoBase64?.trim();
    const photoUrl = payload.photoUrl?.trim();
    const cameraId = payload.cameraId?.trim();
    const unitId = payload.unitId?.trim();
    const sourcePayload = photoBase64 ? { photoBase64 } : photoUrl ? { photoUrl } : cameraId ? { cameraId } : {};

    const response = await api.post<ApiOperationPhotoSearchResponse>(
      '/operation/people/search-by-photo',
      {
        ...sourcePayload,
        fileName: payload.fileName ?? null,
        maxMatches: payload.maxMatches ?? 5,
      },
      unitId
        ? {
            headers: {
              'X-Selected-Unit-Id': unitId,
            },
          }
        : undefined
    );
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
    const response = await api.get<OperationMessagesResponse | ApiOperationMessage[] | ApiOperationMessage>('/messages', { params });
    const messages = parseOperationMessagesPayload(response.data);
    return { data: messages.map(normalizeOperationMessage) };
  },

  async listMessageInbox(params?: { limit?: number; unreadOnly?: boolean }): Promise<OperationMessagesResponse> {
    const response = await api.get<OperationMessagesResponse | ApiOperationMessage[] | ApiOperationMessage>('/messages/inbox', { params });
    const messages = parseOperationMessagesPayload(response.data);
    return { data: messages.map(normalizeOperationMessage) };
  },

  async sendMessage(payload: OperationMessagePayload): Promise<OperationMessage> {
    const response = await api.post<ApiOperationMessage>('/messages', {
      unitId: payload.unitId,
      recipientPersonId: payload.recipientPersonId ?? payload.personId ?? null,
      recipientPhone: payload.recipientPhone ?? null,
      body: payload.text,
      origin: payload.channel === 'INTERNAL' ? 'PORTARIA' : payload.channel,
      direction: 'PORTARIA_TO_RESIDENT',
    });
    return normalizeOperationMessage(response.data);
  },

  async getWhatsAppConnection(unitId: string): Promise<OperationWhatsAppConnection> {
    const response = await api.get<ApiOperationWhatsAppConnection>('/messages/whatsapp/connection', {
      params: { unitId },
    });
    return response.data;
  },

  async connectWhatsApp(unitId: string): Promise<OperationWhatsAppConnection> {
    const response = await api.post<ApiOperationWhatsAppConnection>('/messages/whatsapp/connect', null, {
      params: { unitId },
    });
    return response.data;
  },

  async markMessageRead(messageId: string): Promise<OperationMessage> {
    const response = await api.patch<ApiOperationMessage>(`/messages/${messageId}/read`);
    return normalizeOperationMessage(response.data);
  },

  async searchUnits(query: string, limit = 10): Promise<OperationUnitSearchResult[]> {
    if (operationUnitsEndpointUnavailable) return [];
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    try {
      const response = await api.get<OperationUnitSearchResult[]>('/operation/units', { params: { q: normalizedQuery, limit } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 400 || status === 404 || status === 405 || status === 501) {
        operationUnitsEndpointUnavailable = true;
        return [];
      }
      throw error;
    }
  },

  async listSearchableUnits(limit = 100): Promise<OperationUnitSearchResult[]> {
    const terms = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D'];
    const results = await Promise.allSettled(
      terms.map((term) => api.get<OperationUnitSearchResult[]>('/operation/units', { params: { q: term, limit } }))
    );
    const unitsById = new Map<string, OperationUnitSearchResult>();

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const items = Array.isArray(result.value.data) ? result.value.data : [];
      for (const unit of items) {
        if (unit.id) unitsById.set(unit.id, unit);
      }
    }

    return Array.from(unitsById.values());
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
    if (shiftChangeEndpointUnavailable) return [];

    try {
      const response = await api.get<OperationShiftChange[]>('/operation/shift-changes', { params: { limit } });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404 || status === 405 || status === 500 || status === 501) {
        shiftChangeEndpointUnavailable = true;
        return [];
      }
      throw error;
    }
  },

  async listOperationDevices(): Promise<OperationDevice[]> {
    const response = await api.get<ApiOperationDevice[]>('/master/operation-devices');
    return Array.isArray(response.data) ? response.data : [];
  },
};
