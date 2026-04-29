import { api } from '@/lib/axios';
import type { FaceEngineServer, FaceEngineServerPayload } from '@/types/face-engine-server';

type FaceEngineServerListResponse =
  | FaceEngineServer[]
  | {
      data?: FaceEngineServer[];
      items?: FaceEngineServer[];
      value?: FaceEngineServer[];
    };

function parseList(payload: FaceEngineServerListResponse) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

export const faceEngineServersService = {
  async list() {
    const { data } = await api.get<FaceEngineServerListResponse>('/integrations/face/servers');
    return parseList(data);
  },

  async get(id: string) {
    const { data } = await api.get<FaceEngineServer>(`/integrations/face/servers/${id}`);
    return data;
  },

  async create(payload: FaceEngineServerPayload) {
    const { data } = await api.post<FaceEngineServer>('/integrations/face/servers', payload);
    return data;
  },

  async update(id: string, payload: FaceEngineServerPayload) {
    const { data } = await api.put<FaceEngineServer>(`/integrations/face/servers/${id}`, payload);
    return data;
  },
};
