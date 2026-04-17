'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  RefreshCw,
  Plus,
  Search,
  Eye,
  CameraOff,
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
import { CrudModal } from '@/components/admin/CrudModal';
import { CameraFeed } from '@/components/camera-feed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getCameraDiagnostics } from '@/features/cameras/camera-media';
import type {
  Camera as CameraRecord,
  CameraCreateRequest,
  CameraDeviceType,
  CameraDeviceUsageType,
  CameraStatus,
} from '@/types/camera';

type Filters = {
  search: string;
  status: string;
  media: 'all' | 'with-preview' | 'without-preview' | 'rtsp-only';
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
  status: 'OFFLINE',
  unitId: '',
};

const DEVICE_TYPE_OPTIONS: Array<{ value: CameraDeviceType; label: string }> = [
  { value: 'CAMERA', label: 'Câmera comum' },
  { value: 'IA_FACES', label: 'IA Faces' },
  { value: 'CAMERA_IA', label: 'Câmera IA' },
  { value: 'FACIAL_DEVICE', label: 'Dispositivo Facial' },
];

const DEVICE_USAGE_OPTIONS: Array<{ value: CameraDeviceUsageType; label: string }> = [
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'EXIT', label: 'Saída' },
  { value: 'MONITORING', label: 'Monitoramento' },
  { value: 'PASSAGE', label: 'Passagem' },
];

function supportsDeviceUsageType(deviceType: CameraDeviceType) {
  return deviceType === 'IA_FACES' || deviceType === 'CAMERA_IA' || deviceType === 'FACIAL_DEVICE';
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
  if (deviceType === 'IA_FACES') return 'IA Faces';
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

function getCameraErrorMessage(error: unknown, fallback: string) {
  const maybeApiError = error as {
    response: {
      status: number;
      data: {
        detail: unknown;
        message: string;
      };
    };
    message: string;
  };

  const detail = maybeApiError.response.data.detail;
  const message = maybeApiError.response.data.message;

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

  if (typeof detail === 'string' && detail.trim()) return detail;
  if (typeof message === 'string' && message.trim()) return message;

  const normalizedFallbackMessage = `${String(detail ?? '')} ${String(message ?? '')}`.toLowerCase();
  if (normalizedFallbackMessage.includes('deviceusagetype')) {
    return 'O backend passou a aceitar `deviceUsageType` apenas para IA Faces, Câmera IA e Dispositivo Facial. O cadastro de câmera comum precisa ser enviado sem esse campo.';
  }

  if (maybeApiError.response.status === 500) {
    return 'O backend retornou erro interno ao cadastrar a câmera. Se a URL for RTSP, solicite ao backend validar o cadastro e converter o RTSP para snapshot ou image stream.';
  }

  if (maybeApiError.response.status === 400) {
    return 'Os dados da câmera não foram aceitos. Verifique nome, unidade e URL informada.';
  }

  return maybeApiError.message && !maybeApiError.message.includes('Request failed with status code')
    ? maybeApiError.message
    : fallback;
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
    status: camera.status,
    unitId: camera.unitId ?? '',
  };
}

