import { api } from '@/lib/axios';
import type {
  ResidentDeliveriesListResponse,
  ResidentDeliveriesParams,
  ResidentLgpdConsent,
  ResidentLgpdConsentHistoryEntry,
  ResidentLgpdConsentPayload,
  ResidentLgpdPolicy,
  ResidentNotification,
  ResidentNotificationPreference,
  ResidentNotificationPreferencePayload,
  ResidentNotificationsMarkAllReadResponse,
  ResidentNotificationsParams,
  ResidentProfile,
  ResidentVisitForecastListResponse,
  ResidentVisitForecastParams,
} from '@/types/resident';

function normalizeResidentNotification(raw: ResidentNotification): ResidentNotification {
  return {
    id: String(raw.id ?? ''),
    type: raw.type ?? 'GENERAL',
    domain: raw.domain ?? null,
    title: String(raw.title ?? 'Notificacao'),
    body: String(raw.body ?? ''),
    channel: raw.channel ?? 'APP',
    unitId: raw.unitId ?? null,
    deliveryId: raw.deliveryId ?? null,
    alertId: raw.alertId ?? null,
    messageId: raw.messageId ?? null,
    visitForecastId: raw.visitForecastId ?? null,
    snapshotUrl: raw.snapshotUrl ?? null,
    replayUrl: raw.replayUrl ?? null,
    payload: raw.payload ?? null,
    readAt: raw.readAt ?? null,
    createdAt: String(raw.createdAt ?? ''),
  };
}

export const residentService = {
  async getProfile(selectedUnitId?: string | null): Promise<ResidentProfile> {
    const { data } = await api.get<ResidentProfile>('/resident/profile', {
      headers: selectedUnitId ? { 'X-Selected-Unit-Id': selectedUnitId } : undefined,
    });
    return data;
  },

  async listDeliveries(params?: ResidentDeliveriesParams): Promise<ResidentDeliveriesListResponse> {
    const { data } = await api.get<ResidentDeliveriesListResponse>('/resident/deliveries', { params });
    return data;
  },

  async listVisitForecasts(params?: ResidentVisitForecastParams): Promise<ResidentVisitForecastListResponse> {
    const { data } = await api.get<ResidentVisitForecastListResponse>('/visit-forecasts', { params });
    return data;
  },

  async listNotifications(params?: ResidentNotificationsParams): Promise<ResidentNotification[]> {
    const { data } = await api.get<ResidentNotification[]>('/resident/notifications', { params });
    return Array.isArray(data) ? data.map(normalizeResidentNotification) : [];
  },

  async markNotificationRead(id: string): Promise<ResidentNotification> {
    const { data } = await api.patch<ResidentNotification>(`/resident/notifications/${id}/read`);
    return normalizeResidentNotification(data);
  },

  async markAllNotificationsRead(): Promise<ResidentNotificationsMarkAllReadResponse> {
    const { data } = await api.patch<ResidentNotificationsMarkAllReadResponse>('/resident/notifications/read-all');
    return data;
  },

  async getNotificationPreferences(): Promise<ResidentNotificationPreference> {
    const { data } = await api.get<ResidentNotificationPreference>('/resident/notification-preferences');
    return data;
  },

  async updateNotificationPreferences(payload: ResidentNotificationPreferencePayload): Promise<ResidentNotificationPreference> {
    const { data } = await api.put<ResidentNotificationPreference>('/resident/notification-preferences', payload);
    return data;
  },

  async getLgpdConsent(deviceId: string): Promise<ResidentLgpdConsent> {
    const { data } = await api.get<ResidentLgpdConsent>('/resident/lgpd-consent', {
      params: { deviceId },
    });
    return data;
  },

  async getLgpdPolicy(): Promise<ResidentLgpdPolicy> {
    const { data } = await api.get<ResidentLgpdPolicy>('/resident/lgpd-policy');
    return data;
  },

  async getLgpdConsentHistory(deviceId?: string | null): Promise<ResidentLgpdConsentHistoryEntry[]> {
    const { data } = await api.get<ResidentLgpdConsentHistoryEntry[]>('/resident/lgpd-consent/history', {
      params: deviceId ? { deviceId } : undefined,
    });
    return Array.isArray(data) ? data : [];
  },

  async updateLgpdConsent(payload: ResidentLgpdConsentPayload): Promise<ResidentLgpdConsent> {
    const { data } = await api.put<ResidentLgpdConsent>('/resident/lgpd-consent', payload);
    return data;
  },
};
