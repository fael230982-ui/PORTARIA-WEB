import { api } from '@/lib/axios';
import type { AccessGroup, AccessGroupPayload } from '@/types/access-group';

type AccessGroupsListResponse =
  | AccessGroup[]
  | {
      data?: AccessGroup[];
      items?: AccessGroup[];
      value?: AccessGroup[];
    };

function parseAccessGroupsList(payload: AccessGroupsListResponse): AccessGroup[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

export const accessGroupsService = {
  async list(): Promise<AccessGroup[]> {
    const { data } = await api.get<AccessGroupsListResponse>('/access-groups');
    return parseAccessGroupsList(data);
  },

  async get(id: string): Promise<AccessGroup> {
    const { data } = await api.get<AccessGroup>(`/access-groups/${id}`);
    return data;
  },

  async create(payload: AccessGroupPayload): Promise<AccessGroup> {
    const { data } = await api.post<AccessGroup>('/access-groups', payload);
    return data;
  },

  async update(id: string, payload: AccessGroupPayload): Promise<AccessGroup> {
    const { data } = await api.put<AccessGroup>(`/access-groups/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/access-groups/${id}`);
  },
};
