'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cctv,
  RefreshCw,
  Plus,
  Search,
  Eye,
  Radio,
  ScanFace,
  Filter,
  MapPin,
  Link as LinkIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useCameras } from '@/hooks/use-cameras';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { camerasService } from '@/services/cameras.service';
import { faceEngineServersService } from '@/services/face-engine-servers.service';
import { jobsService } from '@/services/jobs.service';
import { vmsServersService } from '@/services/vms-servers.service';
import { CrudModal } from '@/components/admin/CrudModal';
import { CameraFeed } from '@/components/camera-feed';
import { CameraPlayer } from '@/components/operacao/camera-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getCameraDiagnostics } from '@/features/cameras/camera-media';
import { compareCameraProfiles, normalizeCameraProfile, uniqueSortedCameraProfiles } from '@/features/cameras/camera-profiles';
import { TimedAlert } from '@/components/ui/timed-alert';
import { useAuthStore } from '@/store/auth.store';
import type {
  Camera as CameraRecord,
  CameraCreateRequest,
  CameraDeviceType,
  CameraDeviceUsageType,
  CameraStatus,
} from '@/types/camera';
import type { FaceEngineServer } from '@/types/face-engine-server';
import type { BackgroundJob } from '@/types/job';
import type { VmsExistingCamera, VmsExistingCameraLookupResponse, VmsServer } from '@/types/vms-server';

type Filters = {
  search: string;
  status: string;
  media: 'all' | 'with-preview' | 'without-preview' | 'rtsp-only';
  profile: string;
};

type CameraFormData = {
  name: string;
  location: string;
  deviceType: CameraDeviceType;
  deviceUsageType: '' | CameraDeviceUsageType;
  streamUrl: string;
  snapshotUrl: string;
  engineStreamId: string;
  engineStreamUuid: string;
  faceAnalyticsId: string;
  faceEngineServerId: string;
  vmsServerId: string;
  vmsExistingCameraId: string;
  streamExternalId: string;
  vmsDeviceId: string;
  vmsDeviceItemId: string;
  vmsRecordingServerId: string;
  status: CameraStatus;
  unitId: string;
};

const initialForm: CameraFormData = {
  name: '',
  location: '',
  deviceType: 'CAMERA',
  deviceUsageType: '',
  streamUrl: '',
  snapshotUrl: '',
  engineStreamId: '',
  engineStreamUuid: '',
  faceAnalyticsId: '',
  faceEngineServerId: '',
  vmsServerId: '',
  vmsExistingCameraId: '',
  streamExternalId: '',
  vmsDeviceId: '',
  vmsDeviceItemId: '',
  vmsRecordingServerId: '',
  status: 'OFFLINE',
  unitId: '',
};

const DEVICE_TYPE_OPTIONS: Array<{ value: CameraDeviceType; label: string }> = [
  { value: 'CAMERA', label: 'Câmera comum' },
  { value: 'CAMERA_IA', label: 'Câmera IA' },
  { value: 'FACIAL_DEVICE', label: 'Dispositivo Facial' },
];

const DEVICE_USAGE_OPTIONS: Array<{ value: CameraDeviceUsageType; label: string }> = [
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'EXIT', label: 'Saída' },
  { value: 'MONITORING', label: 'Monitoramento' },
  { value: 'PASSAGE', label: 'Passagem' },
];

const CAMERA_RTSP_JOB_STORAGE_KEY = 'admin-cameras-last-rtsp-job';
const CAMERAS_SNAPSHOT_STORAGE_KEY = 'admin-cameras-snapshot';
const CAMERAS_LOCAL_DRAFTS_STORAGE_KEY = 'admin-cameras-local-drafts';
const VMS_SERVERS_STORAGE_KEY = 'admin-vms-servers-snapshot';
const CAMERA_PROFILE_OPTIONS_STORAGE_KEY = 'admin-camera-profile-options';

type LocalCameraSyncState = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

type LocalCameraDraft = CameraRecord & {
  localOnly: true;
  localSyncState: LocalCameraSyncState;
  localJobId?: string | null;
  localCreatedAt: string;
};

function getJobStatusLabel(status: string) {
  if (status === 'PENDING') return 'Processando fila';
  if (status === 'RUNNING') return 'Em processamento';
  if (status === 'SUCCEEDED') return 'Concluído';
  if (status === 'FAILED') return 'Falhou';
  return status;
}

function getJobStatusClass(status: string) {
  if (status === 'SUCCEEDED') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  if (status === 'FAILED') return 'border-red-500/30 bg-red-500/10 text-red-100';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-100';
}

function isLocalCameraDraft(camera: CameraRecord | LocalCameraDraft): camera is LocalCameraDraft {
  return 'localOnly' in camera && camera.localOnly === true;
}

function supportsDeviceUsageType(deviceType: CameraDeviceType) {
  return deviceType === 'CAMERA_IA' || deviceType === 'FACIAL_DEVICE';
}

