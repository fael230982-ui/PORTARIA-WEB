import type { Alert, AlertCameraEvidence, AlertSeverity, AlertStatus, AlertType, AlertsListResponse } from '@/types/alert';
import { env } from '@/lib/env';

type AlertApiShape = Partial<Alert> & {
  alertId?: string | null;
  alertType?: string | null;
  alertStatus?: string | null;
  severity?: string | null;
  camera_id?: string | null;
  person_id?: string | null;
  photo_url?: string | null;
  snapshot_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  replay_url?: string | null;
  replayCreateUrl?: string | null;
  replay_create_url?: string | null;
  cameras?: unknown;
  read_at?: string | null;
  workflow?: Alert['workflow'] | null;
};

type AlertListApiShape = {
  data?: AlertApiShape[];
  meta?: AlertsListResponse['meta'];
};

type RealTimeAlertPayload = Partial<Alert> & {
  message?: string;
  eventType?: string | null;
  alertType?: string | null;
  alertStatus?: string | null;
  severity?: string | null;
  camera_id?: string | null;
  person_id?: string | null;
  photo_url?: string | null;
  snapshot_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  replay_url?: string | null;
  replayCreateUrl?: string | null;
  replay_create_url?: string | null;
  cameras?: unknown;
  read_at?: string | null;
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeAssetUrl(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized;
  }

  if (normalized.startsWith('/api/proxy/')) {
    return normalized;
  }

  if (normalized.startsWith('/api/v1/')) {
    return normalized.replace(/^\/api\/v1/i, '/api/proxy');
  }

  const proxyablePathPattern = /\/(media|uploads|files|storage)\//i;
  if (/^wss?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      if (proxyablePathPattern.test(url.pathname)) {
        return `/api/proxy${url.pathname}${url.search}`;
      }
    } catch {
      return normalized;
    }

    return normalized;
  }

  const absolutePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  if (proxyablePathPattern.test(absolutePath)) {
    return `/api/proxy${absolutePath}`;
  }

  const baseOrigin = env.apiBaseUrl.replace(/\/api\/v1$/i, '');
  return `${baseOrigin}${absolutePath}`;
}

function normalizeReplayUrl(value: unknown, payload?: unknown) {
  const direct = normalizeString(value);
  if (direct) return direct;
  if (!payload || typeof payload !== 'object') return null;
  const replay = (payload as { replayUrl?: unknown; replay_url?: unknown }).replayUrl
    ?? (payload as { replayUrl?: unknown; replay_url?: unknown }).replay_url;
  return normalizeString(replay);
}

function normalizeAlertCameraEvidence(value: unknown): AlertCameraEvidence[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): AlertCameraEvidence | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;

      return {
        id: normalizeString(record.id),
        cameraId: normalizeString(record.cameraId) ?? normalizeString(record.camera_id) ?? normalizeString(record.id),
        cameraName: normalizeString(record.cameraName) ?? normalizeString(record.camera_name),
        name: normalizeString(record.name),
        label: normalizeString(record.label),
        snapshotUrl: normalizeAssetUrl(record.snapshotUrl) ?? normalizeAssetUrl(record.snapshot_url),
        imageUrl: normalizeAssetUrl(record.imageUrl) ?? normalizeAssetUrl(record.image_url),
        thumbnailUrl: normalizeAssetUrl(record.thumbnailUrl) ?? normalizeAssetUrl(record.thumbnail_url),
        liveUrl: normalizeAssetUrl(record.liveUrl) ?? normalizeAssetUrl(record.live_url),
        hlsUrl: normalizeAssetUrl(record.hlsUrl) ?? normalizeAssetUrl(record.hls_url),
        preferredLiveUrl: normalizeAssetUrl(record.preferredLiveUrl) ?? normalizeAssetUrl(record.preferred_live_url),
        replayUrl: normalizeReplayUrl(record.replayUrl ?? record.replay_url ?? record.url),
        replayCreateUrl: normalizeAssetUrl(record.replayCreateUrl) ?? normalizeAssetUrl(record.replay_create_url),
      };
    })
    .filter((item): item is AlertCameraEvidence => Boolean(item));
}

