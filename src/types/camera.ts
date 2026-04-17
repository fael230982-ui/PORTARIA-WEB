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
  webRtcUrl?: string | null;
  vmsStreamingUrl?: string | null;
  status: CameraStatus;
  lastSeen?: string | null;
  engineStreamId?: number | null;
  engineStreamUuid?: string | null;
  faceAnalyticsId?: number | null;
  unitId?: string | null;
  personId?: string | null;
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
  snapshotUrl: string;
  thumbnailUrl?: string | null;
  frameUrl?: string | null;
  previewUrl?: string | null;
  imageStreamUrl: string;
  mjpegUrl?: string | null;
  liveUrl?: string | null;
  hlsUrl?: string | null;
  webRtcUrl?: string | null;
  gatewayPath?: string | null;
  vmsStreamingUrl?: string | null;
  cameraUuid?: string | null;
  streams?: object[];
};

export type CameraCreateRequest = {
  name: string;
  deviceType?: CameraDeviceType;
  deviceUsageType?: CameraDeviceUsageType | null;
  minAuthorizedAge?: number | null;
  residentVisible?: boolean | null;
  monitoringEnabled?: boolean | null;
  vmsCameraId?: string | null;
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
  status?: CameraStatus;
  unitId?: string | null;
  personId?: string | null;
  accessGroupIds?: string[];
};

export type CameraUpdateRequest = Partial<CameraCreateRequest>;