function normalizeString(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function statusBadgeClass(status: CameraStatus) {
  return status === 'ONLINE'
    ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20'
    : 'bg-red-500/15 text-red-300 hover:bg-red-500/20';
}

function getCameraStatusLabel(status: CameraStatus | string) {
  return normalizeString(status) === 'online' ? 'Online' : 'Offline';
}

function getCameraDeviceTypeLabel(deviceType: CameraDeviceType | string | null | undefined) {
  if (deviceType === 'CAMERA_IA') return 'Câmera IA';
  if (deviceType === 'FACIAL_DEVICE') return 'Dispositivo Facial';
  return 'Câmera comum';
}

function getCameraDeviceUsageLabel(deviceUsageType: CameraDeviceUsageType | string | null | undefined) {
  if (deviceUsageType === 'ENTRY') return 'Entrada';
  if (deviceUsageType === 'EXIT') return 'Saída';
  if (deviceUsageType === 'MONITORING') return 'Monitoramento';
  if (deviceUsageType === 'PASSAGE') return 'Passagem';
  return 'Não configurado';
}

function getCameraUnitLabel(
  camera: Pick<CameraRecord, 'unitId' | 'unitName'>,
  units: Array<{ id: string; label: string; location: string }>
) {
  if (!camera.unitId) return 'Área comum do condomínio';

  return camera.unitName?.trim() || units.find((unit) => unit.id === camera.unitId)?.location || 'Unidade não identificada';
}

function compareCameraRecords(left: CameraRecord, right: CameraRecord) {
  return (
    String(left.name ?? '').localeCompare(String(right.name ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' }) ||
    String(left.location ?? '').localeCompare(String(right.location ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' }) ||
    String(left.id ?? '').localeCompare(String(right.id ?? ''), 'pt-BR')
  );
}

function buildLocalCameraDraft(form: CameraFormData, job?: BackgroundJob | null): LocalCameraDraft {
  const now = new Date().toISOString();

  return {
    id: `local-camera-${job?.id ?? crypto.randomUUID()}`,
    name: form.name.trim() || 'Câmera em processamento',
    location: form.location.trim() || null,
    deviceType: form.deviceType,
    deviceUsageType: supportsDeviceUsageType(form.deviceType) ? form.deviceUsageType || null : null,
    streamUrl: form.streamUrl.trim() || null,
    snapshotUrl: form.snapshotUrl.trim() || null,
    imageStreamUrl: null,
    thumbnailUrl: null,
    liveUrl: null,
    hlsUrl: null,
    webRtcUrl: null,
    vmsStreamingUrl: null,
    provider: null,
    transport: null,
    status: getAutomaticCameraStatusFromForm(form),
    lastSeen: null,
    engineStreamId: form.engineStreamId.trim() ? Number(form.engineStreamId) || null : null,
    engineStreamUuid: form.engineStreamUuid.trim() || null,
    faceAnalyticsId: form.faceAnalyticsId.trim() ? Number(form.faceAnalyticsId) || null : null,
    faceEngineServerId: form.faceEngineServerId.trim() || null,
    faceEngineServerName: null,
    streamExternalId: form.streamExternalId.trim() || null,
    vmsDeviceId: form.vmsDeviceId.trim() ? Number(form.vmsDeviceId) || null : null,
    vmsDeviceItemId: form.vmsDeviceItemId.trim() ? Number(form.vmsDeviceItemId) || null : null,
    vmsRecordingServerId: form.vmsRecordingServerId.trim() ? Number(form.vmsRecordingServerId) || null : null,
    vmsServerId: form.vmsServerId.trim() || null,
    unitId: form.unitId || null,
    personId: null,
    localOnly: true,
    localSyncState: (job?.status as LocalCameraSyncState | undefined) ?? 'PENDING',
    localJobId: job?.id ?? null,
    localCreatedAt: now,
  };
}

function cameraMatchesDraft(camera: CameraRecord, draft: LocalCameraDraft) {
  const sameUnit = (camera.unitId ?? null) === (draft.unitId ?? null);
  const sameName = normalizeString(camera.name) === normalizeString(draft.name);
  const sameStream = normalizeString(camera.streamUrl) === normalizeString(draft.streamUrl);
  const sameSnapshot = normalizeString(camera.snapshotUrl) === normalizeString(draft.snapshotUrl);
  const sameEngineStreamId =
    camera.engineStreamId != null &&
    draft.engineStreamId != null &&
    camera.engineStreamId === draft.engineStreamId;
  const sameFaceAnalyticsId =
    camera.faceAnalyticsId != null &&
    draft.faceAnalyticsId != null &&
    camera.faceAnalyticsId === draft.faceAnalyticsId;

  return (
    sameUnit &&
    (
      (sameName && sameStream) ||
      (sameName && sameSnapshot) ||
      (sameStream && sameSnapshot) ||
      sameEngineStreamId ||
      sameFaceAnalyticsId ||
      sameName
    )
  );
}

function isDraftExpired(draft: LocalCameraDraft) {
  const createdAt = new Date(draft.localCreatedAt).getTime();
  if (Number.isNaN(createdAt)) return false;
  const ageMs = Date.now() - createdAt;

  if (draft.localSyncState === 'FAILED') {
    return ageMs > 5 * 60 * 1000;
  }

  if (draft.localSyncState === 'SUCCEEDED') {
    return ageMs > 10 * 60 * 1000;
  }

  return false;
}

function shouldKeepLocalDraft(draft: LocalCameraDraft) {
  if (isDraftExpired(draft)) return false;

  if (draft.localSyncState === 'PENDING' || draft.localSyncState === 'RUNNING') {
    return true;
  }

  return false;
}

function isRtspStreamUrl(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase().startsWith('rtsp://');
}

function getAutomaticCameraStatus(
  camera: Pick<
    CameraRecord,
    'id' | 'name' | 'status' | 'streamUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'imageStreamUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'vmsStreamingUrl' | 'lastSeen'
  >
): CameraStatus {
  return getCameraDiagnostics(camera).previewReady ? 'ONLINE' : 'OFFLINE';
}

function getAutomaticCameraStatusFromForm(form: Pick<CameraFormData, 'streamUrl' | 'snapshotUrl'>): CameraStatus {
  const snapshotUrl = form.snapshotUrl.trim();
  const streamUrl = form.streamUrl.trim();

  if (snapshotUrl) return 'ONLINE';
  if (streamUrl && !isRtspStreamUrl(streamUrl)) return 'ONLINE';
  return 'OFFLINE';
}

function getDiagnosticBadgeClass(severity: 'ok' | 'warning' | 'error') {
  if (severity === 'ok') return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200';
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/15 text-amber-200';
  return 'border-red-500/30 bg-red-500/15 text-red-200';
}

function humanizeCameraBackendMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('streamurl inválida') && normalized.includes('porta ausente')) {
    return 'O VMS retornou a URL RTSP da câmera sem porta. O backend precisa normalizar essa URL, por exemplo usando a porta padrão 554, durante a importação da câmera existente.';
  }

  if (normalized.includes('cadastro direto de câmera foi desativado')) {
    return 'O backend não aceita mais cadastro direto de câmera VMS. Escolha uma câmera existente do servidor VMS para importar pelo fluxo oficial.';
  }

  if (
    normalized.includes('createcamerausecase.__init__') ||
    normalized.includes('device_repository') ||
    normalized.includes('device_projection_service')
  ) {
    return 'O servidor de câmeras está com uma configuração interna incompleta e não conseguiu concluir este cadastro.';
  }

  if (normalized.includes('deviceusagetype')) {
    return 'O uso do dispositivo só pode ser informado para Câmera IA e Dispositivo Facial.';
  }

  return message;
}

function getCameraErrorMessage(error: unknown, fallback: string) {
  const maybeApiError = error as {
    response?: {
      status?: number;
      data?: {
        detail?: unknown;
        message?: string;
      };
    };
    message?: string;
  };

  const status = maybeApiError.response?.status;
  const detail = maybeApiError.response?.data?.detail;
  const message = maybeApiError.response?.data?.message;

  if (Array.isArray(detail) && detail.length > 0) {
    const readableDetails = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return null;

        const path = Array.isArray((item as { loc?: unknown }).loc)
          ? ((item as { loc: unknown[] }).loc
              .filter((part) => typeof part === 'string' || typeof part === 'number')
              .join('.'))
          : null;
        const itemMessage =
          typeof (item as { msg?: unknown }).msg === 'string'
            ? (item as { msg: string }).msg
            : typeof (item as { message?: unknown }).message === 'string'
              ? (item as { message: string }).message
              : null;

        if (path && itemMessage) return `${path}: ${itemMessage}`;
        return itemMessage;
      })
      .filter(Boolean);

    if (readableDetails.length) {
      return readableDetails.join(' | ');
    }
  }

  if (typeof detail === 'string' && detail.trim()) return humanizeCameraBackendMessage(detail);
  if (typeof message === 'string' && message.trim()) return humanizeCameraBackendMessage(message);

  const normalizedFallbackMessage = `${String(detail ?? '')} ${String(message ?? '')}`.toLowerCase();
  if (normalizedFallbackMessage.includes('deviceusagetype')) {
    return 'O uso do dispositivo só pode ser informado para Câmera IA e Dispositivo Facial.';
  }

  if (status === 500) {
    return 'Ocorreu um erro interno ao cadastrar a câmera. Se a URL for RTSP, confirme se a visualização foi preparada para uso no navegador.';
  }

  if (status === 503) {
    return 'O servidor de câmeras está temporariamente indisponível. Aguarde alguns instantes e atualize a lista novamente.';
  }

  if (status === 502) {
    return 'O backend/VMS retornou falha ao processar esta operação de câmera. A alteração não foi confirmada; tente novamente ou solicite ao backend a verificação do log dessa câmera.';
  }

  if (status === 400) {
    return 'Os dados da câmera não foram aceitos. Verifique nome, unidade e URL informada.';
  }

  return maybeApiError.message && !maybeApiError.message.includes('Request failed with status code')
    ? humanizeCameraBackendMessage(maybeApiError.message)
    : fallback;
}

function toPlainHeaders(headers: unknown) {
  if (!headers || typeof headers !== 'object') return {};
  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)])
  );
}

function getCameraRequestUrl(path: string) {
  if (typeof window !== 'undefined') {
    return new URL(`/api/proxy${path}`, window.location.origin).toString();
  }

  return `/api/proxy${path}`;
}

function logCameraCreateDiagnostics(params: {
  mode: 'reaproveitar-camera-vms' | 'fallback-criar-camera-vms' | 'cadastro-camera';
  payload: CameraCreateRequest;
  requestPath?: string;
  importPayload?: unknown;
  vmsServerId: string | null;
  user: { email?: string | null; role?: string | null } | null;
  authorizationPreview: string | null;
  response?: { status?: number; data?: unknown; headers?: unknown };
  error?: unknown;
}) {
  const timestamp = new Date().toISOString();
  const requestUrl = getCameraRequestUrl(params.requestPath ?? '/cameras');
  const groupedTitle = `[camera-vms] ${params.mode} ${timestamp}`;
  const axiosError = params.error as {
    response?: { status?: number; data?: unknown; headers?: unknown };
    message?: string;
  } | null;

  const responseStatus = params.response?.status ?? axiosError?.response?.status ?? null;
  const responseBody = params.response?.data ?? axiosError?.response?.data ?? null;
  const responseHeaders = params.response?.headers ?? axiosError?.response?.headers ?? null;

  console.groupCollapsed(groupedTitle);
  console.info('Método', 'POST');
  console.info('URL completa', requestUrl);
  console.info('Horário exato', timestamp);
  console.info('Ambiente/host', typeof window !== 'undefined' ? window.location.origin : 'server');
  console.info('server_id usado', params.vmsServerId);
  console.info('Usuário logado', params.user);
  console.info('Token usado na chamada', params.authorizationPreview);
  console.info('Payload final enviado', params.payload);
  if (params.importPayload) {
    console.info('Payload de importação VMS enviado', params.importPayload);
  }
  console.info('Payload usa camelCase', true);
  console.info('deviceType enviado', params.payload.deviceType);
  console.info('Campos VMS enviados', {
    streamExternalId: params.payload.streamExternalId ?? null,
    vmsDeviceId: params.payload.vmsDeviceId ?? null,
    vmsDeviceItemId: params.payload.vmsDeviceItemId ?? null,
    vmsRecordingServerId: params.payload.vmsRecordingServerId ?? null,
    vmsServerId: params.payload.vmsServerId ?? null,
    streamUrl: params.payload.streamUrl ?? null,
    unitId: params.payload.unitId ?? null,
    condominiumId: (params.payload as CameraCreateRequest & { condominiumId?: string | null }).condominiumId ?? null,
  });
  console.info('Status HTTP retornado', responseStatus);
  console.info('Response body completo', responseBody);
  console.info('Response headers principais', toPlainHeaders(responseHeaders));
  if (axiosError?.message) {
    console.warn('Mensagem bruta do erro', axiosError.message);
  }
  console.groupEnd();
}

function buildVmsCameraImportPayload(payload: CameraCreateRequest) {
  return {
    cameraId: payload.vmsDeviceItemId as number,
    recordingServerId: payload.vmsRecordingServerId ?? null,
    name: payload.name ?? null,
    location: payload.location ?? null,
    unitId: payload.unitId ?? null,
    residentVisible: false,
  };
}

