'use client';

import { useQuery } from '@tanstack/react-query';
import { getReports } from '@/services/reports.service';
import type { ReportsListResponse } from '@/types/report';

export function useReports(enabled = true) {
  return useQuery<ReportsListResponse>({
    queryKey: ['reports'],
    queryFn: getReports,
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });
}
