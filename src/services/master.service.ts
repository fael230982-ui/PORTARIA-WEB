import { api } from '@/lib/axios';
import type { Condominium } from '@/types/condominium';
import type { PermissionMatrixItem } from '@/types/user';

type ClientKind = 'CONDOMINIUM' | 'RESIDENCE';
type LicenseStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED';
type MasterModuleCode =
  | 'USERS'
  | 'UNITS'
  | 'PEOPLE'
  | 'CAMERAS'
  | 'ALERTS'
  | 'ACCESS_LOGS'
  | 'DELIVERIES'
  | 'VISIT_FORECASTS'
  | 'VEHICLES'
  | 'FACIAL'
  | 'MESSAGES'
  | 'OPERATION'
  | 'ACCESS_GROUPS'
  | 'IMPORTS'
  | 'INTEGRATIONS'
  | 'MONITORING';

export type MasterClientCreatePayload = {
  name: string;
  clientKind: ClientKind;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  licensePlan?: string | null;
  licenseStatus?: LicenseStatus;
  licenseExpiresAt?: string | null;
  enabledModules?: string[];
  moduleSettings?: Record<string, boolean>;
  slimMode?: boolean;
  adminInitial?: {
    name: string;
    email: string;
    password: string;
  } | null;
};

export type MasterClientProfilePayload = {
  name?: string;
  clientKind?: ClientKind;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
};

export type MasterLicensePayload = {
  licensePlan: string;
  licenseStatus: LicenseStatus;
  licenseExpiresAt?: string | null;
  licenseMonthlyValue?: string | number | null;
  licenseStartsAt?: string | null;
  licenseDueDay?: string | number | null;
};

export type MasterModulesPayload = {
  enabledModules: string[];
  moduleSettings?: Record<string, boolean>;
  slimMode?: boolean;
};

export type MasterSummary = {
  clients: number;
  condominiums: number;
  residences: number;
  activeLicenses: number;
  expiredLicenses: number;
  peopleCount: number;
  residentsCount: number;
  camerasCount: number;
  onlineCameras: number;
  offlineCameras: number;
  pendingDeliveries: number;
  criticalAlerts: number;
  offlineOperationDevices: number;
};

export type MasterModuleCatalogItem = {
  code: MasterModuleCode;
  label: string;
  description: string;
  apiStatus: string;
  persistedByApi: boolean;
  settingKey: string;
  isMandatory?: boolean;
  dependencies?: MasterModuleCode[];
  visibleInProduct?: boolean;
  availabilityNote?: string | null;
};

export type MasterOperationDevice = {
  id: string;
  condominiumId?: string | null;
  condominiumName?: string | null;
  deviceId: string;
  deviceName?: string | null;
  status: string;
  lastSeenAt: string;
  lastHeartbeatDelaySeconds?: number | null;
  userId?: string | null;
  userName?: string | null;
  clientVersion?: string | null;
  currentPath?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | null;
      items?: T[] | null;
      value?: T[] | null;
      Count?: number | null;
    };

type ApiMasterClient = Condominium & {
  clientType?: ClientKind | null;
  uf?: string | null;
  cep?: string | null;
  slimMode?: boolean | null;
  metrics?: Condominium['metrics'];
};

function isUnsupportedContract(error: unknown) {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 400 || status === 404 || status === 405 || status === 422;
}

function normalizeClient(raw: ApiMasterClient): Condominium {
  return {
    ...raw,
    clientKind: raw.clientKind ?? raw.clientType ?? 'CONDOMINIUM',
    state: raw.state ?? raw.uf ?? null,
    zipCode: raw.zipCode ?? raw.cep ?? null,
    peopleCount: raw.peopleCount ?? raw.metrics?.people ?? null,
    residentsCount: raw.residentsCount ?? raw.metrics?.residents ?? null,
    camerasCount: raw.camerasCount ?? raw.metrics?.cameras ?? null,
    metrics: raw.metrics ?? null,
  };
}

