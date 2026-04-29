import { api } from '@/lib/axios';
import type { Condominium } from '@/types/condominium';
import type {
  PartnerClientCreatePayload,
  PartnerCompany,
  PartnerCompanyPayload,
  ProvisioningKey,
  ProvisioningKeyCreatePayload,
  ProvisioningKeyCreateResponse,
} from '@/types/partner';

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | null;
      items?: T[] | null;
      value?: T[] | null;
      Count?: number | null;
    };

function parseList<T>(payload: ApiListResponse<T>) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.value)) return payload.value;
  return [];
}

export const partnersService = {
  async listPartners(): Promise<PartnerCompany[]> {
    const { data } = await api.get<ApiListResponse<PartnerCompany>>('/master/partners');
    return parseList(data);
  },

  async createPartner(payload: PartnerCompanyPayload): Promise<PartnerCompany> {
    const { data } = await api.post<PartnerCompany>('/master/partners', payload);
    return data;
  },

  async updatePartner(partnerId: string, payload: Partial<PartnerCompanyPayload>): Promise<PartnerCompany> {
    const { data } = await api.patch<PartnerCompany>(`/master/partners/${partnerId}`, payload);
    return data;
  },

  async listProvisioningKeys(params?: { ownerType?: string; ownerId?: string }): Promise<ProvisioningKey[]> {
    const { data } = await api.get<ApiListResponse<ProvisioningKey>>('/master/provisioning-keys', { params });
    return parseList(data);
  },

  async createProvisioningKey(payload: ProvisioningKeyCreatePayload): Promise<ProvisioningKeyCreateResponse> {
    const { data } = await api.post<ProvisioningKeyCreateResponse>('/master/provisioning-keys', payload);
    return data;
  },

  async revokeProvisioningKey(keyId: string): Promise<ProvisioningKey> {
    const { data } = await api.patch<ProvisioningKey>(`/master/provisioning-keys/${keyId}/revoke`);
    return data;
  },

  async listPartnerClients(): Promise<Condominium[]> {
    const { data } = await api.get<ApiListResponse<Condominium>>('/partner/clients');
    return parseList(data);
  },

  async createPartnerClient(payload: PartnerClientCreatePayload): Promise<Condominium> {
    const { data } = await api.post<Condominium>('/partner/clients', payload);
    return data;
  },

  async listMyProvisioningKeys(): Promise<ProvisioningKey[]> {
    const { data } = await api.get<ApiListResponse<ProvisioningKey>>('/partner/provisioning-keys');
    return parseList(data);
  },
};