function normalizeAlertType(value: unknown): AlertType {
  const normalized = String(value ?? '').toUpperCase();

  switch (normalized) {
    case 'WARNING':
    case 'DANGER':
    case 'PANIC':
    case 'UNKNOWN_PERSON':
    case 'CAMERA_OFFLINE':
    case 'ACCESS_DENIED':
      return normalized;
    default:
      return 'INFO';
  }
}

function normalizeAlertSeverity(value: unknown, fallbackType: AlertType): AlertSeverity {
  const normalized = String(value ?? '').toUpperCase();

  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'CRITICAL';
  if (normalized === 'WARNING' || normalized === 'MEDIUM') return 'WARNING';
  if (normalized === 'INFO' || normalized === 'LOW') return 'INFO';

  if (fallbackType === 'PANIC' || fallbackType === 'DANGER') return 'CRITICAL';
  if (fallbackType === 'WARNING' || fallbackType === 'ACCESS_DENIED' || fallbackType === 'CAMERA_OFFLINE') return 'WARNING';
  return 'INFO';
}

function normalizeAlertStatus(value: unknown): AlertStatus {
  const normalized = String(value ?? '').toUpperCase();
  return normalized === 'READ' || normalized === 'RESOLVED' ? 'READ' : 'UNREAD';
}

export function normalizeAlert(raw: AlertApiShape): Alert {
  const type = normalizeAlertType(raw.type ?? raw.alertType);

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    alertId: normalizeString(raw.alertId),
    title: String(raw.title ?? 'Alerta'),
    description: normalizeString(raw.description),
    type,
    status: normalizeAlertStatus(raw.status ?? raw.alertStatus ?? (raw.readAt ?? raw.read_at ? 'READ' : 'UNREAD')),
    severity: normalizeAlertSeverity(raw.severity, type),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    cameraId: normalizeString(raw.cameraId) ?? normalizeString(raw.camera_id),
    personId: normalizeString(raw.personId) ?? normalizeString(raw.person_id),
    photoUrl: normalizeAssetUrl(raw.photoUrl) ?? normalizeAssetUrl(raw.photo_url),
    snapshotUrl: normalizeAssetUrl(raw.snapshotUrl) ?? normalizeAssetUrl(raw.snapshot_url),
    thumbnailUrl: normalizeAssetUrl(raw.thumbnailUrl) ?? normalizeAssetUrl(raw.thumbnail_url),
    imageUrl: normalizeAssetUrl(raw.imageUrl) ?? normalizeAssetUrl(raw.image_url),
    replayUrl: normalizeReplayUrl(raw.replayUrl ?? raw.replay_url, raw.payload),
    replayCreateUrl: normalizeAssetUrl(raw.replayCreateUrl) ?? normalizeAssetUrl(raw.replay_create_url),
    cameras: normalizeAlertCameraEvidence(raw.cameras),
    location: normalizeString(raw.location),
    readAt: normalizeString(raw.readAt) ?? normalizeString(raw.read_at),
    workflow: raw.workflow ?? null,
    payload: raw.payload ?? null,
  };
}

export function normalizeAlertsListResponse(data: AlertsListResponse | AlertListApiShape) {
  return {
    ...data,
    data: Array.isArray(data.data) ? data.data.map((alert) => normalizeAlert(alert)) : [],
  };
}

export function normalizeRealtimeAlert(payload: RealTimeAlertPayload): Alert {
  return normalizeAlert({
    id: payload.id,
    alertId: payload.alertId,
    title: payload.title ?? payload.message ?? 'Alerta',
    description: payload.description ?? null,
    type: payload.type ?? 'INFO',
    alertType: payload.alertType ?? payload.eventType ?? null,
    status: payload.status ?? 'UNREAD',
    alertStatus: payload.alertStatus ?? null,
    severity: payload.severity ?? null,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    cameraId: payload.cameraId,
    camera_id: payload.camera_id,
    personId: payload.personId,
    person_id: payload.person_id,
    photoUrl: payload.photoUrl,
    photo_url: payload.photo_url,
    snapshotUrl: payload.snapshotUrl,
    snapshot_url: payload.snapshot_url,
    thumbnailUrl: payload.thumbnailUrl,
    thumbnail_url: payload.thumbnail_url,
    imageUrl: payload.imageUrl,
    image_url: payload.image_url,
    replayUrl: payload.replayUrl,
    replay_url: payload.replay_url,
    replayCreateUrl: payload.replayCreateUrl,
    replay_create_url: payload.replay_create_url,
    cameras: payload.cameras,
    location: payload.location,
    readAt: payload.readAt,
    read_at: payload.read_at,
    payload: payload.payload ?? null,
  });
}

