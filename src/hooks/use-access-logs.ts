'use client';

import { useQuery } from '@tanstack/react-query';
import { getAccessLogs } from '@/services/access-logs.service';
import type { AccessLogsListResponse } from '@/types/access-log';

type UseAccessLogsParams = {
  page?: number;
  limit?: number;
  personId?: string | null;
  cameraId?: string | null;
  userId?: string | null;
  direction?: string | null;
  result?: string | null;
  classification?: string | null;
  unitId?: string | null;
  enabled?: boolean;
};

export const useAccessLogs = (params?: UseAccessLogsParams) => {
  const { enabled = true, ...queryParams } = params ?? {};

  return useQuery<AccessLogsListResponse>({
    queryKey: ['access-logs', queryParams],
    queryFn: () => getAccessLogs(queryParams),
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });
};