function buildCameraPayload(form: CameraFormData): CameraCreateRequest {
  const payload: CameraCreateRequest = {
    name: form.name.trim(),
    deviceType: form.deviceType,
    monitoringEnabled: true,
    residentVisible: false,
    status: getAutomaticCameraStatusFromForm(form),
  };

  payload.deviceUsageType = supportsDeviceUsageType(form.deviceType) ? form.deviceUsageType || null : null;

  payload.location = form.location.trim() || null;
  payload.streamSourceType = form.streamUrl.trim() ? 'RTSP' : null;
  payload.streamUrl = form.streamUrl.trim() || null;
  payload.snapshotUrl = form.snapshotUrl.trim() || null;
  payload.eventExternalId = form.engineStreamId.trim() || null;
  payload.eventIntegrationVendor = form.engineStreamUuid.trim() || null;
  payload.eventIntegrationModel = form.faceAnalyticsId.trim() || null;
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
  requireUnit = false,
}: {
  initialData: Partial<CameraFormData>;
  onSubmit: (data: CameraFormData) => Promise<void> | void;
  onCancel: () => void;
  loading: boolean;
  units: Array<{ id: string; label: string; location: string }>;
  requireUnit: boolean;
}) {
  const [form, setForm] = useState<CameraFormData>({
    ...initialForm,
    ...initialData,
  });
  const usageTypeEnabled = supportsDeviceUsageType(form.deviceType);

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

      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          <span className="text-sm text-slate-300">Localização</span>
          <input
            value={form.location}
            onChange={(e) => setField('location', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Entrada social"
          />
        </label>

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
          <p className="text-xs text-slate-500">
            O backend só aceita `deviceUsageType` para IA Faces, Câmera IA e Dispositivo Facial.
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
            RTSP pode ser salvo aqui, mas o navegador não reproduz RTSP direto. Para preview na Operação, o backend precisa converter para snapshot, MJPEG, HLS ou WebRTC.
          </p>
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
              ? 'Para admin de condomínio, a câmera deve ficar vinculada a uma unidade do próprio condomínio.'
              : 'Use a unidade para amarrar a câmera ao escopo operacional correto.'}
          </p>
        </label>
      </div>

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
          {loading ? 'Salvando...' : 'Salvar na API'}
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
  });
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cameras = useMemo(() => camerasData?.data ?? [], [camerasData]);
  const isAdminScope = user.role === 'ADMIN';
  const accessibleUnits = useMemo(() => {
    if (!isAdminScope) {
      return units;
    }

    return units.filter((unit) => unit.condominiumId === user.condominiumId);
  }, [isAdminScope, units, user.condominiumId]);
  const accessibleUnitIds = useMemo(
    () => new Set(accessibleUnits.map((unit) => unit.id)),
    [accessibleUnits]
  );
  const unitOptions = useMemo(
    () =>
      accessibleUnits.map((unit) => ({
        id: unit.id,
        label: getUnitDisplayParts(unit).join(' / ') || unit.label || 'Unidade sem identificação',
        location: getUnitDisplayParts(unit).join(' / ') || unit.label || 'Unidade sem identificação',
      })),
    [accessibleUnits]
  );
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

  const filteredCameras = useMemo(() => {
    const search = normalizeString(filters.search);
    const status = normalizeString(filters.status);

    return cameras.filter((camera) => {
      const automaticStatus = getAutomaticCameraStatus(camera);
      const scopeOk = (!isAdminScope || (!!camera.unitId && accessibleUnitIds.has(camera.unitId))) && (!activeUnitId || camera.unitId === activeUnitId);
      const statusOk = status === 'all' || normalizeString(automaticStatus) === status;
      const hasPreview = Boolean(camera.snapshotUrl || camera.imageStreamUrl);
      const isRtspOnly = isRtspStreamUrl(camera.streamUrl) && !hasPreview;
      const mediaOk =
        filters.media === 'all' ||
        (filters.media === 'with-preview' && hasPreview) ||
        (filters.media === 'without-preview' && !hasPreview) ||
        (filters.media === 'rtsp-only' && isRtspOnly);
      const searchOk =
        !search ||
        [camera.name, camera.location, camera.streamUrl, camera.snapshotUrl]
          .filter(Boolean)
          .some((value) => normalizeString(value).includes(search));

      return scopeOk && statusOk && mediaOk && searchOk;
    });
  }, [accessibleUnitIds, activeUnitId, cameras, filters, isAdminScope]);

  const stats = useMemo(() => {
    const total = filteredCameras.length;
    const online = filteredCameras.filter((camera) => getAutomaticCameraStatus(camera) === 'ONLINE').length;
    const offline = filteredCameras.filter((camera) => getAutomaticCameraStatus(camera) === 'OFFLINE').length;
    const withSnapshot = filteredCameras.filter((camera) => camera.snapshotUrl || camera.imageStreamUrl).length;
    const withoutPreview = filteredCameras.filter((camera) => !camera.snapshotUrl && !camera.imageStreamUrl).length;
    const rtspOnly = filteredCameras.filter((camera) => isRtspStreamUrl(camera.streamUrl) && !camera.snapshotUrl && !camera.imageStreamUrl).length;

    return { total, online, offline, withSnapshot, withoutPreview, rtspOnly };
  }, [filteredCameras]);

  async function handleCreateCamera(form: CameraFormData) {
    setSaving(true);
    setSubmitError(null);

    try {
      if (isAdminScope) {
        if (!form.unitId) {
          throw new Error('Selecione uma unidade do seu condomínio para cadastrar a câmera.');
        }

        if (!accessibleUnitIds.has(form.unitId)) {
          throw new Error('A unidade selecionada não pertence ao escopo do seu condomínio.');
        }
      }

      const payload = buildCameraPayload(form);
      const isRtspCamera = isRtspStreamUrl(form.streamUrl);

      if (isRtspCamera) {
        const job = await camerasService.createAsync(payload);
        setOpenCreate(false);
        setActionMessage(
          `Cadastro RTSP enviado para processamento em background. Job ${job.id} com status ${job.status}. A câmera pode demorar alguns instantes para aparecer na lista.`
        );
        await refetch();
        return;
      }

      const createdCamera = await camerasService.create(payload);
      if (!createdCamera.id) {
        throw new Error(
          'O backend respondeu ao cadastro, mas não retornou um identificador de câmera. O registro não foi confirmado.'
        );
      }

      setOpenCreate(false);
      setActionMessage('Câmera criada com status automático pela disponibilidade de preview.');
      await refetch();
    } catch (createError) {
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
      if (isAdminScope) {
        if (!form.unitId) {
          throw new Error('Selecione uma unidade do seu condomínio para editar a câmera.');
        }

        if (!accessibleUnitIds.has(form.unitId)) {
          throw new Error('A unidade selecionada não pertence ao escopo do seu condomínio.');
        }
      }

      const payload = buildCameraPayload(form);
      const updatedCamera = await camerasService.update(selectedCamera.id, payload);

      setSelectedCamera(updatedCamera);
      setOpenEdit(false);
      setActionMessage('Câmera atualizada com status automático pela disponibilidade de preview.');
      await refetch();
    } catch (updateError) {
      setSubmitError(
        getCameraErrorMessage(
          updateError,
          'Não foi possível editar a câmera. Confirme se o backend expõe PUT /api/v1/cameras/{id}.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCamera(camera: CameraRecord) {
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
              Cadastro e operação básica do parque de câmeras com integração direta à API real.
            </p>
            {isAdminScope ? (
              <p className="mt-2 text-sm text-slate-500">
                Você está vendo apenas câmeras vinculadas a unidades do seu condomínio.
              </p>
            ) : null}
          </div>

        <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setSubmitError(null);
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
        <StatCard title="Total" value={isLoading ? '...' : String(stats.total)} icon={Camera} hint="Câmeras registradas" />
        <StatCard title="Online" value={isLoading ? '...' : String(stats.online)} icon={Radio} hint="Operando agora" />
        <StatCard title="Offline" value={isLoading ? '...' : String(stats.offline)} icon={CameraOff} hint="Indisponíveis" />
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

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar por nome, localização, stream ou snapshot..."
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
          <button type="button" onClick={() => setFilters({ search: '', status: 'all', media: 'all' })} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
            Limpar filtros
          </button>
        </div>
      </section>

      {actionMessage ? (
        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-sm text-cyan-100">
          {actionMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          Não foi possível carregar as câmeras.
        </div>
      ) : null}

      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
        RTSP é aceito como dado de cadastro, mas navegadores não reproduzem RTSP diretamente. Para visualizar na tela Operação, solicite ao backend/VMS a publicação de `snapshotUrl` ou `imageStreamUrl` a partir da URL RTSP.
      </div>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Lista de câmeras</h2>
            <p className="text-sm text-slate-400">{filteredCameras.length} registro(s) encontrado(s)</p>
          </div>
          <Filter className="h-5 w-5 text-slate-400" />
        </div>

        <div className="divide-y divide-white/10">
          {filteredCameras.map((camera) => (
            <div
              key={camera.id}
              className="grid gap-4 px-5 py-4 lg:grid-cols-[1.3fr_1fr_0.7fr_auto] lg:items-center"
            >
              <div>
                <p className="font-medium text-white">{camera.name}</p>
                <p className="text-sm text-slate-400">{camera.location || 'Local não informado'}</p>
              </div>

              <div className="text-sm text-slate-300">
                {camera.imageStreamUrl ? (
                  <span className="inline-flex items-center gap-2">
                    <Radio className="h-4 w-4 text-slate-400" />
                    Image stream configurado
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
                    setOpenEdit(true);
                  }}
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
                  aria-label="Excluir câmera"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                {camera.unitId ? (
                  <Button
                    variant="outline"
                    onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(camera.unitId ?? '')}`); }}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Unidade
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => captureCameraPhoto(camera)}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  Capturar foto
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CrudModal
        open={openCreate}
        title="Nova câmera"
        description="Cadastre uma câmera na API externa. Se usar RTSP, o backend ainda precisa expor snapshot ou image stream para visualização no navegador."
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
          requireUnit={isAdminScope}
        />
      </CrudModal>

      <CrudModal
        open={openEdit}
        title="Editar câmera"
        description="Atualize nome, local, URLs de preview, integração e unidade vinculada."
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
            requireUnit={isAdminScope}
          />
        ) : null}
      </CrudModal>

      <CrudModal
        open={openView}
        title="Detalhes da câmera"
        description="Resumo técnico retornado pela API."
        onClose={() => setOpenView(false)}
        maxWidth="lg"
      >
        {selectedCamera ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 md:col-span-2">
              <CameraFeed
                camera={selectedCamera}
                className={`${getAutomaticCameraStatus(selectedCamera) === 'OFFLINE' ? 'opacity-45' : ''}`}
                imageClassName="h-72 w-full object-cover"
                emptyLabel="Nenhum preview disponível"
                emptyHint="Nenhum snapshot ou image stream configurado para esta câmera."
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
                <span className="text-xs uppercase tracking-[0.18em]">Localização</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{selectedCamera.location || 'Não informado'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade</p>
              <p className="mt-2 text-base font-medium text-white">
                {unitOptions.find((unit) => unit.id === selectedCamera.unitId)?.location ||
                  (selectedCamera.unitId ? 'Unidade não identificada' : 'Não vinculada')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Conectividade</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>Image Stream URL: {selectedCamera.imageStreamUrl || 'Não configurado'}</p>
                <p>Stream URL: {selectedCamera.streamUrl || 'Não configurado'}</p>
                <p>Snapshot URL: {selectedCamera.snapshotUrl || 'Não configurado'}</p>
                <p>Engine Stream ID: {selectedCamera.engineStreamId ?? 'Não informado'}</p>
                <p>Engine Stream UUID: {selectedCamera.engineStreamUuid || 'Não informado'}</p>
                <p>Face Analytics ID: {selectedCamera.faceAnalyticsId ?? 'Não informado'}</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button
                variant="outline"
                onClick={() => void handleDeleteCamera(selectedCamera)}
                disabled={saving}
                className="border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20 disabled:opacity-60"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir câmera
              </Button>
            </div>
          </div>
        ) : null}
      </CrudModal>
    </div>
  );
}


