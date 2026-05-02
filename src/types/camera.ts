export type CameraStatus = 'ONLINE' | 'OFFLINE';
export type CameraDeviceType = 'CAMERA' | 'IA_FACES' | 'CAMERA_IA' | 'FACIAL_DEVICE';
export type CameraDeviceUsageType = 'ENTRY' | 'EXIT' | 'MONITORING' | 'PASSAGE';

export type Camera = {
  id: string;
  name: string;
  location?: string | null;
  deviceType?: CameraDeviceType | null;
  deviceUsageType?: CameraDeviceUsageType | null;
  provider?: string | null;
  transport?: string | null;
  streamUrl?: string | null;
  snapshotUrl?: string | null;
  thumbnailUrl?: string | null;
  imageStreamUrl?: string | null;
  liveUrl?: string | null;
  hlsUrl?: string | null;
  preferredLiveUrl?: string | null;
  webRtcUrl?: string | null;
  vmsStreamingUrl?: string | null;
  cameraUuid?: string | null;
  preferredStillUrl?: string | null;
  mediaAuthType?: string | null;
  mediaExpirationSupported?: boolean;
  streamExternalId?: string | null;
  vmsDeviceId?: number | null;
  vmsDeviceItemId?: number | null;
  vmsRecordingServerId?: number | null;
  vmsServerId?: string | null;
  vmsServerName?: string | null;
  status: CameraStatus;
  lastSeen?: string | null;
  engineStreamId?: number | null;
  engineStreamUuid?: string | null;
  faceAnalyticsId?: number | null;
  faceEngineServerId?: string | null;
  faceEngineServerName?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  condominiumId?: string | null;
  personId?: string | null;
  deviceId?: string | null;
  accessGroupIds?: string[];
  accessGroupNames?: string[];
  residentVisibleUnitIds?: string[];
  residentDisplayOrder?: number | null;
  residentMainSuggested?: boolean;
  residentCameraGroupId?: string | null;
  residentCameraGroupName?: string | null;
  residentCameraGroupOrder?: number | null;
  visibilityScope?: string | null;
  streaming?: Record<string, unknown> | null;
  vmsProvisioning?: Record<string, unknown> | null;
  gatewayProvisioning?: Record<string, unknown> | null;
};

export type CamerasListResponse = {
  data: Camera[];
  meta?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};

export type CameraStreamingResponse = {
  provider: string;
  transport: string;
  mediaRoute?: 'internal' | 'external' | string | null;
  snapshotUrl: string;
  thumbnailUrl?: string | null;
  frameUrl?: string | null;
  previewUrl?: string | null;
  imageStreamUrl: string;
  mjpegUrl?: string | null;
  preferredLiveUrl?: string | null;
  liveUrl?: string | null;
  hlsUrl?: string | null;
  webRtcUrl?: string | null;
  gatewayPath?: string | null;
  vmsStreamingUrl?: string | null;
  vmsStreamingUrls?: {
    internal?: string | null;
    external?: string | null;
  } | null;
  vmsSnapshotUrls?: {
    internal?: string | null;
    external?: string | null;
  } | null;
  vmsBaseUrls?: {
    internal?: string | null;
    external?: string | null;
  } | null;
  cameraUuid?: string | null;
  streams?: object[];
};

export type CameraReplayCreateRequest = {
  eventTime: string;
  secondsBefore?: number;
  secondsAfter?: number;
};

export type CameraReplayResponse = {
  id: string;
  cameraId: string;
  provider: string;
  vendor?: string | null;
  status: string;
  eventTime: string;
  startTime: string;
  endTime: string;
  secondsBefore: number;
  secondsAfter: number;
  replayUrl?: string | null;
  mediaAuthType?: string | null;
  mediaExpirationSupported?: boolean;
  errorMessage?: string | null;
};

export type CameraCreateRequest = {
  name: string;
  deviceType?: CameraDeviceType;
  deviceUsageType?: CameraDeviceUsageType | null;
  minAuthorizedAge?: number | null;
  residentVisible?: boolean | null;
  monitoringEnabled?: boolean | null;
  vmsCameraId?: string | null;
  streamExternalId?: string | null;
  vmsDeviceId?: number | null;
  vmsDeviceItemId?: number | null;
  vmsRecordingServerId?: number | null;
  vmsServerId?: string | null;
  location?: string | null;
  eventIntegrationVendor?: string | null;
  eventIntegrationModel?: string | null;
  eventExternalId?: string | null;
  eventHost?: string | null;
  eventAiPort?: number | null;
  eventWebPort?: number | null;
  eventUsername?: string | null;
  eventPassword?: string | null;
  streamSourceType?: string | null;
  streamUrl?: string | null;
  snapshotUrl?: string | null;
  faceEngineServerId?: string | null;
  status?: CameraStatus;
  unitId?: string | null;
  personId?: string | null;
  accessGroupIds?: string[];
  residentDisplayOrder?: number | null;
  residentMainSuggested?: boolean | null;
  residentCameraGroupId?: string | null;
};

export type CameraUpdateRequest = Partial<CameraCreateRequest>;
