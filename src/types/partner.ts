export type PartnerStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export type ProvisioningKeyStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export type ProvisioningKeyOwnerType = 'PARTNER' | 'CLIENT';

export type PartnerCompany = {
  id: string;
  name: string;
  document?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  status: PartnerStatus;
  clientLimit?: number | null;
  activeClients?: number;
  allowedModules?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PartnerCompanyPayload = {
  name: string;
  document?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  status?: PartnerStatus;
  clientLimit?: number | null;
  allowedModules?: string[];
};

export type ProvisioningKey = {
  id: string;
  ownerType: ProvisioningKeyOwnerType;
  ownerId: string;
  label?: string | null;
  status: ProvisioningKeyStatus;
  maxClients?: number | null;
  usedClients?: number;
  allowedModules?: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
};

export type ProvisioningKeyCreatePayload = {
  ownerType: ProvisioningKeyOwnerType;
  ownerId: string;
  label?: string | null;
  maxClients?: number | null;
  allowedModules?: string[];
  expiresAt?: string | null;
};

export type ProvisioningKeyCreateResponse = {
  key: ProvisioningKey;
  plainToken: string;
};

export type PartnerClientCreatePayload = {
  provisioningToken: string;
  name: string;
  clientKind: 'CONDOMINIUM' | 'RESIDENCE';
  document?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  enabledModules?: string[];
  adminInitial?: {
    name: string;
    email: string;
    password: string;
  } | null;
};
