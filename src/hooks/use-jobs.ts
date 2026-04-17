'use client';

import { useQuery } from '@tanstack/react-query';
import { jobsService } from '@/services/jobs.service';
import type { BackgroundJob, BackgroundJobsListResponse, BackgroundJobsParams } from '@/types/job';

type UseJobsParams = BackgroundJobsParams & {
  enabled?: boolean;
};

export function useJobs(params?: UseJobsParams) {
  const { enabled = true, ...queryParams } = params ?? {};

  return useQuery<BackgroundJobsListResponse>({
    queryKey: ['jobs', queryParams],
    queryFn: () => jobsService.list(queryParams),
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useJob(id?: string | null, enabled = true) {
  return useQuery<BackgroundJob>({
    queryKey: ['jobs', id],
    queryFn: () => jobsService.findById(id as string),
    enabled: Boolean(id) && enabled,
    staleTime: 10 * 1000,
    retry: 1,
  });
}
