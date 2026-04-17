'use client';

import { useQuery } from '@tanstack/react-query';
import { camerasService } from '@/services/cameras.service';
import type { CameraStreamingResponse } from '@/types/camera';

export function useCameraStreaming(cameraId?: string | null, enabled = true) {
  return useQuery<CameraStreamingResponse>({
    queryKey: ['camera-streaming', cameraId],
    queryFn: () => camerasService.getStreaming(cameraId as string),
    enabled: Boolean(cameraId) && enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });
}
