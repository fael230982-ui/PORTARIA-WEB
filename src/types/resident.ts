import type { Delivery, DeliveriesListResponse, DeliveryStatus } from '@/types/delivery';
import type { UserResponse } from '@/types/user';

export type ResidentDeliveriesParams = {
  page?: number;
  limit?: number;
  status?: DeliveryStatus | string;
  recipientUnitId?: string;
};

export type ResidentDeliveriesListResponse = DeliveriesListResponse;

export type ResidentNotificationType = 'DELIVERY' | 'ACCESS' | 'ALERT' | 'GENERAL' | string;

export type ResidentNotificationChannel = 'APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | string;

export type ResidentNotificationDomain = 'ACCESS' | 'DELIVERY' | 'ALERT' | 'MESSAGE' | 'VISIT' | 'GENERIC' | string;

export type ResidentNotification = {
  id: string;
  type: ResidentNotificationType;
  domain?: ResidentNotificationDomain | null;
  title: string;
  body: string;
  channel: ResidentNotificationChannel;
  unitId?: string | null;
  deliveryId?: string | null;
  alertId?: string | null;
  messageId?: string | null;
  visitForecastId?: string | null;
  snapshotUrl?: string | null;
  replayUrl?: string | null;
  payload?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export type ResidentNotificationsParams = {
  unreadOnly?: boolean;
};

export type ResidentNotificationsMarkAllReadResponse = {
  updatedCount: number;
};

export type ResidentNotificationPreference = {
  accountId?: string | null;
  userId: string;
  channel: 'APP' | 'PUSH' | 'EMAIL' | string;
  priority: 'ALL' | 'IMPORTANT' | 'CRITICAL' | string;
};

export type ResidentNotificationPreferencePayload = {
  channel: ResidentNotificationPreference['channel'];
  priority: ResidentNotificationPreference['priority'];
};

export type ResidentLgpdConsent = {
  accepted: boolean;
  version?: string | null;
  acceptedAt?: string | null;
  accountId?: string | null;
  userId: string;
  deviceId: string;
};

export type ResidentLgpdConsentPayload = {
  accepted: boolean;
  version: string;
  deviceId: string;
};

export type ResidentLgpdConsentHistoryEntry = {
  id?: string | null;
  deviceId?: string | null;
  accepted: boolean;
  version?: string | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
};

export type ResidentLgpdPolicy = {
  scope: 'ACCOUNT_DEVICE' | string;
  currentVersion: string;
  revocationSupported?: boolean;
  historyVersioningSupported?: boolean;
  auditMode?: 'CURRENT_STATE_ONLY' | string;
  governanceDimensions?: string[] | null;
};

export type ResidentProfile = UserResponse;

export type ResidentVisitForecast = {
  id: string;
  visitForecastId?: string | null;
  unitId: string;
  unitName?: string | null;
  residentUserId?: string | null;
  residentUserName?: string | null;
  visitorName: string;
  visitorDocument?: string | null;
  visitorPhone?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  serviceType?: string | null;
  purpose?: string | null;
  notes?: string | null;
  expectedAt?: string | null;
  expectedDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  releaseMode?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  createdAt?: string | null;
};

export type ResidentVisitForecastListResponse = {
  data: ResidentVisitForecast[];
  meta?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};

export type ResidentVisitForecastParams = {
  page?: number;
  limit?: number;
  status?: string;
  unitId?: string;
  residentUserId?: string;
  from?: string;
  to?: string;
};

export type UnitResidentOption = {
  id: string;
  name: string;
  unitId: string;
  unitName?: string | null;
};

export type ResidentDashboardSummary = {
  pendingDeliveries: Delivery[];
  notifications: ResidentNotification[];
};
