import type {
  Camera,
  CameraStatus,
  CameraStreamingResponse,
  CamerasListResponse,
} from '@/types/camera';
import { resolveCameraMediaUrl } from '@/features/cameras/camera-media';

type CameraApiShape = Partial<Camera> & {
  stream_url?: string | null;
  snapshot_url?: string | null;
  thumbnail_url?: string | null;
  image_stream_url?: string | null;
  live_url?: string | null;
  hls_url?: string | null;
  web_rtc_url?: string | null;
  vms_streaming_url?: string | null;
  camera_uuid?: string | null;
  preferred_still_url?: string | null;
  preferred_live_url?: string | null;
  media_auth_type?: string | null;
  media_expiration_supported?: boolean | null;
  stream_external_id?: string | null;
  vms_device_id?: number | null;
  vms_device_item_id?: number | null;
  vms_recording_server_id?: number | null;
  vms_server_id?: string | null;
  vms_server_name?: string | null;
  engine_stream_id?: number | null;
  engine_stream_uuid?: string | null;
  face_analytics_id?: number | null;
  face_engine_server_id?: string | null;
  face_engine_server_name?: string | null;
  unit_name?: string | null;
  condominium_id?: string | null;
  device_id?: string | null;
  access_group_ids?: string[] | null;
  access_group_names?: string[] | null;
  resident_visible_unit_ids?: string[] | null;
  visibility_scope?: string | null;
  last_seen?: string | null;
};