function normalizeClientList(response: ApiListResponse<ApiMasterClient>): Condominium[] {
  const items = Array.isArray(response)
    ? response
    : Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.items)
        ? response.items
        : Array.isArray(response.value)
          ? response.value
          : [];
  return items.map(normalizeClient);
}

function parsePermissionMatrix(response: ApiListResponse<PermissionMatrixItem>) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.value)) return response.value;
  return [];
}

function toMasterModuleKey(value: string) {
  const map: Record<string, MasterModuleCode> = {
    users: 'USERS',
    units: 'UNITS',
    people: 'PEOPLE',
    cameras: 'CAMERAS',
    alerts: 'ALERTS',
    accessLogs: 'ACCESS_LOGS',
    accesslogs: 'ACCESS_LOGS',
    deliveries: 'DELIVERIES',
    visitForecasts: 'VISIT_FORECASTS',
    visitforecasts: 'VISIT_FORECASTS',
    vehicles: 'VEHICLES',
    facialRecognition: 'FACIAL',
    facialrecognition: 'FACIAL',
    operation: 'OPERATION',
    monitoring: 'MONITORING',
    messages: 'MESSAGES',
    accessGroups: 'ACCESS_GROUPS',
    accessgroups: 'ACCESS_GROUPS',
    imports: 'IMPORTS',
    integrations: 'INTEGRATIONS',
  };

  return map[value] ?? (value.toUpperCase() as MasterModuleCode);
}

function isSupportedMasterModule(value: string) {
  const supported = new Set([
    'users',
    'units',
    'people',
    'cameras',
    'alerts',
    'accessLogs',
    'accesslogs',
    'deliveries',
    'visitForecasts',
    'visitforecasts',
    'vehicles',
    'facialRecognition',
    'facialrecognition',
    'operation',
    'monitoring',
    'messages',
    'accessGroups',
    'accessgroups',
    'imports',
    'integrations',
  ]);

  return supported.has(value);
}

function filterSupportedMasterModules(enabledModules: string[]) {
  return enabledModules.filter((item) => isSupportedMasterModule(item));
}

function toCondominiumPayload(payload: MasterClientCreatePayload | MasterClientProfilePayload | MasterModulesPayload | MasterLicensePayload) {
  return payload;
}

