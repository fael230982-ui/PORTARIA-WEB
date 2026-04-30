export type VmsServerStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
export type VmsServerVendor = 'INCORESOFT' | 'DGUARD' | 'DIGIFORT' | 'INTELBRAS_MONUV' | string;
export type VmsServerAuthType = 'API_TOKEN' | 'BASIC' | 'NONE' | string;

export type VmsServerCapabilityFlags = {
  supportsProvisioning?: boolean | null;
  supportsCameraLookup?: boolean | null;
  supportsExistingCameraBinding?: boolean | null;
};

export type VmsServer = {
  id: string;
  name: string;
  vendor?: VmsServerVendor | null;
  baseUrl?: string | null;
  authType?: VmsServerAuthType | null;
  verifySsl?: boolean | null;
  timeoutSeconds?: number | null;
  operationMode?: string | null;
  capabilities?: VmsServerCapabilityFlags | null;
  status?: VmsServerStatus | null;
};

export type VmsServerPayload = {
  name: string;
  vendor?: VmsServerVendor | null;
  baseUrl?: string | null;
  apiToken?: string | null;
  authType?: VmsServerAuthType | null;
  verifySsl?: boolean | null;
  timeoutSeconds?: number | null;
  status?: VmsServerStatus | null;
};

export type VmsExistingCamera = {
  recordingServerId: number;
  recordingServerName?: string | null;
  deviceId: number;
  deviceUuid?: string | null;
  deviceName?: string | null;
  cameraId: number;
  cameraUuid?: string | null;
  cameraName?: string | null;
  streamUrl?: string | null;
  streamExternalId?: string | null;
  enabled?: boolean | null;
};

export type VmsExistingCameraLookupResponse = {
  items: VmsExistingCamera[];
  foundCount?: number | null;
  shouldCreateNewCamera?: boolean | null;
  message?: string | null;
};

export type VmsCameraImportPayload = {
  cameraId: number;
  recordingServerId?: number | null;
  name?: string | null;
  location?: string | null;
  unitId?: string | null;
  residentVisible?: boolean;
  residentVisibleUnitIds?: string[];
  accessGroupIds?: string[];
};
