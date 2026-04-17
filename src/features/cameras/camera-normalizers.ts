import type {
  Camera,
  CameraStatus,
  CameraStreamingResponse,
  CamerasListResponse,
} from '@/types/camera';

type CameraApiShape = Partial<Camera> & {
  stream_url?: string | null;
  snapshot_url?: string | null;
  thumbnail_url?: string | null;
  image_stream_url?: string | null;
  live_url?: string | null;
  hls_url?: string | null;
  web_rtc_url?: string | null;
  vms_streaming_url?: string | null;
  engine_stream_id?: number | null;
  engine_stream_uuid?: string | null;
  face_analytics_id?: number | null;
  last_seen?: string | null;
};

type CameraStreamingApiShape = Partial<CameraStreamingResponse> & {
  image_stream_url?: string;
  snapshot_url?: string;
  thumbnail_url?: string | null;
  frame_url?: string | null;
  preview_url?: string | null;
  mjpeg_url?: string | null;
  live_url?: string | null;
  hls_url?: string | null;
  web_rtc_url?: string | null;
  gateway_path?: string | null;
  vms_streaming_url?: string | null;
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStatus(value: unknown): CameraStatus {
  return String(value ?? '').toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
}

export function normalizeCamera(raw: CameraApiShape): Camera {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Camera sem nome'),
    location: normalizeString(raw.location),
    deviceType: normalizeString(raw.deviceType) as Camera['deviceType'],
    deviceUsageType: normalizeString(raw.deviceUsageType) as Camera['deviceUsageType'],
    provider: normalizeString(raw.provider),
    transport: normalizeString(raw.transport),
    status: normalizeStatus(raw.status),
    streamUrl: normalizeString(raw.streamUrl) ?? normalizeString(raw.stream_url),
    snapshotUrl: normalizeString(raw.snapshotUrl) ?? normalizeString(raw.snapshot_url),
    thumbnailUrl: normalizeString(raw.thumbnailUrl) ?? normalizeString(raw.thumbnail_url),
    imageStreamUrl: normalizeString(raw.imageStreamUrl) ?? normalizeString(raw.image_stream_url),
    liveUrl: normalizeString(raw.liveUrl) ?? normalizeString(raw.live_url),
    hlsUrl: normalizeString(raw.hlsUrl) ?? normalizeString(raw.hls_url),
    webRtcUrl: normalizeString(raw.webRtcUrl) ?? normalizeString(raw.web_rtc_url),
    vmsStreamingUrl: normalizeString(raw.vmsStreamingUrl) ?? normalizeString(raw.vms_streaming_url),
    lastSeen: normalizeString(raw.lastSeen) ?? normalizeString(raw.last_seen),
    engineStreamId: raw.engineStreamId ?? raw.engine_stream_id ?? null,
    engineStreamUuid: normalizeString(raw.engineStreamUuid) ?? normalizeString(raw.engine_stream_uuid),
    faceAnalyticsId: raw.faceAnalyticsId ?? raw.face_analytics_id ?? null,
    unitId: normalizeString(raw.unitId),
    personId: normalizeString(raw.personId),
  };
}

export function normalizeCamerasListResponse(data: Camera[] | CameraApiShape[] | CamerasListResponse) {
  if (Array.isArray(data)) {
    return {
      data: data.map((camera) => normalizeCamera(camera)),
    };
  }

  return {
    ...data,
    data: Array.isArray(data.data) ? data.data.map((camera) => normalizeCamera(camera)) : [],
  };
}

export function normalizeCameraStreamingResponse(
  raw: CameraStreamingResponse | CameraStreamingApiShape
): CameraStreamingResponse {
  const legacyRaw = raw as CameraStreamingApiShape;

  return {
    provider: String(raw.provider ?? 'UNKNOWN'),
    transport: String(raw.transport ?? 'UNKNOWN'),
    snapshotUrl: String(raw.snapshotUrl ?? legacyRaw.snapshot_url ?? raw.previewUrl ?? legacyRaw.preview_url ?? ''),
    thumbnailUrl: normalizeString(raw.thumbnailUrl) ?? normalizeString(legacyRaw.thumbnail_url),
    frameUrl: normalizeString(raw.frameUrl) ?? normalizeString(legacyRaw.frame_url),
    previewUrl: normalizeString(raw.previewUrl) ?? normalizeString(legacyRaw.preview_url),
    imageStreamUrl: String(
      raw.imageStreamUrl ?? legacyRaw.image_stream_url ?? raw.mjpegUrl ?? legacyRaw.mjpeg_url ?? raw.frameUrl ?? legacyRaw.frame_url ?? ''
    ),
    mjpegUrl: normalizeString(raw.mjpegUrl) ?? normalizeString(legacyRaw.mjpeg_url),
    liveUrl: normalizeString(raw.liveUrl) ?? normalizeString(legacyRaw.live_url),
    hlsUrl: normalizeString(raw.hlsUrl) ?? normalizeString(legacyRaw.hls_url),
    webRtcUrl: normalizeString(raw.webRtcUrl) ?? normalizeString(legacyRaw.web_rtc_url),
    gatewayPath: normalizeString(raw.gatewayPath) ?? normalizeString(legacyRaw.gateway_path),
    vmsStreamingUrl: normalizeString(raw.vmsStreamingUrl) ?? normalizeString(legacyRaw.vms_streaming_url),
    cameraUuid: normalizeString(raw.cameraUuid),
    streams: Array.isArray(raw.streams) ? raw.streams : [],
  };
}
