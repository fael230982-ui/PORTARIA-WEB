//src/hooks/use-alerts.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAlerts } from '@/services/alerts.service';
import type { AlertsListResponse } from '@/types/alert';

type UseAlertsParams = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  enabled?: boolean;
  refetchInterval?: number | false;
};

export const useAlerts = (params?: UseAlertsParams) =>
  useQuery<AlertsListResponse>({
    queryKey: ['alerts', params],
    queryFn: () => getAlerts(params),
    enabled: params?.enabled ?? true,
    staleTime: params?.refetchInterval ? 0 : 60 * 1000,
    refetchInterval: params?.refetchInterval,
    refetchIntervalInBackground: false,
    retry: 1,
  });