type CameraStreamingApiShape = Partial<CameraStreamingResponse> & {
  media_route?: string | null;
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
  vms_streaming_urls?: CameraStreamingResponse['vmsStreamingUrls'];
  vms_snapshot_urls?: CameraStreamingResponse['vmsSnapshotUrls'];
  vms_base_urls?: CameraStreamingResponse['vmsBaseUrls'];
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStatus(value: unknown): CameraStatus {
  return String(value ?? '').toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter((item): item is string => Boolean(item))
    : [];
}

export function normalizeCamera(raw: CameraApiShape): Camera {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Câmera sem nome'),
    location: normalizeString(raw.location),
    deviceType: normalizeString(raw.deviceType) as Camera['deviceType'],
    deviceUsageType: normalizeString(raw.deviceUsageType) as Camera['deviceUsageType'],
    provider: normalizeString(raw.provider),
    transport: normalizeString(raw.transport),
    status: normalizeStatus(raw.status),
    streamUrl: resolveCameraMediaUrl(normalizeString(raw.streamUrl) ?? normalizeString(raw.stream_url)),
    snapshotUrl: resolveCameraMediaUrl(normalizeString(raw.snapshotUrl) ?? normalizeString(raw.snapshot_url)),
    thumbnailUrl: resolveCameraMediaUrl(normalizeString(raw.thumbnailUrl) ?? normalizeString(raw.thumbnail_url)),
    imageStreamUrl: resolveCameraMediaUrl(normalizeString(raw.imageStreamUrl) ?? normalizeString(raw.image_stream_url)),
    liveUrl: resolveCameraMediaUrl(normalizeString(raw.liveUrl) ?? normalizeString(raw.live_url)),
    hlsUrl: resolveCameraMediaUrl(normalizeString(raw.hlsUrl) ?? normalizeString(raw.hls_url)),
    webRtcUrl: resolveCameraMediaUrl(normalizeString(raw.webRtcUrl) ?? normalizeString(raw.web_rtc_url)),
    vmsStreamingUrl: normalizeString(raw.vmsStreamingUrl) ?? normalizeString(raw.vms_streaming_url),
    cameraUuid: normalizeString(raw.cameraUuid) ?? normalizeString(raw.camera_uuid),
    preferredStillUrl: resolveCameraMediaUrl(normalizeString(raw.preferredStillUrl) ?? normalizeString(raw.preferred_still_url)),
    preferredLiveUrl: resolveCameraMediaUrl(normalizeString(raw.preferredLiveUrl) ?? normalizeString(raw.preferred_live_url)),
    mediaAuthType: normalizeString(raw.mediaAuthType) ?? normalizeString(raw.media_auth_type),
    mediaExpirationSupported: Boolean(raw.mediaExpirationSupported ?? raw.media_expiration_supported ?? false),
    streamExternalId: normalizeString(raw.streamExternalId) ?? normalizeString(raw.stream_external_id),
    vmsDeviceId: raw.vmsDeviceId ?? raw.vms_device_id ?? null,
    vmsDeviceItemId: raw.vmsDeviceItemId ?? raw.vms_device_item_id ?? null,
    vmsRecordingServerId: raw.vmsRecordingServerId ?? raw.vms_recording_server_id ?? null,
    vmsServerId: normalizeString(raw.vmsServerId) ?? normalizeString(raw.vms_server_id),
    vmsServerName: normalizeString(raw.vmsServerName) ?? normalizeString(raw.vms_server_name),
    lastSeen: normalizeString(raw.lastSeen) ?? normalizeString(raw.last_seen),
    engineStreamId: raw.engineStreamId ?? raw.engine_stream_id ?? null,
    engineStreamUuid: normalizeString(raw.engineStreamUuid) ?? normalizeString(raw.engine_stream_uuid),
    faceAnalyticsId: raw.faceAnalyticsId ?? raw.face_analytics_id ?? null,
    faceEngineServerId: normalizeString(raw.faceEngineServerId) ?? normalizeString(raw.face_engine_server_id),
    faceEngineServerName: normalizeString(raw.faceEngineServerName) ?? normalizeString(raw.face_engine_server_name),
    unitId: normalizeString(raw.unitId),
    unitName: normalizeString(raw.unitName) ?? normalizeString(raw.unit_name),
    condominiumId: normalizeString(raw.condominiumId) ?? normalizeString(raw.condominium_id),
    personId: normalizeString(raw.personId),
    deviceId: normalizeString(raw.deviceId) ?? normalizeString(raw.device_id),
    accessGroupIds: normalizeStringArray(raw.accessGroupIds ?? raw.access_group_ids),
    accessGroupNames: normalizeStringArray(raw.accessGroupNames ?? raw.access_group_names),
    residentVisibleUnitIds: normalizeStringArray(raw.residentVisibleUnitIds ?? raw.resident_visible_unit_ids),
    visibilityScope: normalizeString(raw.visibilityScope) ?? normalizeString(raw.visibility_scope),
    streaming: raw.streaming && typeof raw.streaming === 'object' ? raw.streaming as Record<string, unknown> : null,
    vmsProvisioning: raw.vmsProvisioning && typeof raw.vmsProvisioning === 'object' ? raw.vmsProvisioning as Record<string, unknown> : null,
    gatewayProvisioning: raw.gatewayProvisioning && typeof raw.gatewayProvisioning === 'object' ? raw.gatewayProvisioning as Record<string, unknown> : null,
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
    mediaRoute: normalizeString(raw.mediaRoute) ?? normalizeString(legacyRaw.media_route),
    snapshotUrl: resolveCameraMediaUrl(raw.snapshotUrl ?? legacyRaw.snapshot_url ?? raw.previewUrl ?? legacyRaw.preview_url) ?? '',
    thumbnailUrl: resolveCameraMediaUrl(normalizeString(raw.thumbnailUrl) ?? normalizeString(legacyRaw.thumbnail_url)),
    frameUrl: resolveCameraMediaUrl(normalizeString(raw.frameUrl) ?? normalizeString(legacyRaw.frame_url)),
    previewUrl: resolveCameraMediaUrl(normalizeString(raw.previewUrl) ?? normalizeString(legacyRaw.preview_url)),
    imageStreamUrl:
      resolveCameraMediaUrl(
        raw.imageStreamUrl ?? legacyRaw.image_stream_url ?? raw.mjpegUrl ?? legacyRaw.mjpeg_url ?? raw.frameUrl ?? legacyRaw.frame_url
      ) ?? '',
    mjpegUrl: resolveCameraMediaUrl(normalizeString(raw.mjpegUrl) ?? normalizeString(legacyRaw.mjpeg_url)),
    liveUrl: resolveCameraMediaUrl(normalizeString(raw.liveUrl) ?? normalizeString(legacyRaw.live_url)),
    hlsUrl: resolveCameraMediaUrl(normalizeString(raw.hlsUrl) ?? normalizeString(legacyRaw.hls_url)),
    webRtcUrl: resolveCameraMediaUrl(normalizeString(raw.webRtcUrl) ?? normalizeString(legacyRaw.web_rtc_url)),
    gatewayPath: normalizeString(raw.gatewayPath) ?? normalizeString(legacyRaw.gateway_path),
    vmsStreamingUrl: normalizeString(raw.vmsStreamingUrl) ?? normalizeString(legacyRaw.vms_streaming_url),
    vmsStreamingUrls: raw.vmsStreamingUrls ?? legacyRaw.vms_streaming_urls ?? null,
    vmsSnapshotUrls: raw.vmsSnapshotUrls ?? legacyRaw.vms_snapshot_urls ?? null,
    vmsBaseUrls: raw.vmsBaseUrls ?? legacyRaw.vms_base_urls ?? null,
    cameraUuid: normalizeString(raw.cameraUuid),
    streams: Array.isArray(raw.streams) ? raw.streams : [],
  };
}