function cameraToFormData(camera: CameraRecord): CameraFormData {
  return {
    name: camera.name ?? '',
    location: camera.location ?? '',
    deviceType: camera.deviceType ?? 'CAMERA',
    deviceUsageType:
      camera.deviceUsageType && supportsDeviceUsageType(camera.deviceType ?? 'CAMERA')
        ? camera.deviceUsageType
        : '',
    streamUrl: camera.streamUrl ?? '',
    snapshotUrl: camera.snapshotUrl ?? '',
    engineStreamId: camera.engineStreamId != null ? String(camera.engineStreamId) : '',
    engineStreamUuid: camera.engineStreamUuid ?? '',
    faceAnalyticsId: camera.faceAnalyticsId != null ? String(camera.faceAnalyticsId) : '',
    faceEngineServerId: camera.faceEngineServerId ?? '',
    vmsServerId: camera.vmsServerId ?? '',
    vmsExistingCameraId: '',
    streamExternalId: camera.streamExternalId ?? '',
    vmsDeviceId: camera.vmsDeviceId != null ? String(camera.vmsDeviceId) : '',
    vmsDeviceItemId: camera.vmsDeviceItemId != null ? String(camera.vmsDeviceItemId) : '',
    vmsRecordingServerId: camera.vmsRecordingServerId != null ? String(camera.vmsRecordingServerId) : '',
    status: camera.status,
    unitId: camera.unitId ?? '',
  };
}

function buildCameraPayload(form: CameraFormData): CameraCreateRequest {
  const hasFaceServer = Boolean(form.faceEngineServerId.trim());
  const effectiveDeviceType: CameraDeviceType = hasFaceServer ? 'CAMERA' : form.deviceType;
  const payload: CameraCreateRequest = {
    name: form.name.trim(),
    deviceType: effectiveDeviceType,
    monitoringEnabled: true,
    residentVisible: !form.unitId,
    status: getAutomaticCameraStatusFromForm(form),
  };

  payload.deviceUsageType = hasFaceServer ? null : supportsDeviceUsageType(effectiveDeviceType) ? form.deviceUsageType || null : null;

  payload.location = normalizeCameraProfile(form.location) || null;
  payload.streamSourceType = form.streamUrl.trim() ? 'RTSP' : null;
  payload.streamUrl = form.streamUrl.trim() || null;
  payload.snapshotUrl = form.snapshotUrl.trim() || null;
  payload.eventExternalId = form.engineStreamId.trim() || null;
  payload.eventIntegrationVendor = form.engineStreamUuid.trim() || null;
  payload.eventIntegrationModel = form.faceAnalyticsId.trim() || null;
  payload.faceEngineServerId = form.faceEngineServerId.trim() || null;
  payload.streamExternalId = form.streamExternalId.trim() || null;
  payload.vmsDeviceId = form.vmsDeviceId.trim() ? Number(form.vmsDeviceId) || null : null;
  payload.vmsDeviceItemId = form.vmsDeviceItemId.trim() ? Number(form.vmsDeviceItemId) || null : null;
  payload.vmsRecordingServerId = form.vmsRecordingServerId.trim() ? Number(form.vmsRecordingServerId) || null : null;
  payload.vmsServerId = form.vmsServerId.trim() || null;
  payload.unitId = form.unitId || null;

  return payload;
}

function getUnitDisplayParts(unit: {
  condominium?: { name?: string | null } | null;
  structure?: { label?: string | null } | null;
  label?: string | null;
}) {
  return [
    unit.condominium?.name ?? null,
    unit.structure?.label ?? null,
    unit.label ?? null,
  ].filter((value): value is string => Boolean(String(value ?? '').trim()));
}

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className: string }>;
  hint: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-center text-2xl font-semibold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      </CardContent>
    </Card>
  );
}

function CameraForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  units,
  faceEngineServers,
  vmsServers,
  profileOptions,
  onAddProfile,
  requireUnit = false,
}: {
  initialData: Partial<CameraFormData>;
  onSubmit: (data: CameraFormData) => Promise<void> | void;
  onCancel: () => void;
  loading: boolean;
  units: Array<{ id: string; label: string; location: string }>;
  faceEngineServers: FaceEngineServer[];
  vmsServers: VmsServer[];
  profileOptions: string[];
  onAddProfile: (profile: string) => void;
  requireUnit: boolean;
}) {
  const [form, setForm] = useState<CameraFormData>({
    ...initialForm,
    ...initialData,
  });
  const usageTypeEnabled = supportsDeviceUsageType(form.deviceType);
  const [vmsExistingCameras, setVmsExistingCameras] = useState<VmsExistingCamera[]>([]);
  const [vmsLookupLoading, setVmsLookupLoading] = useState(false);
  const [vmsLookupMessage, setVmsLookupMessage] = useState<string | null>(null);
  const [vmsShouldCreateNewCamera, setVmsShouldCreateNewCamera] = useState(false);
  const [profileConfirmOpen, setProfileConfirmOpen] = useState(false);
  const normalizedProfile = normalizeCameraProfile(form.location);
  const matchedProfile = profileOptions.find((profile) => normalizeString(profile) === normalizeString(normalizedProfile)) ?? null;
  const filteredProfileOptions = profileOptions
    .filter((profile) => !normalizedProfile || normalizeString(profile).includes(normalizeString(normalizedProfile)))
    .slice(0, 8);
  const canAddProfile = Boolean(normalizedProfile) && !matchedProfile;

  useEffect(() => {
    if (!form.vmsServerId.trim()) {
      setVmsExistingCameras([]);
      setVmsLookupMessage(null);
      setVmsShouldCreateNewCamera(false);
      return;
    }

    let active = true;
    setVmsLookupLoading(true);
    void vmsServersService
      .listExistingCameras(form.vmsServerId.trim())
      .then((result: VmsExistingCameraLookupResponse) => {
        if (!active) return;
        setVmsExistingCameras(result.items);
        setVmsLookupMessage(result.message ?? null);
        setVmsShouldCreateNewCamera(Boolean(result.shouldCreateNewCamera));
      })
      .catch(() => {
        if (!active) return;
        setVmsExistingCameras([]);
        setVmsLookupMessage('Não foi possível consultar as câmeras desse servidor VMS agora.');
        setVmsShouldCreateNewCamera(false);
      })
      .finally(() => {
        if (active) {
          setVmsLookupLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [form.vmsServerId]);

  const setField = (field: keyof CameraFormData, value: string) => {
    setForm((prev) => {
      if (field === 'deviceType') {
        const nextDeviceType = value as CameraDeviceType;
        return {
          ...prev,
          deviceType: nextDeviceType,
          deviceUsageType: supportsDeviceUsageType(nextDeviceType) ? prev.deviceUsageType : '',
        };
      }

      if (field === 'vmsServerId') {
        return {
          ...prev,
          vmsServerId: value,
          vmsExistingCameraId: '',
          streamExternalId: '',
          vmsDeviceId: '',
          vmsDeviceItemId: '',
          vmsRecordingServerId: '',
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleExistingVmsCameraSelect = (cameraId: string) => {
    const selectedCamera = vmsExistingCameras.find((item) => String(item.cameraId) === cameraId);

    setForm((prev) => {
      if (!selectedCamera) {
        return {
          ...prev,
          vmsExistingCameraId: '',
          streamExternalId: '',
          vmsDeviceId: '',
          vmsDeviceItemId: '',
          vmsRecordingServerId: '',
        };
      }

      return {
        ...prev,
        vmsExistingCameraId: cameraId,
        name: selectedCamera.cameraName?.trim() || prev.name,
        streamUrl: selectedCamera.streamUrl?.trim() || prev.streamUrl,
        streamExternalId: selectedCamera.streamExternalId?.trim() || selectedCamera.cameraUuid?.trim() || '',
        vmsDeviceId: String(selectedCamera.deviceId),
        vmsDeviceItemId: String(selectedCamera.cameraId),
        vmsRecordingServerId: String(selectedCamera.recordingServerId),
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  const handleConfirmProfile = () => {
    if (!normalizedProfile) return;
    onAddProfile(normalizedProfile);
    setField('location', normalizedProfile);
    setProfileConfirmOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
        Para cadastrar, normalmente basta preencher <span className="font-medium text-white">nome, servidor VMS, stream e unidade</span>.
        Os demais campos são opcionais e ficam em configurações avançadas.
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Nome</span>
          <input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Portaria principal"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Perfil / local</span>
          <input
            value={form.location}
            onChange={(e) => setField('location', e.target.value)}
            onBlur={() => {
              if (matchedProfile) {
                setField('location', matchedProfile);
              } else if (normalizedProfile) {
                setField('location', normalizedProfile);
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Acessos, Elevadores, Área comum, Halls, Lazer"
          />
          {filteredProfileOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredProfileOptions.map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => {
                    setField('location', profile);
                    setProfileConfirmOpen(false);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    normalizeString(profile) === normalizeString(normalizedProfile)
                      ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-50'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {profile}
                </button>
              ))}
            </div>
          ) : null}
          {canAddProfile ? (
            <button
              type="button"
              onClick={() => setProfileConfirmOpen(true)}
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-400/15"
            >
              Adicionar "{normalizedProfile}" como novo perfil
            </button>
          ) : null}
          {profileConfirmOpen && canAddProfile ? (
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-sm text-cyan-50">
              <p className="font-medium">Adicionar "{normalizedProfile}" como novo perfil?</p>
              <p className="mt-1 text-xs text-cyan-100/75">
                Depois ele aparecerá como filtro para novas câmeras e para visualização por perfil.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleConfirmProfile}
                  className="rounded-xl bg-cyan-100 px-3 py-2 text-xs font-semibold text-cyan-950 transition hover:bg-white"
                >
                  Adicionar perfil
                </button>
                <button
                  type="button"
                  onClick={() => setProfileConfirmOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">
            Use este campo para agrupar câmeras por perfil de visualização. Ex.: ACESSOS, ELEVADORES, HALLS, LAZER.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Servidor VMS (obrigatório)</span>
          <select
            value={form.vmsServerId}
            onChange={(e) => setField('vmsServerId', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            required
          >
            <option value="">Selecione um servidor VMS</option>
            {vmsServers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Selecione primeiro o servidor VMS. Esse campo é obrigatório para salvar a câmera. Se ele devolver câmeras, você poderá reaproveitar uma já existente.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Câmera existente no VMS</span>
          <select
            value={form.vmsExistingCameraId}
            onChange={(e) => handleExistingVmsCameraSelect(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!form.vmsServerId.trim() || vmsLookupLoading}
          >
            <option value="">
              {!form.vmsServerId.trim()
                ? 'Selecione primeiro um servidor VMS'
                : vmsLookupLoading
                  ? 'Consultando câmeras do VMS...'
                  : vmsExistingCameras.length
                    ? 'Escolha uma câmera já existente'
                    : vmsShouldCreateNewCamera
                      ? 'Nenhuma câmera encontrada. Cadastre uma câmera nova.'
                      : 'Nenhuma câmera retornada pelo VMS'}
            </option>
            {vmsExistingCameras.map((camera) => (
              <option key={`${camera.deviceId}-${camera.cameraId}`} value={String(camera.cameraId)}>
                {[camera.recordingServerName, camera.deviceName, camera.cameraName].filter(Boolean).join(' / ')}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {vmsLookupMessage ||
              'Se não houver câmera existente, preencha o stream e salve a câmera nova vinculada a este servidor VMS.'}
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">URL RTSP / Stream</span>
          <input
            value={form.streamUrl}
            onChange={(e) => setField('streamUrl', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="rtsp://usuario:senha@ip:554/..."
          />
          <p className="text-xs text-slate-500">
            RTSP pode ser salvo aqui, mas o navegador não reproduz RTSP diretamente. Para visualização na tela de operação, use uma fonte compatível com navegador.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Servidor facial</span>
          <select
            value={form.faceEngineServerId}
            onChange={(e) => setField('faceEngineServerId', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="">Sem vínculo com motor facial</option>
            {faceEngineServers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Para reconhecimento facial, cadastre primeiro o servidor facial e depois vincule a câmera aqui. Nesse caso, a câmera será salva como câmera comum do VMS e provisionada no servidor facial.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Face Analytics ID</span>
          <input
            value={form.faceAnalyticsId}
            onChange={(e) => setField('faceAnalyticsId', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="ID numerico"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-slate-300">Unidade vinculada</span>
          <select
            value={form.unitId}
            onChange={(e) => setField('unitId', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            required={requireUnit}
          >
            <option value="">{requireUnit ? 'Selecione uma unidade' : 'Sem unidade específica'}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.location}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {requireUnit
              ? units.length > 0
                ? 'Para admin de condomínio, a câmera deve ficar vinculada a uma unidade do próprio condomínio.'
                : 'As unidades do condomínio não carregaram agora. A tela está usando as unidades liberadas na sua sessão.'
              : 'Se a câmera for de área comum, deixe sem unidade. Assim ela poderá ficar disponível para visualização geral do condomínio.'}
          </p>
        </label>
      </div>

      <details className="rounded-2xl border border-white/10 bg-slate-900/50">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white">
          Configurações avançadas da câmera
        </summary>
        <div className="grid gap-5 border-t border-white/10 px-4 py-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Tipo do dispositivo</span>
            <select
              value={form.deviceType}
              onChange={(e) => setField('deviceType', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            >
              {DEVICE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Uso do dispositivo</span>
            <select
              value={form.deviceUsageType}
              onChange={(e) => setField('deviceUsageType', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!usageTypeEnabled}
            >
              <option value="">{usageTypeEnabled ? 'Selecione o uso' : 'Não se aplica a câmera comum'}</option>
              {DEVICE_USAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Snapshot URL</span>
            <input
              value={form.snapshotUrl}
              onChange={(e) => setField('snapshotUrl', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="https://..."
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">ID externo do stream</span>
            <input
              value={form.streamExternalId}
              onChange={(e) => setField('streamExternalId', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="camera-uuid-21"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">VMS Device ID</span>
            <input
              value={form.vmsDeviceId}
              onChange={(e) => setField('vmsDeviceId', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="10"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">VMS Camera ID</span>
            <input
              value={form.vmsDeviceItemId}
              onChange={(e) => setField('vmsDeviceItemId', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="21"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">VMS Recording Server ID</span>
            <input
              value={form.vmsRecordingServerId}
              onChange={(e) => setField('vmsRecordingServerId', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="1"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Engine Stream ID</span>
            <input
              value={form.engineStreamId}
              onChange={(e) => setField('engineStreamId', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="ID numerico"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Engine Stream UUID</span>
            <input
              value={form.engineStreamUuid}
              onChange={(e) => setField('engineStreamUuid', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="UUID do stream"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Face Analytics ID</span>
            <input
              value={form.faceAnalyticsId}
              onChange={(e) => setField('faceAnalyticsId', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="ID numerico"
            />
          </label>
        </div>
      </details>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Salvar câmera'}
        </button>
      </div>
    </form>
  );
}

export default function AdminCamerasPage() {
  const router = useRouter();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'MASTER', 'OPERADOR', 'CENTRAL'],
  });
  const [activeUnitId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('unitId') ?? '';
  });
  const { data: camerasData, isLoading, error, refetch } = useCameras({
    unitId: activeUnitId || undefined,
    enabled: Boolean(user),
  });
  const { units } = useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    media: 'all',
    profile: '',
  });
  const [showFilters, setShowFilters] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openProfiles, setOpenProfiles] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSearch, setProfileSearch] = useState('');
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editingProfileValue, setEditingProfileValue] = useState('');
  const [cameraProfileOverrides, setCameraProfileOverrides] = useState<Record<string, string>>({});
  const [faceEngineServers, setFaceEngineServers] = useState<FaceEngineServer[]>([]);
  const [vmsServers, setVmsServers] = useState<VmsServer[]>([]);
  const [pendingRtspJob, setPendingRtspJob] = useState<BackgroundJob | null>(null);
  const [lastRtspJob, setLastRtspJob] = useState<BackgroundJob | null>(null);
  const [snapshotCameras, setSnapshotCameras] = useState<CameraRecord[]>([]);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(null);
  const [localDraftCameras, setLocalDraftCameras] = useState<LocalCameraDraft[]>([]);
  const [hideLoadErrorAlert, setHideLoadErrorAlert] = useState(false);
  const [customCameraProfiles, setCustomCameraProfiles] = useState<string[]>([]);
  const [cameraProfilesLoaded, setCameraProfilesLoaded] = useState(false);

  useEffect(() => {
    setHideLoadErrorAlert(false);
  }, [error]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(VMS_SERVERS_STORAGE_KEY);
      const cached = raw ? (JSON.parse(raw) as VmsServer[]) : [];
      if (Array.isArray(cached) && cached.length > 0) {
        setVmsServers(cached);
      }
    } catch {
      // Ignore invalid VMS cache.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(CAMERA_PROFILE_OPTIONS_STORAGE_KEY);
      const cached = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(cached)) {
        setCustomCameraProfiles(uniqueSortedCameraProfiles(cached));
      }
    } catch {
      // Ignore invalid local cache for camera profiles.
    } finally {
      setCameraProfilesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!cameraProfilesLoaded) return;
    if (typeof window === 'undefined') return;

    if (customCameraProfiles.length === 0) {
      window.localStorage.removeItem(CAMERA_PROFILE_OPTIONS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(CAMERA_PROFILE_OPTIONS_STORAGE_KEY, JSON.stringify(customCameraProfiles));
  }, [cameraProfilesLoaded, customCameraProfiles]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(CAMERA_RTSP_JOB_STORAGE_KEY);
      if (!raw) return;

      const job = JSON.parse(raw) as BackgroundJob;
      if (!job?.id) return;

      setLastRtspJob(job);
      if (job.status === 'PENDING' || job.status === 'RUNNING') {
        setPendingRtspJob(job);
      }
    } catch {
      // Ignore invalid local cache for RTSP jobs.
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;
    void faceEngineServersService
      .list()
      .then((servers) => {
        if (active) {
          setFaceEngineServers(servers);
        }
      })
      .catch(() => {
        if (active) {
          setFaceEngineServers([]);
        }
      });

    void vmsServersService
      .list()
      .then((servers) => {
        if (active) {
          setVmsServers(servers);
        }
      })
      .catch(() => {
        if (active) {
          try {
            const raw = window.localStorage.getItem(VMS_SERVERS_STORAGE_KEY);
            const cached = raw ? (JSON.parse(raw) as VmsServer[]) : [];
            setVmsServers(Array.isArray(cached) ? cached : []);
          } catch {
            setVmsServers([]);
          }
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function refreshVmsServers() {
    try {
      const servers = await vmsServersService.list();
      setVmsServers(servers);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(VMS_SERVERS_STORAGE_KEY, JSON.stringify(servers));
      }
    } catch {
      // Keep current list when refresh fails.
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(CAMERAS_LOCAL_DRAFTS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as LocalCameraDraft[];
      setLocalDraftCameras(Array.isArray(parsed) ? parsed.filter((draft) => shouldKeepLocalDraft(draft)) : []);
    } catch {
      setLocalDraftCameras([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(CAMERAS_SNAPSHOT_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        data?: CameraRecord[];
        updatedAt?: string;
      };

      setSnapshotCameras(Array.isArray(parsed.data) ? parsed.data : []);
      setSnapshotUpdatedAt(typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null);
    } catch {
      setSnapshotCameras([]);
      setSnapshotUpdatedAt(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (lastRtspJob?.id) {
        window.localStorage.setItem(CAMERA_RTSP_JOB_STORAGE_KEY, JSON.stringify(lastRtspJob));
      } else {
        window.localStorage.removeItem(CAMERA_RTSP_JOB_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures and keep page flow.
    }
  }, [lastRtspJob]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (localDraftCameras.length > 0) {
        window.localStorage.setItem(CAMERAS_LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(localDraftCameras));
      } else {
        window.localStorage.removeItem(CAMERAS_LOCAL_DRAFTS_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures and keep page flow.
    }
  }, [localDraftCameras]);

  const cameras = useMemo(() => camerasData?.data ?? [], [camerasData]);
  const usingSnapshot = Boolean(error && snapshotCameras.length > 0);
  const visibleCameras = useMemo(() => {
    const baseCameras = usingSnapshot ? snapshotCameras : cameras;
    const unmatchedDrafts = localDraftCameras.filter(
      (draft) => !baseCameras.some((camera) => cameraMatchesDraft(camera, draft))
    );

    return [...unmatchedDrafts, ...baseCameras].map((camera) =>
      cameraProfileOverrides[camera.id]
        ? {
            ...camera,
            location: cameraProfileOverrides[camera.id],
          }
        : camera
    );
  }, [cameraProfileOverrides, cameras, localDraftCameras, snapshotCameras, usingSnapshot]);
  const isAdminScope = user?.role === 'ADMIN';
  const accessibleUnits = useMemo(() => {
    if (!isAdminScope) {
      return units;
    }

    return units.filter((unit) => unit.condominiumId === user?.condominiumId);
  }, [isAdminScope, units, user?.condominiumId]);
  const accessibleUnitIds = useMemo(
    () => new Set(accessibleUnits.map((unit) => unit.id)),
    [accessibleUnits]
  );
  const fallbackUnitOptions = useMemo(() => {
    const ids = user?.unitIds ?? [];
    const names = user?.unitNames ?? [];

    return ids
      .map((id, index) => {
        const label = names[index]?.trim() || `Unidade ${index + 1}`;
        return {
          id,
          label,
          location: label,
        };
      })
      .filter((unit) => Boolean(unit.id));
  }, [user?.unitIds, user?.unitNames]);
  const unitOptions = useMemo(
    () =>
      accessibleUnits.length > 0
        ? accessibleUnits.map((unit) => ({
            id: unit.id,
            label: getUnitDisplayParts(unit).join(' / ') || unit.label || 'Unidade sem identificação',
            location: getUnitDisplayParts(unit).join(' / ') || unit.label || 'Unidade sem identificação',
          }))
        : fallbackUnitOptions,
    [accessibleUnits, fallbackUnitOptions]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || cameras.length === 0) return;

    const payload = {
      data: cameras,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(CAMERAS_SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
    setSnapshotCameras(cameras);
    setSnapshotUpdatedAt(payload.updatedAt);
  }, [cameras]);

  useEffect(() => {
    if (cameras.length === 0) return;

    setCameraProfileOverrides((current) => {
      const next = { ...current };
      let changed = false;

      cameras.forEach((camera) => {
        const override = next[camera.id];
        if (override && normalizeString(camera.location) === normalizeString(override)) {
          delete next[camera.id];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [cameras]);

  useEffect(() => {
    if (!pendingRtspJob?.id) return;

    let cancelled = false;

    const pollJob = async () => {
      try {
        const nextJob = await jobsService.findById(pendingRtspJob.id);
        if (cancelled) return;

        setPendingRtspJob(nextJob);
        setLastRtspJob(nextJob);
        setLocalDraftCameras((current) =>
          current.map((draft) =>
            draft.localJobId === nextJob.id
              ? {
                  ...draft,
                  localSyncState: nextJob.status as LocalCameraSyncState,
                }
              : draft
          )
        );

        if (nextJob.status === 'SUCCEEDED') {
          setActionMessage('Câmera RTSP processada com sucesso e lista atualizada.');
          setPendingRtspJob(null);
          await refetch();
          return;
        }

        if (nextJob.status === 'FAILED') {
          setSubmitError(
            nextJob.errorMessage
              ? humanizeCameraBackendMessage(nextJob.errorMessage)
              : 'O processamento da câmera não foi concluído.'
          );
          setPendingRtspJob(null);
          return;
        }

        window.setTimeout(() => {
          void pollJob();
        }, 4000);
      } catch {
        if (cancelled) return;

        window.setTimeout(() => {
          void pollJob();
        }, 5000);
      }
    };

    void pollJob();

    return () => {
      cancelled = true;
    };
  }, [pendingRtspJob?.id, refetch]);
  const activeUnitLabel = activeUnitId ? unitOptions.find((unit) => unit.id === activeUnitId)?.label ?? 'Unidade filtrada' : '';

  useEffect(() => {
    if (!activeUnitId || unitOptions.length === 0) return;
    const unit = unitOptions.find((item) => item.id === activeUnitId);
    if (!unit) return;
    setFilters((current) => ({
      ...current,
      search: current.search || unit.label,
    }));
  }, [activeUnitId, unitOptions]);

  useEffect(() => {
    if (cameras.length === 0 || localDraftCameras.length === 0) return;

    setLocalDraftCameras((current) =>
      current.filter((draft) => shouldKeepLocalDraft(draft) && !cameras.some((camera) => cameraMatchesDraft(camera, draft)))
    );
  }, [cameras, localDraftCameras.length]);

  const filteredCameras = useMemo(() => {
    const search = normalizeString(filters.search);
    const status = normalizeString(filters.status);
    const profile = normalizeString(filters.profile);

    return visibleCameras.filter((camera) => {
      const automaticStatus = getAutomaticCameraStatus(camera);
      const scopeOk =
        (!isAdminScope || !camera.unitId || accessibleUnitIds.has(camera.unitId)) &&
        (!activeUnitId || camera.unitId === activeUnitId);
      const statusOk = status === 'all' || normalizeString(automaticStatus) === status;
      const hasPreview = Boolean(camera.snapshotUrl || camera.imageStreamUrl);
      const isRtspOnly = isRtspStreamUrl(camera.streamUrl) && !hasPreview;
      const mediaOk =
        filters.media === 'all' ||
        (filters.media === 'with-preview' && hasPreview) ||
        (filters.media === 'without-preview' && !hasPreview) ||
        (filters.media === 'rtsp-only' && isRtspOnly);
      const profileOk = !profile || normalizeString(camera.location) === profile;
      const searchOk =
        !search ||
        [camera.name, camera.location, camera.streamUrl, camera.snapshotUrl, getCameraUnitLabel(camera, unitOptions)]
          .filter(Boolean)
          .some((value) => normalizeString(value).includes(search));

      return scopeOk && statusOk && mediaOk && profileOk && searchOk;
    }).sort(compareCameraRecords);
  }, [accessibleUnitIds, activeUnitId, filters, isAdminScope, unitOptions, visibleCameras]);

  const profileOptions = useMemo(() => {
    return uniqueSortedCameraProfiles([
      ...customCameraProfiles,
      ...visibleCameras.map((camera) => normalizeCameraProfile(camera.location)),
    ]);
  }, [customCameraProfiles, visibleCameras]);
  const filteredProfileOptions = useMemo(() => {
    const search = normalizeString(profileSearch);
    if (!search) return profileOptions;
    return profileOptions.filter((profile) => normalizeString(profile).includes(search));
  }, [profileOptions, profileSearch]);

  const handleAddCameraProfile = (profile: string) => {
    const normalized = normalizeCameraProfile(profile);
    if (!normalized) return;

    setCustomCameraProfiles((current) =>
      uniqueSortedCameraProfiles([...current.map(normalizeCameraProfile), normalized])
    );
  };

  const profileUsage = useMemo(() => {
    const usage = new Map<string, number>();
    visibleCameras.forEach((camera) => {
      const profile = normalizeCameraProfile(camera.location);
      if (!profile) return;
      usage.set(profile, (usage.get(profile) ?? 0) + 1);
    });
    return usage;
  }, [visibleCameras]);

  const beginEditProfile = (profile: string) => {
    setProfileError(null);
    setEditingProfile(profile);
    setEditingProfileValue(profile);
  };

  const cancelEditProfile = () => {
    setEditingProfile(null);
    setEditingProfileValue('');
    setProfileError(null);
  };

  const handleRenameProfile = async () => {
    if (!editingProfile) return;

    const nextProfile = normalizeCameraProfile(editingProfileValue);
    if (!nextProfile) {
      setProfileError('Informe um nome válido para o perfil.');
      return;
    }

    if (normalizeString(nextProfile) === normalizeString(editingProfile)) {
      cancelEditProfile();
      return;
    }

    const camerasToUpdate = visibleCameras.filter(
      (camera) => normalizeString(camera.location) === normalizeString(editingProfile) && !isLocalCameraDraft(camera)
    );

    setProfileSaving(true);
    setProfileError(null);

    try {
      await Promise.all(
        camerasToUpdate.map((camera) =>
          camerasService.update(camera.id, { location: nextProfile })
        )
      );

      setCameraProfileOverrides((current) => {
        const next = { ...current };
        camerasToUpdate.forEach((camera) => {
          next[camera.id] = nextProfile;
        });
        return next;
      });

      setCustomCameraProfiles((current) =>
        Array.from(
          new Set(current.map((profile) => (normalizeString(profile) === normalizeString(editingProfile) ? nextProfile : normalizeCameraProfile(profile))))
        ).sort(compareCameraProfiles)
      );
      setFilters((current) => ({
        ...current,
        profile: normalizeString(current.profile) === normalizeString(editingProfile) ? nextProfile : current.profile,
      }));
      cancelEditProfile();
      setActionMessage(`Perfil "${editingProfile}" atualizado para "${nextProfile}".`);
      await refetch();
    } catch (error) {
      setProfileError(getCameraErrorMessage(error, 'Não foi possível renomear o perfil agora.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteProfile = (profile: string) => {
    const normalized = normalizeCameraProfile(profile);
    const usedBy = profileUsage.get(normalized) ?? 0;
    if (usedBy > 0) {
      setProfileError(`O perfil "${normalized}" está em uso por ${usedBy} câmera(s). Renomeie ou mova essas câmeras antes de excluir.`);
      return;
    }

    setCustomCameraProfiles((current) => current.filter((item) => normalizeString(item) !== normalizeString(normalized)));
    setActionMessage(`Perfil "${normalized}" removido.`);
  };

  const stats = useMemo(() => {
    const total = filteredCameras.length;
    const online = filteredCameras.filter((camera) => getAutomaticCameraStatus(camera) === 'ONLINE').length;
    const offline = filteredCameras.filter((camera) => getAutomaticCameraStatus(camera) === 'OFFLINE').length;
    const withSnapshot = filteredCameras.filter((camera) => camera.snapshotUrl || camera.imageStreamUrl).length;
    const withoutPreview = filteredCameras.filter((camera) => !camera.snapshotUrl && !camera.imageStreamUrl).length;
    const rtspOnly = filteredCameras.filter((camera) => isRtspStreamUrl(camera.streamUrl) && !camera.snapshotUrl && !camera.imageStreamUrl).length;

    return { total, online, offline, withSnapshot, withoutPreview, rtspOnly };
  }, [filteredCameras]);
  const hasActiveFilters = Boolean(
    filters.search.trim() || filters.status !== 'all' || filters.media !== 'all' || filters.profile || activeUnitId
  );
  const hiddenByFiltersCount = Math.max(visibleCameras.length - filteredCameras.length, 0);

  async function handleCreateCamera(form: CameraFormData) {
    setSaving(true);
    setSubmitError(null);

    try {
      if (isAdminScope && form.unitId && !accessibleUnitIds.has(form.unitId)) {
        throw new Error('A unidade selecionada não pertence ao escopo do seu condomínio.');
      }

      if (!form.vmsServerId.trim()) {
        throw new Error('Selecione o servidor VMS antes de salvar a câmera.');
      }

      const payload = buildCameraPayload(form);
      const authState = useAuthStore.getState();
      const authorizationPreview = authState.token ? `${authState.token.slice(0, 12)}...` : null;
      const createMode: 'reaproveitar-camera-vms' | 'fallback-criar-camera-vms' | 'cadastro-camera' =
        payload.vmsServerId && payload.streamExternalId && payload.vmsDeviceId != null && payload.vmsDeviceItemId != null
          ? 'reaproveitar-camera-vms'
          : payload.vmsServerId
            ? 'fallback-criar-camera-vms'
            : 'cadastro-camera';

      const importPayload =
        createMode === 'reaproveitar-camera-vms' && payload.vmsServerId && payload.vmsDeviceItemId != null
          ? buildVmsCameraImportPayload(payload)
          : null;
      const createResponse =
        importPayload && payload.vmsServerId
          ? await vmsServersService.importExistingCameraDetailed(payload.vmsServerId, importPayload)
          : await camerasService.createDetailed(payload);
      const createdCamera = createResponse.camera;
      logCameraCreateDiagnostics({
        mode: createMode,
        payload,
        requestPath:
          importPayload && payload.vmsServerId
            ? `/integrations/vms/servers/${payload.vmsServerId}/cameras/import`
            : '/cameras',
        importPayload,
        vmsServerId: payload.vmsServerId ?? null,
        user: authState.user
          ? {
              email: authState.user.email,
              role: authState.user.role,
            }
          : null,
        authorizationPreview,
        response: {
          status: createResponse.status,
          data: createResponse.body,
          headers: createResponse.headers,
        },
      });
      if (!createdCamera.id) {
        throw new Error(
          'O cadastro foi aceito, mas a confirmação final da câmera não voltou para a tela.'
        );
      }

      if (form.faceEngineServerId.trim()) {
        await camerasService.provisionFaceServer(form.faceEngineServerId.trim(), createdCamera.id);
      }

      setOpenCreate(false);
      setActionMessage(
        form.faceEngineServerId.trim()
          ? 'Câmera criada e vinculada ao servidor facial.'
          : 'Câmera criada com status automático pela disponibilidade de preview.'
      );
      await refetch();
    } catch (createError) {
      const authState = useAuthStore.getState();
      logCameraCreateDiagnostics({
        mode:
          form.vmsServerId.trim() && form.streamExternalId.trim() && form.vmsDeviceId.trim() && form.vmsDeviceItemId.trim()
            ? 'reaproveitar-camera-vms'
            : form.vmsServerId.trim()
              ? 'fallback-criar-camera-vms'
              : 'cadastro-camera',
        payload: buildCameraPayload(form),
        requestPath:
          form.vmsServerId.trim() && form.streamExternalId.trim() && form.vmsDeviceId.trim() && form.vmsDeviceItemId.trim()
            ? `/integrations/vms/servers/${form.vmsServerId.trim()}/cameras/import`
            : '/cameras',
        importPayload:
          form.vmsServerId.trim() && form.streamExternalId.trim() && form.vmsDeviceId.trim() && form.vmsDeviceItemId.trim()
            ? buildVmsCameraImportPayload(buildCameraPayload(form))
            : null,
        vmsServerId: form.vmsServerId.trim() || null,
        user: authState.user
          ? {
              email: authState.user.email,
              role: authState.user.role,
            }
          : null,
        authorizationPreview: authState.token ? `${authState.token.slice(0, 12)}...` : null,
        error: createError,
      });
      setSubmitError(getCameraErrorMessage(createError, 'Não foi possível criar a câmera.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCamera(form: CameraFormData) {
    if (!selectedCamera) return;

    setSaving(true);
    setSubmitError(null);

    try {
      if (isAdminScope && form.unitId && !accessibleUnitIds.has(form.unitId)) {
        throw new Error('A unidade selecionada não pertence ao escopo do seu condomínio.');
      }

      if (!form.vmsServerId.trim()) {
        throw new Error('Selecione o servidor VMS antes de salvar a câmera.');
      }

      const payload = buildCameraPayload(form);
      const updatedCamera = await camerasService.update(selectedCamera.id, payload);

      if (form.faceEngineServerId.trim()) {
        await camerasService.provisionFaceServer(form.faceEngineServerId.trim(), updatedCamera.id);
      }

      setSelectedCamera(updatedCamera);
      setOpenEdit(false);
      setActionMessage(
        form.faceEngineServerId.trim()
          ? 'Câmera atualizada e vínculo facial provisionado.'
          : 'Câmera atualizada com status automático pela disponibilidade de preview.'
      );
      await refetch();
    } catch (updateError) {
      setSubmitError(
        getCameraErrorMessage(
          updateError,
          'Não foi possível editar a câmera agora. Tente novamente em instantes.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCamera(camera: CameraRecord) {
    if (isLocalCameraDraft(camera)) {
      setLocalDraftCameras((current) => current.filter((draft) => draft.id !== camera.id));
      if (selectedCamera?.id === camera.id) {
        setSelectedCamera(null);
      }
      setOpenEdit(false);
      setOpenView(false);
      setActionMessage('Cadastro pendente removido da tela.');
      return;
    }

    const confirmed = window.confirm(`Excluir a câmera "${camera.name}"? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setSaving(true);
    setSubmitError(null);

    try {
      await camerasService.remove(camera.id);

      if (selectedCamera?.id === camera.id) {
        setSelectedCamera(null);
      }

      setOpenEdit(false);
      setOpenView(false);
      setActionMessage('Câmera excluída com sucesso.');
      await refetch();
    } catch (deleteError) {
      setSubmitError(getCameraErrorMessage(deleteError, 'Não foi possível excluir a câmera.'));
    } finally {
      setSaving(false);
    }
  }

  async function captureCameraPhoto(camera: CameraRecord) {
    try {
      const response = await camerasService.capturePhoto(camera.id);
      setActionMessage(`Captura realizada com sucesso. Foto gerada em ${response.photoUrl}.`);
    } catch (captureError) {
      setActionMessage(
        getCameraErrorMessage(captureError, 'Não foi possível capturar foto da câmera.')
      );
    }
  }

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando câmeras...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Administração</p>
            <h1 className="mt-2 text-2xl font-semibold">Câmeras</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Cadastro e operação básica do parque de câmeras.
            </p>
            {isAdminScope ? (
              <p className="mt-2 text-sm text-slate-500">
                Você está vendo apenas câmeras vinculadas a unidades do seu condomínio.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setProfileError(null);
                setProfileSearch('');
                cancelEditProfile();
                setOpenProfiles(true);
              }}
              className="inline-flex items-center gap-2 border-cyan-400/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/15"
            >
              <Filter className="h-4 w-4" />
              Gerenciar perfis
            </Button>
            <Button
              onClick={() => {
                setSubmitError(null);
                void refreshVmsServers();
                setOpenCreate(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-950 hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              Nova câmera
            </Button>

            <Button
              variant="outline"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          O status de online/offline agora é automático e depende da disponibilidade real de preview da câmera no front.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={isLoading ? '...' : String(stats.total)} icon={Cctv} hint="Câmeras registradas" />
        <StatCard title="Online" value={isLoading ? '...' : String(stats.online)} icon={Radio} hint="Operando agora" />
        <StatCard title="Offline" value={isLoading ? '...' : String(stats.offline)} icon={Cctv} hint="Indisponíveis" />
        <StatCard title="Com preview" value={isLoading ? '...' : String(stats.withSnapshot)} icon={ScanFace} hint="Snapshot ou image stream" />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <button type="button" onClick={() => setFilters((current) => ({ ...current, media: current.media === 'without-preview' ? 'all' : 'without-preview' }))} className={`rounded-3xl border p-5 text-left transition ${filters.media === 'without-preview' ? 'border-amber-400/40 bg-amber-400/15 text-amber-50' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
          <p className="text-sm text-slate-300">Sem preview</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.withoutPreview}</p>
          <p className="mt-1 text-xs text-slate-400">Sem snapshotUrl ou imageStreamUrl.</p>
        </button>
        <button type="button" onClick={() => setFilters((current) => ({ ...current, media: current.media === 'rtsp-only' ? 'all' : 'rtsp-only' }))} className={`rounded-3xl border p-5 text-left transition ${filters.media === 'rtsp-only' ? 'border-red-400/40 bg-red-400/15 text-red-50' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
          <p className="text-sm text-slate-300">RTSP sem conversão</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.rtspOnly}</p>
          <p className="mt-1 text-xs text-slate-400">Precisa de snapshot, MJPEG, HLS ou WebRTC.</p>
        </button>
      </section>


      {activeUnitId ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-sm text-cyan-50 md:flex-row md:items-center md:justify-between">
          <span>Filtro ativo: {activeUnitLabel}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(activeUnitId)}`); }} className="rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-medium text-cyan-50 transition hover:bg-cyan-200/20">
              Abrir unidade
            </button>
            <button type="button" onClick={() => { router.push('/admin/cameras'); }} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15">
              Limpar filtro
            </button>
          </div>
        </div>
      ) : null}

      {showFilters ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Buscar por nome, localização, unidade, stream ou snapshot..."
                className="border-0 bg-transparent p-0 text-white shadow-none placeholder:text-slate-500 focus-visible:ring-0"
              />
            </label>
            <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full bg-transparent text-sm outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <select
                value={filters.media}
                onChange={(e) => setFilters((prev) => ({ ...prev, media: e.target.value as Filters['media'] }))}
                className="w-full bg-transparent text-sm outline-none"
              >
                <option value="all">Todos os previews</option>
                <option value="with-preview">Com preview</option>
                <option value="without-preview">Sem preview</option>
                <option value="rtsp-only">RTSP sem conversão</option>
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <select
                value={filters.profile}
                onChange={(e) => setFilters((prev) => ({ ...prev, profile: e.target.value }))}
                className="w-full bg-transparent text-sm outline-none"
              >
                <option value="">Todos os perfis</option>
                {profileOptions.map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setFilters({ search: '', status: 'all', media: 'all', profile: '' })} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
              Limpar filtros
            </button>
          </div>
        </section>
      ) : null}

      {actionMessage ? (
        <TimedAlert tone="info" onClose={() => setActionMessage(null)} className="rounded-3xl p-5">
          {actionMessage}
        </TimedAlert>
      ) : null}

      <CrudModal
        open={openProfiles}
        title="Gerenciar perfis de câmera"
        description="Padronize os perfis usados para agrupar câmeras na visualização."
        onClose={() => {
          setOpenProfiles(false);
          setProfileSearch('');
          cancelEditProfile();
        }}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {profileError ? (
            <TimedAlert tone="error" onClose={() => setProfileError(null)} className="rounded-2xl p-4">
              {profileError}
            </TimedAlert>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Renomear um perfil atualiza todas as câmeras vinculadas a ele. A exclusão só é permitida para perfil sem câmera em uso.
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={profileSearch}
              onChange={(event) => setProfileSearch(event.target.value)}
              placeholder="Buscar perfil..."
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-slate-500"
            />
            {profileSearch ? (
              <button
                type="button"
                onClick={() => setProfileSearch('')}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10"
              >
                Limpar
              </button>
            ) : null}
          </label>

          {profileOptions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
              Nenhum perfil cadastrado ainda.
            </p>
          ) : filteredProfileOptions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
              Nenhum perfil encontrado para essa busca.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredProfileOptions.map((profile) => {
                const usedBy = profileUsage.get(profile) ?? 0;
                const isEditing = editingProfile === profile;

                return (
                  <div key={profile} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="min-w-0">
                        {isEditing ? (
                          <input
                            value={editingProfileValue}
                            onChange={(event) => setEditingProfileValue(normalizeCameraProfile(event.target.value))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void handleRenameProfile();
                              }
                            }}
                            data-preserve-case="true"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none"
                            autoFocus
                          />
                        ) : (
                          <p className="truncate text-sm font-semibold text-white">{profile}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {usedBy === 1 ? '1 câmera vinculada' : `${usedBy} câmeras vinculadas`}
                        </p>
                      </div>

                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => void handleRenameProfile()}
                            disabled={profileSaving}
                            className="rounded-xl bg-white px-3 py-2 text-xs text-slate-950 hover:bg-slate-200"
                          >
                            {profileSaving ? 'Salvando...' : 'Salvar'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelEditProfile}
                            disabled={profileSaving}
                            className="rounded-xl border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => beginEditProfile(profile)}
                            className="rounded-xl border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDeleteProfile(profile)}
                            disabled={usedBy > 0}
                            className="rounded-xl border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CrudModal>

      {lastRtspJob ? (
        <TimedAlert
          tone={lastRtspJob.status === 'FAILED' ? 'error' : lastRtspJob.status === 'SUCCEEDED' ? 'success' : 'info'}
          onClose={() => setLastRtspJob(null)}
          className={`rounded-3xl p-5 ${getJobStatusClass(lastRtspJob.status)}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Acompanhamento do cadastro RTSP</p>
              <p className="mt-1 text-xs opacity-80">Job {lastRtspJob.id}</p>
            </div>
            <Badge className="border-white/10 bg-white/10 text-white">
              {getJobStatusLabel(lastRtspJob.status)}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <p>Tentativas: {lastRtspJob.attempts} de {lastRtspJob.maxAttempts}</p>
            <p>Criado em: {new Date(lastRtspJob.createdAt).toLocaleString('pt-BR')}</p>
            {lastRtspJob.updatedAt ? <p>Última atualização: {new Date(lastRtspJob.updatedAt).toLocaleString('pt-BR')}</p> : null}
            {lastRtspJob.finishedAt ? <p>Finalizado em: {new Date(lastRtspJob.finishedAt).toLocaleString('pt-BR')}</p> : null}
          </div>
          {lastRtspJob.errorMessage ? (
            <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {lastRtspJob.errorMessage}
            </p>
          ) : null}
        </TimedAlert>
      ) : null}

      {usingSnapshot ? (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          Mostrando a última atualização disponível de câmeras. O servidor está indisponível agora e novas alterações podem demorar para refletir.
          {snapshotUpdatedAt ? ` Última sincronização: ${new Date(snapshotUpdatedAt).toLocaleString('pt-BR')}.` : ''}
        </div>
      ) : null}

      {!usingSnapshot && localDraftCameras.length > 0 ? (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          {cameras.length} câmera(s) confirmada(s) pelo servidor e {localDraftCameras.length} aguardando sincronização final.
        </div>
      ) : null}

      {!usingSnapshot && error && !hideLoadErrorAlert ? (
        <TimedAlert tone="error" onClose={() => setHideLoadErrorAlert(true)} className="rounded-3xl p-5">
          {getCameraErrorMessage(error, 'Não foi possível carregar as câmeras.')}
        </TimedAlert>
      ) : null}

      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
        RTSP é aceito no cadastro, mas navegadores não reproduzem RTSP diretamente. Para visualizar na operação, use uma fonte compatível com navegador.
      </div>

      <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-sm text-cyan-100">
        O motor facial agora é configurado em <strong>Servidores faciais</strong>. Depois, vincule o servidor desejado na câmera correspondente.
      </div>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Lista de câmeras</h2>
            <p className="text-sm text-slate-400">
              {filteredCameras.length} exibida(s)
              {hasActiveFilters && hiddenByFiltersCount > 0 ? ` • ${hiddenByFiltersCount} oculta(s) por filtro` : ''}
              {!usingSnapshot ? ` • ${cameras.length} cadastrada(s) no servidor` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
              showFilters
                ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        <div className="divide-y divide-white/10">
          {filteredCameras.map((camera) => {
            const cameraUnitLabel = getCameraUnitLabel(camera, unitOptions);

            return (
            <div
              key={camera.id}
              className={`grid gap-4 px-5 py-4 lg:grid-cols-[1.3fr_1fr_0.7fr_auto] lg:items-center ${
                isLocalCameraDraft(camera) ? 'bg-amber-500/5' : ''
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{camera.name}</p>
                  {isLocalCameraDraft(camera) ? (
                    <Badge className={`border-white/10 ${getJobStatusClass(camera.localSyncState)}`}>
                      {camera.localSyncState === 'SUCCEEDED'
                        ? 'Aguardando aparecer na lista'
                        : getJobStatusLabel(camera.localSyncState)}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-slate-400">{camera.location || 'Local não informado'}</p>
                {isLocalCameraDraft(camera) ? (
                  <p className="mt-1 text-xs text-amber-200">
                    Cadastro salvo localmente enquanto o servidor conclui a sincronização.
                  </p>
                ) : null}
              </div>

              <div className="text-sm text-slate-300">
                {camera.imageStreamUrl ? (
                  <span className="inline-flex items-center gap-2">
                    <Radio className="h-4 w-4 text-slate-400" />
                    Stream de imagem configurado
                  </span>
                ) : camera.snapshotUrl ? (
                  <span className="inline-flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                    Snapshot configurado
                  </span>
                ) : camera.streamUrl ? (
                  <span className="inline-flex items-center gap-2">
                    <Radio className="h-4 w-4 text-slate-400" />
                    Stream configurado
                  </span>
                ) : (
                  'Sem URL configurada'
                )}
              </div>

              <div>
                <Badge className={statusBadgeClass(getAutomaticCameraStatus(camera))}>
                  {getCameraStatusLabel(getAutomaticCameraStatus(camera))}
                </Badge>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setSelectedCamera(camera);
                    setOpenView(true);
                  }}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  aria-label="Visualizar câmera"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setSubmitError(null);
                    setSelectedCamera(camera);
                    void refreshVmsServers();
                    setOpenEdit(true);
                  }}
                  disabled={isLocalCameraDraft(camera)}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  aria-label="Editar câmera"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => void handleDeleteCamera(camera)}
                  disabled={saving}
                  className="border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                  aria-label={isLocalCameraDraft(camera) ? 'Remover cadastro pendente' : 'Excluir câmera'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                {camera.unitId ? (
                  <button
                    type="button"
                    onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(camera.unitId ?? '')}`); }}
                    className="inline-flex max-w-56 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-left text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/20"
                    title={cameraUnitLabel}
                  >
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{cameraUnitLabel}</span>
                  </button>
                ) : (
                  <Badge className="border-cyan-500/20 bg-cyan-500/10 text-cyan-100">
                    Área comum
                  </Badge>
                )}

                <Button
                  variant="outline"
                  onClick={() => captureCameraPhoto(camera)}
                  disabled={isLocalCameraDraft(camera)}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  Capturar foto
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <CrudModal
        open={openCreate}
        title="Nova câmera"
        description="Cadastre uma câmera e informe a fonte de visualização adequada para uso no navegador."
        onClose={() => setOpenCreate(false)}
        maxWidth="xl"
      >
        {submitError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </div>
        ) : null}
        <CameraForm
          initialData={initialForm}
          onSubmit={handleCreateCamera}
          onCancel={() => setOpenCreate(false)}
          loading={saving}
          units={unitOptions}
          faceEngineServers={faceEngineServers}
          vmsServers={vmsServers}
          profileOptions={profileOptions}
          onAddProfile={handleAddCameraProfile}
          requireUnit={false}
        />
      </CrudModal>

      <CrudModal
        open={openEdit}
        title="Editar câmera"
        description="Atualize nome, perfil, URLs de preview, integração e unidade vinculada."
        onClose={() => {
          setOpenEdit(false);
          setSubmitError(null);
        }}
        maxWidth="xl"
      >
        {submitError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </div>
        ) : null}
        {selectedCamera ? (
          <CameraForm
            key={selectedCamera.id}
            initialData={cameraToFormData(selectedCamera)}
            onSubmit={handleUpdateCamera}
            onCancel={() => {
              setOpenEdit(false);
              setSubmitError(null);
            }}
            loading={saving}
            units={unitOptions}
            faceEngineServers={faceEngineServers}
            vmsServers={vmsServers}
            profileOptions={profileOptions}
            onAddProfile={handleAddCameraProfile}
            requireUnit={false}
          />
        ) : null}
      </CrudModal>

      <CrudModal
        open={openView}
        title="Detalhes da câmera"
        description={selectedCamera && isLocalCameraDraft(selectedCamera) ? 'Cadastro aguardando confirmação completa do servidor.' : 'Resumo da câmera cadastrada.'}
        onClose={() => setOpenView(false)}
        maxWidth="lg"
      >
        {selectedCamera ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 md:col-span-2">
              <CameraPlayer
                cameraId={selectedCamera.id}
                cameraData={selectedCamera}
                compactOverlay
                className=""
                heightClassName="h-72"
                emptyHint="Nenhum preview ou stream ao vivo disponível para esta câmera."
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Nome</p>
              <p className="mt-2 text-base font-medium text-white">{selectedCamera.name}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
              <p className="mt-2 text-base font-medium text-white">
                {getCameraStatusLabel(getAutomaticCameraStatus(selectedCamera))}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tipo do dispositivo</p>
              <p className="mt-2 text-base font-medium text-white">
                {getCameraDeviceTypeLabel(selectedCamera.deviceType)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Uso do dispositivo</p>
              <p className="mt-2 text-base font-medium text-white">
                {getCameraDeviceUsageLabel(selectedCamera.deviceUsageType)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Perfil / local</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{selectedCamera.location || 'Não informado'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade</p>
              <p className="mt-2 text-base font-medium text-white">
                {getCameraUnitLabel(selectedCamera, unitOptions)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Servidor facial</p>
              <p className="mt-2 text-base font-medium text-white">
                {selectedCamera.faceEngineServerName || 'Sem vínculo com motor facial'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Servidor VMS</p>
              <p className="mt-2 text-base font-medium text-white">
                {selectedCamera.vmsServerId || 'Sem vínculo com VMS'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Conectividade</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>URL do stream de imagem: {selectedCamera.imageStreamUrl || 'Não configurado'}</p>
                <p>URL do stream: {selectedCamera.streamUrl || 'Não configurado'}</p>
                <p>Snapshot URL: {selectedCamera.snapshotUrl || 'Não configurado'}</p>
                <p>Stream External ID: {selectedCamera.streamExternalId || 'Não informado'}</p>
                <p>VMS Device ID: {selectedCamera.vmsDeviceId ?? 'Não informado'}</p>
                <p>VMS Camera ID: {selectedCamera.vmsDeviceItemId ?? 'Não informado'}</p>
                <p>VMS Recording Server ID: {selectedCamera.vmsRecordingServerId ?? 'Não informado'}</p>
                <p>Engine Stream ID: {selectedCamera.engineStreamId ?? 'Não informado'}</p>
                <p>Engine Stream UUID: {selectedCamera.engineStreamUuid || 'Não informado'}</p>
                <p>Face Analytics ID: {selectedCamera.faceAnalyticsId ?? 'Não informado'}</p>
              </div>
            </div>
            <div className="md:col-span-2">
              {!isLocalCameraDraft(selectedCamera) ? (
                <Button
                  variant="outline"
                  onClick={() => void handleDeleteCamera(selectedCamera)}
                  disabled={saving}
                  className="border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir câmera
                </Button>
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  A câmera ainda está em sincronização. Assim que o servidor confirmar o cadastro, ela ficará disponível para edição, captura e exclusão.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </CrudModal>
    </div>
  );
}


