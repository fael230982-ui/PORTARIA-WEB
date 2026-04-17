'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllDeliveries, getDeliveries } from '@/services/deliveries.service';
import type { DeliveriesListResponse } from '@/types/delivery';

type UseDeliveriesParams = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  recipientUnitId?: string;
  enabled?: boolean;
};

export const useDeliveries = (params?: UseDeliveriesParams) => {
  const { enabled = true, ...queryParams } = params ?? {};

  return useQuery<DeliveriesListResponse>({
    queryKey: ['deliveries', queryParams],
    queryFn: () => getDeliveries(queryParams),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useAllDeliveries = (params?: Omit<UseDeliveriesParams, 'page'>) => {
  const { enabled = true, ...queryParams } = params ?? {};

  return useQuery<DeliveriesListResponse>({
    queryKey: ['deliveries', 'all-pages', queryParams],
    queryFn: () => getAllDeliveries(queryParams),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
