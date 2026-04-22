export type DeviceStatus = 'ONLINE' | 'OFFLINE';

export type DeviceType = 'CAMERA' | 'IA_FACES' | 'CAMERA_IA' | 'FACIAL_DEVICE';

export type DeviceUsageType = 'ENTRY' | 'EXIT' | 'MONITORING' | 'PASSAGE';

export type DeviceRemoteAccessTargetType = 'DOOR' | 'SECBOX';

export type DeviceRemoteAccessConfig = {
  targetType: DeviceRemoteAccessTargetType;
  doorNumber?: number | null;
  secboxId?: string | null;
  portalId?: number | null;
  reason?: number;
  residentEnabled?: boolean;
};

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  vendor?: string | null;
  model?: string | null;
  externalId?: string | null;
  externalUuid?: string | null;
  host?: string | null;
  aiPort?: number | null;
  webPort?: number | null;
  username?: string | null;
  streamUrl?: string | null;
  snapshotUrl?: string | null;
  monitoringEnabled?: boolean;
  residentVisible?: boolean;
  remoteAccessConfig?: DeviceRemoteAccessConfig | null;
  cameraEnabled?: boolean;
  deviceUsageType?: DeviceUsageType | null;
  minAuthorizedAge?: number | null;
  unitId?: string | null;
  cameraId?: string | null;
  cameraName?: string | null;
};

export type DevicePayload = {
  name: string;
  type: DeviceType;
  vendor?: string | null;
  model?: string | null;
  externalId?: string | null;
  externalUuid?: string | null;
  host?: string | null;
  aiPort?: number | null;
  webPort?: number | null;
  username?: string | null;
  password?: string | null;
  streamUrl?: string | null;
  snapshotUrl?: string | null;
  monitoringEnabled?: boolean;
  residentVisible?: boolean;
  remoteAccessConfig?: DeviceRemoteAccessConfig | null;
  cameraEnabled?: boolean;
  deviceUsageType?: DeviceUsageType | null;
  minAuthorizedAge?: number | null;
  unitId?: string | null;
  status?: DeviceStatus;
};

export type DeviceControlResponse = {
  ok: boolean;
  vendor: string;
  operation: string;
  result?: Record<string, unknown>;
};

export type ControlIdConfigurePushPayload = {
  remoteAddress: string;
  requestTimeout?: number;
  requestPeriod?: number;
};

export type ControlIdConfigureMonitorPayload = {
  hostname: string;
  port: number;
  path?: string;
  requestTimeout?: number;
};

export type ControlIdEnableOnlinePayload = {
  serverId: number;
  serverAddress: string;
  serverName?: string;
  publicKey?: string | null;
  destroyExistingServerId?: number | null;
  localIdentification?: boolean;
  extractTemplate?: boolean;
  maxRequestAttempts?: number;
};

export type ControlIdRemoteOpenPayload = {
  doorNumber?: number | null;
  secboxId?: string | null;
  portalId?: number | null;
  reason?: number;
};
