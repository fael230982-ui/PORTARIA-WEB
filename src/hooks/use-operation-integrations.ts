'use client';

import { useQuery } from '@tanstack/react-query';
import { operationService, type OperationMessagesParams, type OperationSearchParams } from '@/services/operation.service';

export function useOperationSearch(params: OperationSearchParams, enabled = false) {
  return useQuery({
    queryKey: ['operation-search', params],
    queryFn: () => operationService.search(params),
    enabled: enabled && params.q.trim().length >= 2,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useOperationUnitSearch(query: string, enabled = false) {
  return useQuery({
    queryKey: ['operation-unit-search', query],
    queryFn: () => operationService.searchUnits(query, 12),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function usePersonAccessSummary(personId?: string | null, enabled = false) {
  return useQuery({
    queryKey: ['person-access-summary', personId],
    queryFn: () => operationService.getPersonAccessSummary(personId as string),
    enabled: enabled && Boolean(personId),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useOperationActions(enabled = false) {
  return useQuery({
    queryKey: ['operation-actions'],
    queryFn: () => operationService.listActions(),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useOperationMessages(params?: OperationMessagesParams, enabled = false) {
  return useQuery({
    queryKey: ['operation-messages', params],
    queryFn: () => operationService.listMessages(params),
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
    refetchInterval: enabled ? 15 * 1000 : false,
  });
}

export function useOperationWhatsAppConnection(unitId?: string | null, enabled = false) {
  return useQuery({
    queryKey: ['operation-whatsapp-connection', unitId],
    queryFn: () => operationService.getWhatsAppConnection(unitId as string),
    enabled: enabled && Boolean(unitId),
    staleTime: 5 * 1000,
    retry: 1,
    refetchInterval: (query) => {
      if (!enabled || !unitId) return false;
      const state = query.state.data?.state?.trim().toLowerCase();
      if (!state) return 5 * 1000;
      return state === 'open' ? false : 5 * 1000;
    },
  });
}