export function getAlertEvidenceUrl(alert?: Pick<Alert, 'snapshotUrl' | 'imageUrl' | 'thumbnailUrl' | 'photoUrl' | 'payload' | 'cameras'> | null) {
  if (!alert) return null;
  const firstCameraEvidence = alert.cameras?.find((camera) => camera.snapshotUrl || camera.imageUrl || camera.thumbnailUrl);
  const payload = alert.payload && typeof alert.payload === 'object'
    ? alert.payload as {
        snapshotUrl?: unknown;
        snapshot_url?: unknown;
        imageUrl?: unknown;
        image_url?: unknown;
        thumbnailUrl?: unknown;
        thumbnail_url?: unknown;
        photoUrl?: unknown;
        photo_url?: unknown;
      }
    : null;

  return (
    alert.snapshotUrl ||
    alert.imageUrl ||
    alert.thumbnailUrl ||
    alert.photoUrl ||
    firstCameraEvidence?.snapshotUrl ||
    firstCameraEvidence?.imageUrl ||
    firstCameraEvidence?.thumbnailUrl ||
    normalizeAssetUrl(payload?.snapshotUrl) ||
    normalizeAssetUrl(payload?.snapshot_url) ||
    normalizeAssetUrl(payload?.imageUrl) ||
    normalizeAssetUrl(payload?.image_url) ||
    normalizeAssetUrl(payload?.thumbnailUrl) ||
    normalizeAssetUrl(payload?.thumbnail_url) ||
    normalizeAssetUrl(payload?.photoUrl) ||
    normalizeAssetUrl(payload?.photo_url) ||
    null
  );
}

export function getAlertReplayUrl(alert?: Pick<Alert, 'replayUrl' | 'payload' | 'cameras'> | null) {
  if (!alert) return null;
  return normalizeReplayUrl(alert.replayUrl, alert.payload) || alert.cameras?.find((camera) => camera.replayUrl)?.replayUrl || null;
}

export function getAlertEvidenceLabel(alert?: Pick<Alert, 'snapshotUrl' | 'imageUrl' | 'thumbnailUrl' | 'photoUrl'> | null) {
  if (!alert) return 'Sem evidencia';
  if (alert.snapshotUrl) return 'snapshot';
  if (alert.imageUrl) return 'imagem';
  if (alert.thumbnailUrl) return 'thumbnail';
  if (alert.photoUrl) return 'foto';
  return 'Sem evidencia';
}

export function getAlertTone(type: AlertType) {
  switch (type) {
    case 'PANIC':
    case 'DANGER':
      return 'border-red-500/20 bg-red-500/15 text-red-300';
    case 'WARNING':
    case 'ACCESS_DENIED':
    case 'CAMERA_OFFLINE':
      return 'border-amber-500/20 bg-amber-500/15 text-amber-300';
    case 'UNKNOWN_PERSON':
      return 'border-orange-500/20 bg-orange-500/15 text-orange-300';
    default:
      return 'border-sky-500/20 bg-sky-500/15 text-sky-300';
  }
}

export function getAlertTypeLabel(type: AlertType | string) {
  switch (type) {
    case 'WARNING':
      return 'Atenção';
    case 'DANGER':
      return 'Risco';
    case 'PANIC':
      return 'Pânico';
    case 'UNKNOWN_PERSON':
      return 'Pessoa não identificada';
    case 'CAMERA_OFFLINE':
      return 'Câmera offline';
    case 'ACCESS_DENIED':
      return 'Acesso negado';
    case 'INFO':
    default:
      return 'Informação';
  }
}

export function getAlertStatusLabel(status: AlertStatus | string) {
  return status === 'READ' ? 'Resolvido' : 'Novo';
}

export function getAlertStatusClass(status: AlertStatus | string) {
  return status === 'READ'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
    : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
}