export const masterService = {
  async getPermissionsMatrix(): Promise<PermissionMatrixItem[]> {
    try {
      const response = await api.get<ApiListResponse<PermissionMatrixItem>>('/auth/permissions-matrix');
      return parsePermissionMatrix(response.data);
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      return [];
    }
  },

  async listClients(): Promise<Condominium[]> {
    try {
      const response = await api.get<ApiListResponse<ApiMasterClient>>('/master/clients');
      return normalizeClientList(response.data);
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      const response = await api.get<Condominium[]>('/condominiums');
      return response.data;
    }
  },

  async createClient(payload: MasterClientCreatePayload): Promise<{ client: Condominium; fullContractPersisted: boolean }> {
    try {
      const supportedModules = filterSupportedMasterModules(payload.enabledModules ?? []);
      const response = await api.post<ApiMasterClient>('/master/clients', {
        name: payload.name,
        clientType: payload.clientKind,
        document: payload.document ?? null,
        address: payload.address ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        uf: payload.state ?? null,
        zipCode: payload.zipCode ?? null,
        cep: payload.zipCode ?? null,
        responsibleName: payload.responsibleName ?? null,
        responsibleEmail: payload.responsibleEmail ?? null,
        responsiblePhone: payload.responsiblePhone ?? null,
        licensePlan: payload.licensePlan ?? 'BASIC',
        licenseStatus: payload.licenseStatus ?? 'ACTIVE',
        licenseExpiresAt: payload.licenseExpiresAt ?? null,
        enabledModules: supportedModules.map(toMasterModuleKey),
        slimMode: payload.slimMode ?? false,
        adminInitial: payload.adminInitial ?? null,
      });
      return { client: normalizeClient(response.data), fullContractPersisted: true };
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      try {
        const response = await api.post<Condominium>('/condominiums', toCondominiumPayload(payload));
        return { client: response.data, fullContractPersisted: true };
      } catch (fallbackError) {
        if (!isUnsupportedContract(fallbackError)) throw fallbackError;
        const response = await api.post<Condominium>('/condominiums', { name: payload.name });
        return { client: response.data, fullContractPersisted: false };
      }
    }
  },

  async updateClientProfile(clientId: string, payload: MasterClientProfilePayload): Promise<Condominium> {
    try {
      const response = await api.patch<ApiMasterClient>(`/master/clients/${clientId}`, {
        name: payload.name,
        clientType: payload.clientKind,
        document: payload.document ?? null,
        address: payload.address ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        uf: payload.state ?? null,
        zipCode: payload.zipCode ?? null,
        cep: payload.zipCode ?? null,
        responsibleName: payload.responsibleName ?? null,
        responsibleEmail: payload.responsibleEmail ?? null,
        responsiblePhone: payload.responsiblePhone ?? null,
      });
      return normalizeClient(response.data);
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      try {
        const response = await api.patch<Condominium>(`/condominiums/${clientId}`, toCondominiumPayload(payload));
        return response.data;
      } catch (patchError) {
        if (!isUnsupportedContract(patchError)) throw patchError;
        const response = await api.put<Condominium>(`/condominiums/${clientId}`, toCondominiumPayload(payload));
        return response.data;
      }
    }
  },

  async updateLicense(clientId: string, payload: MasterLicensePayload): Promise<Partial<Condominium>> {
    try {
      const response = await api.patch<Partial<ApiMasterClient>>(`/master/licenses/${clientId}`, {
        licensePlan: payload.licensePlan,
        licenseStatus: payload.licenseStatus,
        licenseExpiresAt: payload.licenseExpiresAt ?? null,
        licenseMonthlyValue: payload.licenseMonthlyValue ?? null,
        licenseStartsAt: payload.licenseStartsAt ?? null,
        licenseDueDay: payload.licenseDueDay ?? null,
      });
      return normalizeClient(response.data as ApiMasterClient);
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      try {
        const response = await api.patch<Condominium>(`/condominiums/${clientId}`, toCondominiumPayload(payload));
        return response.data;
      } catch (patchError) {
        if (!isUnsupportedContract(patchError)) throw patchError;
        const response = await api.put<Condominium>(`/condominiums/${clientId}`, toCondominiumPayload(payload));
        return response.data;
      }
    }
  },

  async updateModules(clientId: string, payload: MasterModulesPayload): Promise<Partial<Condominium>> {
    try {
      const supportedModules = filterSupportedMasterModules(payload.enabledModules);
      const response = await api.patch<Partial<ApiMasterClient>>(`/master/clients/${clientId}/modules`, {
        enabledModules: supportedModules.map(toMasterModuleKey),
        slimMode: payload.slimMode ?? false,
      });
      return normalizeClient(response.data as ApiMasterClient);
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      try {
        const response = await api.patch<Condominium>(`/condominiums/${clientId}`, toCondominiumPayload(payload));
        return response.data;
      } catch (patchError) {
        if (!isUnsupportedContract(patchError)) throw patchError;
        const response = await api.put<Condominium>(`/condominiums/${clientId}`, toCondominiumPayload(payload));
        return response.data;
      }
    }
  },

  async getSummary(): Promise<MasterSummary | null> {
    try {
      const response = await api.get<MasterSummary>('/master/summary');
      return response.data;
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      return null;
    }
  },

  async listModuleCatalog(): Promise<MasterModuleCatalogItem[]> {
    try {
      const response = await api.get<MasterModuleCatalogItem[]>('/master/modules/catalog');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      return [];
    }
  },

  async listOperationDevices(filters?: { status?: string; condominiumId?: string | null }): Promise<MasterOperationDevice[]> {
    try {
      const response = await api.get<MasterOperationDevice[]>('/master/operation-devices', { params: filters });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (!isUnsupportedContract(error)) throw error;
      return [];
    }
  },
};
