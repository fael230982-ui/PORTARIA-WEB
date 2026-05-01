import { api } from '@/lib/axios';
import { normalizeCamera } from '@/features/cameras/camera-normalizers';
import type { Camera } from '@/types/camera';
import type {
  VmsCameraImportPayload,
  VmsExistingCamera,
  VmsExistingCameraLookupResponse,
  VmsServer,
  VmsServerDeleteImpact,
  VmsServerPayload,
} from '@/types/vms-server';

type VmsServerListResponse =
  | VmsServer[]
  | {
      data?: VmsServer[];
      items?: VmsServer[];
      value?: VmsServer[];
    };

function parseServers(payload: VmsServerListResponse) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

export const vmsServersService = {
  async list() {
    const { data } = await api.get<VmsServerListResponse>('/integrations/vms/servers');
    return parseServers(data);
  },

  async create(payload: VmsServerPayload) {
    const { data } = await api.post<VmsServer>('/integrations/vms/servers', payload);
    return data;
  },

  async update(id: string, payload: Partial<VmsServerPayload>) {
    try {
      const { data } = await api.patch<VmsServer>(`/integrations/vms/servers/${id}`, payload);
      return data;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }

      const { data } = await api.put<VmsServer>(`/integrations/vms/servers/${id}`, payload);
      return data;
    }
  },

  async remove(id: string) {
    await api.delete(`/integrations/vms/servers/${id}`);
  },

  async getDeleteImpact(id: string) {
    const { data } = await api.get<VmsServerDeleteImpact>(`/integrations/vms/servers/${id}/delete-impact`);
    return data;
  },

  async listExistingCameras(serverId: string): Promise<VmsExistingCameraLookupResponse> {
    const { data } = await api.get<VmsExistingCamera[] | VmsExistingCameraLookupResponse>(`/integrations/vms/servers/${serverId}/cameras`);

    if (Array.isArray(data)) {
      return {
        items: data,
        foundCount: data.length,
        shouldCreateNewCamera: data.length === 0,
        message:
          data.length === 0
            ? 'Nenhuma câmera cadastrada foi encontrada neste servidor VMS. O front deve orientar o cadastro de uma câmera nova.'
            : null,
      };
    }

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      foundCount: typeof data?.foundCount === 'number' ? data.foundCount : Array.isArray(data?.items) ? data.items.length : 0,
      shouldCreateNewCamera: Boolean(data?.shouldCreateNewCamera),
      message: typeof data?.message === 'string' ? data.message : null,
    };
  },

  async importExistingCamera(serverId: string, payload: VmsCameraImportPayload): Promise<Camera> {
    const { data } = await api.post<Camera>(`/integrations/vms/servers/${serverId}/cameras/import`, payload);
    return normalizeCamera(data);
  },

  async importExistingCameraDetailed(serverId: string, payload: VmsCameraImportPayload) {
    const response = await api.post<Camera>(`/integrations/vms/servers/${serverId}/cameras/import`, payload);
    return {
      camera: normalizeCamera(response.data),
      status: response.status,
      headers: response.headers,
      body: response.data,
    };
  },
};
