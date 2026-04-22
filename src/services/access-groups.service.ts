import { api } from '@/lib/axios';
import type { AccessGroup, AccessGroupPayload } from '@/types/access-group';

export const accessGroupsService = {
  async list(): Promise<AccessGroup[]> {
    const { data } = await api.get<AccessGroup[]>('/access-groups');
    return Array.isArray(data) ? data : [];
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
