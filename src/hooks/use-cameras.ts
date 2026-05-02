'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { camerasService } from '@/services/cameras.service';

type UseCamerasParams = {
  status?: string;
  unitId?: string;
  mediaRoute?: 'internal' | 'external';
  enabled?: boolean;
};

export function useCameras(params?: UseCamerasParams) {
  const { enabled = true, ...rawParams } = params ?? {};
  const queryParams = {
    status: rawParams.status,
    unitId: rawParams.unitId,
    mediaRoute: rawParams.mediaRoute ?? 'external',
  };

  return useQuery({
    queryKey: ['cameras', queryParams],
    queryFn: () => camerasService.list(queryParams),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}
