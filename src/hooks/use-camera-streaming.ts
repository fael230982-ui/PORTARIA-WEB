'use client';

import { useQuery } from '@tanstack/react-query';
import { camerasService } from '@/services/cameras.service';
import type { CameraStreamingResponse } from '@/types/camera';

export function useCameraStreaming(cameraId?: string | null, enabled = true) {
  return useQuery<CameraStreamingResponse>({
    queryKey: ['camera-streaming', cameraId, 'external'],
    queryFn: () => camerasService.getStreaming(cameraId as string, 'external'),
    enabled: Boolean(cameraId) && enabled,
    staleTime: 0,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
