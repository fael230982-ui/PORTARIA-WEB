'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { residentService } from '@/services/resident.service';
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

type EnabledParam<T> = T & {
  enabled?: boolean;
};

export function useResidentDeliveries(params?: EnabledParam<ResidentDeliveriesParams>) {
  const { enabled = true, ...queryParams } = params ?? {};

  return useQuery<ResidentDeliveriesListResponse>({
    queryKey: ['resident', 'deliveries', queryParams],
    queryFn: () => residentService.listDeliveries(queryParams),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useResidentProfile(selectedUnitId?: string | null, enabled = true) {
  return useQuery<ResidentProfile>({
    queryKey: ['resident', 'profile', selectedUnitId],
    queryFn: () => residentService.getProfile(selectedUnitId),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useResidentVisitForecasts(params?: EnabledParam<ResidentVisitForecastParams>) {
  const { enabled = true, ...queryParams } = params ?? {};

  return useQuery<ResidentVisitForecastListResponse>({
    queryKey: ['resident', 'visit-forecasts', queryParams],
    queryFn: () => residentService.listVisitForecasts(queryParams),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useResidentNotifications(params?: EnabledParam<ResidentNotificationsParams>) {
  const { enabled = true, ...queryParams } = params ?? {};

  return useQuery<ResidentNotification[]>({
    queryKey: ['resident', 'notifications', queryParams],
    queryFn: () => residentService.listNotifications(queryParams),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useMarkResidentNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => residentService.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', 'notifications'] });
    },
  });
}

export function useMarkAllResidentNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<ResidentNotificationsMarkAllReadResponse>({
    mutationFn: () => residentService.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', 'notifications'] });
    },
  });
}

export function useResidentNotificationPreferences(enabled = true) {
  return useQuery<ResidentNotificationPreference>({
    queryKey: ['resident', 'notification-preferences'],
    queryFn: () => residentService.getNotificationPreferences(),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useUpdateResidentNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ResidentNotificationPreferencePayload) => residentService.updateNotificationPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', 'notification-preferences'] });
    },
  });
}

export function useResidentLgpdConsent(deviceId?: string | null, enabled = true) {
  return useQuery<ResidentLgpdConsent>({
    queryKey: ['resident', 'lgpd-consent', deviceId],
    queryFn: () => residentService.getLgpdConsent(deviceId as string),
    enabled: enabled && Boolean(deviceId),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useResidentLgpdPolicy(enabled = true) {
  return useQuery<ResidentLgpdPolicy>({
    queryKey: ['resident', 'lgpd-policy'],
    queryFn: () => residentService.getLgpdPolicy(),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useResidentLgpdConsentHistory(deviceId?: string | null, enabled = true) {
  return useQuery<ResidentLgpdConsentHistoryEntry[]>({
    queryKey: ['resident', 'lgpd-consent-history', deviceId],
    queryFn: () => residentService.getLgpdConsentHistory(deviceId),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useUpdateResidentLgpdConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ResidentLgpdConsentPayload) => residentService.updateLgpdConsent(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resident', 'lgpd-consent', variables.deviceId] });
    },
  });
}
