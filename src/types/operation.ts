import type { Alert } from '@/types/alert';
import type { Camera } from '@/types/camera';
import type { Delivery, DeliveryStatus } from '@/types/delivery';
import type { Person, PersonCategory } from '@/types/person';

export type OperationSearchResultType = 'PERSON' | 'DELIVERY' | 'ALERT' | 'CAMERA' | 'UNIT' | 'ACCESS_LOG';

export type OperationSearchResult = {
  id: string;
  type: OperationSearchResultType;
  title: string;
  subtitle?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  personId?: string | null;
  category?: PersonCategory | null;
  status?: string | null;
  payload?: Person | Delivery | Alert | Camera | Record<string, unknown>;
};

export type OperationSearchResponse = {
  data: OperationSearchResult[];
  people?: Record<string, unknown>[];
  deliveries?: Record<string, unknown>[];
  accessLogs?: Record<string, unknown>[];
};

export type OperationUnitSearchResult = {
  id: string;
  label: string;
  condominiumId?: string | null;
  condominiumName?: string | null;
};

export type PersonAccessSummary = {
  personId: string;
  isInsideNow: boolean;
  lastEntryAt?: string | null;
  lastExitAt?: string | null;
  entriesToday?: number;
  exitsToday?: number;
  lastOperatorId?: string | null;
  lastOperatorName?: string | null;
  lastCameraId?: string | null;
  lastLocation?: string | null;
};

export type OperationActionKind =
  | 'GATE_MAIN'
  | 'GARAGE'
  | 'PEDESTRIAN_GATE'
  | 'SIREN'
  | 'EXTERNAL_LIGHT'
  | 'EMERGENCY'
  | string;

export type OperationAction = {
  id: string;
  kind: OperationActionKind;
  label: string;
  description?: string | null;
  enabled: boolean;
  requiresConfirmation?: boolean;
  auditRequired?: boolean;
  cooldownSeconds?: number | null;
};

export type OperationActionExecutePayload = {
  reason?: string | null;
  unitId?: string | null;
  personId?: string | null;
  payload?: Record<string, unknown> | null;
};

export type OperationDeviceHeartbeatPayload = {
  deviceId: string;
  deviceName?: string | null;
  clientVersion?: string | null;
  currentPath?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type OperationDeviceHeartbeatResponse = {
  ok: boolean;
  serverTime: string;
};

export type OperationDevice = {
  id: string;
  condominiumId?: string | null;
  condominiumName?: string | null;
  deviceId: string;
  deviceName?: string | null;
  status: string;
  lastSeenAt: string;
  lastHeartbeatDelaySeconds?: number | null;
  userId?: string | null;
  userName?: string | null;
  clientVersion?: string | null;
  currentPath?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type OperationActionExecuteResponse = {
  id: string;
  actionId: string;
  status: 'QUEUED' | 'SUCCESS' | 'REGISTERED' | 'FAILED';
  message?: string | null;
  executedAt?: string | null;
  executedBy?: string | null;
  result?: Record<string, unknown> | null;
  failureReason?: string | null;
};

export type OperationMessageChannel = 'APP' | 'WHATSAPP' | 'PORTARIA' | 'INTERNAL';

export type OperationMessage = {
  id: string;
  unitId?: string | null;
  unitLabel?: string | null;
  personId?: string | null;
  recipientPersonId?: string | null;
  recipientPhone?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  channel: OperationMessageChannel;
  direction: 'INBOUND' | 'OUTBOUND' | 'PORTARIA_TO_RESIDENT' | 'RESIDENT_TO_PORTARIA';
  text: string;
  status?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type OperationMessagePayload = {
  unitId: string;
  personId?: string | null;
  recipientPersonId?: string | null;
  recipientPhone?: string | null;
  channel: OperationMessageChannel;
  text: string;
};

export type OperationMessagesResponse = {
  data: OperationMessage[];
};

export type OperationWhatsAppConnection = {
  enabled: boolean;
  instance?: string | null;
  state?: string | null;
  qrCodeText?: string | null;
  qrCodeImageDataUrl?: string | null;
  pairingCode?: string | null;
};

export type OperationEventType =
  | 'ALERT_CREATED'
  | 'ACCESS_REGISTERED'
  | 'DELIVERY_CREATED'
  | 'DELIVERY_UPDATED'
  | 'CAMERA_STATUS_CHANGED'
  | 'MESSAGE_CREATED'
  | 'ACTION_EXECUTED'
  | string;

export type OperationEvent = {
  id: string;
  eventId?: string;
  type: OperationEventType;
  eventType?: OperationEventType | null;
  createdAt: string;
  occurredAt?: string;
  timestamp?: string;
  unitId?: string | null;
  condominiumId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  cameraId?: string | null;
  title?: string | null;
  body?: string | null;
  payload: Record<string, unknown>;
};

export type OperationShiftChangePayload = {
  incomingOperatorName?: string | null;
  notes?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  currentPath?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type OperationShiftChange = {
  id: string;
  condominiumId?: string | null;
  condominiumName?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  deviceStatus?: string | null;
  deviceLastSeenAt?: string | null;
  currentPath?: string | null;
  outgoingUserId?: string | null;
  outgoingUserName?: string | null;
  incomingOperatorName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type DeliveryWithdrawalValidationPayload = {
  code?: string | null;
  validationMethod?: 'CODE' | 'QRCODE' | 'MANUAL' | null;
  manualConfirmation?: boolean;
};

export type DeliveryWithdrawalValidationResponse = {
  valid: boolean;
  deliveryId: string;
  status?: DeliveryStatus;
  message?: string | null;
  withdrawnAt?: string | null;
  withdrawnBy?: string | null;
  withdrawnByName?: string | null;
};

export type OperationPhotoSearchRequest = {
  photoUrl?: string | null;
  photoBase64?: string | null;
  cameraId?: string | null;
  fileName?: string | null;
  maxMatches?: number;
};

export type OperationPhotoSearchMatch = {
  confidence: number;
  person: Person;
  residentUnit?: {
    id: string;
    label?: string | null;
    condominiumId?: string | null;
    condominiumName?: string | null;
  } | null;
  activeVisitForecasts?: Record<string, unknown>[];
  possibleDestination?: string | null;
};

export type OperationPhotoSearchResponse = {
  matched: boolean;
  matchStrategy: string;
  capturedPhotoUrl: string;
  matches?: OperationPhotoSearchMatch[];
};

export type OperationPhotoSearchAuditEntry = {
  id: string;
  createdAt: string;
  actorUserId?: string | null;
  actorUserName?: string | null;
  actorRole?: string | null;
  condominiumIds?: string[];
  sourceType: string;
  sourceCameraId?: string | null;
  sourceFileName?: string | null;
  capturedPhotoUrl: string;
  matched: boolean;
  matchStrategy?: string | null;
  matchesCount?: number | null;
  topMatchConfidence?: number | null;
};

export type OperationPhotoSearchAuditParams = {
  page?: number;
  limit?: number;
  actorUserId?: string | null;
  matched?: boolean | null;
  sourceType?: string | null;
  from?: string | null;
  to?: string | null;
  orderBy?: string | null;
  orderDirection?: 'asc' | 'desc' | null;
};

export type OperationPhotoSearchAuditResponse = {
  data: OperationPhotoSearchAuditEntry[];
  meta?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};
