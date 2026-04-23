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

export const partnersService = {
  async listPartners(): Promise<PartnerCompany[]> {
    const { data } = await api.get<PartnerCompany[]>('/master/partners');
    return Array.isArray(data) ? data : [];
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
    const { data } = await api.get<ProvisioningKey[]>('/master/provisioning-keys', { params });
    return Array.isArray(data) ? data : [];
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
    const { data } = await api.get<Condominium[]>('/partner/clients');
    return Array.isArray(data) ? data : [];
  },

  async createPartnerClient(payload: PartnerClientCreatePayload): Promise<Condominium> {
    const { data } = await api.post<Condominium>('/partner/clients', payload);
    return data;
  },

  async listMyProvisioningKeys(): Promise<ProvisioningKey[]> {
    const { data } = await api.get<ProvisioningKey[]>('/partner/provisioning-keys');
    return Array.isArray(data) ? data : [];
  },
};
