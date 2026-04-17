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
    enabled: enabled && Boolean(params?.unitId),
    staleTime: 30 * 1000,
    retry: 1,
  });
}
