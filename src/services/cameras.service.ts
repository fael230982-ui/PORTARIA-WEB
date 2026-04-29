import { api } from '@/lib/axios';
import {
  normalizeCamera,
  normalizeCamerasListResponse,
  normalizeCameraStreamingResponse,
} from '@/features/cameras/camera-normalizers';
import type {
  Camera,
  CameraCreateRequest,
  CameraReplayCreateRequest,
  CameraReplayResponse,
  CameraUpdateRequest,
  CamerasListResponse,
  CameraStreamingResponse,
} from '@/types/camera';
import type { BackgroundJob } from '@/types/job';

type CamerasListParams = {
  status?: string;
  unitId?: string;
};

export const camerasService = {
  async list(params?: CamerasListParams): Promise<CamerasListResponse> {
    const queryParams = {
      status: params?.status,
      unitId: params?.unitId,
    };

    const { data } = await api.get<Camera[] | CamerasListResponse>('/cameras', {
      params: queryParams,
    });

    const normalized = normalizeCamerasListResponse(data);

    if (params?.unitId) {
      const filteredCameras = normalized.data.filter((camera) => camera.unitId === params.unitId || !camera.unitId);

      return {
        ...normalized,
        data: filteredCameras,
        meta: normalized.meta
          ? {
              ...normalized.meta,
              totalItems: filteredCameras.length,
            }
          : normalized.meta,
      };
    }

    return normalized;
  },

  async create(payload: CameraCreateRequest): Promise<Camera> {
    const { data } = await api.post<Camera>('/cameras', payload);
    return normalizeCamera(data);
  },

  async createDetailed(payload: CameraCreateRequest) {
    const response = await api.post<Camera>('/cameras', payload);
    return {
      camera: normalizeCamera(response.data),
      status: response.status,
      headers: response.headers,
      body: response.data,
    };
  },

  async createAsync(payload: CameraCreateRequest): Promise<BackgroundJob> {
    const { data } = await api.post<BackgroundJob>('/cameras/async', payload);
    return data;
  },

  async update(id: string, payload: CameraUpdateRequest): Promise<Camera> {
    try {
      const { data } = await api.patch<Camera>(`/cameras/${id}`, payload);
      return normalizeCamera(data);
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }

      const { data } = await api.put<Camera>(`/cameras/${id}`, payload);
      return normalizeCamera(data);
    }
  },

  async findById(id: string): Promise<Camera> {
    const { data } = await api.get<Camera>(`/cameras/${id}`);
    return normalizeCamera(data);
  },

  async remove(id: string) {
    await api.delete(`/cameras/${id}`);
  },

  async getStreaming(id: string): Promise<CameraStreamingResponse> {
    const { data } = await api.get<CameraStreamingResponse>(`/cameras/${id}/streaming`);
    return normalizeCameraStreamingResponse(data);
  },

  async provisionFaceServer(serverId: string, cameraId: string) {
    const { data } = await api.post(`/integrations/face/servers/${serverId}/cameras/${cameraId}/provision`);
    return data;
  },

  async createReplay(id: string, payload: CameraReplayCreateRequest): Promise<CameraReplayResponse> {
    const { data } = await api.post<CameraReplayResponse>(`/cameras/${id}/replays`, payload);
    return {
      ...data,
      replayUrl: data.replayUrl ?? null,
    };
  },

  async getReplay(cameraId: string, replayId: string): Promise<CameraReplayResponse> {
    const { data } = await api.get<CameraReplayResponse>(`/cameras/${cameraId}/replays/${replayId}`);
    return {
      ...data,
      replayUrl: data.replayUrl ?? null,
    };
  },

  getImageStreamPath(id: string, params?: { width?: number; height?: number; intervalMs?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.width) searchParams.set('width', String(params.width));
    if (params?.height) searchParams.set('height', String(params.height));
    if (params?.intervalMs) searchParams.set('intervalMs', String(params.intervalMs));

    const query = searchParams.toString();
    return `/cameras/${id}/image-stream${query ? `?${query}` : ''}`;
  },

  async updateStatus(id: string, status: 'ONLINE' | 'OFFLINE') {
    const { data } = await api.patch(`/cameras/${id}/status`, { status });
    return data;
  },

  async capturePhoto(id: string) {
    const { data } = await api.post<{ photoUrl: string }>(`/cameras/${id}/capture-photo`);
    return data;
  },
};
