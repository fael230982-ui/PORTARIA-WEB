'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Bell,
  DoorClosed,
  DoorOpen,
  Building2,
  Cctv,
  Delete,
  Grid3X3,
  LifeBuoy,
  MessageCircle,
  Monitor,
  PhoneCall,
  PhoneOff,
  QrCode,
  RefreshCcw,
  Search,
  LogOut,
  Package,
  ShieldAlert,
  Smartphone,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAlerts } from '@/hooks/use-alerts';
import { useCameras } from '@/hooks/use-cameras';
import { usePeople } from '@/hooks/use-people';
import { useUnitResidents } from '@/hooks/use-people';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useOfflineOperationQueue } from '@/hooks/use-offline-operation-queue';
import { useOperationEvents } from '@/hooks/use-operation-events';
import { CrudModal } from '@/components/admin/CrudModal';
import { CameraFeed } from '@/components/camera-feed';
import { CameraPlayer } from '@/components/operacao/camera-player';
import { Button } from '@/components/ui/button';
import { logout } from '@/services/auth.service';
import { camerasService } from '@/services/cameras.service';
import { devicesService } from '@/services/devices.service';
import { createPerson, updatePerson, updatePersonStatus, uploadPersonPhoto } from '@/services/people.service';
import { updateAlertStatus, updateAlertWorkflow } from '@/services/alerts.service';
import { createReport } from '@/services/reports.service';
import { useReports } from '@/hooks/use-reports';
import { useDeliveries } from '@/hooks/use-deliveries';
import { useAccessLogs } from '@/hooks/use-access-logs';
import { useVehicles } from '@/hooks/use-vehicles';
import { useOperationActions, useOperationMessages, useOperationSearch, useOperationUnitSearch, useOperationWhatsAppConnection } from '@/hooks/use-operation-integrations';
import { operationService } from '@/services/operation.service';
import { writeLocalOperationPresence } from '@/features/operation/local-operation-presence';
import {
  buildAccessEvents,
  buildAccessSummaryByPerson,
  buildLatestAccessByPerson,
  formatAccessDateTime,
} from '@/features/people/access-history';
import {
  buildEventsFromAccessLogs,
  buildLatestAccessLogByPerson,
  normalizeAccessLogs,
} from '@/features/people/access-log-history';
import {
  buildAccessReportPayload,
  buildOperationOccurrencePayload,
  buildShiftHandoverReportPayload,
  getPersonUnitLabel,
  parseOperationReportMetadata,
} from '@/features/reports/report-metadata';
import {
  clearFailedOfflineOperations,
  enqueueOfflineOperation,
  isOfflineQueueCandidateError,
  removeOfflineOperationItem,
  resetFailedOfflineOperationItem,
  type OfflineOperationDraft,
} from '@/features/offline/offline-operation-queue';
import { maskDocument, maskEmail, maskPhone } from '@/features/legal/data-masking';
import { createClientRequestId } from '@/features/offline/client-request-id';
import { getUnitReference } from '@/features/people/morador-normalizers';
import { getPersonStatusBadgeClass } from '@/features/people/status-badges';
import { useVisitorDocumentRequirement } from '@/features/people/visitor-document-policy';
import { getAlertEvidenceUrl, getAlertReplayUrl, getAlertTypeLabel } from '@/features/alerts/alert-normalizers';
import {
  getPreferredImageStreamUrl,
  getPreferredSnapshotUrl,
  getPreferredVideoStreamUrl,
} from '@/features/cameras/camera-media';
import {
  alertResolutionPresets,
  getAlertWorkflowClass,
  getAlertWorkflowLabel,
  getAlertWorkflowRecord,
} from '@/features/alerts/alert-workflow';
import {
  getDeliveryStatusLabel,
  hasDeliverySecureWithdrawal,
  matchesDeliverySearch,
  normalizeDeliveries,
  normalizeDeliveryStatus,
} from '@/features/deliveries/delivery-normalizers';
import { useAlertWorkflow } from '@/hooks/use-alert-workflow';
import { brandClasses, getBrandEyebrowClassName } from '@/config/brand-classes';
import { brandConfig } from '@/config/brand';
import { createDelivery as createDeliveryRequest, updateDeliveryStatus, validateDeliveryWithdrawal } from '@/services/deliveries.service';
import type { Alert } from '@/types/alert';
import type { AccessLog } from '@/types/access-log';
import type { Camera } from '@/types/camera';
import type { Unit } from '@/types/condominium';
import type { Delivery, DeliveryPayload } from '@/types/delivery';
import type { Device, DeviceDoorStatus } from '@/types/device';
import type { OperationAction, OperationEvent, OperationMessage, OperationPhotoSearchResponse, OperationShiftChange } from '@/types/operation';
import type { Person, PersonCategory } from '@/types/person';
import type { Report, ShiftHandoverReportMetadata } from '@/types/report';
import type { Vehicle } from '@/types/vehicle';

const allowedRoles = ['OPERADOR', 'GERENTE', 'ADMIN', 'MASTER', 'CENTRAL'] as const;
const CAMERA_ALERT_FOCUS_STORAGE_KEY = 'operation-camera-alert-focus';
const DEVICE_ALERT_CAMERAS_STORAGE_KEY = 'admin-device-alert-cameras';
const CAMERA_MONITOR_WINDOW_STORAGE_KEY = 'operation-camera-monitor-window';

function getCameraMonitorWindowFeatures() {
  const fallback = { width: 1680, height: 960 };
  const parts = ['noopener', 'noreferrer'];

  if (typeof window === 'undefined') {
    return [...parts, `width=${fallback.width}`, `height=${fallback.height}`].join(',');
  }

  try {
    const raw = window.localStorage.getItem(CAMERA_MONITOR_WINDOW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as { left?: number; top?: number; width?: number; height?: number } : null;
    const width = Number.isFinite(parsed?.width) ? Math.max(640, Math.round(parsed?.width ?? fallback.width)) : fallback.width;
    const height = Number.isFinite(parsed?.height) ? Math.max(480, Math.round(parsed?.height ?? fallback.height)) : fallback.height;
    const left = Number.isFinite(parsed?.left) ? Math.round(parsed?.left ?? 0) : null;
    const top = Number.isFinite(parsed?.top) ? Math.round(parsed?.top ?? 0) : null;

    parts.push(`width=${width}`, `height=${height}`);
    if (left !== null) parts.push(`left=${left}`);
    if (top !== null) parts.push(`top=${top}`);
    return parts.join(',');
  } catch {
    return [...parts, `width=${fallback.width}`, `height=${fallback.height}`].join(',');
  }
}

const operationalModules: Array<{
  label: string;
  description: string;
  icon: typeof Users;
  href?: string;
}> = [
  { label: 'Moradores', description: 'Consulta rápida de pessoas', icon: Users },
  { label: 'Visitantes', description: 'Cadastro imediato', icon: ShieldAlert },
  { label: 'Locatários', description: 'Gestão de acesso', icon: Building2 },
  { label: 'Prestadores', description: 'Entrada de serviços', icon: LifeBuoy },
  { label: 'Encomendas', description: 'Registro de mercadorias', icon: Package },
  { label: 'Câmeras', description: 'Monitor em tela separada', icon: Monitor },
];

const contactButtons = [
  'Interfone social',
  'Interfone externo',
  'Zeladoria',
  'Elevador',
  'Portao lateral',
  'Pedestre rua',
];

const fallbackOperationActionLabels = ['Portao principal', 'Garagem', 'Portao pedestre', 'Sirene'];

function getRemoteOpenButtons(device: Device | null) {
  if (!device) return [] as Array<{ doorNumber: 1 | 2; label: string }>;

  const config = device.remoteAccessConfig;
  const items: Array<{ doorNumber: 1 | 2; label: string; enabled: boolean }> = [
    {
      doorNumber: 1,
      label: config?.actionOneLabel?.trim() || 'Acionamento 1',
      enabled: config?.actionOneEnabled ?? true,
    },
    {
      doorNumber: 2,
      label: config?.actionTwoLabel?.trim() || 'Acionamento 2',
      enabled: config?.actionTwoEnabled ?? true,
    },
  ];

  return items.filter((item) => item.enabled).map(({ enabled: _enabled, ...item }) => item);
}

function getRemoteOpenFeedbackClass(feedback: 'idle' | 'success' | 'pending' | 'error' | undefined, fallbackClass: string) {
  if (feedback === 'success') {
    return 'border-emerald-400/45 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30';
  }
  if (feedback === 'pending') {
    return 'border-amber-400/45 bg-amber-500/20 text-amber-50 hover:bg-amber-500/30';
  }
  if (feedback === 'error') {
    return 'border-red-400/45 bg-red-500/20 text-red-50 hover:bg-red-500/30';
  }
  return fallbackClass;
}

function getRemoteOpenDoorStateLabel(feedback: 'idle' | 'success' | 'pending' | 'error' | undefined) {
  if (feedback === 'success') return 'Comando confirmado';
  if (feedback === 'pending') return 'Aguardando confirmação';
  if (feedback === 'error') return 'Falha no comando';
  return 'Sensor não monitorado';
}

function getRemoteOpenDoorIconClass(feedback: 'idle' | 'success' | 'pending' | 'error' | undefined) {
  if (feedback === 'success') return 'border-emerald-300/40 bg-emerald-300/20 text-emerald-50';
  if (feedback === 'pending') return 'border-amber-300/40 bg-amber-300/20 text-amber-50';
  if (feedback === 'error') return 'border-red-300/40 bg-red-300/20 text-red-50';
  return 'border-white/15 bg-white/10 text-slate-100';
}

function getRemoteOpenDoorStateLabelWithSensor(
  feedback: 'idle' | 'success' | 'pending' | 'error' | undefined,
  doorStatus?: DeviceDoorStatus | null
) {
  if (doorStatus?.sensorAvailable) {
    const normalized = String(doorStatus.doorStatus ?? doorStatus.doorState ?? '').toUpperCase();
    if (doorStatus.doorOpen === true || normalized === 'OPEN') return 'Porta aberta';
    if (doorStatus.doorOpen === false || normalized === 'CLOSED') return 'Porta fechada';
    return 'Sensor sem estado';
  }
  if (feedback === 'success') return 'Comando confirmado';
  if (feedback === 'pending') return 'Aguardando confirmação';
  if (feedback === 'error') return 'Falha no comando';
  return 'Sensor não monitorado';
}

function getRemoteOpenDoorIconClassWithSensor(
  feedback: 'idle' | 'success' | 'pending' | 'error' | undefined,
  doorStatus?: DeviceDoorStatus | null
) {
  if (doorStatus?.sensorAvailable) {
    const normalized = String(doorStatus.doorStatus ?? doorStatus.doorState ?? '').toUpperCase();
    if (doorStatus.doorOpen === true || normalized === 'OPEN') return 'border-red-300/50 bg-red-400/20 text-red-50';
    if (doorStatus.doorOpen === false || normalized === 'CLOSED') return 'border-emerald-300/50 bg-emerald-400/20 text-emerald-50';
  }
  if (feedback === 'success') return 'border-emerald-300/40 bg-emerald-300/20 text-emerald-50';
  if (feedback === 'pending') return 'border-amber-300/40 bg-amber-300/20 text-amber-50';
  if (feedback === 'error') return 'border-red-300/40 bg-red-300/20 text-red-50';
  return 'border-white/15 bg-white/10 text-slate-100';
}

function getDoorStatusFromResponse(response: unknown): DeviceDoorStatus | null {
  const result = (response as { result?: unknown } | null)?.result;
  if (!result || typeof result !== 'object') return null;
  return result as DeviceDoorStatus;
}

function isDoorOpenBySensor(doorStatus?: DeviceDoorStatus | null) {
  if (!doorStatus?.sensorAvailable) return false;
  const normalized = String(doorStatus.doorStatus ?? doorStatus.doorState ?? '').toUpperCase();
  return doorStatus.doorOpen === true || normalized === 'OPEN';
}

function isQueuedControlResult(result: unknown) {
  const deviceResult = (result as { result?: { deviceResult?: { queued?: boolean } } } | undefined)?.result?.deviceResult;
  const controlResult = (result as { result?: { queued?: boolean } } | undefined)?.result;
  return deviceResult?.queued === true || controlResult?.queued === true;
}

function getControlJobId(result: unknown) {
  const controlResult = (result as { result?: { jobId?: unknown; deviceResult?: { jobId?: unknown } } } | undefined)?.result;
  const jobId = controlResult?.jobId ?? controlResult?.deviceResult?.jobId;
  return typeof jobId === 'string' && jobId.trim() ? jobId.trim() : null;
}

function getControlJobStatus(result: unknown) {
  const responseStatus = (result as { status?: unknown } | undefined)?.status;
  const controlResult = (result as { result?: { status?: unknown; finalStatus?: unknown; job?: { status?: unknown } } } | undefined)?.result;
  const status = responseStatus ?? controlResult?.status ?? controlResult?.finalStatus ?? controlResult?.job?.status;
  return typeof status === 'string' ? status.toUpperCase() : null;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getOperationMessageChannelLabel(channel: string | null | undefined) {
  if (channel === 'WHATSAPP') return 'WhatsApp';
  if (channel === 'PORTARIA' || channel === 'APP') return 'Aplicativo';
  return 'Portaria';
}

function getWhatsAppConnectionLabel(state: string | null | undefined, enabled: boolean | undefined) {
  const normalized = state?.trim().toLowerCase();

  if (enabled === false) return 'Desativado';
  if (normalized === 'open') return 'Conectado';
  if (normalized === 'connecting') return 'Conectando';
  if (normalized === 'qr' || normalized === 'qrcode' || normalized === 'awaiting_qr_scan') return 'Aguardando leitura do QR code';
  if (normalized === 'close' || normalized === 'closed' || normalized === 'disconnected') return 'Desconectado';
  if (normalized === 'pairing') return 'Aguardando pareamento';
  if (state?.trim()) return state;
  return 'Não conectado';
}

function mergeOperationMessagesById(messages: OperationMessage[]) {
  const itemsById = new Map<string, OperationMessage>();

  messages.forEach((message) => {
    if (!message?.id) return;
    itemsById.set(message.id, message);
  });

  return sortOperationMessages([...itemsById.values()]);
}

function sortOperationMessages(messages: OperationMessage[]) {
  return [...messages].sort((left, right) => {
    const leftUnread = left.readAt ? 0 : 1;
    const rightUnread = right.readAt ? 0 : 1;
    if (leftUnread !== rightUnread) return rightUnread - leftUnread;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

const UNIT_CONVERSATION_PERSON_PREFIX = 'unit-conversation:';

function isUnitConversationPerson(person: Person | null | undefined) {
  return Boolean(person?.id?.startsWith(UNIT_CONVERSATION_PERSON_PREFIX));
}

type OperationSnapshotCache = {
  people: Person[];
  deliveries: Delivery[];
  cameras: Camera[];
  alerts: Alert[];
  reports: Report[];
  accessLogs: AccessLog[];
  units: Unit[];
  operationActions: OperationAction[];
  recentShiftChanges: OperationShiftChange[];
  cachedAt: string | null;
};

type QuickPersonFormData = {
  name: string;
  email: string;
  phone: string;
  document: string;
  photoUrl: string;
  category: PersonCategory;
  unitId: string;
  startDate: string;
  endDate: string;
};

const initialQuickPersonForm: QuickPersonFormData = {
  name: '',
  email: '',
  phone: '',
  document: '',
  photoUrl: '',
  category: 'VISITOR',
  unitId: '',
  startDate: '',
  endDate: '',
};

type OccurrenceFormData = {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  scopeType: 'CONDOMINIUM' | 'UNIT';
  unitId: string;
};

type EntryFormState = {
  personIds: string[];
  unitId: string;
  search: string;
};

type ExitFormState = {
  personIds: string[];
  search: string;
};

type DeliveryFormState = {
  recipientUnitId: string;
  recipientPersonId: string;
  deliveryCompany: string;
  trackingCode: string;
  receivedAt: string;
  photoUrl: string;
};

type ActiveShiftDraft = {
  startedAt: string;
  operatorId?: string | null;
  operatorName?: string | null;
  condominiumId?: string | null;
  condominiumName?: string | null;
};

const initialOccurrenceForm: OccurrenceFormData = {
  title: '',
  description: '',
  priority: 'medium',
  scopeType: 'CONDOMINIUM',
  unitId: '',
};

const initialEntryForm: EntryFormState = {
  personIds: [],
  unitId: '',
  search: '',
};

const initialExitForm: ExitFormState = {
  personIds: [],
  search: '',
};

const initialDeliveryForm: DeliveryFormState = {
  recipientUnitId: '',
  recipientPersonId: '',
  deliveryCompany: '',
  trackingCode: '',
  receivedAt: '',
  photoUrl: '',
};

type PhotoSearchPanelState = {
  result: OperationPhotoSearchResponse | null;
  loading: boolean;
  error: string | null;
  sourceLabel: string | null;
  lastFileName: string | null;
  fallbackPreviewUrl: string | null;
};

const initialPhotoSearchPanelState: PhotoSearchPanelState = {
  result: null,
  loading: false,
  error: null,
  sourceLabel: null,
  lastFileName: null,
  fallbackPreviewUrl: null,
};

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const [, base64] = value.split(',', 2);
      if (!base64) {
        reject(new Error('Não foi possível ler a imagem selecionada.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });
}

function getDeviceStatusTone(status?: string | null) {
  const normalized = String(status ?? '').trim().toUpperCase();
  if (normalized === 'ONLINE') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';
  if (normalized === 'OFFLINE') return 'border-rose-400/20 bg-rose-400/10 text-rose-100';
  return 'border-white/10 bg-white/10 text-slate-200';
}

function QuickPersonForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
  errorMessage,
  units,
  categoryLocked = false,
  submitLabel = 'Salvar cadastro',
  visitorDocumentRequired,
  onToggleVisitorDocumentRequired,
}: {
  value: QuickPersonFormData;
  onChange: (field: keyof QuickPersonFormData, nextValue: string) => void;
  onSubmit: () => Promise<void> | void;
  onCancel: () => void;
  loading: boolean;
  errorMessage?: string | null;
  units: Array<{ id: string; label: string }>;
  categoryLocked?: boolean;
  submitLabel?: string;
  visitorDocumentRequired: boolean;
  onToggleVisitorDocumentRequired: (value: boolean) => void;
}) {
  const [unitSearch, setUnitSearch] = useState('');
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [webcamActive, setWebcamActive] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const {
    data: searchedUnits = [],
    isFetching: loadingSearchedUnits,
  } = useOperationUnitSearch(unitSearch, unitSearch.trim().length >= 2);
  const selectedUnitLabel = units.find((unit) => unit.id === value.unitId)?.label ?? '';
  const filteredUnits = units.filter((unit) => {
    const search = normalizeText(unitSearch || selectedUnitLabel);
    if (!search) return true;
    return normalizeText(unit.label).includes(search);
  });
  const visibleUnits = unitSearch.trim().length >= 2 && searchedUnits.length
    ? searchedUnits.map((unit) => ({
        id: unit.id,
        label: [unit.condominiumName, unit.label].filter(Boolean).join(' / ') || unit.label,
      }))
    : filteredUnits;

  function handlePhotoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError(null);

    const reader = new FileReader();
    reader.onload = () => {
      onChange('photoUrl', typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function startWebcam() {
    try {
      setPhotoError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setWebcamActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setPhotoError('Não foi possível acessar a webcam deste computador.');
    }
  }

  function stopWebcam() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  }

  function captureWebcamPhoto() {
    if (!videoRef.current || !canvasRef.current) {
      setPhotoError('Webcam indisponível para capturar a foto.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');

    if (!context) {
      setPhotoError('Não foi possível processar a imagem da webcam.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    onChange('photoUrl', canvas.toDataURL('image/jpeg', 0.92));
    setPhotoInputKey((current) => current + 1);
    stopWebcam();
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit();
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Nome</span>
          <input value={value.name} onChange={(event) => onChange('name', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Nome completo" required />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Categoria</span>
          <select
            value={value.category}
            onChange={(event) => onChange('category', event.target.value)}
            disabled={categoryLocked}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="VISITOR">Visitante</option>
            <option value="SERVICE_PROVIDER">Prestador de serviço</option>
            <option value="RENTER">Locatário</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Documento</span>
          <input value={value.document} onChange={(event) => onChange('document', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="CPF ou documento" />
          {value.category === 'VISITOR' ? (
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={visitorDocumentRequired}
                onChange={(event) => onToggleVisitorDocumentRequired(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Exigir CPF/documento para visitante.
                <span className="mt-1 block text-slate-500">
                  Quando desligado, o visitante pode ser salvo sem documento no front.
                </span>
              </span>
            </label>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Telefone</span>
          <input value={value.phone} onChange={(event) => onChange('phone', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Telefone" />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">E-mail</span>
          <input type="email" value={value.email} onChange={(event) => onChange('email', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="email@exemplo.com" />
        </label>
        <div className="space-y-2 md:col-span-2">
          <span className="text-sm text-slate-300">Foto</span>
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[120px_1fr]">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-xs text-slate-400">
              {value.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value.photoUrl} alt="Foto do cadastro" className="h-full w-full object-cover" />
              ) : (
                <span>Sem foto</span>
              )}
            </div>
            <div className="space-y-3">
              <input
                key={photoInputKey}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void startWebcam()}
                  disabled={webcamActive}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Abrir webcam
                </button>
                {webcamActive ? (
                  <>
                    <button
                      type="button"
                      onClick={captureWebcamPhoto}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition ${brandClasses.solidAccent}`}
                    >
                      Capturar foto
                    </button>
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/15"
                    >
                      Fechar webcam
                    </button>
                  </>
                ) : null}
              </div>
              {webcamActive ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline autoPlay />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <canvas ref={canvasRef} className="hidden" />
              )}
              <input
                value={value.photoUrl.startsWith('data:') ? '' : value.photoUrl}
                onChange={(event) => onChange('photoUrl', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Ou informe uma URL de foto"
              />
              {value.photoUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('photoUrl', '');
                    setPhotoInputKey((current) => current + 1);
                    setPhotoError(null);
                  }}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/15"
                >
                  Remover foto
                </button>
              ) : null}
              {photoError ? <p className="text-xs text-red-200">{photoError}</p> : null}
            </div>
          </div>
        </div>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Unidade</span>
          <div className="space-y-2">
            <input
              value={unitSearch || selectedUnitLabel}
              onChange={(event) => {
                setUnitSearch(event.target.value);
                if (value.unitId) onChange('unitId', '');
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="Busque a unidade de destino"
            />
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80">
              {units.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400">Nenhuma unidade carregada.</div>
              ) : loadingSearchedUnits ? (
                <div className="px-4 py-3 text-sm text-slate-400">Consultando unidades...</div>
              ) : visibleUnits.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400">Nenhuma unidade encontrada para essa busca.</div>
              ) : (
                visibleUnits.slice(0, 12).map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      onChange('unitId', unit.id);
                      setUnitSearch('');
                    }}
                    className={`block w-full border-b border-white/5 px-4 py-3 text-left text-sm transition last:border-b-0 ${
                      value.unitId === unit.id ? 'bg-cyan-500/15 text-cyan-100' : 'text-white hover:bg-white/5'
                    }`}
                  >
                    {unit.label}
                  </button>
                ))
              )}
            </div>
            <input type="hidden" value={value.unitId} required />
          </div>
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Inicio previsto</span>
          <input type="datetime-local" value={value.startDate} onChange={(event) => onChange('startDate', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Fim previsto</span>
          <input type="datetime-local" value={value.endDate} onChange={(event) => onChange('endDate', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        </label>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className={`rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${brandClasses.solidAccent}`}>
          {loading ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function QuickDeliveryForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
  errorMessage,
  units,
  people,
}: {
  value: DeliveryFormState;
  onChange: (field: keyof DeliveryFormState, nextValue: string) => void;
  onSubmit: () => Promise<void> | void;
  onCancel: () => void;
  loading: boolean;
  errorMessage?: string | null;
  units: Array<{ id: string; label: string }>;
  people: Person[];
}) {
  const [unitSearch, setUnitSearch] = useState('');
  const {
    data: searchedUnits = [],
    isFetching: loadingSearchedUnits,
  } = useOperationUnitSearch(unitSearch, unitSearch.trim().length >= 2);
  const selectedUnitLabel = units.find((unit) => unit.id === value.recipientUnitId)?.label ?? '';
  const visibleUnits = unitSearch.trim().length >= 2 && searchedUnits.length
    ? searchedUnits.map((unit) => ({
        id: unit.id,
        label: [unit.condominiumName, unit.label].filter(Boolean).join(' / ') || unit.label,
      }))
    : units.filter((unit) => {
        const search = normalizeText(unitSearch || selectedUnitLabel);
        if (!search) return true;
        return normalizeText(unit.label).includes(search);
      });
  const { data: unitResidents = [], isFetching: loadingUnitResidentsResidents } = useUnitResidents(value.recipientUnitId, Boolean(value.recipientUnitId));
  const availablePeople = useMemo(() => {
    if (unitResidents.length > 0) {
      return unitResidents.map((person) => ({ id: person.id, name: person.name }));
    }
    return people
      .filter((person) => !value.recipientUnitId || person.unitId === value.recipientUnitId)
      .map((person) => ({ id: person.id, name: person.name }));
  }, [people, unitResidents, value.recipientUnitId]);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit();
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Unidade de destino</span>
          <div className="space-y-2">
            <input
              value={unitSearch || selectedUnitLabel}
              onChange={(event) => {
                setUnitSearch(event.target.value);
                if (value.recipientUnitId) {
                  onChange('recipientUnitId', '');
                  onChange('recipientPersonId', '');
                }
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="Busque a unidade de destino"
              required={!value.recipientUnitId}
            />
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80">
              {units.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400">Nenhuma unidade carregada.</div>
              ) : loadingSearchedUnits ? (
                <div className="px-4 py-3 text-sm text-slate-400">Consultando unidades...</div>
              ) : visibleUnits.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400">Nenhuma unidade encontrada para essa busca.</div>
              ) : (
                visibleUnits.slice(0, 12).map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      onChange('recipientUnitId', unit.id);
                      onChange('recipientPersonId', '');
                      setUnitSearch('');
                    }}
                    className={`block w-full border-b border-white/5 px-4 py-3 text-left text-sm transition last:border-b-0 ${
                      value.recipientUnitId === unit.id ? 'bg-cyan-500/15 text-cyan-100' : 'text-white hover:bg-white/5'
                    }`}
                  >
                    {unit.label}
                  </button>
                ))
              )}
            </div>
            <input type="hidden" value={value.recipientUnitId} required />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Destinatário</span>
          <select
            value={value.recipientPersonId}
            onChange={(event) => onChange('recipientPersonId', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="">Não vincular a uma pessoa específica</option>
            {loadingUnitResidentsResidents ? <option value="">Carregando moradores da unidade...</option> : null}
            {availablePeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Transportadora</span>
          <input
            value={value.deliveryCompany}
            onChange={(event) => onChange('deliveryCompany', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Correios, Amazon, Mercado Livre"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Código de rastreio</span>
          <input
            value={value.trackingCode}
            onChange={(event) => onChange('trackingCode', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Opcional"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Entrada na portaria</span>
          <input
            type="datetime-local"
            value={value.receivedAt}
            onChange={(event) => onChange('receivedAt', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">URL da foto</span>
          <input
            value={value.photoUrl}
            onChange={(event) => onChange('photoUrl', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Opcional"
          />
        </label>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className={`rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${brandClasses.solidAccent}`}>
          {loading ? 'Registrando...' : 'Registrar encomenda'}
        </button>
      </div>
    </form>
  );
}

function OperationalPersonSummaryCard({
  person,
  now,
  latestAccessAction,
  accessSummary,
  highlighted = false,
  revealSensitive = false,
  unitLabel,
}: {
  person: Person;
  now: Date;
  latestAccessAction?: 'ENTRY' | 'EXIT';
  accessSummary?: {
    entryAt?: string | null;
    exitAt?: string | null;
  } | null;
  highlighted?: boolean;
  revealSensitive?: boolean;
  unitLabel?: string | null;
}) {
  const scheduleState = getScheduleState(person, now);
  const faceReadiness = getFaceReadiness(person);
  const resolvedUnitLabel =
    unitLabel?.trim() ||
    [getCompleteUnitLabel(person.unit, person.unitName ?? person.unitId)]
      .filter(Boolean)
      .join(' / ') || (person.unitId ? 'Unidade não identificada' : 'Não informada');
  const hasUnresolvedUnit = isUnresolvedUnitLabel(resolvedUnitLabel);

  return (
    <div className={`rounded-2xl border p-4 transition ${highlighted ? `${brandClasses.softAccentMuted} shadow-[0_0_0_1px_rgba(255,255,255,0.05)]` : 'border-white/10 bg-white/[0.035]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-sm font-semibold text-slate-200">
            {person.photoUrl ? (
              <Image
                src={person.photoUrl}
                alt={person.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span>{getPersonInitials(person.name)}</span>
            )}
          </div>
          <div>
            <p className="font-medium text-white">{person.name}</p>
            <p className="mt-1 text-sm text-slate-400">{getPersonLabel(person)}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded-full border px-2 py-1 ${getPresenceStateClass(person, latestAccessAction)}`}>
                {getPresenceStateLabel(person, latestAccessAction)}
              </span>
              <span className={`rounded-full border px-2 py-1 ${faceReadiness.className}`}>{faceReadiness.label}</span>
              <span className={`rounded-full border px-2 py-1 ${scheduleState.className}`}>{scheduleState.label}</span>
              {hasUnresolvedUnit ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/12 px-2 py-1 text-amber-100">
                  unidade inconsistente
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] ${getPersonStatusBadgeClass(person.statusLabel || person.status)}`}>
          {person.statusLabel || person.status}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
        <span>Documento: {person.document?.trim() ? maskDocument(person.document) : 'Não informado'}</span>
        <span>Telefone: {person.phone?.trim() ? (revealSensitive ? person.phone : maskPhone(person.phone)) : 'Não informado'}</span>
        <span>E-mail: {person.email?.trim() ? maskEmail(person.email) : 'Não informado'}</span>
        <span>Cadastro: {formatOptionalDateTime(person.createdAt)}</span>
        <span>Inicio previsto: {formatOptionalDateTime(person.startDate)}</span>
        <span>Fim previsto: {formatOptionalDateTime(person.endDate)}</span>
        <span>Unidade: {resolvedUnitLabel}</span>
        <span>Condomínio: {person.unit?.condominium?.name || 'Não informado'}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>Última entrada: {formatAccessDateTime(accessSummary?.entryAt)}</span>
        <span>Última saída: {formatAccessDateTime(accessSummary?.exitAt)}</span>
      </div>
    </div>
  );
}

function getCameraBadgeTone(status: Camera['status']) {
  return status === 'ONLINE' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-red-400/20 bg-red-400/10 text-red-300';
}

function getScopeLabel(camera: Camera, unitLabels: Map<string, string>) {
  if (!camera.unitId) return 'Área comum do condomínio';
  return unitLabels.get(camera.unitId) ?? unitLabels.get(getUnitReference(camera.unitId)) ?? 'Unidade não identificada';
}

function getAlertTone(type: Alert['type']) {
  if (type === 'PANIC' || type === 'ACCESS_DENIED' || type === 'CAMERA_OFFLINE') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (type === 'WARNING' || type === 'UNKNOWN_PERSON') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100';
}

function getPersonLabel(person: Person) {
  return person.categoryLabel || person.category || 'Pessoa';
}

function getCategoryLabel(category: PersonCategory) {
  if (category === 'VISITOR') return 'Visitante';
  if (category === 'SERVICE_PROVIDER') return 'Prestador';
  if (category === 'RENTER') return 'Locatário';
  if (category === 'DELIVERER') return 'Entregador';
  return 'Morador';
}

function getCategoryTextClass(category: PersonCategory) {
  if (category === 'RESIDENT') return 'text-sky-200 font-semibold';
  if (category === 'VISITOR') return 'text-fuchsia-200 font-semibold';
  if (category === 'SERVICE_PROVIDER') return 'text-amber-200 font-semibold';
  if (category === 'RENTER') return 'text-emerald-200 font-semibold';
  return 'text-rose-200 font-semibold';
}

function formatNow(now: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const axiosLikeError = error as {
    response?: {
      status?: number;
      data?: {
        detail?: unknown;
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  const detail = axiosLikeError.response?.data?.detail;
  const message = axiosLikeError.response?.data?.message;
  const errorMessage = axiosLikeError.response?.data?.error;

  function humanizeApiMessage(raw: string) {
    const normalized = raw.trim();
    const upper = normalized.toUpperCase();

    if (
      upper.includes('UNITID') ||
      upper.includes('UNITIDS')
    ) {
      if (upper.includes('VISITOR') || upper.includes('SERVICE_PROVIDER') || upper.includes('DELIVERER') || upper.includes('RENTER')) {
        return 'Selecione a unidade de destino antes de cadastrar visitante, prestador, entregador ou locatário.';
      }

      return 'Selecione a unidade vinculada antes de continuar.';
    }

    if (upper.includes('DOCUMENT') || upper.includes('CPF')) {
      return 'Informe o CPF ou documento da pessoa antes de continuar.';
    }

    if (upper.includes('NAME')) {
      return 'Informe o nome da pessoa antes de continuar.';
    }

    if (upper.includes('PHONE')) {
      return 'Verifique o telefone informado.';
    }

    if (upper.includes('EMAIL')) {
      return 'Verifique o e-mail informado.';
    }

    if (
      upper.includes('EXACTLY ONE') ||
      upper.includes('INFORME EXATAMENTE UM') ||
      (upper.includes('PHOTOURL') && upper.includes('PHOTOBASE64') && upper.includes('CAMERAID'))
    ) {
      return 'Escolha apenas uma origem para a busca facial: uma câmera ou uma imagem enviada.';
    }

    return normalized;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const formatted = detail
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as { loc?: unknown[]; msg?: string; type?: string };
        const field = Array.isArray(record.loc) ? String(record.loc.at(-1) ?? '').trim() : '';
        const mappedField =
          field === 'name'
            ? 'nome'
            : field === 'document'
              ? 'documento'
              : field === 'phone'
                ? 'telefone'
                : field === 'email'
                  ? 'e-mail'
                  : field === 'unitId'
                    ? 'unidade'
                    : field === 'category'
                      ? 'categoria'
                      : field === 'startDate'
                        ? 'inicio previsto'
                        : field === 'endDate'
                          ? 'fim previsto'
                          : field;
        const itemMessage = String(record.msg ?? '').trim();

        if (!mappedField && itemMessage) return itemMessage;
        if (mappedField && itemMessage) return `${mappedField}: ${itemMessage}`;
        return null;
      })
      .filter(Boolean)
      .join(' | ');

    if (formatted) return humanizeApiMessage(formatted);
  }

  if (typeof detail === 'string' && detail.trim()) {
    return humanizeApiMessage(detail);
  }

  if (typeof message === 'string' && message.trim()) {
    return humanizeApiMessage(message);
  }

  if (typeof errorMessage === 'string' && errorMessage.trim()) {
    return humanizeApiMessage(errorMessage);
  }

  if (axiosLikeError.response?.status === 400) {
    return 'Os dados informados são inválidos. Verifique nome, documento, unidade e campos obrigatórios.';
  }

  if (axiosLikeError.response?.status === 403) {
    return 'A unidade selecionada não pertence ao vínculo permitido para esta operação.';
  }

  if (error instanceof Error && error.message && !error.message.includes('Request failed with status code')) {
    return error.message;
  }

  return fallback;
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function sanitizeAlertCopy(value?: string | null) {
  return String(value ?? '')
    .replace(/detecnado/gi, 'detectado')
    .replace(/detecdta/gi, 'detectada')
    .replace(/detecdado/gi, 'detectado')
    .replace(/detecnado/gi, 'detectado')
    .trim();
}

function appendUnitContext(baseText: string, unitLabel?: string | null) {
  const normalizedBase = normalizeText(baseText);
  const normalizedUnit = normalizeText(unitLabel);
  if (!normalizedUnit || normalizedUnit.includes('sem unidade') || normalizedUnit.includes('não identificada')) {
    return baseText;
  }
  if (normalizedBase.includes(normalizedUnit)) {
    return baseText;
  }
  return `${baseText} - ${unitLabel}`;
}

function getOperationEventPayloadString(event: OperationEvent, ...keys: string[]) {
  for (const key of keys) {
    const value = event.payload?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

type AlertMediaItem = {
  key: string;
  cameraId?: string | null;
  cameraName?: string | null;
  snapshotUrl?: string | null;
  liveUrl?: string | null;
  replayUrl?: string | null;
};

type CameraAlertFocusPayload = {
  id: string;
  title: string;
  timestamp: string;
  cameraIds: string[];
  media: AlertMediaItem[];
};

function getObjectString(source: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function readDeviceAlertCameraMap() {
  if (typeof window === 'undefined') return {} as Record<string, string[]>;
  try {
    const raw = window.localStorage.getItem(DEVICE_ALERT_CAMERAS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([deviceId, cameraIds]) => [
        deviceId,
        Array.isArray(cameraIds) ? cameraIds.filter((id): id is string => typeof id === 'string') : [],
      ])
    );
  } catch {
    return {};
  }
}

function getAlertMediaItems(alert?: Alert | null): AlertMediaItem[] {
  if (!alert) return [];

  const payload = alert.payload && typeof alert.payload === 'object' ? alert.payload : {};
  const items: AlertMediaItem[] = [];

  const addItem = (item: Omit<AlertMediaItem, 'key'> & { key?: string | null }) => {
    if (!item.snapshotUrl && !item.liveUrl && !item.replayUrl && !item.cameraId) return;
    const key = item.key || item.cameraId || item.snapshotUrl || item.liveUrl || item.replayUrl || `media-${items.length}`;
    if (items.some((current) => current.key === key)) return;
    items.push({ ...item, key });
  };

  alert.cameras?.forEach((camera, index) => {
    addItem({
      key: camera.id ?? camera.cameraId ?? `alert-camera-${index}`,
      cameraId: camera.cameraId ?? camera.id ?? null,
      cameraName: camera.cameraName ?? camera.name ?? camera.label ?? null,
      snapshotUrl: camera.snapshotUrl ?? camera.imageUrl ?? camera.thumbnailUrl ?? null,
      liveUrl: camera.liveUrl ?? camera.hlsUrl ?? camera.preferredLiveUrl ?? null,
      replayUrl: camera.replayUrl ?? null,
    });
  });

  addItem({
    key: alert.cameraId ?? alert.snapshotUrl ?? alert.replayUrl ?? null,
    cameraId: alert.cameraId ?? getObjectString(payload, 'cameraId', 'camera_id'),
    cameraName: getObjectString(payload, 'cameraName', 'camera_name'),
    snapshotUrl: alert.snapshotUrl ?? alert.imageUrl ?? alert.thumbnailUrl ?? alert.photoUrl ?? getObjectString(payload, 'snapshotUrl', 'snapshot_url', 'imageUrl', 'image_url'),
    liveUrl: getObjectString(payload, 'liveUrl', 'live_url', 'hlsUrl', 'hls_url'),
    replayUrl: alert.replayUrl ?? getObjectString(payload, 'replayUrl', 'replay_url'),
  });

  const payloadArrays = ['cameras', 'cameraEvidence', 'cameraSnapshots', 'snapshots', 'replays', 'evidence'];
  payloadArrays.forEach((key) => {
    const value = payload[key];
    if (!Array.isArray(value)) return;

    value.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const record = entry as Record<string, unknown>;
      addItem({
        key: getObjectString(record, 'id', 'cameraId', 'camera_id') ?? `${key}-${index}`,
        cameraId: getObjectString(record, 'cameraId', 'camera_id', 'id'),
        cameraName: getObjectString(record, 'cameraName', 'camera_name', 'name', 'label'),
        snapshotUrl: getObjectString(record, 'snapshotUrl', 'snapshot_url', 'imageUrl', 'image_url', 'thumbnailUrl', 'thumbnail_url'),
        liveUrl: getObjectString(record, 'liveUrl', 'live_url', 'hlsUrl', 'hls_url', 'preferredLiveUrl', 'preferred_live_url'),
        replayUrl: getObjectString(record, 'replayUrl', 'replay_url', 'url'),
      });
    });
  });

  const cameraIds = payload.cameraIds ?? payload.camera_ids;
  if (Array.isArray(cameraIds)) {
    cameraIds.forEach((cameraId, index) => {
      if (typeof cameraId !== 'string' || !cameraId.trim()) return;
      addItem({ key: `camera-${cameraId}`, cameraId, cameraName: `Câmera ${index + 1}` });
    });
  }

  const deviceId = getObjectString(payload, 'deviceId', 'device_id') ?? getObjectString(payload, 'sourceDeviceId', 'source_device_id');
  const mappedCameraIds = deviceId ? readDeviceAlertCameraMap()[deviceId] ?? [] : [];
  mappedCameraIds.forEach((cameraId, index) => {
    addItem({ key: `device-${deviceId}-camera-${cameraId}`, cameraId, cameraName: `Câmera vinculada ${index + 1}` });
  });

  return items;
}

function buildCameraAlertFocusPayload(alert: Alert): CameraAlertFocusPayload | null {
  const media = getAlertMediaItems(alert);
  const cameraIds = Array.from(
    new Set(
      [
        alert.cameraId,
        ...media.map((item) => item.cameraId),
      ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    )
  );

  if (!cameraIds.length && !media.length) return null;

  return {
    id: alert.id,
    title: alert.title || 'Ocorrência',
    timestamp: new Date().toISOString(),
    cameraIds,
    media,
  };
}

function operationEventToAlert(event: OperationEvent): Alert | null {
  const eventType = String(event.eventType ?? event.type ?? '').toUpperCase();
  const entityType = String(event.entityType ?? '').toUpperCase();
  const trigger = getOperationEventPayloadString(event, 'trigger', 'eventTrigger', 'event_type', 'eventType');
  const normalizedTrigger = String(trigger ?? '').toUpperCase();
  const isAlertEvent =
    entityType === 'ALERT' ||
    eventType.includes('ALERT') ||
    eventType.includes('DANGER') ||
    eventType.includes('DOOR') ||
    normalizedTrigger.includes('CONTROL_ID_DOOR');

  if (!isAlertEvent) return null;

  const title =
    event.title ||
    getOperationEventPayloadString(event, 'title') ||
    (normalizedTrigger.includes('FORCED_OPEN') ? 'Arrombamento detectado no Control iD' : 'Alerta operacional');
  const description =
    event.body ||
    getOperationEventPayloadString(event, 'description', 'message', 'body') ||
    trigger ||
    null;
  const critical =
    eventType.includes('DANGER') ||
    eventType.includes('PANIC') ||
    eventType.includes('FORCED') ||
    normalizedTrigger.includes('FORCED') ||
    normalizeText(title).includes('arrombamento');

  return {
    id: String(event.entityId ?? event.eventId ?? event.id),
    alertId: String(event.eventId ?? event.id),
    title,
    description,
    type: critical ? 'DANGER' : 'INFO',
    status: 'UNREAD',
    severity: critical ? 'CRITICAL' : 'INFO',
    timestamp: String(event.occurredAt ?? event.timestamp ?? event.createdAt ?? new Date().toISOString()),
    cameraId: event.cameraId ?? getOperationEventPayloadString(event, 'cameraId', 'camera_id'),
    personId: getOperationEventPayloadString(event, 'personId', 'person_id'),
    snapshotUrl: getOperationEventPayloadString(event, 'snapshotUrl', 'snapshot_url'),
    imageUrl: getOperationEventPayloadString(event, 'imageUrl', 'image_url'),
    replayUrl: getOperationEventPayloadString(event, 'replayUrl', 'replay_url'),
    location: getOperationEventPayloadString(event, 'location', 'deviceName', 'doorName'),
    readAt: null,
    workflow: null,
    payload: {
      ...event.payload,
      deviceId: getOperationEventPayloadString(event, 'deviceId', 'device_id') ?? event.entityId ?? null,
    },
  };
}

function playAlertSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.7);
    gain.connect(audioContext.destination);

    [0, 0.18, 0.36].forEach((offset) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + offset);
      oscillator.connect(gain);
      oscillator.start(audioContext.currentTime + offset);
      oscillator.stop(audioContext.currentTime + offset + 0.12);
    });

    window.setTimeout(() => {
      void audioContext.close();
    }, 900);
  } catch {
    // Browsers can block audio before the first user interaction. The modal still calls attention visually.
  }
}

function playMessageSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
    gain.connect(audioContext.destination);

    [0, 0.16].forEach((offset) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + offset);
      oscillator.connect(gain);
      oscillator.start(audioContext.currentTime + offset);
      oscillator.stop(audioContext.currentTime + offset + 0.09);
    });

    window.setTimeout(() => {
      void audioContext.close();
    }, 550);
  } catch {
    // O navegador pode bloquear audio antes da primeira interacao; o destaque visual permanece.
  }
}

function isUnresolvedUnitLabel(label?: string | null) {
  const normalized = normalizeText(label);
  return normalized.includes('unidade não resolvida');
}

function getCompleteUnitLabel(unit?: Unit | null, fallback?: string | null) {
  const structureLabel = unit?.structure?.label?.trim() || unit?.structureLabel?.trim() || '';
  const rawStructureType = unit?.structure?.type || unit?.structureType || (structureLabel ? 'STREET' : null);
  const structureTypeLabel =
    rawStructureType === 'BLOCK'
      ? 'BLOCO'
      : rawStructureType === 'QUAD'
        ? 'QUADRA'
        : rawStructureType === 'LOT'
          ? 'LOTE'
          : rawStructureType === 'STREET'
            ? 'RUA'
            : '';
  const unitLabel = unit?.label?.trim() || fallback?.trim() || '';
  const condominiumName = unit?.condominium?.name?.trim() || unit?.condominiumName?.trim() || '';
  const legacyReference = unit?.legacyUnitId?.trim() || '';

  if (structureLabel && unitLabel) {
    return `${[structureTypeLabel, structureLabel].filter(Boolean).join(' ')} - ${unitLabel}`;
  }

  if (legacyReference && legacyReference !== unitLabel) {
    return legacyReference;
  }

  return unitLabel || fallback?.trim() || condominiumName;
}

function isTechnicalIdentifier(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) return true;
  if (/^[0-9a-f]{6,}(-[0-9a-f]{4,})+$/i.test(normalized)) return true;
  return /^[0-9a-f]{16,}$/i.test(normalized);
}

function getPresenceStateLabel(person: Person, latestAccessAction?: 'ENTRY' | 'EXIT') {
  if (latestAccessAction === 'ENTRY') return 'dentro';
  if (latestAccessAction === 'EXIT') return 'fora';
  if (person.status === 'BLOCKED') return 'bloqueado';
  if (person.status === 'EXPIRED') return 'vencido';
  if (person.status === 'ACTIVE') return 'ativo';
  return 'inativo';
}

function getPresenceStateClass(person: Person, latestAccessAction?: 'ENTRY' | 'EXIT') {
  if (latestAccessAction === 'ENTRY') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  if (latestAccessAction === 'EXIT') return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
  if (person.status === 'BLOCKED') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (person.status === 'EXPIRED') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (person.status === 'ACTIVE') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100';
  return 'border-white/10 bg-slate-950/60 text-slate-300';
}

function getScheduleState(person: Person, now: Date) {
  if (!person.endDate) {
    return {
      label: 'Sem limite de permanência',
      className: 'border-white/10 bg-white/5 text-slate-300',
    };
  }

  const endDate = new Date(person.endDate);
  if (Number.isNaN(endDate.getTime())) {
    return {
      label: 'Horário inválido',
      className: 'border-white/10 bg-white/5 text-slate-300',
    };
  }

  if (endDate.getTime() < now.getTime()) {
    return {
      label: 'Permanência vencida',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    };
  }

  return {
      label: `Válido até ${endDate.toLocaleString('pt-BR')}`,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  };
}

function getPersonInitials(name?: string | null) {
  const tokens = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) return 'PS';
  return tokens.map((token) => token[0]?.toUpperCase() ?? '').join('');
}

function formatOptionalDateTime(value?: string | null) {
  if (!value) return 'Não informado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Não informado';
  return parsed.toLocaleString('pt-BR');
}

function getShiftStorageKey(userId?: string | null) {
  return userId ? `operation-active-shift:${userId}` : null;
}

function parseStoredShift(value: string | null): ActiveShiftDraft | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as ActiveShiftDraft;
    if (!parsed.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getAlertSeverityRank(alert: Alert) {
  if (alert.severity === 'CRITICAL' || alert.type === 'PANIC' || alert.type === 'DANGER') return 3;
  if (alert.severity === 'WARNING' || alert.type === 'WARNING' || alert.type === 'ACCESS_DENIED' || alert.type === 'CAMERA_OFFLINE' || alert.type === 'UNKNOWN_PERSON') return 2;
  return 1;
}

function getAlertSeverityLabel(alert: Alert) {
  const rank = getAlertSeverityRank(alert);
  if (rank >= 3) return 'Crítico';
  if (rank === 2) return 'Atenção';
  return 'Informativo';
}

function getAlertSeverityClass(rank: number) {
  if (rank >= 3) return 'border-red-400/30 bg-red-500/15 text-red-100';
  if (rank === 2) return 'border-amber-400/30 bg-amber-500/15 text-amber-100';
  return 'border-sky-400/30 bg-sky-500/15 text-sky-100';
}

function getAlertQueueRank(workflowStatus: 'NEW' | 'ON_HOLD' | 'RESOLVED') {
  if (workflowStatus === 'NEW') return 3;
  if (workflowStatus === 'ON_HOLD') return 2;
  return 1;
}

function isWithinShiftPeriod(value: string | null | undefined, startedAt: string) {
  if (!value) return false;

  const compared = new Date(value).getTime();
  const start = new Date(startedAt).getTime();

  if (Number.isNaN(compared) || Number.isNaN(start)) return false;
  return compared >= start;
}

function getFaceReadiness(person: Person) {
  if (person.photoUrl?.trim()) {
    return {
      label: 'Foto disponível',
      className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
    };
  }

  return {
    label: 'Sem foto',
    className: 'border-white/10 bg-white/5 text-slate-300',
  };
}

function mergeUnits(primary: Unit[], fallbackPeople: Person[]) {
  const map = new Map<string, Unit>();

  primary.forEach((unit) => {
    map.set(unit.id, unit);
    if (unit.legacyUnitId) {
      map.set(unit.legacyUnitId, unit);
      const shortReference = getUnitReference(unit.legacyUnitId);
      if (shortReference) map.set(shortReference, unit);
    }
  });

  fallbackPeople.forEach((person) => {
    if (person.unit?.id) {
      map.set(person.unit.id, person.unit);
      if (person.unit.legacyUnitId) {
        map.set(person.unit.legacyUnitId, person.unit);
        const shortReference = getUnitReference(person.unit.legacyUnitId);
        if (shortReference) map.set(shortReference, person.unit);
      }
      return;
    }

    if (person.unitId && !map.has(person.unitId)) {
      const derivedLabel =
        person.unit?.label ||
        person.unit?.legacyUnitId ||
        getUnitReference(person.unitId);

      map.set(person.unitId, {
        id: person.unitId,
        label: derivedLabel,
        condominiumId: null,
        condominium: null,
        structureType: null,
        structure: null,
        streetId: null,
        legacyUnitId: getUnitReference(person.unitId),
      });
    }
  });

  return Array.from(map.values());
}

function getOperationSnapshotKey(userId?: string | null) {
  return userId ? `operation-snapshot:${userId}` : null;
}

function readOperationSnapshotCache(userId?: string | null): OperationSnapshotCache {
  if (typeof window === 'undefined') {
    return {
      people: [],
      deliveries: [],
      cameras: [],
      alerts: [],
      reports: [],
      accessLogs: [],
      units: [],
      operationActions: [],
      recentShiftChanges: [],
      cachedAt: null,
    };
  }

  const key = getOperationSnapshotKey(userId);
  if (!key) {
    return {
      people: [],
      deliveries: [],
      cameras: [],
      alerts: [],
      reports: [],
      accessLogs: [],
      units: [],
      operationActions: [],
      recentShiftChanges: [],
      cachedAt: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {
        people: [],
        deliveries: [],
        cameras: [],
        alerts: [],
        reports: [],
        accessLogs: [],
        units: [],
        operationActions: [],
        recentShiftChanges: [],
        cachedAt: null,
      };
    }

    const parsed = JSON.parse(raw) as Partial<OperationSnapshotCache>;
    return {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
      cameras: Array.isArray(parsed.cameras) ? parsed.cameras : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      accessLogs: Array.isArray(parsed.accessLogs) ? parsed.accessLogs : [],
      units: Array.isArray(parsed.units) ? parsed.units : [],
      operationActions: Array.isArray(parsed.operationActions) ? parsed.operationActions : [],
      recentShiftChanges: Array.isArray(parsed.recentShiftChanges) ? parsed.recentShiftChanges : [],
      cachedAt: typeof parsed.cachedAt === 'string' ? parsed.cachedAt : null,
    };
  } catch {
    return {
      people: [],
      deliveries: [],
      cameras: [],
      alerts: [],
      reports: [],
      accessLogs: [],
      units: [],
      operationActions: [],
      recentShiftChanges: [],
      cachedAt: null,
    };
  }
}

export default function OperacaoPage() {
  const router = useRouter();
  const { clearSession } = useAuth();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: [...allowedRoles],
  });
  const { events: operationEvents } = useOperationEvents(Boolean(user));
  const { data: alertsData, isLoading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useAlerts({ limit: 30, refetchInterval: 5000 });
  const { data: camerasData, isLoading: camerasLoading, error: camerasError, refetch: refetchCameras } = useCameras();
  const { data: peopleData, isLoading: peopleLoading, error: peopleError, refetch: refetchPeople } = usePeople({ limit: 100 });
  const { data: reportsData, refetch: refetchReports } = useReports(Boolean(user));
  const { data: deliveriesData, isLoading: deliveriesLoading, error: deliveriesError, refetch: refetchDeliveries } = useDeliveries({ limit: 50, enabled: Boolean(user) });
  const { data: accessLogsData, refetch: refetchAccessLogs } = useAccessLogs({ limit: 100, result: 'ALLOWED', enabled: Boolean(user) });
  const { data: vehiclesData } = useVehicles(Boolean(user));
  const { data: operationActionsData, isLoading: operationActionsLoading, error: operationActionsError, refetch: refetchOperationActions } = useOperationActions(Boolean(user));
  const scopedCondominiumId =
    user && user.role !== 'MASTER' && user.role !== 'CENTRAL'
      ? user.condominiumId ?? undefined
      : undefined;
  const { units, condominiums } = useResidenceCatalog(Boolean(user), scopedCondominiumId);

  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedCameraVisualStatus, setSelectedCameraVisualStatus] = useState<Camera['status'] | null>(null);
  const [photoSearchCameraId, setPhotoSearchCameraId] = useState('');
  const [cameraFocusPulse, setCameraFocusPulse] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [attentionAlert, setAttentionAlert] = useState<Alert | null>(null);
  const [openQuickPerson, setOpenQuickPerson] = useState(false);
  const [openQuickPersonTypeModal, setOpenQuickPersonTypeModal] = useState(false);
  const [openOccurrence, setOpenOccurrence] = useState(false);
  const [openResidentsModal, setOpenResidentsModal] = useState(false);
  const [openEntryModal, setOpenEntryModal] = useState(false);
  const [openExitModal, setOpenExitModal] = useState(false);
  const [openDeliveryModal, setOpenDeliveryModal] = useState(false);
  const [openAccessHistoryModal, setOpenAccessHistoryModal] = useState(false);
  const [openDeliveriesHistoryModal, setOpenDeliveriesHistoryModal] = useState(false);
  const [openOperationalPeopleModal, setOpenOperationalPeopleModal] = useState(false);
  const [openCamerasListModal, setOpenCamerasListModal] = useState(false);
  const [openAlertsModal, setOpenAlertsModal] = useState(false);
  const [alertsStatusFilter, setAlertsStatusFilter] = useState<'ALL' | 'NEW' | 'ON_HOLD' | 'RESOLVED'>('NEW');
  const [openActionsModal, setOpenActionsModal] = useState(false);
  const [deliveriesHistoryFilter, setDeliveriesHistoryFilter] = useState<'ALL' | 'PENDING' | 'WITHDRAWN'>('PENDING');
  const [openBatchExitConfirm, setOpenBatchExitConfirm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedResidentPerson, setSelectedResidentPerson] = useState<Person | null>(null);
  const [selectedSearchPerson, setSelectedSearchPerson] = useState<Person | null>(null);
  const [quickPersonCategoryLocked, setQuickPersonCategoryLocked] = useState(false);
  const { required: visitorDocumentRequired, setRequired: setVisitorDocumentRequired } = useVisitorDocumentRequirement();
  const [selectedExtension, setSelectedExtension] = useState(contactButtons[0] ?? '');
  const [dialedNumber, setDialedNumber] = useState('');
  const [callActive, setCallActive] = useState(false);
  const [quickPersonForm, setQuickPersonForm] = useState<QuickPersonFormData>(initialQuickPersonForm);
  const [occurrenceForm, setOccurrenceForm] = useState<OccurrenceFormData>(initialOccurrenceForm);
  const [savingPerson, setSavingPerson] = useState(false);
  const [savingOccurrence, setSavingOccurrence] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliveryUpdatingId, setDeliveryUpdatingId] = useState<string | null>(null);
  const [deliveryWithdrawalCodeById, setDeliveryWithdrawalCodeById] = useState<Record<string, string>>({});
  const [deliveryValidatingId, setDeliveryValidatingId] = useState<string | null>(null);
  const [alertResolutionPreset, setAlertResolutionPreset] = useState('');
  const [alertResolutionText, setAlertResolutionText] = useState('');
  const [alertResolutionError, setAlertResolutionError] = useState<string | null>(null);
  const [alertSearch, setAlertSearch] = useState('');
  const [pendingManualWithdrawalDelivery, setPendingManualWithdrawalDelivery] = useState<Delivery | null>(null);
  const [personUpdatingId, setPersonUpdatingId] = useState<string | null>(null);
  const [actionExecutingId, setActionExecutingId] = useState<string | null>(null);
  const [pendingOperationAction, setPendingOperationAction] = useState<OperationAction | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionCooldowns, setActionCooldowns] = useState<Record<string, number>>({});
  const [quickPersonError, setQuickPersonError] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [operationalConsultationCategory, setOperationalConsultationCategory] = useState<PersonCategory | 'ALL'>('ALL');
  const [operationalPeopleModalCategory, setOperationalPeopleModalCategory] = useState<PersonCategory | 'ALL'>('ALL');
  const [operationalPeopleModalSearch, setOperationalPeopleModalSearch] = useState('');
  const [operationUnitSearch, setOperationUnitSearch] = useState('');
  const [selectedOperationUnitId, setSelectedOperationUnitId] = useState('');
  const [residentSearch, setResidentSearch] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [residentMessageText, setResidentMessageText] = useState('');
  const [residentMessageChannel, setResidentMessageChannel] = useState<'PORTARIA' | 'WHATSAPP'>('PORTARIA');
  const [residentMessageSaving, setResidentMessageSaving] = useState(false);
  const [residentMessageUpdatingId, setResidentMessageUpdatingId] = useState<string | null>(null);
  const [residentWhatsAppConnecting, setResidentWhatsAppConnecting] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(initialEntryForm);
  const [exitForm, setExitForm] = useState<ExitFormState>(initialExitForm);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormState>(initialDeliveryForm);
  const [alertUpdating, setAlertUpdating] = useState(false);
  const [pageMessage, setPageMessage] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [remoteOpenDevices, setRemoteOpenDevices] = useState<Device[]>([]);
  const [selectedRemoteOpenDeviceId, setSelectedRemoteOpenDeviceId] = useState('');
  const [remoteOpenLoading, setRemoteOpenLoading] = useState(false);
  const [remoteOpenExecutingKey, setRemoteOpenExecutingKey] = useState<string | null>(null);
  const [remoteOpenFeedback, setRemoteOpenFeedback] = useState<Record<string, 'idle' | 'success' | 'pending' | 'error'>>({});
  const [remoteDoorStatusByDevice, setRemoteDoorStatusByDevice] = useState<Record<string, DeviceDoorStatus>>({});
  const [inboxMessages, setInboxMessages] = useState<OperationMessage[]>([]);
  const [inboxMessagesLoading, setInboxMessagesLoading] = useState(false);
  const [inboxMessagesError, setInboxMessagesError] = useState<string | null>(null);
  const [inboxMessagesMode, setInboxMessagesMode] = useState<'unit' | 'empty'>('empty');
  const [highlightedInboxMessageIds, setHighlightedInboxMessageIds] = useState<string[]>([]);
  const [brokenAlertImageUrls, setBrokenAlertImageUrls] = useState<Record<string, boolean>>({});
  const knownAlertIdsRef = useRef<Set<string> | null>(null);
  const knownInboxMessageIdsRef = useRef<Set<string> | null>(null);
  const inboxMessagesRef = useRef<OperationMessage[]>([]);
  const [photoSearchPanel, setPhotoSearchPanel] = useState<PhotoSearchPanelState>(initialPhotoSearchPanelState);
  const [activeShift, setActiveShift] = useState<ActiveShiftDraft | null>(null);
  const [openShiftCloseModal, setOpenShiftCloseModal] = useState(false);
  const [openOperationExitModal, setOpenOperationExitModal] = useState(false);
  const [exitAfterShiftClose, setExitAfterShiftClose] = useState(false);
  const [openOfflineQueueModal, setOpenOfflineQueueModal] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');
  const [savingShiftReport, setSavingShiftReport] = useState(false);
  const [recentShiftChanges, setRecentShiftChanges] = useState<OperationShiftChange[]>([]);
  const [snapshotCache, setSnapshotCache] = useState<OperationSnapshotCache>(() =>
    readOperationSnapshotCache(null)
  );
  const [now, setNow] = useState(() => new Date());
  const {
    pendingCount: offlinePendingCount,
    failedCount: offlineFailedCount,
    isOnline,
    isFlushing: offlineSyncing,
    lastFlushSummary,
    flushNow: flushOfflineNow,
    queue: offlineQueue,
    refreshQueue: refreshOfflineQueue,
  } = useOfflineOperationQueue(Boolean(user));
  const consultationSectionRef = useRef<HTMLDivElement | null>(null);
  const consultationInputRef = useRef<HTMLInputElement | null>(null);
  const cameraMonitorSectionRef = useRef<HTMLElement | null>(null);
  const alertResolutionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const photoSearchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedResidentIsUnitConversation = isUnitConversationPerson(selectedResidentPerson);
  const selectedResidentUnitId = selectedResidentPerson?.unitId ?? selectedResidentPerson?.unit?.id ?? null;
  const {
    data: residentMessagesData,
    isLoading: residentMessagesLoading,
    error: residentMessagesError,
    refetch: refetchResidentMessages,
  } = useOperationMessages(
    selectedResidentUnitId ? { unitId: selectedResidentUnitId, limit: 20 } : undefined,
    Boolean(selectedResidentUnitId)
  );
  const {
    data: residentWhatsAppConnection,
    isLoading: residentWhatsAppLoading,
    error: residentWhatsAppError,
    refetch: refetchResidentWhatsAppConnection,
  } = useOperationWhatsAppConnection(selectedResidentUnitId, Boolean(selectedResidentPerson && selectedResidentUnitId));
  const {
    data: operationSearchData,
    isFetching: operationSearchLoading,
    error: operationSearchError,
  } = useOperationSearch(
    { q: peopleSearch.trim(), limit: 12 },
    normalizeText(peopleSearch).length >= 2
  );
  const residentMessages = residentMessagesData?.data ?? [];
  const recentInboxMessages = useMemo(
    () =>
      sortOperationMessages(inboxMessages).slice(0, 6),
    [inboxMessages]
  );
  const unreadResidentMessagesCount = residentMessages.filter((message) => !message.readAt).length;
  const unreadInboxMessagesCount = inboxMessages.filter(
    (message) => (message.direction === 'INBOUND' || message.direction === 'RESIDENT_TO_PORTARIA') && !message.readAt
  ).length;
  const residentPhone = selectedResidentPerson?.phone?.trim() || null;
  const residentWhatsAppState = residentWhatsAppConnection?.state?.trim().toLowerCase() ?? null;
  const residentWhatsAppReady = residentWhatsAppState === 'open';
  const residentWhatsAppQrCodeImage = residentWhatsAppConnection?.qrCodeImageDataUrl?.trim() || null;
  const residentWhatsAppPairingCode = residentWhatsAppConnection?.pairingCode?.trim() || null;
  const residentWhatsAppCanSend = Boolean((selectedResidentPerson?.id && !selectedResidentIsUnitConversation) || residentPhone);

  useEffect(() => {
    inboxMessagesRef.current = inboxMessages;
  }, [inboxMessages]);

  useEffect(() => {
    const incomingUnreadIds = new Set(
      inboxMessages
        .filter((message) => (message.direction === 'INBOUND' || message.direction === 'RESIDENT_TO_PORTARIA') && !message.readAt)
        .map((message) => message.id)
    );

    if (!knownInboxMessageIdsRef.current) {
      knownInboxMessageIdsRef.current = incomingUnreadIds;
      return;
    }

    const newMessageIds = [...incomingUnreadIds].filter((id) => !knownInboxMessageIdsRef.current?.has(id));
    knownInboxMessageIdsRef.current = incomingUnreadIds;

    if (!newMessageIds.length) return;

    playMessageSound();
    setHighlightedInboxMessageIds((current) => Array.from(new Set([...newMessageIds, ...current])));

    const timeoutId = window.setTimeout(() => {
      setHighlightedInboxMessageIds((current) => current.filter((id) => !newMessageIds.includes(id)));
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [inboxMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (photoSearchPanel.fallbackPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photoSearchPanel.fallbackPreviewUrl);
      }
    };
  }, [photoSearchPanel.fallbackPreviewUrl]);

  useEffect(() => {
    if (photoSearchPanel.loading) return;
    if (!photoSearchPanel.error && !photoSearchPanel.result) return;

    const timer = window.setTimeout(() => {
      setPhotoSearchPanel((current) => {
        if (current.loading) return current;
        if (current.fallbackPreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(current.fallbackPreviewUrl);
        }
        return initialPhotoSearchPanelState;
      });
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [photoSearchPanel.error, photoSearchPanel.loading, photoSearchPanel.result]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const storageKey = getShiftStorageKey(user.id);
    if (!storageKey) return;

    const storedShift = parseStoredShift(window.localStorage.getItem(storageKey));
    if (storedShift) {
      setActiveShift(storedShift);
      return;
    }

    setActiveShift({
      startedAt: new Date().toISOString(),
      operatorId: user.id,
      operatorName: user.name,
      condominiumId: user.condominiumId ?? null,
      condominiumName: user.selectedUnitName ?? null,
    });
  }, [user]);

  useEffect(() => {
    setSnapshotCache(readOperationSnapshotCache(user?.id ?? null));
  }, [user?.id]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const storageKey = 'operation-device-id';
    let deviceId = window.localStorage.getItem(storageKey);
    if (!deviceId) {
      deviceId = `web-${crypto.randomUUID()}`;
      window.localStorage.setItem(storageKey, deviceId);
    }

    const sendHeartbeat = () => {
      const lastSeenAt = new Date().toISOString();
      writeLocalOperationPresence({
        condominiumId: user.condominiumId ?? 'global-operation',
        deviceId,
        deviceName: 'Portaria web',
        currentPath: window.location.pathname,
        lastSeenAt,
        role: user.role,
        userId: user.id,
      });

      return operationService.sendHeartbeat({
        deviceId,
        deviceName: 'Portaria web',
        clientVersion: 'web-v4.4',
        currentPath: window.location.pathname,
        metadata: {
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          role: user.role,
        },
      }).catch(() => undefined);
    };

    void sendHeartbeat();
    const timer = window.setInterval(() => {
      void sendHeartbeat();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!isOnline && !recentShiftChanges.length && snapshotCache.recentShiftChanges.length) {
      setRecentShiftChanges(snapshotCache.recentShiftChanges);
    }
  }, [isOnline, recentShiftChanges.length, snapshotCache.recentShiftChanges]);

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      void refetchAlerts();
      void refetchAccessLogs();
      void refetchCameras();
      void refetchDeliveries();
      void refetchPeople();
      void refetchReports();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [refetchAccessLogs, refetchAlerts, refetchCameras, refetchDeliveries, refetchPeople, refetchReports, user]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const key = getOperationSnapshotKey(user.id);
    if (!key) return;
    const currentSnapshot = readOperationSnapshotCache(user.id);

    const nextSnapshot: OperationSnapshotCache = {
      people: peopleData?.data ?? currentSnapshot.people,
      deliveries: deliveriesData ? normalizeDeliveries(deliveriesData) : currentSnapshot.deliveries,
      cameras: camerasData?.data ?? currentSnapshot.cameras,
      alerts: alertsData?.data ?? currentSnapshot.alerts,
      reports: reportsData?.data ?? currentSnapshot.reports,
      accessLogs: accessLogsData ? normalizeAccessLogs(accessLogsData) : currentSnapshot.accessLogs,
      units: units.length ? units : currentSnapshot.units,
      operationActions: operationActionsData ?? currentSnapshot.operationActions,
      recentShiftChanges: recentShiftChanges.length ? recentShiftChanges : currentSnapshot.recentShiftChanges,
      cachedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(key, JSON.stringify(nextSnapshot));
    setSnapshotCache(nextSnapshot);
  }, [
    accessLogsData,
    alertsData?.data,
    camerasData?.data,
    deliveriesData,
    operationActionsData,
    peopleData?.data,
    recentShiftChanges,
    reportsData?.data,
    units,
    user,
  ]);

  useEffect(() => {
    const cameraFromQuery = new URLSearchParams(window.location.search).get('c');
    if (!cameraFromQuery) return;
    setSelectedCameraId(cameraFromQuery);
  }, []);

  const people = useMemo(
    () => (peopleData?.data?.length ? peopleData.data : !isOnline ? snapshotCache.people : peopleData?.data ?? []),
    [isOnline, peopleData, snapshotCache.people]
  );
  const deliveries = useMemo(() => {
    const normalizedLive = deliveriesData ? normalizeDeliveries(deliveriesData) : [];
    return normalizedLive.length ? normalizedLive : !isOnline ? snapshotCache.deliveries : normalizedLive;
  }, [deliveriesData, isOnline, snapshotCache.deliveries]);
  const availableUnits = useMemo(
    () => (units.length ? units : !isOnline ? snapshotCache.units : units),
    [isOnline, snapshotCache.units, units]
  );
  const effectiveUnits = useMemo(() => mergeUnits(availableUnits, people), [availableUnits, people]);
  const catalogScopedUnits = useMemo(() => {
    if (!user) return [];
    if (user.role === 'MASTER' || user.role === 'CENTRAL') return availableUnits;
    const scopedIdentifiers = [
      user.selectedUnitId,
      user.unitId,
      ...(user.unitIds ?? []),
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    if (scopedIdentifiers.length > 0) {
      const scopedKeys = new Set<string>();
      scopedIdentifiers.forEach((identifier) => {
        scopedKeys.add(identifier);
        const shortReference = getUnitReference(identifier);
        if (shortReference) scopedKeys.add(shortReference);
      });

      const unitScoped = availableUnits.filter((unit) => {
        const shortId = getUnitReference(unit.id);
        const shortLegacy = getUnitReference(unit.legacyUnitId);
        return (
          scopedKeys.has(unit.id) ||
          Boolean(unit.legacyUnitId && scopedKeys.has(unit.legacyUnitId)) ||
          Boolean(shortId && scopedKeys.has(shortId)) ||
          Boolean(shortLegacy && scopedKeys.has(shortLegacy))
        );
      });
      if (unitScoped.length > 0) return unitScoped;
    }
    if (user.condominiumId) {
      return availableUnits.filter((unit) => unit.condominiumId === user.condominiumId);
    }
    return availableUnits;
  }, [availableUnits, user]);

  const scopedUnits = useMemo(() => {
    if (!user) return [];
    if (user.role === 'MASTER' || user.role === 'CENTRAL') return effectiveUnits;
    if (user.unitId) return effectiveUnits.filter((unit) => unit.id === user.unitId);
    if (user.condominiumId) return effectiveUnits.filter((unit) => unit.condominiumId === user.condominiumId);
    return effectiveUnits;
  }, [effectiveUnits, user]);
  const inboxUnitIds = useMemo(() => {
    const identifiers = new Set<string>();

    [user?.selectedUnitId, user?.unitId, ...(user?.unitIds ?? [])]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .forEach((value) => identifiers.add(value));

    catalogScopedUnits.forEach((unit) => {
      if (unit.id) identifiers.add(unit.id);
      if (unit.legacyUnitId) identifiers.add(unit.legacyUnitId);
    });

    if (selectedResidentUnitId) {
      identifiers.add(selectedResidentUnitId);
    }

    return [...identifiers];
  }, [catalogScopedUnits, selectedResidentUnitId, user]);
  const unitLabels = useMemo(
    () =>
      new Map(
        scopedUnits.map((unit) => [
          unit.id,
          getCompleteUnitLabel(unit, unit.label),
        ])
      ),
    [scopedUnits]
  );
  const quickPersonUnitOptions = useMemo(
    () => {
      const catalogOptions = catalogScopedUnits
        .map((unit) => ({
          id: unit.id,
          label:
            getCompleteUnitLabel(unit, unit.label) || unit.legacyUnitId || '',
        }))
        .filter((unit) => Boolean(unit.label));

      if (catalogOptions.length > 0) {
        return catalogOptions;
      }

      const personDerivedOptions = new Map<string, { id: string; label: string }>();
      people.forEach((person) => {
        if (!person.unitId) return;
        const fallbackLabel =
          getCompleteUnitLabel(person.unit, person.unitName ?? person.unitId) ||
          person.unitName?.trim();
        const label = [fallbackLabel].find(
          (value) => Boolean(value) && !String(value).includes('Unidade não resolvida')
        );
        if (!label) return;
        personDerivedOptions.set(person.unitId, { id: person.unitId, label });
      });

      if (personDerivedOptions.size > 0) {
        return Array.from(personDerivedOptions.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      }

      return effectiveUnits
        .map((unit) => ({
          id: unit.id,
          label: getCompleteUnitLabel(unit, unit.label) || unit.legacyUnitId || '',
        }))
        .filter((unit) => Boolean(unit.label));
    },
    [catalogScopedUnits, effectiveUnits, people]
  );
  const quickDeliveryUnitOptions = useMemo(() => quickPersonUnitOptions, [quickPersonUnitOptions]);
  const defaultQuickPersonUnitId = useMemo(() => {
    const preferredIds = [user?.selectedUnitId, user?.unitId]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    for (const preferredId of preferredIds) {
      const directMatch = quickPersonUnitOptions.find((unit) => unit.id === preferredId);
      if (directMatch) return directMatch.id;
    }

    if (quickPersonUnitOptions.length === 1) {
      return quickPersonUnitOptions[0].id;
    }

    return '';
  }, [quickPersonUnitOptions, user?.selectedUnitId, user?.unitId]);
  const defaultQuickDeliveryUnitId = useMemo(() => {
    const preferredIds = [user?.selectedUnitId, user?.unitId]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    for (const preferredId of preferredIds) {
      const directMatch = quickDeliveryUnitOptions.find((unit) => unit.id === preferredId);
      if (directMatch) return directMatch.id;
    }

    if (quickDeliveryUnitOptions.length === 1) {
      return quickDeliveryUnitOptions[0].id;
    }

    return '';
  }, [quickDeliveryUnitOptions, user?.selectedUnitId, user?.unitId]);
  useEffect(() => {
    if (!selectedOperationUnitId && defaultQuickPersonUnitId) {
      setSelectedOperationUnitId(defaultQuickPersonUnitId);
    }
  }, [defaultQuickPersonUnitId, selectedOperationUnitId]);
  useEffect(() => {
    if (selectedResidentUnitId) {
      setSelectedOperationUnitId(selectedResidentUnitId);
    }
  }, [selectedResidentUnitId]);
  useEffect(() => {
    if (!user) return;

    const scopedCondominiumId = user.condominiumId ?? user.condominiumIds?.[0] ?? null;
    if (!scopedCondominiumId) {
      setRemoteOpenDevices([]);
      return;
    }

    let active = true;

    async function loadRemoteOpenDevices() {
      setRemoteOpenLoading(true);
      try {
        const devices = await devicesService.list({ condominiumId: scopedCondominiumId });
        if (!active) return;

        const candidates = devices.filter(
          (device) =>
            device.type === 'FACIAL_DEVICE' &&
            Boolean(device.host?.trim()) &&
            Boolean(
              device.remoteAccessConfig?.targetType ||
              device.remoteAccessConfig?.secboxId ||
              device.remoteAccessConfig?.portalId ||
              device.remoteAccessConfig?.doorNumber ||
              device.remoteAccessConfig?.actionOneEnabled ||
              device.remoteAccessConfig?.actionTwoEnabled
            )
        );

        const testedDevices: Device[] = [];
        for (const device of candidates) {
          try {
            const response = await devicesService.testControlIdConnection(device.id);
            if (response?.ok) {
              testedDevices.push({ ...device, status: 'ONLINE' });
            }
          } catch {
            // Ignore devices that fail the connectivity probe here.
          }
        }

        const nextDevices = testedDevices.length > 0 ? testedDevices : candidates;
        setRemoteOpenDevices(nextDevices);
        setSelectedRemoteOpenDeviceId((current) =>
          current && nextDevices.some((device) => device.id === current) ? current : nextDevices[0]?.id ?? ''
        );
      } catch {
        if (!active) return;
        setRemoteOpenDevices([]);
        setSelectedRemoteOpenDeviceId('');
      } finally {
        if (active) {
          setRemoteOpenLoading(false);
        }
      }
    }

    void loadRemoteOpenDevices();
    const refreshTimer = window.setInterval(() => {
      void loadRemoteOpenDevices();
    }, 20000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [user]);
  const deliveryStats = useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const isToday = (value?: string | null) => {
      if (!value) return false;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed >= startOfToday;
    };

    return {
      total: deliveries.length,
      totalToday: deliveries.filter((item) => isToday(item.receivedAt)).length,
      withdrawn: deliveries.filter((item) => normalizeDeliveryStatus(item.status) === 'WITHDRAWN').length,
      withdrawnToday: deliveries.filter((item) => normalizeDeliveryStatus(item.status) === 'WITHDRAWN' && isToday(item.withdrawnAt)).length,
      pendingWithdrawal: deliveries.filter((item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN').length,
      pendingToday: deliveries.filter((item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN' && isToday(item.receivedAt)).length,
      pendingWithoutSecureCode: deliveries.filter((item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN' && !hasDeliverySecureWithdrawal(item)).length,
    };
  }, [deliveries, now]);
  const pendingDeliveries = useMemo(
    () => deliveries.filter((item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN'),
    [deliveries]
  );
  const filteredPendingDeliveries = useMemo(
    () =>
      pendingDeliveries.filter((delivery) => {
        const deliveryPerson = delivery.recipientPersonId ? people.find((person) => person.id === delivery.recipientPersonId) : null;
        const deliveryUnit = quickDeliveryUnitOptions.find((unit) => unit.id === delivery.recipientUnitId)?.label ?? '';
        return matchesDeliverySearch(delivery, deliverySearch.trim(), [
          delivery.recipientPersonName ?? '',
          deliveryPerson?.name ?? '',
          deliveryPerson?.document ?? '',
          deliveryUnit,
        ]);
      }),
    [deliverySearch, pendingDeliveries, people, quickDeliveryUnitOptions]
  );
  const vehicles = useMemo(() => vehiclesData?.data ?? [], [vehiclesData?.data]);
  const deliveriesHistoryItems = useMemo(() => {
    const base =
      deliveriesHistoryFilter === 'WITHDRAWN'
        ? deliveries.filter((item) => normalizeDeliveryStatus(item.status) === 'WITHDRAWN')
        : deliveriesHistoryFilter === 'ALL'
          ? deliveries
          : pendingDeliveries;

    return base.filter((delivery) => {
      const deliveryPerson = delivery.recipientPersonId ? people.find((person) => person.id === delivery.recipientPersonId) : null;
      const deliveryUnit = quickDeliveryUnitOptions.find((unit) => unit.id === delivery.recipientUnitId)?.label ?? '';
      return matchesDeliverySearch(delivery, deliverySearch.trim(), [
        delivery.recipientPersonName ?? '',
        deliveryPerson?.name ?? '',
        deliveryPerson?.document ?? '',
        deliveryUnit,
      ]);
    });
  }, [deliveries, deliveriesHistoryFilter, deliverySearch, pendingDeliveries, people, quickDeliveryUnitOptions]);
  const deliveriesHistoryMeta = useMemo(() => {
    if (deliveriesHistoryFilter === 'WITHDRAWN') {
      return {
        title: 'Encomendas retiradas',
        description: 'Consulta operacional das encomendas ja retiradas na portaria.',
        empty: 'Nenhuma encomenda retirada encontrada.',
      };
    }
    if (deliveriesHistoryFilter === 'ALL') {
      return {
        title: 'Todas as encomendas',
        description: 'Consulta operacional das encomendas recebidas e ainda não notificadas.',
        empty: 'Nenhuma encomenda encontrada.',
      };
    }
    return {
      title: 'Encomendas aguardando retirada',
      description: 'Consulta operacional das encomendas ainda pendentes na portaria.',
      empty: 'Nenhuma encomenda aguardando retirada.',
    };
  }, [deliveriesHistoryFilter]);
  const accessibleUnitsMap = useMemo(
    () => {
      const map = new Map<string, Unit>();
      effectiveUnits.forEach((unit) => {
        map.set(unit.id, unit);
        if (unit.legacyUnitId) {
          map.set(unit.legacyUnitId, unit);
          const shortReference = getUnitReference(unit.legacyUnitId);
          if (shortReference) map.set(shortReference, unit);
        }
      });
      return map;
    },
    [effectiveUnits]
  );
  const refetchInboxMessages = useCallback(async () => {
    if (!user) {
      setInboxMessages([]);
      setInboxMessagesError(null);
      setInboxMessagesMode('empty');
      return;
    }

    setInboxMessagesLoading(true);
    setInboxMessagesError(null);
    setInboxMessagesMode('unit');

    try {
      const inboxResponse = await operationService.listMessageInbox({ limit: 50 });
      let mergedMessages = mergeOperationMessagesById(inboxResponse.data ?? []).slice(0, 50);

      if (!mergedMessages.length && inboxUnitIds.length) {
        const responses = await Promise.all(
          inboxUnitIds.map((unitId) => operationService.listMessages({ unitId, limit: 20 }))
        );
        mergedMessages = mergeOperationMessagesById(
          responses.flatMap((response) => response.data ?? []).slice(0, 200)
        ).slice(0, 50);
      }

      setInboxMessages(mergedMessages);
      setInboxMessagesMode(mergedMessages.length || inboxUnitIds.length ? 'unit' : 'empty');
    } catch (error) {
      if (inboxUnitIds.length) {
        try {
          const responses = await Promise.all(
            inboxUnitIds.map((unitId) => operationService.listMessages({ unitId, limit: 20 }))
          );
          const mergedMessages = mergeOperationMessagesById(
            responses.flatMap((response) => response.data ?? []).slice(0, 200)
          ).slice(0, 50);
          setInboxMessages(mergedMessages);
          setInboxMessagesMode(mergedMessages.length ? 'unit' : 'empty');
          return;
        } catch {
          // Mantem o erro original da inbox, que e o endpoint canonico para a portaria.
        }
      }
      if (inboxMessagesRef.current.length > 0) {
        setInboxMessagesMode('unit');
        setInboxMessagesError(null);
        return;
      }

      setInboxMessagesError(error instanceof Error ? error.message : 'Não foi possível atualizar as mensagens agora.');
    } finally {
      setInboxMessagesLoading(false);
    }
  }, [inboxUnitIds, user]);
  useEffect(() => {
    void refetchInboxMessages();

    if (!user) return;

    const timer = window.setInterval(() => {
      void refetchInboxMessages();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [inboxUnitIds.length, refetchInboxMessages, user]);
  const cameras = useMemo(
    () => (camerasData?.data?.length ? camerasData.data : !isOnline ? snapshotCache.cameras : camerasData?.data ?? []),
    [camerasData, isOnline, snapshotCache.cameras]
  );
  const operationActions = useMemo(
    () => (operationActionsData?.length ? operationActionsData : !isOnline ? snapshotCache.operationActions : operationActionsData ?? []),
    [isOnline, operationActionsData, snapshotCache.operationActions]
  );
  const visibleOperationActions = operationActions.slice(0, 4);
  const primaryRemoteOpenDevice = useMemo(() => {
    if (!remoteOpenDevices.length) return null;
    if (!selectedRemoteOpenDeviceId) return remoteOpenDevices[0] ?? null;
    return remoteOpenDevices.find((device) => device.id === selectedRemoteOpenDeviceId) ?? remoteOpenDevices[0] ?? null;
  }, [remoteOpenDevices, selectedRemoteOpenDeviceId]);
  const remoteOpenButtons = useMemo(() => getRemoteOpenButtons(primaryRemoteOpenDevice), [primaryRemoteOpenDevice]);
  const primaryDoorStatus = primaryRemoteOpenDevice ? remoteDoorStatusByDevice[primaryRemoteOpenDevice.id] ?? null : null;

  useEffect(() => {
    if (!primaryRemoteOpenDevice) return;

    let cancelled = false;

    async function loadDoorStatus() {
      try {
        const response = await devicesService.getControlIdDoorStatus(primaryRemoteOpenDevice.id);
        const status = getDoorStatusFromResponse(response);
        if (!status || cancelled) return;
        setRemoteDoorStatusByDevice((current) => ({
          ...current,
          [primaryRemoteOpenDevice.id]: status,
        }));
      } catch {
        if (cancelled) return;
        setRemoteDoorStatusByDevice((current) => {
          const next = { ...current };
          delete next[primaryRemoteOpenDevice.id];
          return next;
        });
      }
    }

    void loadDoorStatus();
    const timer = window.setInterval(() => {
      void loadDoorStatus();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [primaryRemoteOpenDevice]);

  const liveOperationAlerts = useMemo(
    () => operationEvents.map(operationEventToAlert).filter((alert): alert is Alert => Boolean(alert)),
    [operationEvents]
  );
  const alerts = useMemo(() => {
    const baseAlerts = alertsData?.data?.length ? alertsData.data : !isOnline ? snapshotCache.alerts : alertsData?.data ?? [];
    const unique = new Map<string, Alert>();

    [...liveOperationAlerts, ...baseAlerts].forEach((alert) => {
      if (!unique.has(alert.id)) {
        unique.set(alert.id, alert);
      }
    });

    return Array.from(unique.values()).sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );
  }, [alertsData?.data, isOnline, liveOperationAlerts, snapshotCache.alerts]);
  useEffect(() => {
    if (!alerts.length) return;

    const currentIds = new Set(alerts.map((alert) => alert.id));
    if (!knownAlertIdsRef.current) {
      knownAlertIdsRef.current = currentIds;
      return;
    }

    const newAlert = alerts.find((alert) => !knownAlertIdsRef.current?.has(alert.id) && alert.status === 'UNREAD');
    knownAlertIdsRef.current = currentIds;

    if (!newAlert) return;
    setAttentionAlert(newAlert);
    playAlertSound();
    if (getAlertMediaItems(newAlert).length || newAlert.cameraId) {
      openCameraMonitorForAlert(newAlert);
    }
  }, [alerts]);
  const selectedOperationUnit = useMemo(
    () => (selectedOperationUnitId ? accessibleUnitsMap.get(selectedOperationUnitId) ?? null : null),
    [accessibleUnitsMap, selectedOperationUnitId]
  );
  const selectedOperationUnitLabel = useMemo(() => {
    if (!selectedOperationUnit) return '';
    return [selectedOperationUnit.condominium?.name, selectedOperationUnit.structure?.label, selectedOperationUnit.label]
      .filter(Boolean)
      .join(' / ');
  }, [selectedOperationUnit]);
  const filteredOperationUnitOptions = useMemo(() => {
    const search = normalizeText(operationUnitSearch);
    if (!search) return quickPersonUnitOptions.slice(0, 8);
    return quickPersonUnitOptions
      .filter((unit) => normalizeText(unit.label).includes(search))
      .slice(0, 8);
  }, [operationUnitSearch, quickPersonUnitOptions]);
  const selectedOperationUnitResidents = useMemo(
    () =>
      selectedOperationUnitId
        ? people.filter(
            (person) =>
              person.category === 'RESIDENT' &&
              (person.unitId === selectedOperationUnitId || person.unit?.id === selectedOperationUnitId)
          )
        : [],
    [people, selectedOperationUnitId]
  );
  const selectedOperationUnitVehicles = useMemo(
    () => (selectedOperationUnitId ? vehicles.filter((vehicle) => vehicle.unitId === selectedOperationUnitId) : []),
    [selectedOperationUnitId, vehicles]
  );
  const selectedOperationUnitDeliveries = useMemo(
    () => (selectedOperationUnitId ? pendingDeliveries.filter((delivery) => delivery.recipientUnitId === selectedOperationUnitId) : []),
    [pendingDeliveries, selectedOperationUnitId]
  );
  const selectedOperationUnitCameras = useMemo(
    () =>
      selectedOperationUnitId
        ? cameras.filter((camera) => camera.unitId === selectedOperationUnitId || !camera.unitId)
        : cameras.filter((camera) => !camera.unitId),
    [cameras, selectedOperationUnitId]
  );
  const selectedOperationUnitAlerts = useMemo(() => {
    if (!selectedOperationUnitId) return [];
    const residentIds = new Set(selectedOperationUnitResidents.map((person) => person.id));
    const cameraIds = new Set(selectedOperationUnitCameras.map((camera) => camera.id));
    return alerts.filter(
      (alert) =>
        (alert.personId && residentIds.has(alert.personId)) ||
        (alert.cameraId && cameraIds.has(alert.cameraId))
    );
  }, [alerts, selectedOperationUnitCameras, selectedOperationUnitId, selectedOperationUnitResidents]);
  const selectedOperationUnitMessages = useMemo(
    () => (selectedOperationUnitId ? inboxMessages.filter((message) => message.unitId === selectedOperationUnitId).slice(0, 4) : []),
    [inboxMessages, selectedOperationUnitId]
  );
  const { store: alertWorkflowStore, markOpened: markAlertOpened, resolve: resolveAlertWorkflow, hold: holdAlertWorkflow, saveDraft: saveAlertDraftWorkflow } = useAlertWorkflow(alerts);
  const reports = useMemo(
    () => (reportsData?.data?.length ? reportsData.data : !isOnline ? snapshotCache.reports : reportsData?.data ?? []),
    [isOnline, reportsData?.data, snapshotCache.reports]
  );
  const accessLogs = useMemo(() => {
    const normalizedLive = accessLogsData ? normalizeAccessLogs(accessLogsData) : [];
    return normalizedLive.length ? normalizedLive : !isOnline ? snapshotCache.accessLogs : normalizedLive;
  }, [accessLogsData, isOnline, snapshotCache.accessLogs]);
  const accessLogEvents = useMemo(() => buildEventsFromAccessLogs(accessLogs), [accessLogs]);
  const accessEvents = useMemo(() => buildAccessEvents(reports), [reports]);
  const hasStructuredAccessLogs = accessLogEvents.length > 0;
  const effectiveAccessEvents = hasStructuredAccessLogs ? accessLogEvents : accessEvents;
  const scopedPeople = useMemo(() => people, [people]);
  const operationalPeople = useMemo(
    () => scopedPeople.filter((person) => ['VISITOR', 'SERVICE_PROVIDER', 'RENTER', 'DELIVERER'].includes(person.category)),
    [scopedPeople]
  );
  const latestAccessByPerson = useMemo(
    () => (hasStructuredAccessLogs ? buildLatestAccessLogByPerson(accessLogEvents) : buildLatestAccessByPerson(accessEvents)),
    [accessEvents, accessLogEvents, hasStructuredAccessLogs]
  );
  const accessSummaryByPerson = useMemo(() => buildAccessSummaryByPerson(effectiveAccessEvents), [effectiveAccessEvents]);
  const searchablePeople = useMemo(() => {
    const search = normalizeText(peopleSearch);
    if (!search) return [];

    return scopedPeople.filter((person) => {
      const resolvedUnit =
        person.unit ||
        (person.unitId ? accessibleUnitsMap.get(person.unitId) ?? null : null);

      return [
        person.name,
        person.email,
        person.phone,
        person.document,
        person.unitId,
        resolvedUnit?.label,
        resolvedUnit?.condominium?.name,
        resolvedUnit?.structure?.label,
        getPersonLabel(person),
      ]
        .filter(Boolean)
      .some((value) => normalizeText(value).includes(search));
    });
  }, [accessibleUnitsMap, peopleSearch, scopedPeople]);
  const operationSearchResults = useMemo(() => operationSearchData?.data ?? [], [operationSearchData?.data]);
  const operationSearchPeopleIds = useMemo(
    () => new Set(operationSearchResults.map((item) => item.personId || (item.type === 'PERSON' ? item.id : null)).filter(Boolean) as string[]),
    [operationSearchResults]
  );
  const localOnlySearchablePeople = useMemo(
    () => searchablePeople.filter((person) => !operationSearchPeopleIds.has(person.id)),
    [operationSearchPeopleIds, searchablePeople]
  );
  const residentPeople = useMemo(
    () => scopedPeople.filter((person) => !['VISITOR', 'SERVICE_PROVIDER', 'RENTER', 'DELIVERER'].includes(person.category)),
    [scopedPeople]
  );
  const residentSearchResults = useMemo(() => {
    const search = normalizeText(residentSearch);
    const base = residentPeople;
    if (!search) return base.slice(0, 12);

    return base.filter((person) => {
      const resolvedUnit =
        person.unit ||
        (person.unitId ? accessibleUnitsMap.get(person.unitId) ?? null : null);

      return [
        person.name,
        person.email,
        person.phone,
        person.document,
        person.unitId,
        resolvedUnit?.label,
        resolvedUnit?.condominium?.name,
        resolvedUnit?.structure?.label,
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(search));
    });
  }, [accessibleUnitsMap, residentPeople, residentSearch]);
  const entryCandidates = useMemo(() => {
    const search = normalizeText(entryForm.search);
    const base = operationalPeople;
    if (!search) return base.slice(0, 12);

    return base.filter((person) => {
      const resolvedUnit =
        person.unit ||
        (person.unitId ? accessibleUnitsMap.get(person.unitId) ?? null : null);

      return [
        person.name,
        person.email,
        person.phone,
        person.document,
        person.unitId,
        resolvedUnit?.label,
        resolvedUnit?.condominium?.name,
        getPersonLabel(person),
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(search));
    });
  }, [accessibleUnitsMap, entryForm.search, operationalPeople]);
  const selectedEntryPeople = useMemo(
    () => operationalPeople.filter((person) => entryForm.personIds.includes(person.id)),
    [entryForm.personIds, operationalPeople]
  );
  const peopleInsideNow = useMemo(
    () =>
      operationalPeople.filter((person) => {
        const latestAccess = latestAccessByPerson.get(person.id);
        if (latestAccess) return latestAccess.action === 'ENTRY';
        return person.status === 'ACTIVE';
      }),
    [latestAccessByPerson, operationalPeople]
  );
  const exitCandidates = useMemo(() => {
    const search = normalizeText(exitForm.search);
    const base = peopleInsideNow;
    if (!search) return base.slice(0, 12);

    return base.filter((person) => {
      const resolvedUnit =
        person.unit ||
        (person.unitId ? accessibleUnitsMap.get(person.unitId) ?? null : null);

      return [
        person.name,
        person.email,
        person.phone,
        person.document,
        person.unitId,
        resolvedUnit?.label,
        resolvedUnit?.condominium?.name,
        getPersonLabel(person),
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(search));
    });
  }, [accessibleUnitsMap, exitForm.search, peopleInsideNow]);
  const selectedExitPeople = useMemo(
    () => peopleInsideNow.filter((person) => exitForm.personIds.includes(person.id)),
    [exitForm.personIds, peopleInsideNow]
  );
  const hasPeopleSearch = normalizeText(peopleSearch).length > 0;
  const hasOperationalConsultation = hasPeopleSearch || operationalConsultationCategory !== 'ALL';
  const showOperationalPeopleError = Boolean(peopleError && !peopleLoading && scopedPeople.length === 0);
  const filteredOperationalPeople = useMemo(() => {
    const search = normalizeText(peopleSearch);
    const base =
      operationalConsultationCategory === 'ALL'
        ? operationalPeople
        : operationalPeople.filter((person) => person.category === operationalConsultationCategory);

    if (!search) return base;

    return base.filter((person) =>
      [
        person.name,
        person.email,
        person.phone,
        person.document,
        getPersonUnitLabel(person, accessibleUnitsMap),
        person.unit?.condominium?.name,
        person.unitId,
        getPersonLabel(person),
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(search))
    );
  }, [accessibleUnitsMap, operationalConsultationCategory, operationalPeople, peopleSearch]);
  const operationalPeopleModalResults = useMemo(() => {
    const search = normalizeText(operationalPeopleModalSearch);
    const base =
      operationalPeopleModalCategory === 'ALL'
        ? operationalPeople
        : operationalPeople.filter((person) => person.category === operationalPeopleModalCategory);

    const filtered = !search
      ? base
      : base.filter((person) =>
          [
            person.name,
            person.email,
            person.phone,
            person.document,
            getPersonUnitLabel(person, accessibleUnitsMap),
            person.unit?.condominium?.name,
            person.unitId,
            getPersonLabel(person),
          ]
            .filter(Boolean)
            .some((value) => normalizeText(value).includes(search))
        );

    return filtered.slice(0, 40);
  }, [accessibleUnitsMap, operationalPeople, operationalPeopleModalCategory, operationalPeopleModalSearch]);
  const overdueOperationalPeople = useMemo(
    () =>
      filteredOperationalPeople.filter((person) => {
        if (person.status !== 'ACTIVE' || !person.endDate) return false;
        return new Date(person.endDate).getTime() < now.getTime();
      }),
    [filteredOperationalPeople, now]
  );
  const presenceSummary = useMemo(
    () => ({
      visitors: peopleInsideNow.filter((person) => person.category === 'VISITOR').length,
      serviceProviders: peopleInsideNow.filter((person) => person.category === 'SERVICE_PROVIDER').length,
      renters: peopleInsideNow.filter((person) => person.category === 'RENTER').length,
      deliverers: peopleInsideNow.filter((person) => person.category === 'DELIVERER').length,
    }),
    [peopleInsideNow]
  );
  const recentAccessTimeline = useMemo(
    () =>
      effectiveAccessEvents.map((event) => {
        const eventWithLabels = event as typeof event & {
          personName?: string;
          categoryLabel?: string;
          unitLabel?: string;
        };
        const eventPersonName = normalizeText(eventWithLabels.personName);
        const person =
          scopedPeople.find((item) => item.id === event.personId) ??
          scopedPeople.find((item) => eventPersonName && normalizeText(item.name) === eventPersonName) ??
          scopedPeople.find((item) => eventPersonName && normalizeText(item.name).includes(eventPersonName)) ??
          null;
        const resolvedUnit =
          person?.unit || (person?.unitId ? accessibleUnitsMap.get(person.unitId) ?? null : null);
        const resolvedUnitLabel = [resolvedUnit?.condominium?.name, resolvedUnit?.structure?.label, resolvedUnit?.label]
          .filter(Boolean)
          .join(' / ');
        const fallbackUnitLabel = eventWithLabels.unitLabel;

        return {
          ...event,
          personName: person?.name ?? eventWithLabels.personName ?? 'Pessoa não identificada',
          categoryLabel: person ? getCategoryLabel(person.category) : eventWithLabels.categoryLabel ?? 'Pessoa',
          unitLabel:
            resolvedUnitLabel ||
            (!isTechnicalIdentifier(fallbackUnitLabel) ? fallbackUnitLabel : null) ||
            (person?.unitId && !isTechnicalIdentifier(person.unitId) ? person.unitId : null) ||
            'Unidade não identificada',
        };
      }),
    [accessibleUnitsMap, effectiveAccessEvents, scopedPeople]
  );
  const preferredCamera = useMemo(
    () =>
      cameras.find(
        (camera) =>
          Boolean(getPreferredVideoStreamUrl(camera)) ||
          Boolean(getPreferredImageStreamUrl(camera)) ||
          Boolean(getPreferredSnapshotUrl(camera))
      ) ?? cameras[0] ?? null,
    [cameras]
  );
  const selectedCamera =
    cameras.find((camera) => camera.id === selectedCameraId) ??
    preferredCamera;
  const selectedCameraStatus = selectedCameraVisualStatus ?? selectedCamera?.status ?? 'OFFLINE';

  useEffect(() => {
    if (!selectedCamera) {
      setSelectedCameraVisualStatus(null);
      return;
    }

    const hasAvailableMedia =
      Boolean(getPreferredVideoStreamUrl(selectedCamera)) ||
      Boolean(getPreferredImageStreamUrl(selectedCamera)) ||
      Boolean(getPreferredSnapshotUrl(selectedCamera));

    setSelectedCameraVisualStatus(hasAvailableMedia ? 'ONLINE' : selectedCamera.status ?? 'OFFLINE');
  }, [selectedCamera]);

  useEffect(() => {
    setSelectedCameraVisualStatus(null);
  }, [selectedCamera?.id]);

  useEffect(() => {
    if (!cameras.length) return;
    const currentExists = selectedCameraId && cameras.some((camera) => camera.id === selectedCameraId);
    if (currentExists) return;
    if (preferredCamera?.id) {
      setSelectedCameraId(preferredCamera.id);
    }
  }, [cameras, preferredCamera?.id, selectedCameraId]);
  const selectedPhotoSearchCamera = cameras.find((camera) => camera.id === photoSearchCameraId) ?? selectedCamera;
  const photoSearchPreviewUrl =
    photoSearchPanel.result?.capturedPhotoUrl ??
    photoSearchPanel.fallbackPreviewUrl ??
    null;
  const isPhotoSearchCameraSource = photoSearchPanel.sourceLabel?.startsWith('Câmera') ?? false;
  const shouldShowPhotoSearchPreview = Boolean(photoSearchPreviewUrl) && !isPhotoSearchCameraSource;
  const hasPhotoSearchContent = Boolean(
    photoSearchPanel.loading ||
    photoSearchPanel.error ||
    photoSearchPanel.result ||
    photoSearchPanel.lastFileName ||
    shouldShowPhotoSearchPreview
  );
  const selectedAlertPerson = useMemo(
    () => (selectedAlert?.personId ? scopedPeople.find((person) => person.id === selectedAlert.personId) ?? null : null),
    [scopedPeople, selectedAlert]
  );
  const selectedAlertCamera = useMemo(
    () => (selectedAlert?.cameraId ? cameras.find((camera) => camera.id === selectedAlert.cameraId) ?? null : null),
    [cameras, selectedAlert]
  );
  const selectedAlertWorkflow = useMemo(
    () => getAlertWorkflowRecord(selectedAlert, alertWorkflowStore),
    [alertWorkflowStore, selectedAlert]
  );
  const selectedAlertReplayUrl = useMemo(() => getAlertReplayUrl(selectedAlert), [selectedAlert]);
  const selectedAlertMediaItems = useMemo(() => getAlertMediaItems(selectedAlert), [selectedAlert]);
  const selectedAlertAccessSummary = useMemo(
    () => (selectedAlert?.personId ? accessSummaryByPerson.get(selectedAlert.personId) ?? null : null),
    [accessSummaryByPerson, selectedAlert]
  );
  const selectedAlertUnitLabel = useMemo(() => {
    if (selectedAlertPerson) {
      return getPersonUnitLabel(selectedAlertPerson, accessibleUnitsMap);
    }
    if (selectedAlertCamera) {
      return getScopeLabel(selectedAlertCamera, unitLabels);
    }
    return 'Sem unidade definida';
  }, [accessibleUnitsMap, selectedAlertCamera, selectedAlertPerson, unitLabels]);
  const alertsWithOperationalContext = useMemo(
    () =>
      alerts.map((alert) => {
        const person = alert.personId ? scopedPeople.find((item) => item.id === alert.personId) ?? null : null;
        const camera = alert.cameraId ? cameras.find((item) => item.id === alert.cameraId) ?? null : null;
        const unitLabel = person
          ? getPersonUnitLabel(person, accessibleUnitsMap)
          : camera
            ? getScopeLabel(camera, unitLabels)
            : 'Sem unidade definida';
        const workflow = getAlertWorkflowRecord(alert, alertWorkflowStore);
        const title = appendUnitContext(sanitizeAlertCopy(alert.title || 'Ocorrencia'), unitLabel);
        const description = sanitizeAlertCopy(alert.description || 'Sem descrição complementar.');

        return {
          alert,
          workflow,
          unitLabel,
          title,
          description,
          statusLabel: getAlertWorkflowLabel(alert, workflow),
          workflowStatus: workflow?.workflowStatus ?? (alert.status === 'READ' ? 'RESOLVED' : 'NEW'),
          severityRank: getAlertSeverityRank(alert),
          severityLabel: getAlertSeverityLabel(alert),
        };
      }),
    [accessibleUnitsMap, alertWorkflowStore, alerts, cameras, scopedPeople, unitLabels]
  );
  const filteredOperationalAlerts = useMemo(() => {
    const normalizedSearch = normalizeText(alertSearch);
    return alertsWithOperationalContext.filter(({ alert, workflow, unitLabel, title, description }) => {
      const matchesStatus =
        alertsStatusFilter === 'ALL'
          ? true
          : (workflow?.workflowStatus ?? (alert.status === 'READ' ? 'RESOLVED' : 'NEW')) === alertsStatusFilter;
      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;
      return [title, description, unitLabel, getAlertTypeLabel(alert.type), alert.location]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(normalizedSearch));
    }).sort((left, right) => {
      const queueDelta = getAlertQueueRank(left.workflowStatus) - getAlertQueueRank(right.workflowStatus);
      if (queueDelta !== 0) return queueDelta > 0 ? -1 : 1;
      const severityDelta = right.severityRank - left.severityRank;
      if (severityDelta !== 0) return severityDelta;
      return new Date(right.alert.timestamp).getTime() - new Date(left.alert.timestamp).getTime();
    });
  }, [alertSearch, alertsStatusFilter, alertsWithOperationalContext]);
  const selectedAlertImageUrl = useMemo(() => getAlertEvidenceUrl(selectedAlert), [selectedAlert]);
  const selectedAlertImageUnavailable = Boolean(selectedAlertImageUrl && brokenAlertImageUrls[selectedAlertImageUrl]);

  function markAlertImageAsUnavailable(url?: string | null) {
    if (!url) return;
    setBrokenAlertImageUrls((current) => (current[url] ? current : { ...current, [url]: true }));
  }
  useEffect(() => {
    if (selectedAlert?.cameraId) {
      setSelectedCameraId(selectedAlert.cameraId);
    }
  }, [selectedAlert?.cameraId]);
  useEffect(() => {
    if (!cameraFocusPulse) return;
    const timer = window.setTimeout(() => setCameraFocusPulse(false), 2200);
    return () => window.clearTimeout(timer);
  }, [cameraFocusPulse]);
  useEffect(() => {
    if (!selectedAlert) {
      setAlertResolutionPreset('');
      setAlertResolutionText('');
      setAlertResolutionError(null);
      return;
    }

    markAlertOpened(selectedAlert, user?.name ?? null);
    setAlertResolutionPreset(selectedAlertWorkflow?.draftPreset ?? selectedAlertWorkflow?.resolutionPreset ?? '');
    setAlertResolutionText(selectedAlertWorkflow?.draftNote ?? selectedAlertWorkflow?.resolutionNote ?? '');
    setAlertResolutionError(null);
  }, [markAlertOpened, selectedAlert?.id, user?.name]);
  function focusCameraOnMonitor(cameraId?: string | null, closeAlert = false) {
    if (!cameraId) return;
    setSelectedCameraId(cameraId);
    setCameraFocusPulse(true);
    if (closeAlert) setSelectedAlert(null);
    window.requestAnimationFrame(() => {
      cameraMonitorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  const condominiumName =
    scopedUnits[0]?.condominium?.name ||
    condominiums.find((item) => item.id === user?.condominiumId)?.name ||
    (user?.role === 'MASTER' ? 'Base operacional global' : 'Base operacional');

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const storageKey = getShiftStorageKey(user.id);
    if (!storageKey) return;

    if (!activeShift) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const normalizedShift: ActiveShiftDraft = {
      ...activeShift,
      operatorId: user.id,
      operatorName: user.name,
      condominiumId: user.condominiumId ?? activeShift.condominiumId ?? null,
      condominiumName,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(normalizedShift));
  }, [activeShift, condominiumName, user]);

  const reportsDuringActiveShift = useMemo(() => {
    if (!activeShift?.startedAt) return [];
    return reports.filter((report) => isWithinShiftPeriod(report.createdAt, activeShift.startedAt));
  }, [activeShift?.startedAt, reports]);

  const operationReportsDuringShift = useMemo(
    () =>
      reportsDuringActiveShift.filter((report) => {
        const parsed = parseOperationReportMetadata(report);
        if (parsed) return true;
        return normalizeText(report.category).includes('operacao');
      }),
    [reportsDuringActiveShift]
  );

  const alertsDuringShift = useMemo(() => {
    if (!activeShift?.startedAt) return [];
    return alerts.filter((alert) => isWithinShiftPeriod(alert.timestamp, activeShift.startedAt));
  }, [activeShift?.startedAt, alerts]);

  const accessEventsDuringShift = useMemo(() => {
    if (!activeShift?.startedAt) return [];
    return effectiveAccessEvents.filter((event) => isWithinShiftPeriod(event.createdAt, activeShift.startedAt));
  }, [activeShift?.startedAt, effectiveAccessEvents]);

  const deliveriesDuringShift = useMemo(() => {
    if (!activeShift?.startedAt) return [];
    return deliveries.filter((delivery) => isWithinShiftPeriod(delivery.receivedAt, activeShift.startedAt));
  }, [activeShift?.startedAt, deliveries]);

  const withdrawnDeliveriesDuringShift = useMemo(() => {
    if (!activeShift?.startedAt) return [];
    return deliveries.filter((delivery) => isWithinShiftPeriod(delivery.withdrawnAt, activeShift.startedAt));
  }, [activeShift?.startedAt, deliveries]);

  const residentMessagesDuringShift = useMemo(() => {
    if (!activeShift?.startedAt) return [];
    return inboxMessages.filter((message) => isWithinShiftPeriod(message.createdAt, activeShift.startedAt));
  }, [activeShift?.startedAt, inboxMessages]);

  const activeShiftSummary = useMemo<ShiftHandoverReportMetadata['summary'] | null>(() => {
    if (!activeShift?.startedAt) return null;

    const uniqueAlertLocations = Array.from(
      new Set(
        alertsDuringShift
          .map((alert) => {
            if (alert.location?.trim()) return alert.location.trim();

            const camera = alert.cameraId ? cameras.find((item) => item.id === alert.cameraId) ?? null : null;
            if (camera?.location?.trim()) return camera.location.trim();
            if (camera) return getScopeLabel(camera, unitLabels);

            const person = alert.personId ? scopedPeople.find((item) => item.id === alert.personId) ?? null : null;
            if (person) return getPersonUnitLabel(person, accessibleUnitsMap);

            return null;
          })
          .filter((value): value is string => Boolean(value))
      )
    );

    return {
      alerts: alertsDuringShift.length,
      alertLocations: uniqueAlertLocations,
      receivedDeliveries: deliveriesDuringShift.length,
      pendingDeliveries: deliveryStats.pendingWithdrawal,
      withdrawnDeliveries: withdrawnDeliveriesDuringShift.length,
      visitors: presenceSummary.visitors,
      serviceProviders: presenceSummary.serviceProviders,
      activeResidents: residentPeople.filter((person) => person.status === 'ACTIVE').length,
      unreadMessages: residentMessagesDuringShift.filter((message) => !message.readAt).length,
      occurrences: operationReportsDuringShift.length,
      accessEntries: accessEventsDuringShift.filter((event) => event.action === 'ENTRY').length,
      accessExits: accessEventsDuringShift.filter((event) => event.action === 'EXIT').length,
    };
  }, [
    activeShift?.startedAt,
    alertsDuringShift,
    deliveriesDuringShift.length,
    deliveryStats.pendingWithdrawal,
    withdrawnDeliveriesDuringShift.length,
    presenceSummary.visitors,
    presenceSummary.serviceProviders,
    residentPeople,
    residentMessagesDuringShift,
    operationReportsDuringShift.length,
    accessEventsDuringShift,
    accessibleUnitsMap,
    cameras,
    scopedPeople,
    unitLabels,
  ]);

  const shiftDurationMinutes = useMemo(() => {
    if (!activeShift?.startedAt) return 0;

    const start = new Date(activeShift.startedAt).getTime();
    const end = now.getTime();
    if (Number.isNaN(start) || end <= start) return 0;
    return Math.max(1, Math.round((end - start) / 60000));
  }, [activeShift?.startedAt, now]);

  function handleStartShift() {
    if (!user) return;

    const startedAt = new Date().toISOString();
    setActiveShift({
      startedAt,
      operatorId: user.id,
      operatorName: user.name,
      condominiumId: user.condominiumId ?? null,
      condominiumName,
    });
    setShiftNotes('');
    setPageMessage({ tone: 'success', text: 'Turno iniciado. O resumo sera consolidado no encerramento.' });
  }

  function queueOfflineDrafts(drafts: OfflineOperationDraft[], message: string) {
    drafts.forEach((draft) => enqueueOfflineOperation(draft));
    setPageMessage({ tone: 'success', text: message });
  }

  function buildEntryOfflineDrafts(person: Person, unitId?: string | null) {
    const effectiveUnitId = unitId ?? person.unitId ?? null;
    const effectivePerson: Person = {
      ...person,
      unitId: effectiveUnitId,
      unit: effectiveUnitId ? accessibleUnitsMap.get(effectiveUnitId) ?? person.unit ?? null : person.unit ?? null,
    };

    const drafts: OfflineOperationDraft[] = [];

    if (effectiveUnitId && person.unitId !== effectiveUnitId) {
      drafts.push({
        kind: 'PERSON_UPDATE',
        payload: {
          personId: person.id,
          payload: {
            name: person.name,
            email: person.email ?? null,
            phone: person.phone ?? null,
            document: person.document ?? null,
            category: person.category,
            unitId: effectiveUnitId,
            startDate: person.startDate ?? null,
            endDate: person.endDate ?? null,
          },
        },
        description: `Atualizar unidade de ${person.name}`,
      });
    }

    if (person.status !== 'ACTIVE') {
      drafts.push({
        kind: 'PERSON_STATUS_UPDATE',
        payload: {
          personId: person.id,
          payload: { status: 'ACTIVE' },
        },
        description: `Registrar ${person.name} como ativo`,
      });
    }

    drafts.push({
      kind: 'REPORT_CREATE',
      payload: buildAccessReportPayload(effectivePerson, 'ENTRY', accessibleUnitsMap),
      description: `Registrar entrada de ${person.name}`,
    });

    return drafts;
  }

  function buildExitOfflineDrafts(person: Person) {
    return [
      {
        kind: 'PERSON_STATUS_UPDATE' as const,
        payload: {
          personId: person.id,
          payload: { status: 'INACTIVE' as const },
        },
        description: `Registrar ${person.name} como inativo`,
      },
      {
        kind: 'REPORT_CREATE' as const,
        payload: buildAccessReportPayload(person, 'EXIT', accessibleUnitsMap),
        description: `Registrar saída de ${person.name}`,
      },
    ];
  }

  async function handleCloseShift() {
    if (!user || !activeShift || !activeShiftSummary) return;

    setSavingShiftReport(true);
    setPageMessage(null);

    try {
      const endedAt = new Date().toISOString();
      const durationMinutes = Math.max(
        1,
        Math.round((new Date(endedAt).getTime() - new Date(activeShift.startedAt).getTime()) / 60000)
      );
      const deviceId =
        typeof window !== 'undefined' ? window.localStorage.getItem('operation-device-id') : null;
      const reportPayload = buildShiftHandoverReportPayload({
        operatorId: user.id,
        operatorName: user.name,
        condominiumId: user.condominiumId ?? null,
        condominiumName,
        startedAt: activeShift.startedAt,
        endedAt,
        durationMinutes,
        summary: activeShiftSummary,
        notes: shiftNotes,
      });
      const shiftChangePayload = {
        incomingOperatorName: null,
        notes: shiftNotes || null,
        deviceId,
        deviceName: 'Portaria web',
        currentPath: typeof window !== 'undefined' ? window.location.pathname : '/operacao',
        metadata: {
          source: 'web-operation',
          durationMinutes,
          summary: activeShiftSummary,
        },
      };

      try {
        await createReport(reportPayload);
        if (typeof window !== 'undefined') {
          await operationService.createShiftChange(shiftChangePayload).catch(() => null);
        }
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          [
            {
              kind: 'REPORT_CREATE',
              payload: reportPayload,
              description: 'Registrar fechamento de turno',
            },
            {
              kind: 'SHIFT_CHANGE_CREATE',
              payload: shiftChangePayload,
              description: 'Registrar troca de turno',
            },
          ],
          'Sem conexão. O fechamento do turno foi salvo localmente e será sincronizado ao reconectar.'
        );
      }

      const shiftChanges = await operationService.listShiftChanges(8).catch(() => []);
      setRecentShiftChanges(shiftChanges);
      setActiveShift(null);
      setShiftNotes('');
      setOpenShiftCloseModal(false);
      setOpenOperationExitModal(false);
      setPageMessage((current) => current ?? { tone: 'success', text: 'Relatorio de troca de turno salvo com sucesso.' });
      await refetchReports();
      if (exitAfterShiftClose) {
        setExitAfterShiftClose(false);
        await handleConfirmLogout();
      }
    } catch (error) {
      setPageMessage({
        tone: 'error',
        text: getErrorMessage(error, 'Não foi possível salvar o relatório de troca de turno.'),
      });
    } finally {
      setSavingShiftReport(false);
    }
  }

  async function resolveQuickPersonPhotoUrl(data: QuickPersonFormData) {
    const rawPhotoUrl = data.photoUrl.trim();

    if (!rawPhotoUrl) {
      return null;
    }

    if (rawPhotoUrl.startsWith('data:')) {
      const response = await uploadPersonPhoto(rawPhotoUrl, `${data.name || getCategoryLabel(data.category)}.jpg`);
      return response.photoUrl;
    }

    return rawPhotoUrl;
  }

  async function handleCreateQuickPerson() {
    setSavingPerson(true);
    setPageMessage(null);
    setQuickPersonError(null);
    try {
      if (quickPersonForm.category === 'VISITOR' && visitorDocumentRequired && !quickPersonForm.document.trim()) {
        setQuickPersonError('CPF/documento está obrigatório para visitante neste terminal.');
        return;
      }

      const photoUrl = await resolveQuickPersonPhotoUrl(quickPersonForm);

      const payload = {
        name: quickPersonForm.name.trim(),
        email: quickPersonForm.email.trim() || null,
        phone: quickPersonForm.phone.trim() || null,
        document: quickPersonForm.document.trim() || null,
        photoUrl,
        category: quickPersonForm.category,
        unitId: quickPersonForm.unitId || null,
        startDate: toIsoOrNull(quickPersonForm.startDate),
        endDate: toIsoOrNull(quickPersonForm.endDate),
      };

      try {
        await createPerson(payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          [
            {
              kind: 'PERSON_CREATE',
              payload,
              description: `Cadastrar ${getCategoryLabel(quickPersonForm.category)}`,
            },
          ],
          `Sem conexão. ${getCategoryLabel(quickPersonForm.category)} salvo localmente para sincronização.`
        );
      }

      setOpenQuickPerson(false);
      setQuickPersonForm(initialQuickPersonForm);
      setPageMessage((current) => current ?? { tone: 'success', text: `${getCategoryLabel(quickPersonForm.category)} cadastrado com sucesso.` });
      await refetchPeople();
    } catch (error) {
      setQuickPersonError(getErrorMessage(error, 'Não foi possível cadastrar a pessoa na operação.'));
    } finally {
      setSavingPerson(false);
    }
  }

  async function handleUpdateOperationalPerson() {
    if (!editingPerson) return;

    setSavingPerson(true);
    setPageMessage(null);
    setQuickPersonError(null);
    try {
      if (quickPersonForm.category === 'VISITOR' && visitorDocumentRequired && !quickPersonForm.document.trim()) {
        setQuickPersonError('CPF/documento está obrigatório para visitante neste terminal.');
        return;
      }

      const photoUrl = await resolveQuickPersonPhotoUrl(quickPersonForm);

      const payload = {
        name: quickPersonForm.name.trim(),
        email: quickPersonForm.email.trim() || null,
        phone: quickPersonForm.phone.trim() || null,
        document: quickPersonForm.document.trim() || null,
        photoUrl,
        category: quickPersonForm.category,
        unitId: quickPersonForm.unitId || null,
        startDate: toIsoOrNull(quickPersonForm.startDate),
        endDate: toIsoOrNull(quickPersonForm.endDate),
      };

      try {
        await updatePerson(editingPerson.id, payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          [
            {
              kind: 'PERSON_UPDATE',
              payload: {
                personId: editingPerson.id,
                payload,
              },
              description: `Atualizar cadastro de ${editingPerson.name}`,
            },
          ],
          `Sem conexão. A atualização de ${editingPerson.name} foi salva localmente.`
        );
      }

      setOpenQuickPerson(false);
      setEditingPerson(null);
      setQuickPersonForm(initialQuickPersonForm);
      setPageMessage((current) => current ?? { tone: 'success', text: `${editingPerson.name} atualizado com sucesso.` });
      await refetchPeople();
    } catch (error) {
      setQuickPersonError(getErrorMessage(error, 'Não foi possível atualizar a pessoa.'));
    } finally {
      setSavingPerson(false);
    }
  }

  async function handleCreateDelivery() {
    if (!user) return;

    setSavingDelivery(true);
    setDeliveryError(null);
    setPageMessage(null);
    try {
      const payload: DeliveryPayload = {
        recipientUnitId: deliveryForm.recipientUnitId,
        recipientPersonId: deliveryForm.recipientPersonId || null,
        deliveryCompany: deliveryForm.deliveryCompany.trim(),
        trackingCode: deliveryForm.trackingCode.trim() || null,
        status: 'RECEIVED',
        receivedAt: toIsoOrNull(deliveryForm.receivedAt),
        receivedBy: user.id,
        photoUrl: deliveryForm.photoUrl.trim() || null,
        clientRequestId: createClientRequestId('delivery'),
      };

      try {
        await createDeliveryRequest(payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          [
            {
              kind: 'DELIVERY_CREATE',
              payload,
              description: `Registrar encomenda de ${payload.deliveryCompany}`,
            },
          ],
          'Sem conexão. A encomenda foi salva localmente e será sincronizada ao reconectar.'
        );
      }
      setOpenDeliveryModal(false);
      setDeliveryForm(initialDeliveryForm);
      setPageMessage((current) => current ?? { tone: 'success', text: 'Encomenda registrada com sucesso.' });
      await refetchDeliveries();
    } catch (error) {
      const message = getErrorMessage(error, 'Não foi possível registrar a encomenda.');
      setDeliveryError(message);
      setPageMessage({ tone: 'error', text: message });
    } finally {
      setSavingDelivery(false);
    }
  }

  async function handleNotifyDelivery(deliveryId: string) {
    if (!user) return;

    setDeliveryUpdatingId(deliveryId);
    setPageMessage(null);
    try {
      try {
        await updateDeliveryStatus(deliveryId, { status: 'NOTIFIED' });
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          [
            {
              kind: 'DELIVERY_STATUS_UPDATE',
              payload: {
                deliveryId,
                payload: { status: 'NOTIFIED' },
              },
              description: 'Marcar encomenda como notificada',
            },
          ],
          'Sem conexão. A notificação da encomenda foi salva localmente.'
        );
      }
      setPageMessage((current) => current ?? { tone: 'success', text: 'Encomenda marcada como morador notificado.' });
      await refetchDeliveries();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível marcar a encomenda como notificada.') });
    } finally {
      setDeliveryUpdatingId(null);
    }
  }

  async function handleValidateDeliveryWithdrawal(deliveryId: string) {
    const code = deliveryWithdrawalCodeById[deliveryId]?.trim();
    if (!code) {
      setPageMessage({ tone: 'error', text: 'Digite o código apresentado pelo morador.' });
      return;
    }

    setDeliveryValidatingId(deliveryId);
    setPageMessage(null);
    try {
      const response = await validateDeliveryWithdrawal(deliveryId, { code });
      if (!response.valid) {
        setPageMessage({ tone: 'error', text: response.message || 'Código inválido para esta encomenda.' });
        return;
      }

      setDeliveryWithdrawalCodeById((current) => {
        const next = { ...current };
        delete next[deliveryId];
        return next;
      });
      setPageMessage({ tone: 'success', text: 'Código validado e retirada confirmada.' });
      await refetchDeliveries();
    } catch (error) {
      if (isOfflineQueueCandidateError(error)) {
        setPageMessage({
          tone: 'error',
          text: 'Sem conexão. A retirada por código não pode ser validada offline. Aguarde a reconexão ou use a confirmação manual excepcional.',
        });
        return;
      }
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível validar a retirada.') });
    } finally {
      setDeliveryValidatingId(null);
    }
  }

  async function handleManualDeliveryWithdrawal(deliveryId: string) {
    const confirmed = window.confirm('Confirmar retirada manual desta encomenda?');
    if (!confirmed) return;

    setDeliveryValidatingId(deliveryId);
    setPageMessage(null);
    try {
      const response = await validateDeliveryWithdrawal(deliveryId, {
        validationMethod: 'MANUAL',
        manualConfirmation: true,
      }).catch(async (error) => {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          [
            {
              kind: 'DELIVERY_WITHDRAWAL_VALIDATE',
              payload: {
                deliveryId,
                payload: {
                  validationMethod: 'MANUAL',
                  manualConfirmation: true,
                },
              },
              description: 'Confirmar retirada manual de encomenda',
            },
          ],
          'Sem conexão. A retirada manual foi salva localmente para sincronização.'
        );

        return {
          valid: true,
          deliveryId,
          message: 'Retirada manual registrada localmente.',
        };
      });

      if (!response.valid) {
        setPageMessage({ tone: 'error', text: response.message || 'A retirada manual não foi confirmada.' });
        return;
      }

      setPageMessage((current) => current ?? { tone: 'success', text: response.message || 'Retirada manual confirmada.' });
      await refetchDeliveries();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível confirmar a retirada manual.') });
    } finally {
      setDeliveryValidatingId(null);
    }
  }

  async function handleResolveSelectedAlert() {
    if (!selectedAlert) return;
    const alertToResolve = selectedAlert;
    const resolutionValue = `${alertResolutionPreset} ${alertResolutionText}`.trim();
    if (!resolutionValue) {
      setAlertResolutionError('Preencha a resolução antes de encerrar a ocorrência.');
      setPageMessage({ tone: 'error', text: 'Preencha a resolução da ocorrência antes de clicar em resolver.' });
      alertResolutionTextareaRef.current?.focus();
      return;
    }
    setAlertUpdating(true);
    setPageMessage(null);
    setAlertResolutionError(null);
    const resolutionNote = alertResolutionText.trim() || alertResolutionPreset || null;
    try {
      await Promise.allSettled([
        updateAlertWorkflow(alertToResolve.id, {
          workflowStatus: 'RESOLVED',
          resolutionNote,
          resolutionPreset: alertResolutionPreset || null,
        }),
        updateAlertStatus(alertToResolve.id, 'READ'),
      ]);
      resolveAlertWorkflow(alertToResolve, {
        actorName: user?.name ?? null,
        note: resolutionNote,
        preset: alertResolutionPreset || null,
      });
      setSelectedAlert(null);
      setAttentionAlert((current) => (current?.id === alertToResolve.id ? null : current));
      setAlertResolutionPreset('');
      setAlertResolutionText('');
      setPageMessage({ tone: 'success', text: 'Ocorrência resolvida.' });
      await refetchAlerts();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível atualizar o evento.') });
    } finally {
      setAlertUpdating(false);
    }
  }

  function handleHoldSelectedAlert() {
    if (!selectedAlert) return;
    void updateAlertWorkflow(selectedAlert.id, {
      workflowStatus: 'ON_HOLD',
      resolutionNote: alertResolutionText.trim() || alertResolutionPreset || null,
      resolutionPreset: alertResolutionPreset || null,
    }).catch(() => undefined);
    holdAlertWorkflow(selectedAlert, {
      actorName: user?.name ?? null,
      note: alertResolutionText.trim() || alertResolutionPreset || null,
      preset: alertResolutionPreset || null,
    });
    setPageMessage({ tone: 'success', text: 'Ocorrencia colocada em espera.' });
    setAlertResolutionError(null);
  }

  function handleSaveSelectedAlertDraft() {
    if (!selectedAlert) return;
    saveAlertDraftWorkflow(selectedAlert, {
      actorName: user?.name ?? null,
      note: alertResolutionText.trim() || null,
      preset: alertResolutionPreset || null,
    });
    setPageMessage({ tone: 'success', text: 'Rascunho da ocorrência salvo.' });
    setAlertResolutionError(null);
    setSelectedAlert(null);
  }

  async function handleRegisterEntry(person: Person) {
    setPersonUpdatingId(person.id);
    setPageMessage(null);
    try {
      try {
        if (person.status !== 'ACTIVE') {
          await updatePersonStatus(person.id, { status: 'ACTIVE' });
        }

        await createReport(buildAccessReportPayload(person, 'ENTRY', accessibleUnitsMap));
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        queueOfflineDrafts(
          buildEntryOfflineDrafts(person),
          `Sem conexão. A entrada de ${person.name} foi salva localmente.`
        );
      }

      setPageMessage((current) => current ?? { tone: 'success', text: `Entrada registrada para ${person.name}.` });
      await Promise.all([refetchPeople(), refetchReports()]);
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível registrar a entrada.') });
    } finally {
      setPersonUpdatingId(null);
    }
  }

  async function handleRegisterEntryFromModal() {
    if (selectedEntryPeople.length === 0) {
      setPageMessage({ tone: 'error', text: 'Selecione ao menos uma pessoa para a entrada.' });
      return;
    }

    if (!entryForm.unitId) {
      setPageMessage({ tone: 'error', text: 'Selecione a unidade de destino.' });
      return;
    }

    setSavingEntry(true);
    setPageMessage(null);
    try {
      try {
        for (const selectedEntryPerson of selectedEntryPeople) {
          if (selectedEntryPerson.unitId !== entryForm.unitId) {
            await updatePerson(selectedEntryPerson.id, {
              name: selectedEntryPerson.name,
              email: selectedEntryPerson.email ?? null,
              phone: selectedEntryPerson.phone ?? null,
              document: selectedEntryPerson.document ?? null,
              category: selectedEntryPerson.category,
              unitId: entryForm.unitId,
              startDate: selectedEntryPerson.startDate ?? null,
              endDate: selectedEntryPerson.endDate ?? null,
            });
          }

          const effectivePerson: Person = {
            ...selectedEntryPerson,
            unitId: entryForm.unitId,
            unit: accessibleUnitsMap.get(entryForm.unitId) ?? selectedEntryPerson.unit ?? null,
          };

          if (selectedEntryPerson.status !== 'ACTIVE') {
            await updatePersonStatus(selectedEntryPerson.id, { status: 'ACTIVE' });
          }

          await createReport(buildAccessReportPayload(effectivePerson, 'ENTRY', accessibleUnitsMap));
        }
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          selectedEntryPeople.flatMap((selectedEntryPerson) =>
            buildEntryOfflineDrafts(selectedEntryPerson, entryForm.unitId)
          ),
          `Sem conexão. ${selectedEntryPeople.length === 1 ? 'A entrada foi salva localmente.' : `As ${selectedEntryPeople.length} entradas foram salvas localmente.`}`
        );
      }

      setOpenEntryModal(false);
      setEntryForm(initialEntryForm);
      setPageMessage((current) => current ?? {
        tone: 'success',
        text:
          selectedEntryPeople.length === 1
            ? `Entrada registrada para ${selectedEntryPeople[0]?.name}.`
            : `Entrada registrada para ${selectedEntryPeople.length} pessoas.`,
      });
      await Promise.all([refetchPeople(), refetchReports()]);
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível registrar a entrada em lote.') });
    } finally {
      setSavingEntry(false);
    }
  }

  async function handleRegisterExitFromModal() {
    if (selectedExitPeople.length === 0) {
      setPageMessage({ tone: 'error', text: 'Selecione ao menos uma pessoa para a saída.' });
      return;
    }

    setSavingExit(true);
    setPageMessage(null);
    try {
      try {
        for (const selectedExitPerson of selectedExitPeople) {
          await updatePersonStatus(selectedExitPerson.id, { status: 'INACTIVE' });
          await createReport(buildAccessReportPayload(selectedExitPerson, 'EXIT', accessibleUnitsMap));
        }
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;

        queueOfflineDrafts(
          selectedExitPeople.flatMap((selectedExitPerson) => buildExitOfflineDrafts(selectedExitPerson)),
          `Sem conexão. ${selectedExitPeople.length === 1 ? 'A saída foi salva localmente.' : `As ${selectedExitPeople.length} saídas foram salvas localmente.`}`
        );
      }

      setOpenExitModal(false);
      setOpenBatchExitConfirm(false);
      setExitForm(initialExitForm);
      setPageMessage((current) => current ?? {
        tone: 'success',
        text:
          selectedExitPeople.length === 1
            ? `Saida registrada para ${selectedExitPeople[0]?.name}.`
            : `Saida registrada para ${selectedExitPeople.length} pessoas.`,
      });
      await Promise.all([refetchPeople(), refetchReports()]);
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível registrar a saída.') });
    } finally {
      setSavingExit(false);
    }
  }

  async function handleRegisterExit(person: Person) {
    setPersonUpdatingId(person.id);
    setPageMessage(null);
    try {
      try {
        await updatePersonStatus(person.id, { status: 'INACTIVE' });
        await createReport(buildAccessReportPayload(person, 'EXIT', accessibleUnitsMap));
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        queueOfflineDrafts(
          buildExitOfflineDrafts(person),
          `Sem conexão. A saída de ${person.name} foi salva localmente.`
        );
      }
      setPageMessage((current) => current ?? { tone: 'success', text: `Saida registrada para ${person.name}.` });
      await Promise.all([refetchPeople(), refetchReports()]);
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível atualizar o status da pessoa.') });
    } finally {
      setPersonUpdatingId(null);
    }
  }

  async function handleTogglePersonAccess(person: Person) {
    setPersonUpdatingId(person.id);
    setPageMessage(null);
    try {
      const nextStatus = person.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
      try {
        await updatePersonStatus(person.id, { status: nextStatus });
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        queueOfflineDrafts(
          [
            {
              kind: 'PERSON_STATUS_UPDATE',
              payload: {
                personId: person.id,
                payload: { status: nextStatus },
              },
              description: `${nextStatus === 'BLOCKED' ? 'Bloquear' : 'Liberar'} acesso de ${person.name}`,
            },
          ],
          `Sem conexão. A alteração de acesso de ${person.name} foi salva localmente.`
        );
      }
      setPageMessage({
        tone: 'success',
        text: nextStatus === 'BLOCKED' ? `Acesso bloqueado para ${person.name}.` : `Acesso liberado para ${person.name}.`,
      });
      await refetchPeople();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível atualizar o status da pessoa.') });
    } finally {
      setPersonUpdatingId(null);
    }
  }

  async function handleCreateOccurrence() {
    if (occurrenceForm.scopeType === 'UNIT' && !occurrenceForm.unitId) {
      setPageMessage({ tone: 'error', text: 'Selecione a unidade da ocorrência antes de salvar.' });
      return;
    }

    setSavingOccurrence(true);
    setPageMessage(null);
    try {
      const payload = buildOperationOccurrencePayload({
        title: occurrenceForm.title,
        description: occurrenceForm.description,
        priority: occurrenceForm.priority,
        context: 'operacao',
        cameraId: selectedCameraId || null,
        personId: selectedAlert?.personId ?? null,
        unitId:
          occurrenceForm.scopeType === 'UNIT'
            ? occurrenceForm.unitId || null
            : null,
      });

      try {
        await createReport(payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        queueOfflineDrafts(
          [
            {
              kind: 'REPORT_CREATE',
              payload,
              description: `Registrar ocorrência: ${occurrenceForm.title}`,
            },
          ],
          'Sem conexão. A ocorrência foi salva localmente para sincronização.'
        );
      }
      setOpenOccurrence(false);
      setOccurrenceForm(initialOccurrenceForm);
      setPageMessage((current) => current ?? { tone: 'success', text: 'Ocorrencia registrada com sucesso.' });
      await refetchReports();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível registrar a ocorrência.') });
    } finally {
      setSavingOccurrence(false);
    }
  }

  async function handleSearchPeopleByCameraSnapshot() {
    if (!selectedPhotoSearchCamera) {
      setPageMessage({ tone: 'error', text: 'Selecione uma câmera antes de buscar por foto.' });
      return;
    }

    setPhotoSearchPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      sourceLabel: `Câmera: ${selectedPhotoSearchCamera.name}`,
      lastFileName: null,
    }));
    setPageMessage(null);

    try {
      const result = await operationService.searchPeopleByPhoto({
        cameraId: selectedPhotoSearchCamera.id,
        unitId:
          selectedPhotoSearchCamera.unitId ??
          selectedOperationUnitId ??
          selectedSearchPerson?.unitId ??
          selectedAlertPerson?.unitId ??
          selectedResidentUnitId ??
          user?.selectedUnitId ??
          user?.unitId ??
          user?.unitIds?.[0] ??
          null,
        fileName: `${selectedPhotoSearchCamera.name || 'camera'}-${Date.now()}.jpg`,
        maxMatches: 5,
      });

      setPhotoSearchPanel({
        result,
        loading: false,
        error: null,
        sourceLabel: `Câmera: ${selectedPhotoSearchCamera.name}`,
        lastFileName: null,
        fallbackPreviewUrl: null,
      });
      setPageMessage({
        tone: 'success',
        text: result.matched
          ? `Busca facial concluida com ${result.matches?.length ?? 0} correspondencia(s).`
          : 'Busca facial concluida sem correspondencias.',
      });
    } catch (error) {
      setPhotoSearchPanel((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error, 'Não foi possível buscar pela câmera selecionada.'),
      }));
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível buscar pela câmera selecionada.') });
    }
  }

  async function handleUploadPhotoSearch(file: File) {
    setPhotoSearchPanel({
      result: null,
      loading: true,
      error: null,
      sourceLabel: 'Imagem enviada manualmente',
      lastFileName: file.name,
      fallbackPreviewUrl: URL.createObjectURL(file),
    });
    setPageMessage(null);

    try {
      const photoBase64 = await fileToBase64(file);
      const result = await operationService.searchPeopleByPhoto({
        photoBase64,
        unitId:
          selectedPhotoSearchCamera?.unitId ??
          selectedOperationUnitId ??
          selectedSearchPerson?.unitId ??
          selectedAlertPerson?.unitId ??
          selectedResidentUnitId ??
          user?.selectedUnitId ??
          user?.unitId ??
          user?.unitIds?.[0] ??
          null,
        fileName: file.name,
        maxMatches: 5,
      });

      setPhotoSearchPanel((current) => ({
        ...current,
        result,
        loading: false,
        error: null,
      }));
      setPageMessage({
        tone: 'success',
        text: result.matched
          ? `Busca facial concluida com ${result.matches?.length ?? 0} correspondencia(s).`
          : 'Busca facial concluida sem correspondencias.',
      });
    } catch (error) {
      setPhotoSearchPanel((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error, 'Não foi possível analisar a imagem enviada.'),
      }));
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível analisar a imagem enviada.') });
    }
  }

  function handlePhotoSearchFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleUploadPhotoSearch(file);
    event.target.value = '';
  }

  function openPhotoSearchUpload() {
    photoSearchInputRef.current?.click();
  }

  function openPhotoSearchMatch(person: Person) {
    setSelectedSearchPerson(person);
    setPeopleSearch(person.name);
    consultationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearPhotoSearchPanel() {
    setPhotoSearchPanel((current) => {
      if (current.fallbackPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(current.fallbackPreviewUrl);
      }
      return initialPhotoSearchPanelState;
    });
  }

  async function executeOperationAction(action: OperationAction, reason?: string | null) {
    setActionExecutingId(action.id);
    setPageMessage(null);
    try {
      const response = await operationService.executeAction(action.id, {
        reason: reason?.trim() || 'Acionamento remoto pela tela Operação',
        unitId: selectedSearchPerson?.unitId ?? selectedAlertPerson?.unitId ?? null,
        personId: selectedSearchPerson?.id ?? selectedAlertPerson?.id ?? null,
      });

      if (action.cooldownSeconds) {
        setActionCooldowns((current) => ({
          ...current,
          [action.id]: Date.now() + action.cooldownSeconds * 1000,
        }));
      }

      setPageMessage({
        tone: response.status === 'FAILED' ? 'error' : 'success',
        text: response.message || (response.status === 'FAILED' ? 'Acionamento não confirmado pelo dispositivo.' : `${action.label} acionado com sucesso.`),
      });
      await refetchOperationActions();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível executar o acionamento.') });
    } finally {
      setActionExecutingId(null);
      setPendingOperationAction(null);
      setActionReason('');
    }
  }

  async function handleExecuteOperationAction(actionId: string) {
    const action = operationActions.find((item) => item.id === actionId);
    if (!action || !action.enabled || actionExecutingId) return;

    const cooldownUntil = actionCooldowns[action.id];
    if (cooldownUntil && cooldownUntil > Date.now()) {
      const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setPageMessage({ tone: 'error', text: `Aguarde ${remainingSeconds}s para repetir ${action.label}.` });
      return;
    }

    if (action.requiresConfirmation) {
      setPendingOperationAction(action);
      setActionReason('');
      return;
    }

    await executeOperationAction(action);
  }

  async function handleRemoteOpenAction(doorNumber: 1 | 2) {
    if (!primaryRemoteOpenDevice) {
      setPageMessage({ tone: 'error', text: 'Nenhum dispositivo de abertura remota está disponível para esta operação.' });
      return;
    }

    const executionKey = `${primaryRemoteOpenDevice.id}:${doorNumber}`;
    setRemoteOpenExecutingKey(executionKey);
    setRemoteOpenFeedback((current) => ({ ...current, [executionKey]: 'idle' }));
    setPageMessage(null);
    try {
      const response = await devicesService.remoteOpenControlId(primaryRemoteOpenDevice.id, {
        doorNumber,
        secboxId: primaryRemoteOpenDevice.remoteAccessConfig?.secboxId ?? null,
        portalId: primaryRemoteOpenDevice.remoteAccessConfig?.portalId ?? null,
        reason: primaryRemoteOpenDevice.remoteAccessConfig?.reason ?? 1,
      });
      if (response?.ok === false && response.message) {
        throw new Error(response.message);
      }
      if (response?.ok === false) {
        throw new Error('O comando foi enviado, mas o equipamento não confirmou a abertura.');
      }
      const queued = isQueuedControlResult(response);
      const jobId = getControlJobId(response);
      setRemoteOpenFeedback((current) => ({ ...current, [executionKey]: queued ? 'pending' : 'success' }));
      setPageMessage({
        tone: queued ? 'warning' : 'success',
        text: queued
          ? `${doorNumber === 1 ? 'Acionamento 1' : 'Acionamento 2'} enviado ao backend. Aguardando confirmação física do equipamento.`
          : `${doorNumber === 1 ? 'Acionamento 1' : 'Acionamento 2'} executado pela API em ${primaryRemoteOpenDevice.name}.`,
      });
      if (queued && jobId) {
        for (let attempt = 0; attempt < 15; attempt += 1) {
          await wait(2000);
          const job = await devicesService.getControlIdJob(primaryRemoteOpenDevice.id, jobId);
          const status = getControlJobStatus(job);

          if (status === 'SUCCEEDED') {
            setRemoteOpenFeedback((current) => ({ ...current, [executionKey]: 'success' }));
            setPageMessage({
              tone: 'success',
              text: `${doorNumber === 1 ? 'Acionamento 1' : 'Acionamento 2'} confirmado pelo equipamento.`,
            });
            return;
          }

          if (status === 'FAILED') {
            throw new Error(job.message || 'O equipamento recusou ou falhou ao executar o acionamento.');
          }
        }
        setPageMessage({
          tone: 'warning',
          text: `${doorNumber === 1 ? 'Acionamento 1' : 'Acionamento 2'} ainda está pendente no backend. O Control iD ainda não consumiu ou confirmou o comando.`,
        });
      }
    } catch (error) {
      setRemoteOpenFeedback((current) => ({ ...current, [executionKey]: 'error' }));
      setPageMessage({
        tone: 'error',
        text: getErrorMessage(error, 'Não foi possível executar a abertura remota.'),
      });
    } finally {
      try {
        const statusResponse = await devicesService.getControlIdDoorStatus(primaryRemoteOpenDevice.id);
        const status = getDoorStatusFromResponse(statusResponse);
        if (status) {
          setRemoteDoorStatusByDevice((current) => ({
            ...current,
            [primaryRemoteOpenDevice.id]: status,
          }));
        }
      } catch {
        // Sem sensor ou endpoint indisponível: a tela mantém o estado como não monitorado.
      }
      setRemoteOpenExecutingKey(null);
    }
  }

  async function handleSendResidentMessage() {
    const text = residentMessageText.trim();
    if (!selectedResidentUnitId || !text) return;

    setResidentMessageSaving(true);
    setPageMessage(null);
    try {
      const payload = {
        unitId: selectedResidentUnitId,
        channel: 'PORTARIA',
        text,
      } as const;

      try {
        await operationService.sendMessage(payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        queueOfflineDrafts(
          [
            {
              kind: 'MESSAGE_SEND',
              payload,
              description: 'Enviar mensagem para unidade',
            },
          ],
          'Sem conexão. A mensagem foi salva localmente e será enviada quando a rede voltar.'
        );
      }
      setResidentMessageText('');
      setPageMessage((current) => current ?? { tone: 'success', text: 'Mensagem enviada para a unidade.' });
      await refetchResidentMessages();
      await refetchInboxMessages();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível enviar a mensagem.') });
    } finally {
      setResidentMessageSaving(false);
    }
  }

  async function handleMarkResidentMessageRead(message: OperationMessage) {
    if (!message.id || residentMessageUpdatingId) return;

    setResidentMessageUpdatingId(message.id);
    setPageMessage(null);
    try {
      await operationService.markMessageRead(message.id);
      await refetchResidentMessages();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível carregar as mensagens da unidade.') });
    } finally {
      setResidentMessageUpdatingId(null);
    }
  }

  function openResidentConversationFromMessage(message: OperationMessage) {
    const residentFromMessage =
      (message.personId ? residentPeople.find((person) => person.id === message.personId) ?? null : null) ||
      (message.recipientPersonId ? residentPeople.find((person) => person.id === message.recipientPersonId) ?? null : null) ||
      (message.unitId ? residentPeople.find((person) => person.unitId === message.unitId) ?? null : null);

    if (residentFromMessage) {
      setSelectedResidentPerson(residentFromMessage);
      return;
    }

    if (message.unitId) {
      const unit = accessibleUnitsMap.get(message.unitId) ?? null;
      const unitLabel = getCompleteUnitLabel(unit, message.unitLabel) ?? message.unitLabel ?? message.unitId;
      setSelectedResidentPerson({
        id: `${UNIT_CONVERSATION_PERSON_PREFIX}${message.unitId}`,
        name: message.senderName?.trim() || 'Morador não identificado',
        category: 'RESIDENT',
        status: 'ACTIVE',
        unitId: message.unitId,
        unitName: unitLabel,
        unit,
      });
    }
  }

  async function handleSendResidentMessageV55() {
    const text = residentMessageText.trim();
    if (!selectedResidentUnitId || !text) return;
    if (residentMessageChannel === 'WHATSAPP' && !residentWhatsAppCanSend) {
      setPageMessage({
        tone: 'error',
        text: 'Cadastre um telefone ou vincule a pessoa antes de enviar pelo WhatsApp.',
      });
      return;
    }
    if (residentMessageChannel === 'WHATSAPP' && !residentWhatsAppReady) {
      setPageMessage({
        tone: 'error',
        text: 'Conecte o WhatsApp da unidade e aguarde a confirmação antes de enviar mensagens por esse canal.',
      });
      return;
    }

    setResidentMessageSaving(true);
    setPageMessage(null);
    try {
      const payload = {
        unitId: selectedResidentUnitId,
        personId: selectedResidentIsUnitConversation ? null : selectedResidentPerson?.id ?? null,
        recipientPersonId: residentMessageChannel === 'WHATSAPP' && !selectedResidentIsUnitConversation ? selectedResidentPerson?.id ?? null : null,
        recipientPhone: residentMessageChannel === 'WHATSAPP' ? residentPhone : null,
        channel: residentMessageChannel,
        text,
      } as const;

      try {
        await operationService.sendMessage(payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        queueOfflineDrafts(
          [
            {
              kind: 'MESSAGE_SEND',
              payload,
              description: residentMessageChannel === 'WHATSAPP' ? 'Enviar mensagem por WhatsApp' : 'Enviar mensagem para unidade',
            },
          ],
          'Sem conexao. A mensagem foi salva localmente e sera enviada quando a rede voltar.'
        );
      }

      setResidentMessageText('');
      setPageMessage({
        tone: 'success',
        text: residentMessageChannel === 'WHATSAPP' ? 'Mensagem enviada pelo WhatsApp.' : 'Mensagem enviada para a unidade.',
      });
      await refetchResidentMessages();
      await refetchInboxMessages();
    } catch (error) {
      setPageMessage({ tone: 'error', text: getErrorMessage(error, 'Não foi possível enviar a mensagem.') });
    } finally {
      setResidentMessageSaving(false);
    }
  }

  async function handleConnectResidentWhatsApp() {
    if (!selectedResidentUnitId) return;

    setResidentWhatsAppConnecting(true);
    setPageMessage(null);
    try {
      await operationService.connectWhatsApp(selectedResidentUnitId);
      await refetchResidentWhatsAppConnection();
      setPageMessage({
        tone: 'success',
        text: 'Conexao do WhatsApp preparada. Leia o QR code para concluir o pareamento.',
      });
    } catch (error) {
      setPageMessage({
        tone: 'error',
        text: getErrorMessage(error, 'Não foi possível preparar a conexão do WhatsApp.'),
      });
    } finally {
      setResidentWhatsAppConnecting(false);
    }
  }

  function handleDialKey(key: string) {
    if (callActive) return;
    setDialedNumber((current) => `${current}${key}`.slice(0, 20));
  }

  function handleDialBackspace() {
    if (callActive) return;
    setDialedNumber((current) => current.slice(0, -1));
  }

  function handleStartCall() {
    if (!selectedExtension && !dialedNumber) return;
    setCallActive(true);
    setPageMessage({
      tone: 'success',
      text: `Chamada iniciada em ${selectedExtension}${dialedNumber ? ` | ${dialedNumber}` : ''}.`,
    });
  }

  function handleEndCall() {
    if (!callActive && !dialedNumber) return;
    setCallActive(false);
    setDialedNumber('');
    setPageMessage({
      tone: 'success',
      text: 'Chamada finalizada.',
    });
  }

  function openEditOperationalPerson(person: Person) {
    setEditingPerson(person);
    setQuickPersonError(null);
    setQuickPersonCategoryLocked(false);
    setQuickPersonForm({
      name: person.name ?? '',
      email: person.email ?? '',
      phone: person.phone ?? '',
      document: person.document ?? '',
      photoUrl: person.photoUrl ?? '',
      category: ['VISITOR', 'SERVICE_PROVIDER', 'RENTER'].includes(person.category)
        ? person.category
        : 'VISITOR',
      unitId: person.unitId ?? '',
      startDate: person.startDate ? new Date(person.startDate).toISOString().slice(0, 16) : '',
      endDate: person.endDate ? new Date(person.endDate).toISOString().slice(0, 16) : '',
    });
    setOpenQuickPerson(true);
  }

  function openQuickPersonByCategory(category: QuickPersonFormData['category']) {
    setEditingPerson(null);
    setQuickPersonError(null);
    setQuickPersonCategoryLocked(true);
    setOpenQuickPersonTypeModal(false);
    setQuickPersonForm({
      ...initialQuickPersonForm,
      category,
      unitId: defaultQuickPersonUnitId,
    });
    setOpenQuickPerson(true);
  }

  function openOperationalConsultation(category: PersonCategory | 'ALL' = 'ALL') {
    setOperationalConsultationCategory(category);
    setPeopleSearch('');
    setSelectedSearchPerson(null);
    consultationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.requestAnimationFrame(() => consultationInputRef.current?.focus());
  }

  function openOperationalPeopleConsultation(category: PersonCategory | 'ALL' = 'ALL') {
    setOperationalPeopleModalCategory(category);
    setOperationalPeopleModalSearch('');
    setSelectedSearchPerson(null);
    setOpenOperationalPeopleModal(true);
  }

  function openDeliveryRegistration() {
    setDeliveryError(null);
    setDeliveryForm({
      ...initialDeliveryForm,
      recipientUnitId: defaultQuickDeliveryUnitId,
      receivedAt: toDatetimeLocal(new Date().toISOString()),
    });
    setOpenDeliveryModal(true);
  }

  function openResidentsConsultation() {
    setResidentSearch('');
    setOpenResidentsModal(true);
  }

  function openEntryRegistration() {
    setEntryForm(initialEntryForm);
    setOpenEntryModal(true);
  }

  function openExitRegistration() {
    setExitForm(initialExitForm);
    setOpenBatchExitConfirm(false);
    setOpenExitModal(true);
  }

  function openCameraMonitor() {
    try {
      window.localStorage.removeItem(CAMERA_ALERT_FOCUS_STORAGE_KEY);
    } catch {
      // Se o storage estiver bloqueado, abre o monitor normalmente.
    }
    window.open('/operacao/cameras', 'operacao-cameras-monitor', getCameraMonitorWindowFeatures());
  }

  function openCameraMonitorForAlert(alert: Alert) {
    const focusPayload = buildCameraAlertFocusPayload(alert);
    const searchParams = new URLSearchParams();

    if (focusPayload) {
      try {
        window.localStorage.setItem(CAMERA_ALERT_FOCUS_STORAGE_KEY, JSON.stringify(focusPayload));
      } catch {
        // If storage is blocked, the monitor still opens normally.
      }

      if (focusPayload.cameraIds.length) {
        searchParams.set('cameraIds', focusPayload.cameraIds.join(','));
      }
      searchParams.set('alertId', alert.id);
    }

    const query = searchParams.toString();
    window.open(`/operacao/cameras${query ? `?${query}` : ''}`, 'operacao-cameras-monitor', getCameraMonitorWindowFeatures());
  }

  async function handleConfirmLogout() {
    setPageMessage(null);
    try {
      await logout();
    } catch {
      // Mantém limpeza local mesmo se o backend não responder no logout.
    } finally {
      clearSession();
      router.replace('/login');
    }
  }

  function handleOperationExitClick() {
    if (activeShift) {
      setExitAfterShiftClose(false);
      setOpenOperationExitModal(true);
      return;
    }

    void handleConfirmLogout();
  }

  if (isChecking) return <div className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">Carregando autenticação...</div>;
  if (!canAccess || !user) return null;

  return (
    <div className="flex h-screen w-screen min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_#23476f_0,_#0a1828_38%,_#07111f_100%)] text-white">
      <div className="flex h-full min-h-0 w-full max-w-none flex-col gap-1.5 overflow-hidden px-1.5 py-1.5 2xl:px-3">
        <header className={`rounded-[20px] border bg-slate-950/55 px-3 py-1.5 shadow-[0_20px_80px_rgba(2,12,24,0.45)] backdrop-blur ${brandClasses.softAccentPanel}`}>
          <div className="grid gap-2 xl:grid-cols-[1fr_1.28fr_310px] xl:items-stretch">
            <div className="flex min-h-[72px] items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-3 py-1.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-full min-h-[56px] w-[74px] items-center justify-center rounded-[18px] p-2 ${brandClasses.softAccentPanel}`}>
                  <Image
                    src={brandConfig.primaryLogo.src}
                    alt={brandConfig.primaryLogo.alt}
                    width={brandConfig.primaryLogo.width}
                    height={brandConfig.primaryLogo.height}
                    className="h-11 w-auto object-contain opacity-95 sm:h-12"
                  />
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] uppercase tracking-[0.24em] ${getBrandEyebrowClassName()}`}>Operação Portaria</p>
                  <h1 className="mt-0.5 text-base font-semibold sm:text-lg">{condominiumName}</h1>
                  <p className="mt-0.5 text-xs font-medium text-white/90">Base operacional</p>
                  <p className="mt-0.5 text-[11px] text-slate-300">Monitoramento, cadastro de acesso e tratamento de eventos.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-1.5">
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    <Grid3X3 className="h-4 w-4" />
                    Resumo do turno
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        activeShift
                          ? 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-slate-300'
                      }`}
                    >
                      {activeShift ? `Em andamento desde ${formatAccessDateTime(activeShift.startedAt)}` : 'Turno não iniciado'}
                    </span>
                    {activeShift ? (
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${brandClasses.activeChip}`}>
                        {shiftDurationMinutes} min
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {!activeShift ? (
                    <button
                      type="button"
                      onClick={handleStartShift}
                      className="rounded-xl border border-emerald-400/25 bg-emerald-400/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-400/20"
                    >
                      Iniciar turno
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenShiftCloseModal(true)}
                      className="rounded-xl border border-amber-400/25 bg-amber-400/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-50 transition hover:bg-amber-400/20"
                    >
                      Fechar turno
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setOpenAlertsModal(true)}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 text-center transition hover:border-red-400/30 hover:bg-red-500/10"
                >
                  <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Alertas</p>
                  <p className="mt-0.5 text-sm font-semibold">{alertsLoading ? '...' : alerts.length}</p>
                </button>
                <div className={`rounded-2xl border p-1.5 text-center ${brandClasses.softAccentPanel}`}><p className={`text-[9px] uppercase tracking-[0.16em] ${brandClasses.accentTextSoft}`}>Visitantes</p><p className="mt-0.5 text-sm font-semibold">{peopleLoading ? '...' : presenceSummary.visitors}</p></div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-center"><p className="text-[9px] uppercase tracking-[0.16em] text-emerald-100">Prestadores</p><p className="mt-0.5 text-sm font-semibold">{peopleLoading ? '...' : presenceSummary.serviceProviders}</p></div>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveriesHistoryFilter('PENDING');
                    setOpenDeliveriesHistoryModal(true);
                  }}
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-1.5 text-center transition hover:border-amber-300/40 hover:bg-amber-500/20"
                >
                  <p className="text-[9px] uppercase tracking-[0.16em] text-amber-100">Encomendas</p>
                  <p className="mt-0.5 text-sm font-semibold">{deliveriesLoading ? '...' : deliveryStats.pendingWithdrawal}</p>
                </button>
              </div>
            </div>

            <div className="flex min-h-[72px] flex-col justify-between rounded-[18px] border border-white/10 bg-white/5 p-2">
              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <div className="min-w-0">
                  <p className={`text-[10px] uppercase tracking-[0.22em] ${brandClasses.accentTextSoft}`}>Operador</p>
                  <p className="mt-1 truncate text-base font-semibold text-white">{user.name}</p>
                  <p className="truncate text-xs text-slate-300">{maskEmail(user.email)}</p>
                </div>
                <div className={`rounded-2xl border bg-slate-950/60 px-3 py-1.5 text-right ${brandClasses.softAccentPanel}`}>
                  <p className={`text-[10px] uppercase tracking-[0.18em] ${brandClasses.accentTextSoft}`}>Agora</p>
                  <p className={`mt-1 text-xs font-semibold ${brandClasses.accentText}`}>{formatNow(now)}</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleOperationExitClick} className="mt-1.5 h-8 w-full border-red-400/20 bg-red-500/10 px-3 text-xs font-medium text-red-100 hover:bg-red-500/15">
                <LogOut className="mr-2 h-4 w-4" />
                Sair da operação
              </Button>
            </div>
          </div>
        </header>

        {pageMessage ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${
            pageMessage.tone === 'success'
              ? `${brandClasses.softAccentPanel} text-white`
              : pageMessage.tone === 'warning'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                : 'border-red-500/30 bg-red-500/10 text-red-100'
          }`}>
            {pageMessage.text}
          </div>
        ) : null}

        {attentionAlert ? (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-red-950/55 p-4 backdrop-blur-sm">
            <section className="w-full max-w-lg overflow-hidden rounded-[32px] border border-red-300/30 bg-slate-950 text-white shadow-[0_30px_100px_rgba(127,29,29,0.45)]">
              <div className="border-b border-red-300/20 bg-red-500/15 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-2xl border border-red-300/30 bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-100" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-100">Novo alerta</p>
                    <h2 className="mt-1 text-xl font-semibold">{attentionAlert.title || 'Ocorrência recebida'}</h2>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <p className="text-sm leading-relaxed text-slate-300">
                  {attentionAlert.description || 'Uma nova ocorrência foi registrada e precisa de atenção da portaria.'}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Tipo</p>
                    <p className="mt-1 text-sm font-semibold">{getAlertTypeLabel(attentionAlert.type)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Prioridade</p>
                    <p className="mt-1 text-sm font-semibold">{getAlertSeverityRank(attentionAlert) >= 3 ? 'Crítica' : 'Atenção'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Hora</p>
                    <p className="mt-1 text-sm font-semibold">{formatOptionalDateTime(attentionAlert.timestamp)}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1 bg-red-500 text-white hover:bg-red-400"
                    onClick={() => {
                      setSelectedAlert(attentionAlert);
                      setAttentionAlert(null);
                    }}
                  >
                    Atender ocorrência
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                      setOpenAlertsModal(true);
                      setAttentionAlert(null);
                    }}
                  >
                    Ver fila de alertas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={() => setAttentionAlert(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {!isOnline || offlinePendingCount || offlineFailedCount ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${!isOnline ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : offlineFailedCount ? 'border-red-500/30 bg-red-500/10 text-red-100' : `${brandClasses.softAccentPanel} text-white`}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">
                  {!isOnline
                    ? 'Modo offline ativo'
                    : offlinePendingCount
                      ? 'Sincronização pendente'
                      : 'Itens com falha definitiva'}
                </p>
                <p className="mt-1 text-xs opacity-90">
                  {!isOnline
                    ? `A operação continua localmente. ${offlinePendingCount} item(ns) aguardam sincronização.${snapshotCache.cachedAt ? ` A tela usa o último snapshot salvo em ${formatOptionalDateTime(snapshotCache.cachedAt)}.` : ''}`
                    : offlinePendingCount
                      ? `${offlinePendingCount} item(ns) aguardam envio automático.${lastFlushSummary?.succeeded ? ` ${lastFlushSummary.succeeded} item(ns) já foram sincronizados nesta rodada.` : ''}`
                      : `${offlineFailedCount} item(ns) ficaram com falha definitiva e precisam de revisão manual.`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void flushOfflineNow()}
                disabled={!isOnline || offlineSyncing || offlinePendingCount === 0}
                className="border-white/15 bg-black/20 text-white hover:bg-white/10"
              >
                {offlineSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
              <input
                ref={photoSearchInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSearchFileChange}
              />
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={openPhotoSearchUpload}
                disabled={photoSearchPanel.loading}
              >
                Enviar imagem
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOpenOfflineQueueModal(true)}
                className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
              >
                Ver fila offline
              </button>
              {offlinePendingCount ? (
                <span className={`rounded-full border px-3 py-1.5 text-[11px] ${brandClasses.activeChip}`}>
                  {offlinePendingCount} pendente(s)
                </span>
              ) : null}
              {offlineFailedCount ? (
                <span className="rounded-full border border-red-500/25 bg-red-500/12 px-3 py-1.5 text-[11px] text-red-100">
                  {offlineFailedCount} com falha
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Rede</p>
            <p className="mt-2 text-sm font-medium text-white">{isOnline ? 'Conectada' : 'Offline'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Fila offline</p>
            <p className="mt-2 text-sm font-medium text-white">
              {offlinePendingCount} pendente(s){offlineFailedCount ? ` | ${offlineFailedCount} falha(s)` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Snapshot local</p>
            <p className="mt-2 text-sm font-medium text-white">{snapshotCache.cachedAt ? formatOptionalDateTime(snapshotCache.cachedAt) : 'Não disponível'}</p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-1.5 overflow-hidden xl:grid-cols-[460px_minmax(0,1fr)_160px] 2xl:grid-cols-[540px_minmax(0,1fr)_190px]">
          <section ref={cameraMonitorSectionRef} className="min-h-0 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col gap-1.5">
            <div className={`overflow-hidden rounded-[20px] border bg-slate-950/45 shadow-[0_20px_80px_rgba(2,12,24,0.28)] backdrop-blur transition ${cameraFocusPulse ? 'border-cyan-300/60 shadow-[0_0_0_1px_rgba(103,232,249,0.22),0_20px_80px_rgba(2,12,24,0.28)]' : 'border-cyan-500/15'}`}>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Câmera principal</p>
                  {camerasError ? (
                    <p className="mt-1 text-sm font-medium text-red-100">Erro ao carregar câmeras.</p>
                  ) : cameras.length === 0 ? (
                    <h2 className="mt-1 text-base font-medium">Nenhuma câmera disponível no momento</h2>
                  ) : (
                    <>
                      <select
                        value={selectedCamera?.id ?? ''}
                        onChange={(event) => setSelectedCameraId(event.target.value)}
                        className="mt-1 w-full max-w-[360px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-sm font-medium text-white outline-none"
                      >
                        {cameras.map((camera) => (
                          <option key={camera.id} value={camera.id} className="bg-slate-950 text-white">
                            {camera.name} {camera.location ? `| ${camera.location}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-400">
                        {cameras.length} câmera(s) liberada(s) para este operador. O monitor principal exibe uma por vez.
                      </p>
                    </>
                  )}
                </div>
                {selectedCamera ? <span className={`rounded-full border px-3 py-1 text-xs ${getCameraBadgeTone(selectedCameraStatus)}`}>{selectedCameraStatus}</span> : null}
              </div>

              <div className={`relative bg-black ${selectedCamera ? 'h-[38vh] min-h-[285px] max-h-[390px]' : 'h-[30vh] min-h-[240px] max-h-[320px]'}`}>
                {selectedCamera ? (
                  <CameraPlayer
                    key={selectedCamera.id}
                    cameraId={selectedCamera.id}
                    cameraData={{
                      ...selectedCamera,
                      unitLabel: getScopeLabel(selectedCamera, unitLabels),
                    }}
                    heightClassName="h-[38vh] min-h-[285px] max-h-[390px]"
                    compactOverlay
                    onStatusChange={setSelectedCameraVisualStatus}
                    emptyHint="Snapshot ou image stream ainda não disponível."
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-950/80">
                    <div className="text-center">
                      <Cctv className="mx-auto mb-4 h-16 w-16 opacity-20" />
                      <p className="text-sm text-slate-300">Nenhum preview disponível</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {camerasLoading
                          ? 'Carregando câmeras...'
                          : cameras.length === 0
                            ? 'Não há câmeras cadastradas ou liberadas para este usuário.'
                            : 'Configure imageStreamUrl, snapshotUrl ou streamUrl na câmera.'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedCamera ? (
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
                      <p className="font-medium text-white">{selectedCamera.location || 'Local não informado'}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{getScopeLabel(selectedCamera, unitLabels)}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <button type="button" onClick={openCameraMonitor} className={`rounded-[16px] border px-3 py-2 text-xs font-medium transition ${brandClasses.softAccentPanel} ${brandClasses.accentTextSoft}`}>
                Monitor externo
              </button>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => void handleSearchPeopleByCameraSnapshot()}
                disabled={!selectedPhotoSearchCamera || photoSearchPanel.loading}
              >
                {photoSearchPanel.loading && photoSearchPanel.sourceLabel?.startsWith('Câmera') ? 'Buscando...' : 'Buscar rosto'}
              </Button>
            </div>

            {hasPhotoSearchContent ? (
            <div className="rounded-[18px] border border-white/10 bg-slate-950/35 p-3 backdrop-blur">
              <div className={`grid gap-3 ${shouldShowPhotoSearchPreview ? 'xl:grid-cols-[148px_minmax(0,1fr)]' : ''}`}>
                {shouldShowPhotoSearchPreview ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSearchPreviewUrl!} alt="Prévia da busca facial" className="h-36 w-full object-cover" />
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-3 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                      onClick={clearPhotoSearchPanel}
                      disabled={photoSearchPanel.loading}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className={`grid gap-2 ${photoSearchPanel.lastFileName ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Resultado</p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {photoSearchPanel.loading
                          ? 'Processando'
                          : photoSearchPanel.result
                            ? photoSearchPanel.result.matched
                            ? `${photoSearchPanel.result.matches?.length ?? 0} match(es)`
                            : 'Sem match'
                          : 'Sem consulta'}
                      </p>
                    </div>
                    {photoSearchPanel.lastFileName ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Arquivo</p>
                        <p className="mt-1 truncate text-sm font-medium text-white">{photoSearchPanel.lastFileName}</p>
                      </div>
                    ) : null}
                  </div>

                  {photoSearchPanel.error ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                      {photoSearchPanel.error}
                    </div>
                  ) : null}

                  {photoSearchPanel.result ? (
                    photoSearchPanel.result.matches?.length ? (
                      <div className="space-y-2">
                        {photoSearchPanel.result.matches.map((match) => {
                          const latestAccess = latestAccessByPerson.get(match.person.id);
                          const isInside = latestAccess?.action === 'ENTRY';
                          const actionLabel = isInside ? 'Registrar saída' : 'Registrar entrada';

                          return (
                            <div key={`${match.person.id}-${match.confidence}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">{match.person.name}</p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {match.person.categoryLabel ?? match.person.category}
                                    {match.residentUnit?.label ? ` | ${match.residentUnit.label}` : ''}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`rounded-full border px-2 py-1 text-[11px] ${getPresenceStateClass(match.person, latestAccess?.action)}`}>
                                      {getPresenceStateLabel(match.person, latestAccess?.action)}
                                    </span>
                                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-medium text-cyan-100">
                                      {(match.confidence * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  {match.possibleDestination ? (
                                    <p className="mt-2 text-xs text-cyan-200">Destino provável: {match.possibleDestination}</p>
                                  ) : null}
                                  {!!match.activeVisitForecasts?.length ? (
                                    <p className="mt-1 text-xs text-emerald-200">
                                      {match.activeVisitForecasts.length} visita(s) prevista(s) vinculada(s)
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  onClick={() => openPhotoSearchMatch(match.person)}
                                >
                                  Abrir ficha
                                </Button>
                                <Button
                                  type="button"
                                  className={`text-slate-950 ${brandClasses.solidAccent}`}
                                  onClick={() => void (isInside ? handleRegisterExit(match.person) : handleRegisterEntry(match.person))}
                                  disabled={personUpdatingId === match.person.id}
                                >
                                  {personUpdatingId === match.person.id ? 'Registrando...' : actionLabel}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                        A imagem foi processada, mas não retornou correspondências.
                      </div>
                    )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-400">
                      Aguardando o resultado da busca.
                    </div>
                  )}
                </div>
              </div>
            </div>
            ) : null}

            </div>
          </section>

          <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <div className="rounded-[18px] border border-white/10 bg-slate-950/40 p-2 backdrop-blur">
              <div className="grid gap-2 sm:grid-cols-4">
                <Button onClick={() => setOpenQuickPersonTypeModal(true)} className={`h-8 rounded-lg px-3 text-xs ${brandClasses.solidAccent}`}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo cadastro
                </Button>
                <Button onClick={openEntryRegistration} className="h-8 rounded-lg bg-emerald-200 px-3 text-xs text-emerald-950 hover:bg-emerald-100">
                  <Search className="mr-2 h-4 w-4" />
                  Registrar entrada
                </Button>
                <Button onClick={openExitRegistration} className="h-8 rounded-lg bg-red-200 px-3 text-xs text-red-950 hover:bg-red-100">
                  <LogOut className="mr-2 h-4 w-4" />
                  Registrar saída
                </Button>
                <Button onClick={openDeliveryRegistration} className="h-8 rounded-lg bg-yellow-200 px-3 text-xs text-yellow-950 hover:bg-yellow-100">
                  <Package className="mr-2 h-4 w-4" />
                  Registrar encomenda
                </Button>
              </div>
            </div>

            <div className="rounded-[16px] border border-white/10 bg-slate-950/25 px-2 py-1.5 backdrop-blur">
              <div className="grid gap-1 sm:grid-cols-6">
                {operationalModules.map((module) => {
                  const tile = (
                    <div className={`rounded-[12px] border bg-transparent px-2 py-1.5 text-center transition hover:bg-white/5 ${brandClasses.softAccentPanel}`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <module.icon className={`h-3 w-3 ${brandClasses.accentTextSoft}`} />
                        <p className="truncate text-[11px] font-medium text-slate-200">{module.label}</p>
                      </div>
                    </div>
                  );
                  const className = '';
                  if (module.label === 'Moradores') return <button key={module.label} type="button" className={className} onClick={openResidentsConsultation}>{tile}</button>;
                  if (module.label === 'Visitantes') return <button key={module.label} type="button" className={className} onClick={() => openOperationalPeopleConsultation('VISITOR')}>{tile}</button>;
                  if (module.label.startsWith('Locat')) return <button key={module.label} type="button" className={className} onClick={() => openOperationalPeopleConsultation('RENTER')}>{tile}</button>;
                  if (module.label === 'Locatários') return <button key={module.label} type="button" className={className} onClick={() => openOperationalConsultation('RENTER')}>{tile}</button>;
                  if (module.label === 'Prestadores') return <button key={module.label} type="button" className={className} onClick={() => openOperationalPeopleConsultation('SERVICE_PROVIDER')}>{tile}</button>;
                  if (module.label === 'Encomendas') return <button key={module.label} type="button" className={className} onClick={() => { setDeliveriesHistoryFilter('ALL'); setOpenDeliveriesHistoryModal(true); }}>{tile}</button>;
                  if (module.label === 'Locatários') return <button key={module.label} type="button" className={className} onClick={() => openQuickPersonByCategory('RENTER')}>{tile}</button>;
                  if (module.label === 'Prestadores') return <button key={module.label} type="button" className={className} onClick={() => openQuickPersonByCategory('SERVICE_PROVIDER')}>{tile}</button>;
                  if (module.label === 'Encomendas') return <button key={module.label} type="button" className={className} onClick={openDeliveryRegistration}>{tile}</button>;
                  if (module.label === 'Câmeras') return <button key={module.label} type="button" className={className} onClick={() => setOpenCamerasListModal(true)}>{tile}</button>;
                  return <button key={module.label} type="button" className={className}>{tile}</button>;
                })}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 items-start gap-1.5 overflow-y-auto pr-1 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="grid content-start gap-2">
                <div className={`rounded-[22px] border p-3 backdrop-blur ${brandClasses.softAccentPanel}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Consulta por unidade</p>
                      <p className="mt-1 text-sm text-slate-300">Selecione a unidade para ver moradores, encomendas, veículos, alertas, câmeras e mensagens.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedOperationUnit ? (
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                          Unidade ativa
                        </span>
                      ) : null}
                      {(selectedOperationUnitId || operationUnitSearch) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOperationUnitId('');
                            setOperationUnitSearch('');
                          }}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
                        >
                          Limpar
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <input
                    value={operationUnitSearch}
                    onChange={(event) => setOperationUnitSearch(event.target.value)}
                    placeholder="Buscar unidade por nome, bloco ou referência..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {filteredOperationUnitOptions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300 sm:col-span-2">
                        Nenhuma unidade encontrada para essa busca.
                      </div>
                    ) : (
                      filteredOperationUnitOptions.map((unit) => (
                        <button
                          key={`operation-unit-${unit.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedOperationUnitId(unit.id);
                            setOperationUnitSearch(unit.label);
                          }}
                          className={`rounded-2xl border px-3 py-3 text-left transition ${
                            selectedOperationUnitId === unit.id
                              ? `${brandClasses.softAccent} text-white`
                              : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          <p className="truncate text-sm font-medium">{unit.label}</p>
                        </button>
                      ))
                    )}
                  </div>

                  {selectedOperationUnit ? (
                    <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{selectedOperationUnitLabel || selectedOperationUnit.label}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {selectedOperationUnit.condominium?.name || 'Condomínio não informado'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => {
                              setResidentSearch(selectedOperationUnit.label);
                              openResidentsConsultation();
                            }}
                          >
                            Ver moradores
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => {
                              setEntryForm((current) => ({ ...current, unitId: selectedOperationUnit.id }));
                              setOpenEntryModal(true);
                            }}
                          >
                            Registrar entrada
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => {
                              setDeliveryForm((current) => ({ ...current, recipientUnitId: selectedOperationUnit.id }));
                              setOpenDeliveryModal(true);
                            }}
                          >
                            Nova encomenda
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                          { label: 'Moradores', value: selectedOperationUnitResidents.length },
                          { label: 'Encomendas', value: selectedOperationUnitDeliveries.length },
                          { label: 'Veículos', value: selectedOperationUnitVehicles.length },
                          { label: 'Alertas', value: selectedOperationUnitAlerts.length },
                          { label: 'Câmeras', value: selectedOperationUnitCameras.length },
                          { label: 'Mensagens', value: selectedOperationUnitMessages.length },
                        ].map((item) => (
                          <div key={`unit-summary-${item.label}`} className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 text-center">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                            <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Moradores vinculados</p>
                          <div className="mt-2 space-y-2">
                            {selectedOperationUnitResidents.length === 0 ? (
                              <p className="text-sm text-slate-300">Nenhum morador vinculado a esta unidade.</p>
                            ) : (
                              selectedOperationUnitResidents.slice(0, 4).map((person) => (
                                <button
                                  key={`unit-resident-${person.id}`}
                                  type="button"
                                  onClick={() => setSelectedResidentPerson(person)}
                                  className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                                >
                                  {person.name}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Pendências da unidade</p>
                          <div className="mt-2 space-y-2 text-sm text-slate-300">
                            <p>{selectedOperationUnitDeliveries.length} encomenda(s) aguardando retirada</p>
                            <p>{selectedOperationUnitVehicles.length} veículo(s) vinculado(s)</p>
                            <p>{selectedOperationUnitAlerts.length} alerta(s) recente(s)</p>
                            <p>{selectedOperationUnitCameras.length} câmera(s) associada(s)</p>
                            <p>{selectedOperationUnitMessages.length} mensagem(ns) recente(s)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div ref={consultationSectionRef} className={`rounded-[22px] border p-3 backdrop-blur ${brandClasses.softAccentPanel}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Busca rápida</p>
                      <p className="mt-1 text-sm text-slate-300">Pesquise por nome, documento, telefone ou unidade.</p>
                    </div>
                    <button type="button" onClick={() => setOpenOccurrence(true)} className={`text-xs ${brandClasses.accentTextSoft} hover:opacity-80`}>
                      nova ocorrência
                    </button>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {[
                      { key: 'ALL', label: 'Todos' },
                      { key: 'VISITOR', label: 'Visitantes' },
                      { key: 'SERVICE_PROVIDER', label: 'Prestadores' },
                      { key: 'RENTER', label: 'Locatários' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setOperationalConsultationCategory(option.key as PersonCategory | 'ALL')}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                          operationalConsultationCategory === option.key
                            ? `${brandClasses.softAccent} text-white`
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setOpenQuickPersonTypeModal(true)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${brandClasses.softAccent}`}>
                      + novo
                    </button>
                  </div>
                  <input
                    ref={consultationInputRef}
                    value={peopleSearch}
                    onChange={(event) => setPeopleSearch(event.target.value)}
                    placeholder="Buscar por nome, unidade, documento, telefone..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="mt-3 space-y-2">
                    {showOperationalPeopleError ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">Não foi possível atualizar a lista de pessoas agora.</div> : null}
                    {!showOperationalPeopleError && hasOperationalConsultation && filteredOperationalPeople.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">Nenhuma pessoa encontrada para essa busca.</div> : null}
                    {!hasOperationalConsultation ? <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-3 text-sm text-slate-300">Nenhum resultado exibido ainda. Comece digitando para consultar.</div> : null}
                    {hasOperationalConsultation ? filteredOperationalPeople.slice(0, 6).map((person) => (
                      <button key={person.id} type="button" onClick={() => setSelectedSearchPerson(person)} className="w-full text-left">
                        <OperationalPersonSummaryCard
                          person={person}
                          now={now}
                          latestAccessAction={latestAccessByPerson.get(person.id)?.action}
                          accessSummary={accessSummaryByPerson.get(person.id)}
                          highlighted={selectedSearchPerson?.id === person.id}
                          unitLabel={getPersonUnitLabel(person, accessibleUnitsMap)}
                        />
                      </button>
                    )) : null}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-3 backdrop-blur">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mensagens dos moradores</p>
                      <p className="mt-1 text-sm text-slate-300">Últimas conversas recebidas pelo painel da portaria.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadInboxMessagesCount > 0 ? (
                        <span className="rounded-full border border-amber-400/25 bg-amber-400/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                          {unreadInboxMessagesCount} nova{unreadInboxMessagesCount > 1 ? 's' : ''}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void refetchInboxMessages()}
                        disabled={inboxMessagesLoading || inboxMessagesMode === 'empty'}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10 disabled:opacity-60"
                      >
                        Atualizar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {inboxMessagesMode === 'empty' ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                        A caixa geral depende das unidades liberadas para este turno. Enquanto isso, abra a ficha do morador para conversar pela unidade correta.
                      </div>
                    ) : inboxMessagesError ? (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                        Não foi possível carregar a caixa de entrada agora.
                      </div>
                    ) : inboxMessagesLoading && recentInboxMessages.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">Carregando mensagens...</div>
                    ) : recentInboxMessages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                        Nenhuma mensagem encontrada até agora.
                      </div>
                    ) : (
                      recentInboxMessages.map((message) => {
                        const messageUnitLabel =
                          (message.unitId ? getCompleteUnitLabel(accessibleUnitsMap.get(message.unitId), message.unitLabel) : null) ??
                          message.unitLabel ??
                          'Unidade não identificada';
                        const incoming = message.direction === 'INBOUND' || message.direction === 'RESIDENT_TO_PORTARIA';
                        const highlighted = highlightedInboxMessageIds.includes(message.id);

                        return (
                          <button
                            key={message.id}
                            type="button"
                            onClick={() => openResidentConversationFromMessage(message)}
                            className={`w-full rounded-2xl border p-3 text-left transition hover:bg-white/10 ${
                              highlighted
                                ? 'animate-pulse border-amber-300/70 bg-amber-400/15 shadow-[0_0_0_1px_rgba(251,191,36,0.22),0_0_28px_rgba(251,191,36,0.16)]'
                                : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                  {incoming ? message.senderName || 'Morador' : 'Portaria'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                                  {getOperationMessageChannelLabel(message.channel)}
                                </span>
                                {incoming && !message.readAt ? (
                                  <span className="rounded-full border border-amber-400/25 bg-amber-400/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                                    Nova
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-slate-500">{new Date(message.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm text-white">{message.text}</p>
                            <p className="mt-2 text-xs text-slate-400">{messageUnitLabel}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

                <div className="grid content-start gap-2">
                  <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/[0.045] p-3 backdrop-blur">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-100">Acionamentos</p>
                      <button
                        type="button"
                        onClick={() => setOpenActionsModal(true)}
                        className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-50 transition hover:bg-amber-300/20"
                      >
                        Ampliar
                      </button>
                    </div>
                  {remoteOpenDevices.length > 1 ? (
                    <select
                      aria-label="Leitor para acionamento"
                      value={selectedRemoteOpenDeviceId}
                      onChange={(event) => setSelectedRemoteOpenDeviceId(event.target.value)}
                      className="h-10 w-full rounded-2xl border border-amber-400/25 bg-slate-950/70 px-3 text-sm text-white outline-none"
                    >
                      {remoteOpenDevices.map((device) => (
                        <option key={device.id} value={device.id} className="bg-slate-950 text-white">
                          {device.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {remoteOpenButtons.length > 0 ? remoteOpenButtons.map((action) => {
                      const feedbackKey = `${primaryRemoteOpenDevice?.id}:${action.doorNumber}`;
                      const feedback = remoteOpenFeedback[feedbackKey];
                      const doorStatus = primaryDoorStatus;
                      const DoorIcon = isDoorOpenBySensor(doorStatus) ? DoorOpen : DoorClosed;
                      return (
                      <button
                        key={`remote-open-${action.doorNumber}`}
                        type="button"
                        onClick={() => void handleRemoteOpenAction(action.doorNumber)}
                        disabled={!primaryRemoteOpenDevice || Boolean(remoteOpenExecutingKey)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${getRemoteOpenFeedbackClass(feedback, 'border-amber-400/25 bg-amber-400/10 text-amber-50 hover:border-amber-300/50 hover:bg-amber-400/20')}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${getRemoteOpenDoorIconClassWithSensor(feedback, doorStatus)}`}>
                              <DoorIcon className="h-4 w-4" />
                            </span>
                            {remoteOpenExecutingKey === feedbackKey ? 'Acionando...' : action.label}
                          </span>
                          <span className="text-[10px] font-medium opacity-80">{getRemoteOpenDoorStateLabelWithSensor(feedback, doorStatus)}</span>
                        </span>
                      </button>
                      );
                    }) : (
                      <button type="button" disabled className="col-span-2 rounded-2xl border border-white/10 bg-slate-950/50 px-2 py-2.5 text-xs font-medium text-slate-300 opacity-75">
                        Nenhum acionamento ativo
                      </button>
                    )}
                  </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pessoas em alerta</p>
                      <p className="mt-2 text-center text-2xl font-semibold text-white">{overdueOperationalPeople.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Eventos recentes</p>
                      <p className="mt-2 text-center text-2xl font-semibold text-white">{alerts.length}</p>
                    </div>
                  </div>
                </div>
              </div>
          </section>

          <aside className="min-h-0 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-white/10 bg-slate-950/55 p-2.5 backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ações imediatas</p>
                  <h2 className="mt-0.5 text-sm font-medium">Discagem rápida</h2>
                </div>
                <Bell className="h-5 w-5 text-slate-500" />
              </div>

              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Ramal rápido</span>
                <select
                  value={selectedExtension}
                  onChange={(event) => setSelectedExtension(event.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-white outline-none"
                >
                  {contactButtons.map((contact) => (
                    <option key={contact} value={contact} className="bg-slate-950 text-white">
                      {contact}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mb-2 mt-2 rounded-[22px] border border-cyan-500/20 bg-white/5 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Destino</p>
                    <p className="mt-1 text-sm font-medium text-white">{selectedExtension || 'Sem ramal selecionado'}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] uppercase ${callActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                    {callActive ? 'Em chamada' : 'Pronto'}
                  </span>
                </div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Número digitado</p>
                  <p className="mt-1 min-h-[22px] text-center font-mono text-lg tracking-[0.24em] text-cyan-100">{dialedNumber || '___'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                  <button key={key} type="button" onClick={() => handleDialKey(key)} className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                    {key}
                  </button>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <button type="button" onClick={handleDialBackspace} disabled={callActive || !dialedNumber} className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60">
                  <Delete className="mx-auto h-4 w-4" />
                </button>
                <button type="button" onClick={handleStartCall} disabled={callActive || (!selectedExtension && !dialedNumber)} className="rounded-[18px] bg-emerald-500/85 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60">
                  <PhoneCall className="mx-auto h-4 w-4" />
                </button>
                <button type="button" onClick={handleEndCall} disabled={!callActive && !dialedNumber} className="rounded-[18px] bg-red-500/85 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60">
                  <PhoneOff className="mx-auto h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 flex h-[78px] items-center justify-center rounded-[18px] border border-white/5 bg-white/[0.02] p-1.5">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white p-2">
                  <Image
                    src={brandConfig.partnerLogo.src}
                    alt={brandConfig.partnerLogo.alt}
                    width={brandConfig.partnerLogo.width}
                    height={brandConfig.partnerLogo.height}
                    className="h-full max-h-[74px] w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>

        <CrudModal
          open={openShiftCloseModal}
          title="Fechar turno"
          description="Revise o resumo operacional e registre as observacoes da passagem."
          onClose={() => setOpenShiftCloseModal(false)}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Inicio</p>
                  <p className="mt-2 text-sm font-medium text-white">{activeShift ? formatOptionalDateTime(activeShift.startedAt) : 'Não iniciado'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Encerramento</p>
                  <p className="mt-2 text-sm font-medium text-white">{formatOptionalDateTime(now.toISOString())}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Duração</p>
                  <p className="mt-2 text-sm font-medium text-white">{shiftDurationMinutes} min</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenAlertsModal(true)}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-red-400/30 hover:bg-red-500/10"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Alertas</p>
                  <p className="mt-2 text-sm font-medium text-white">{activeShiftSummary?.alerts ?? 0}</p>
                </button>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Ocorrencias</p>
                  <p className="mt-2 text-sm font-medium text-white">{activeShiftSummary?.occurrences ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Acessos</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {(activeShiftSummary?.accessEntries ?? 0) + (activeShiftSummary?.accessExits ?? 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveriesHistoryFilter('ALL');
                    setOpenDeliveriesHistoryModal(true);
                  }}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/10"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Encomendas recebidas</p>
                  <p className="mt-2 text-sm font-medium text-white">{activeShiftSummary?.receivedDeliveries ?? 0}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveriesHistoryFilter('PENDING');
                    setOpenDeliveriesHistoryModal(true);
                  }}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-amber-400/30 hover:bg-amber-500/10"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Pendentes para retirada</p>
                  <p className="mt-2 text-sm font-medium text-white">{activeShiftSummary?.pendingDeliveries ?? 0}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveriesHistoryFilter('WITHDRAWN');
                    setOpenDeliveriesHistoryModal(true);
                  }}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-emerald-400/30 hover:bg-emerald-500/10"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Retiradas</p>
                  <p className="mt-2 text-sm font-medium text-white">{activeShiftSummary?.withdrawnDeliveries ?? 0}</p>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Pessoas no predio</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    Visitantes {activeShiftSummary?.visitors ?? 0} | Prestadores {activeShiftSummary?.serviceProviders ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Mensagens não lidas</p>
                  <p className="mt-2 text-sm font-medium text-white">{activeShiftSummary?.unreadMessages ?? 0}</p>
                </div>
              </div>

              <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">Locais com alerta</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeShiftSummary?.alertLocations?.length ? (
                  activeShiftSummary.alertLocations.map((location) => (
                    <span key={location} className="rounded-full border border-amber-400/25 bg-amber-400/12 px-3 py-1 text-xs text-amber-50">
                      {location}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">Nenhum local de alerta registrado neste turno.</span>
                )}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Observacoes para a passagem de turno</span>
              <textarea
                value={shiftNotes}
                onChange={(event) => setShiftNotes(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                placeholder="Registre pendências, fatos relevantes, orientações para o próximo porteiro e qualquer observação operacional."
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Histórico de turno</p>
                  <p className="mt-1 text-sm text-slate-300">Últimas passagens registradas para acompanhar a troca de turno.</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {recentShiftChanges.length ? (
                  recentShiftChanges.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-white">{item.outgoingUserName || 'Operador não informado'}</span>
                        <span className="text-slate-400">{formatOptionalDateTime(item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {[item.condominiumName, item.deviceName || 'Portaria web', item.currentPath].filter(Boolean).join(' | ')}
                      </p>
                      {item.deviceStatus || item.deviceLastSeenAt ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {item.deviceStatus ? (
                            <span className={`rounded-full border px-2.5 py-1 ${getDeviceStatusTone(item.deviceStatus)}`}>
                              Device {item.deviceStatus}
                            </span>
                          ) : null}
                          {item.deviceLastSeenAt ? (
                            <span className="text-slate-500">Ultimo heartbeat: {formatOptionalDateTime(item.deviceLastSeenAt)}</span>
                          ) : null}
                        </div>
                      ) : null}
                      {item.notes ? <p className="mt-2 text-sm text-slate-300">{item.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Nenhum histórico disponível no momento.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenShiftCloseModal(false)}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
              >
                Continuar turno
              </button>
              <button
                type="button"
                onClick={() => void handleCloseShift()}
                disabled={savingShiftReport || !activeShift || !activeShiftSummary}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${brandClasses.solidAccent}`}
              >
                {savingShiftReport ? 'Salvando...' : 'Salvar troca de turno'}
              </button>
            </div>
          </div>
        </CrudModal>

        <CrudModal
          open={openOperationExitModal}
          title="Sair da operação"
          description="Escolha se o turno continua aberto ou se será encerrado agora."
          onClose={() => setOpenOperationExitModal(false)}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-slate-200">
                O turno está em andamento desde {activeShift ? formatOptionalDateTime(activeShift.startedAt) : 'agora'}.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Use pausa quando for sair da tela e voltar depois. Use finalizar quando estiver encerrando o trabalho na portaria.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleConfirmLogout()}
                className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-left text-cyan-50 transition hover:bg-cyan-400/15"
              >
                <p className="font-semibold">Pausar e sair</p>
                <p className="mt-1 text-sm text-cyan-100/80">Mantém o turno aberto para continuar quando retornar.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitAfterShiftClose(true);
                  setOpenOperationExitModal(false);
                  setOpenShiftCloseModal(true);
                }}
                className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-left text-amber-50 transition hover:bg-amber-400/15"
              >
                <p className="font-semibold">Finalizar turno</p>
                <p className="mt-1 text-sm text-amber-100/80">Abre o resumo para registrar observações e encerrar.</p>
              </button>
            </div>
          </div>
        </CrudModal>

        <CrudModal
          open={openOfflineQueueModal}
          title="Fila offline da operação"
          description="Itens salvos localmente enquanto a conexão estava indisponível ou instável."
          onClose={() => setOpenOfflineQueueModal(false)}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Conectividade</p>
                <p className="mt-2 text-sm font-medium text-white">{isOnline ? 'Online' : 'Offline'}</p>
              </div>
              <div className={`rounded-2xl border p-3 ${brandClasses.softAccentPanel}`}>
                <p className={`text-[11px] uppercase tracking-[0.16em] ${brandClasses.accentTextSoft}`}>Pendentes</p>
                <p className="mt-2 text-sm font-medium text-white">{offlinePendingCount}</p>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-red-100">Falhas definitivas</p>
                <p className="mt-2 text-sm font-medium text-white">{offlineFailedCount}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void flushOfflineNow()}
                disabled={!isOnline || offlineSyncing || offlinePendingCount === 0}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {offlineSyncing ? 'Sincronizando...' : 'Sincronizar fila'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearFailedOfflineOperations();
                  refreshOfflineQueue();
                }}
                disabled={offlineFailedCount === 0}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpar falhas
              </button>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {offlineQueue.length ? (
                offlineQueue.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.description}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.kind} | {formatOptionalDateTime(item.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          item.status === 'failed'
                            ? 'border-red-500/25 bg-red-500/12 text-red-100'
                            : 'border-cyan-500/25 bg-cyan-500/12 text-cyan-100'
                        }`}
                      >
                        {item.status === 'failed' ? 'Falha definitiva' : 'Pendente'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                      <p>Tentativas: <span className="text-white">{item.attempts}</span></p>
                      <p>Última tentativa: <span className="text-white">{formatOptionalDateTime(item.lastAttemptAt)}</span></p>
                    </div>

                    {item.lastError ? (
                      <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                        {item.lastError}
                      </p>
                    ) : null}

                    {item.status === 'failed' ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            resetFailedOfflineOperationItem(item.id);
                            refreshOfflineQueue();
                          }}
                          className={`rounded-xl border px-3 py-2 text-xs transition ${brandClasses.softAccent}`}
                        >
                          Recolocar na fila
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeOfflineOperationItem(item.id);
                            refreshOfflineQueue();
                          }}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100 transition hover:bg-red-500/15"
                        >
                          Remover item
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                  Nenhum item na fila offline.
                </div>
              )}
            </div>
          </div>
        </CrudModal>

        <CrudModal
          open={openQuickPersonTypeModal}
          title="Novo cadastro"
          description="Selecione o tipo de pessoa que será cadastrada."
          onClose={() => setOpenQuickPersonTypeModal(false)}
          maxWidth="md"
        >
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { category: 'VISITOR' as const, title: 'Visitante', description: 'Acesso temporário para visita.' },
              { category: 'SERVICE_PROVIDER' as const, title: 'Prestador', description: 'Serviço, manutenção ou entrega técnica.' },
              { category: 'RENTER' as const, title: 'Locatário', description: 'Pessoa vinculada por locação.' },
            ].map((option) => (
              <button
                key={option.category}
                type="button"
                onClick={() => openQuickPersonByCategory(option.category)}
                className={`rounded-2xl border p-4 text-left transition hover:scale-[1.01] ${brandClasses.softAccentPanel}`}
              >
                <p className="font-semibold text-white">{option.title}</p>
                <p className="mt-2 text-sm text-slate-300">{option.description}</p>
              </button>
            ))}
          </div>
        </CrudModal>

        <CrudModal open={openQuickPerson} title={editingPerson ? 'Editar cadastro operacional' : 'Novo cadastro operacional'} description="Use para visitante, prestador de serviço ou locatário." onClose={() => { setOpenQuickPerson(false); setEditingPerson(null); setQuickPersonCategoryLocked(false); setQuickPersonError(null); setQuickPersonForm(initialQuickPersonForm); }} maxWidth="xl">
          <QuickPersonForm
            key={`${editingPerson?.id ?? 'new'}-${quickPersonForm.category}-${openQuickPerson ? 'open' : 'closed'}`}
            value={quickPersonForm}
            onChange={(field, nextValue) => setQuickPersonForm((current) => ({ ...current, [field]: nextValue }))}
            onSubmit={editingPerson ? handleUpdateOperationalPerson : handleCreateQuickPerson}
            onCancel={() => { setOpenQuickPerson(false); setEditingPerson(null); setQuickPersonCategoryLocked(false); setQuickPersonError(null); setQuickPersonForm(initialQuickPersonForm); }}
            loading={savingPerson}
            errorMessage={quickPersonError}
            units={quickPersonUnitOptions}
            categoryLocked={quickPersonCategoryLocked}
            submitLabel={editingPerson ? 'Salvar alterações' : 'Cadastrar pessoa'}
            visitorDocumentRequired={visitorDocumentRequired}
            onToggleVisitorDocumentRequired={setVisitorDocumentRequired}
          />
        </CrudModal>

        <CrudModal open={openDeliveryModal} title="Registrar encomenda" description="Cadastre a encomenda recebida na portaria." onClose={() => { setOpenDeliveryModal(false); setDeliveryError(null); setDeliveryForm(initialDeliveryForm); }} maxWidth="xl">
          <QuickDeliveryForm
            value={deliveryForm}
            onChange={(field, nextValue) => setDeliveryForm((current) => ({ ...current, [field]: nextValue }))}
            onSubmit={handleCreateDelivery}
            onCancel={() => { setOpenDeliveryModal(false); setDeliveryError(null); setDeliveryForm(initialDeliveryForm); }}
            loading={savingDelivery}
            errorMessage={deliveryError}
            units={quickDeliveryUnitOptions}
            people={people}
          />
        </CrudModal>

        <CrudModal
          open={openDeliveriesHistoryModal}
          title={
            deliveriesHistoryFilter === 'WITHDRAWN'
              ? 'Encomendas retiradas'
              : deliveriesHistoryFilter === 'ALL'
                ? 'Todas as encomendas'
                : 'Encomendas aguardando retirada'
          }
          description={
            deliveriesHistoryFilter === 'WITHDRAWN'
              ? 'Consulta operacional das encomendas já retiradas na portaria.'
              : deliveriesHistoryFilter === 'ALL'
                ? 'Consulta operacional com o histórico acumulado das encomendas.'
                : 'Consulta operacional das encomendas ainda pendentes na portaria.'
          }
          onClose={() => {
            setOpenDeliveriesHistoryModal(false);
            setDeliverySearch('');
            setDeliveriesHistoryFilter('PENDING');
          }}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setDeliveriesHistoryFilter('ALL')}
                className={`rounded-2xl border p-3 text-center ${deliveriesHistoryFilter === 'ALL' ? brandClasses.softAccentPanel : 'border-white/10 bg-white/5'}`}
              >
                <p className={`text-[10px] uppercase tracking-[0.16em] ${brandClasses.accentTextSoft}`}>Total</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{deliveryStats.total}</p>
                <p className="mt-1 text-[11px] text-slate-400">Hoje {deliveryStats.totalToday}</p>
              </button>
              <button
                type="button"
                onClick={() => setDeliveriesHistoryFilter('PENDING')}
                className={`rounded-2xl border p-3 text-center ${deliveriesHistoryFilter === 'PENDING' ? 'border-amber-500/20 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-amber-100">Aguardando</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{deliveryStats.pendingWithdrawal}</p>
                <p className="mt-1 text-[11px] text-slate-400">Hoje {deliveryStats.pendingToday}</p>
              </button>
              <button
                type="button"
                onClick={() => setDeliveriesHistoryFilter('WITHDRAWN')}
                className={`rounded-2xl border p-3 text-center ${deliveriesHistoryFilter === 'WITHDRAWN' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-100">Retiradas</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{deliveryStats.withdrawn}</p>
                <p className="mt-1 text-[11px] text-slate-400">Hoje {deliveryStats.withdrawnToday}</p>
              </button>
              <div className="hidden rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-red-100">Sem código</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{deliveryStats.pendingWithoutSecureCode}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <label className="text-xs uppercase tracking-[0.16em] text-slate-500">Buscar encomenda</label>
              <input
                value={deliverySearch}
                onChange={(event) => setDeliverySearch(event.target.value)}
                placeholder="Nome do morador, unidade, transportadora ou rastreio..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            {deliveriesError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">Erro ao carregar encomendas.</div>
            ) : deliveriesHistoryItems.length === 0 && !deliverySearch.trim() ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                {deliveriesHistoryFilter === 'WITHDRAWN'
                  ? 'Nenhuma encomenda retirada encontrada.'
                  : deliveriesHistoryFilter === 'ALL'
                    ? 'Nenhuma encomenda encontrada.'
                    : 'Nenhuma encomenda aguardando retirada.'}
              </div>
            ) : deliveriesHistoryItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhuma encomenda encontrada para essa busca.</div>
            ) : (
              <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                {deliveriesHistoryItems.map((delivery) => {
                  const deliveryPerson = delivery.recipientPersonName || (delivery.recipientPersonId ? people.find((person) => person.id === delivery.recipientPersonId)?.name : null);
                  const deliveryUnit = quickDeliveryUnitOptions.find((unit) => unit.id === delivery.recipientUnitId)?.label ?? 'Unidade não identificada';
                  const hasSecureWithdrawal = hasDeliverySecureWithdrawal(delivery);
                  const isNotified = normalizeDeliveryStatus(delivery.status) === 'NOTIFIED';
                  const isUpdatingDelivery = deliveryUpdatingId === delivery.id;
                  const isWithdrawn = normalizeDeliveryStatus(delivery.status) === 'WITHDRAWN';

                  return (
                    <div key={`${delivery.id}-modal`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{deliveryPerson || 'Destinatário não vinculado'}</p>
                          <p className="mt-1 truncate text-sm text-slate-400">
                            {[delivery.deliveryCompany, deliveryUnit, delivery.trackingCode || null].filter(Boolean).join(' | ')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] uppercase text-amber-100">
                            {getDeliveryStatusLabel(delivery.status)}
                          </span>
                          <p className="mt-1 text-xs text-slate-400">{delivery.receivedAt ? new Date(delivery.receivedAt).toLocaleString('pt-BR') : 'Sem data'}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Validação de retirada</p>
                          <p className="mt-1 text-sm text-white">{isWithdrawn ? 'Retirada já concluída e registrada.' : hasSecureWithdrawal ? 'Solicite ao morador o código ou QR Code no app.' : 'Validar identidade manualmente.'}</p>
                          <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${isWithdrawn ? 'text-slate-300' : hasSecureWithdrawal ? 'text-emerald-300' : 'text-amber-200'}`}>
                            {isWithdrawn ? 'Somente consulta' : hasSecureWithdrawal ? 'Código protegido para a portaria' : 'Sem código disponível'}
                          </p>
                        </div>
                        <div className="grid gap-2 lg:min-w-[360px]">
                          {hasSecureWithdrawal && !isWithdrawn ? (
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                              <input
                                value={deliveryWithdrawalCodeById[delivery.id] ?? ''}
                                onChange={(event) =>
                                  setDeliveryWithdrawalCodeById((current) => ({
                                    ...current,
                                    [delivery.id]: event.target.value,
                                  }))
                                }
                                className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-xs text-white outline-none placeholder:text-slate-500"
                                placeholder="Código apresentado pelo morador"
                              />
                              <button
                                type="button"
                                onClick={() => void handleValidateDeliveryWithdrawal(delivery.id)}
                                disabled={deliveryValidatingId === delivery.id}
                                className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {deliveryValidatingId === delivery.id ? 'Validando...' : 'Validar retirada'}
                              </button>
                            </div>
                          ) : null}
                          <div className="grid gap-2 sm:grid-cols-3">
                          {!isWithdrawn ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleNotifyDelivery(delivery.id)}
                                disabled={isNotified || isUpdatingDelivery}
                                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {isUpdatingDelivery ? 'Atualizando...' : isNotified ? 'Notificado' : 'Marcar notificado'}
                              </button>
                              <button
                                type="button"
                                onClick={() => router.push('/operacao/encomendas/retirada-rapida')}
                                className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-amber-50 transition hover:bg-amber-400/20"
                              >
                                Retirada rápida
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleManualDeliveryWithdrawal(delivery.id)}
                                disabled={deliveryValidatingId === delivery.id}
                                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {deliveryValidatingId === delivery.id ? 'Confirmando...' : 'Retirada manual'}
                              </button>
                            </>
                          ) : (
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 sm:col-span-3">
                              Encomenda finalizada
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CrudModal>

        <CrudModal open={openAlertsModal} title="Alertas e eventos críticos" description="Consulta completa dos alertas recentes da operação." onClose={() => setOpenAlertsModal(false)} maxWidth="xl">
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-red-100">Alertas</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{alerts.length}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-amber-100">Permanência</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{overdueOperationalPeople.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Status</p>
                <p className="mt-1 text-center text-xl font-semibold text-white">{alertsLoading ? '...' : 'Atualizado'}</p>
              </div>
            </div>

            <input
              value={alertSearch}
              onChange={(event) => setAlertSearch(event.target.value)}
              placeholder="Buscar por unidade, título, descrição ou tipo da ocorrência"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />

            <div className="grid gap-2 sm:grid-cols-4">
              {[
                { key: 'ALL', label: 'Todos', count: alertsWithOperationalContext.length },
                { key: 'NEW', label: 'Pendentes', count: alertsWithOperationalContext.filter((item) => (item.workflow?.workflowStatus ?? (item.alert.status === 'READ' ? 'RESOLVED' : 'NEW')) === 'NEW').length },
                { key: 'ON_HOLD', label: 'Em espera', count: alertsWithOperationalContext.filter((item) => (item.workflow?.workflowStatus ?? (item.alert.status === 'READ' ? 'RESOLVED' : 'NEW')) === 'ON_HOLD').length },
                { key: 'RESOLVED', label: 'Resolvidos', count: alertsWithOperationalContext.filter((item) => (item.workflow?.workflowStatus ?? (item.alert.status === 'READ' ? 'RESOLVED' : 'NEW')) === 'RESOLVED').length },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setAlertsStatusFilter(option.key as 'ALL' | 'NEW' | 'ON_HOLD' | 'RESOLVED')}
                  className={`rounded-2xl border p-3 text-left transition ${alertsStatusFilter === option.key ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] opacity-80">{option.label}</p>
                  <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{option.count}</p>
                </button>
              ))}
            </div>

            {alertsError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">Erro ao carregar alertas.</div>
            ) : overdueOperationalPeople.length === 0 && alerts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhum alerta no momento.</div>
            ) : (
              <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                {overdueOperationalPeople.map((person) => (
                  <div key={`${person.id}-overdue-modal`} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                    <p className="font-medium">Permanência vencida</p>
                    <p className="mt-1 text-sm">{person.name} passou do horário previsto.</p>
                  </div>
                ))}
                {filteredOperationalAlerts.map(({ alert, workflow, unitLabel, title, description, statusLabel, severityRank }) => {
                  const evidenceUrl = getAlertEvidenceUrl(alert);
                  const showEvidence = Boolean(evidenceUrl && !brokenAlertImageUrls[evidenceUrl]);
                  return (
                    <div key={`${alert.id}-modal`} className={`rounded-2xl border p-3 text-left ${getAlertTone(alert.type)} ${severityRank >= 3 ? 'shadow-[0_0_0_1px_rgba(248,113,113,0.28)]' : ''}`}>
                      <div className="flex items-start gap-3">
                        {showEvidence ? (
                          <img
                            src={evidenceUrl!}
                            alt={title}
                            className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                            onError={() => markAlertImageAsUnavailable(evidenceUrl)}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium">{title}</p>
                              <p className="mt-1 text-sm opacity-90">{appendUnitContext(description, unitLabel)}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <span className={`rounded-full border px-2 py-1 text-[11px] uppercase ${getAlertSeverityClass(severityRank)}`}>
                                {severityRank >= 3 ? 'Crítico' : severityRank === 2 ? 'Atenção' : 'Informativo'}
                              </span>
                              <span className={`rounded-full border px-2 py-1 text-[11px] uppercase ${getAlertWorkflowClass(alert, workflow)}`}>{statusLabel}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setOpenAlertsModal(false);
                                }}
                                className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition hover:bg-white/10"
                              >
                                Detalhar
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-80">
                            <span>{getAlertTypeLabel(alert.type)}</span>
                            <span>{unitLabel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CrudModal>

        <CrudModal open={openActionsModal} title="Painel de acionamentos" description="Acione somente as portas cadastradas para este posto." onClose={() => setOpenActionsModal(false)} maxWidth="xl">
          <div className="space-y-4">
            {operationActionsError && !primaryRemoteOpenDevice ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                Não foi possível carregar os acionamentos agora. Tente novamente em instantes.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {remoteOpenButtons.length > 0 ? remoteOpenButtons.map((action) => {
                const feedbackKey = `${primaryRemoteOpenDevice?.id}:${action.doorNumber}`;
                const feedback = remoteOpenFeedback[feedbackKey];
                const doorStatus = primaryDoorStatus;
                const DoorIcon = isDoorOpenBySensor(doorStatus) ? DoorOpen : DoorClosed;
                return (
                <button
                  key={`${action.doorNumber}-modal`}
                  type="button"
                  onClick={() => void handleRemoteOpenAction(action.doorNumber)}
                  disabled={!primaryRemoteOpenDevice || Boolean(remoteOpenExecutingKey)}
                  className={`min-h-[86px] rounded-[24px] border px-4 py-4 text-left text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${getRemoteOpenFeedbackClass(feedback, 'border-cyan-400/25 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20')}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${getRemoteOpenDoorIconClassWithSensor(feedback, doorStatus)}`}>
                        <DoorIcon className="h-5 w-5" />
                      </span>
                      <span>{remoteOpenExecutingKey === feedbackKey ? 'Acionando...' : action.label}</span>
                    </span>
                    <span className="text-xs font-normal uppercase tracking-[0.14em] opacity-75">{getRemoteOpenDoorStateLabelWithSensor(feedback, doorStatus)}</span>
                  </span>
                </button>
                );
              }) : (
                <button type="button" disabled className="min-h-[86px] rounded-[24px] border border-white/10 bg-slate-950/60 px-4 py-4 text-base font-semibold text-slate-300 opacity-75 sm:col-span-2">
                  Nenhum acionamento ativo
                </button>
              )}
            </div>
          </div>
        </CrudModal>

        <CrudModal
          open={Boolean(pendingOperationAction)}
          title="Confirmar acionamento"
          description="Revise o comando antes de enviar para o dispositivo."
          onClose={() => {
            setPendingOperationAction(null);
            setActionReason('');
          }}
          maxWidth="md"
        >
          {pendingOperationAction ? (
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${brandClasses.softAccentPanel}`}>
                <p className="text-sm font-medium text-white">{pendingOperationAction.label}</p>
                <p className={`mt-1 text-xs uppercase tracking-[0.14em] ${brandClasses.accentTextSoft}`}>{pendingOperationAction.kind}</p>
                <p className="mt-3 text-sm text-slate-200">{pendingOperationAction.description || 'Comando operacional com auditoria.'}</p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Motivo do acionamento</span>
                <input
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Ex.: liberação solicitada pela portaria"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingOperationAction(null);
                    setActionReason('');
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void executeOperationAction(pendingOperationAction, actionReason)}
                  disabled={actionExecutingId === pendingOperationAction.id}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${brandClasses.softAccent}`}
                >
                  {actionExecutingId === pendingOperationAction.id ? 'Acionando...' : 'Confirmar acionamento'}
                </button>
              </div>
            </div>
          ) : null}
        </CrudModal>

        <CrudModal open={openResidentsModal} title="Consulta de moradores" description="A portaria pode consultar moradores, sem alterar o cadastro." onClose={() => setOpenResidentsModal(false)} maxWidth="xl">
          <div className="space-y-4">
            <input
              value={residentSearch}
              onChange={(event) => setResidentSearch(event.target.value)}
              placeholder="Buscar morador por nome, documento, telefone ou unidade..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />

            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {residentSearchResults.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhum morador encontrado.</div>
              ) : (
                residentSearchResults.map((person) => {
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setSelectedResidentPerson(person)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{person.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-sm text-slate-400">
                          <span className={getCategoryTextClass(person.category)}>{getCategoryLabel(person.category)}</span>
                          <span>|</span>
                          <span className="truncate">{getPersonUnitLabel(person, accessibleUnitsMap)}</span>
                          {person.phone || person.document ? (
                            <>
                              <span>|</span>
                              <span className="truncate">
                                {person.phone ? maskPhone(person.phone) : person.document ? maskDocument(person.document) : 'Não informado'}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${getPersonStatusBadgeClass(person.statusLabel || person.status)}`}>
                        {person.statusLabel || person.status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </CrudModal>

        <CrudModal
          open={openOperationalPeopleModal}
          title={
            operationalPeopleModalCategory === 'VISITOR'
              ? 'Consulta de visitantes'
              : operationalPeopleModalCategory === 'SERVICE_PROVIDER'
                ? 'Consulta de prestadores'
                : operationalPeopleModalCategory === 'RENTER'
                  ? 'Consulta de locatarios'
                  : 'Consulta operacional'
          }
          description="Consulte cadastros operacionais e registre entrada ou saida quando necessario."
          onClose={() => {
            setOpenOperationalPeopleModal(false);
            setOperationalPeopleModalSearch('');
            setOperationalPeopleModalCategory('ALL');
          }}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'ALL', label: 'Todos' },
                { key: 'VISITOR', label: 'Visitantes' },
                { key: 'SERVICE_PROVIDER', label: 'Prestadores' },
                { key: 'RENTER', label: 'Locatarios' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setOperationalPeopleModalCategory(option.key as PersonCategory | 'ALL')}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    operationalPeopleModalCategory === option.key
                      ? `${brandClasses.softAccent} text-white`
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpenOperationalPeopleModal(false);
                  if (operationalPeopleModalCategory === 'VISITOR' || operationalPeopleModalCategory === 'SERVICE_PROVIDER' || operationalPeopleModalCategory === 'RENTER') {
                    openQuickPersonByCategory(operationalPeopleModalCategory);
                  } else {
                    setOpenQuickPersonTypeModal(true);
                  }
                }}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${brandClasses.softAccent}`}
              >
                + novo cadastro
              </button>
            </div>

            <input
              value={operationalPeopleModalSearch}
              onChange={(event) => setOperationalPeopleModalSearch(event.target.value)}
              placeholder="Buscar por nome, documento, telefone ou unidade..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />

            <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
              {operationalPeopleModalResults.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhum cadastro encontrado.</div>
              ) : (
                operationalPeopleModalResults.map((person) => {
                  const latestAccess = latestAccessByPerson.get(person.id);
                  const isInside = latestAccess?.action === 'ENTRY' || (!latestAccess && person.status === 'ACTIVE');
                  return (
                    <div key={`${person.id}-operational-consultation`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <OperationalPersonSummaryCard
                        person={person}
                        now={now}
                        latestAccessAction={latestAccess?.action}
                        accessSummary={accessSummaryByPerson.get(person.id)}
                        unitLabel={getPersonUnitLabel(person, accessibleUnitsMap)}
                      />
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => {
                            setOpenOperationalPeopleModal(false);
                            setSelectedSearchPerson(person);
                          }}
                        >
                          Abrir ficha
                        </Button>
                        <Button
                          type="button"
                          className={`text-slate-950 ${brandClasses.solidAccent}`}
                          onClick={() => void (isInside ? handleRegisterExit(person) : handleRegisterEntry(person))}
                          disabled={personUpdatingId === person.id}
                        >
                          {personUpdatingId === person.id ? 'Registrando...' : isInside ? 'Registrar saida' : 'Registrar entrada'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CrudModal>

        <CrudModal
          open={openCamerasListModal}
          title="Consulta de cameras"
          description={`Veja as ${cameras.length} camera(s) liberada(s) para este operador e abra uma delas no monitor da operacao.`}
          onClose={() => setOpenCamerasListModal(false)}
          maxWidth="xl"
        >
          <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
            {cameras.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhuma câmera cadastrada ou liberada para este usuário.</div>
            ) : (
              cameras.map((camera) => (
                <div key={`${camera.id}-camera-consultation`} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-white">{camera.name || camera.location || 'Câmera sem nome'}</p>
                      <span className={`rounded-full border px-3 py-1 text-[11px] ${getCameraBadgeTone(camera.status)}`}>{camera.status}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-400">{camera.location || 'Local não informado'}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{getScopeLabel(camera, unitLabels)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => {
                        setOpenCamerasListModal(false);
                        focusCameraOnMonitor(camera.id);
                      }}
                    >
                      Ver na tela
                    </Button>
                    <Button type="button" className={`text-slate-950 ${brandClasses.solidAccent}`} onClick={openCameraMonitor}>
                      Monitor externo
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CrudModal>

        <CrudModal open={openAccessHistoryModal} title="Histórico completo de acessos" description="Consulta dos eventos recentes registrados pela portaria." onClose={() => setOpenAccessHistoryModal(false)} maxWidth="xl">
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-100">Entradas</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{recentAccessTimeline.filter((event) => event.action === 'ENTRY').length}</p>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-red-100">Saidas</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{recentAccessTimeline.filter((event) => event.action === 'EXIT').length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Total exibido</p>
                <p className="mt-1 text-center text-xl font-semibold tabular-nums text-white">{recentAccessTimeline.length}</p>
              </div>
            </div>

            {recentAccessTimeline.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhum acesso registrado ainda.</div>
            ) : (
              <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                {recentAccessTimeline.map((event) => (
                  <div key={`${event.personId}-${event.createdAt}-${event.action}-modal`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{event.personName}</p>
                      <p className="mt-1 truncate text-sm text-slate-400">{event.categoryLabel} | {event.unitLabel}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${event.action === 'ENTRY' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-100'}`}>
                          {event.action === 'ENTRY' ? 'entrada' : 'saída'}
                      </span>
                      <p className="mt-1 text-xs text-slate-400">{new Date(event.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CrudModal>

        <CrudModal open={openEntryModal} title="Registrar entrada" description="Selecione a pessoa e vincule a unidade de destino antes de confirmar." onClose={() => { setOpenEntryModal(false); setEntryForm(initialEntryForm); }} maxWidth="xl">
          <div className="space-y-5">
            <input
              value={entryForm.search}
              onChange={(event) => setEntryForm((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar visitante, prestador ou locatário..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />

            <div className="max-h-[34vh] space-y-3 overflow-y-auto pr-1">
              {entryCandidates.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhuma pessoa operacional encontrada.</div>
              ) : (
                entryCandidates.map((person) => {
                  const latestAccess = latestAccessByPerson.get(person.id);

                  return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() =>
                      setEntryForm((current) => ({
                        ...current,
                        personIds: current.personIds.includes(person.id)
                          ? current.personIds.filter((id) => id !== person.id)
                          : [...current.personIds, person.id],
                        unitId: current.unitId || person.unitId || '',
                      }))
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      entryForm.personIds.includes(person.id)
                        ? 'border-cyan-300/70 bg-cyan-400/18 shadow-[0_0_0_1px_rgba(103,232,249,0.22)]'
                        : 'border-white/10 bg-white/[0.035] hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{person.name}</p>
                        <p className="mt-1 truncate text-sm text-slate-400">
                          {[
                            getPersonLabel(person),
                            getPersonUnitLabel(person, accessibleUnitsMap),
                            person.document || null,
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${getPresenceStateClass(person, latestAccess?.action)}`}>
                          {getPresenceStateLabel(person, latestAccess?.action)}
                        </span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
                          entryForm.personIds.includes(person.id)
                            ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                            : 'border-white/15 text-slate-400'
                        }`}>
                          {entryForm.personIds.includes(person.id) ? 'OK' : '+'}
                        </span>
                      </div>
                    </div>
                  </button>
                )})
              )}
            </div>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Unidade de destino</span>
              <select
                value={entryForm.unitId}
                onChange={(event) => setEntryForm((current) => ({ ...current, unitId: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="">Selecione a unidade</option>
                {quickPersonUnitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id} className="bg-slate-950 text-white">
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Entrada em lote</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {entryForm.personIds.length === 0
                      ? 'Selecione uma ou mais pessoas para registrar a entrada em conjunto.'
                      : `${entryForm.personIds.length} pessoa(s) selecionada(s) para o mesmo destino.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entryCandidates.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEntryForm((current) => ({
                          ...current,
                          personIds: Array.from(new Set([...current.personIds, ...entryCandidates.map((person) => person.id)])),
                        }))
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
                    >
                      Selecionar visiveis
                    </button>
                  ) : null}
                  {entryForm.personIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setEntryForm((current) => ({ ...current, personIds: [] }))}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
                    >
                      Limpar selecao
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedEntryPeople.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {selectedEntryPeople.length === 1 ? 'Pessoa selecionada' : 'Pessoas selecionadas'}
                </p>
                <div className="grid gap-3">
                  {selectedEntryPeople.map((selectedEntryPerson) => (
                    <OperationalPersonSummaryCard
                      key={selectedEntryPerson.id}
                      person={{
                        ...selectedEntryPerson,
                        unitId: entryForm.unitId || selectedEntryPerson.unitId,
                        unit:
                          (entryForm.unitId ? accessibleUnitsMap.get(entryForm.unitId) : null) ??
                          selectedEntryPerson.unit ??
                          null,
                      }}
                      unitLabel={getPersonUnitLabel(
                        {
                          ...selectedEntryPerson,
                          unitId: entryForm.unitId || selectedEntryPerson.unitId,
                          unit:
                            (entryForm.unitId ? accessibleUnitsMap.get(entryForm.unitId) : null) ??
                            selectedEntryPerson.unit ??
                            null,
                        },
                        accessibleUnitsMap
                      )}
                      now={now}
                      latestAccessAction={latestAccessByPerson.get(selectedEntryPerson.id)?.action}
                      accessSummary={accessSummaryByPerson.get(selectedEntryPerson.id)}
                      highlighted
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setOpenEntryModal(false); setEntryForm(initialEntryForm); }} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleRegisterEntryFromModal()} disabled={savingEntry || entryForm.personIds.length === 0 || !entryForm.unitId} className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
                {savingEntry ? 'Registrando...' : entryForm.personIds.length > 1 ? 'Confirmar entradas' : 'Confirmar entrada'}
              </button>
            </div>
          </div>
        </CrudModal>

        <CrudModal open={openExitModal} title="Registrar saída" description="Selecione quem está deixando o condomínio e confirme a baixa." onClose={() => { setOpenExitModal(false); setExitForm(initialExitForm); }} maxWidth="xl">
          <div className="space-y-5">
            <input
              value={exitForm.search}
              onChange={(event) => setExitForm((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar quem está saindo..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />

            <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
              {exitCandidates.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Nenhuma pessoa com presenca ativa encontrada.</div>
              ) : (
                exitCandidates.map((person) => {
                  const latestAccess = latestAccessByPerson.get(person.id);

                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() =>
                        setExitForm((current) => ({
                          ...current,
                          personIds: current.personIds.includes(person.id)
                            ? current.personIds.filter((id) => id !== person.id)
                            : [...current.personIds, person.id],
                        }))
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        exitForm.personIds.includes(person.id)
                          ? 'border-emerald-300/70 bg-emerald-400/18 shadow-[0_0_0_1px_rgba(110,231,183,0.22)]'
                          : 'border-white/10 bg-white/[0.035] hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{person.name}</p>
                          <p className="mt-1 truncate text-sm text-slate-400">
                            {[
                            getPersonLabel(person),
                              getPersonUnitLabel(person, accessibleUnitsMap),
                              person.document || null,
                            ]
                              .filter(Boolean)
                              .join(' | ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${getPresenceStateClass(person, latestAccess?.action)}`}>
                            {getPresenceStateLabel(person, latestAccess?.action)}
                          </span>
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
                            exitForm.personIds.includes(person.id)
                              ? 'border-emerald-300 bg-emerald-300 text-slate-950'
                              : 'border-white/15 text-slate-400'
                          }`}>
                            {exitForm.personIds.includes(person.id) ? 'OK' : '+'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saida em lote</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {exitForm.personIds.length === 0
                      ? 'Selecione uma ou mais pessoas para registrar a saída em conjunto.'
                      : `${exitForm.personIds.length} pessoa(s) selecionada(s) para baixa coletiva.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exitCandidates.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExitForm((current) => ({
                          ...current,
                          personIds: Array.from(new Set([...current.personIds, ...exitCandidates.map((person) => person.id)])),
                        }))
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
                    >
                      Selecionar visiveis
                    </button>
                  ) : null}
                  {exitForm.personIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExitForm((current) => ({ ...current, personIds: [] }))}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
                    >
                      Limpar selecao
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedExitPeople.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {selectedExitPeople.length === 1 ? 'Pessoa selecionada' : 'Pessoas selecionadas'}
                </p>
                <div className="grid gap-3">
                  {selectedExitPeople.map((selectedExitPerson) => (
                    <OperationalPersonSummaryCard
                      key={selectedExitPerson.id}
                      person={selectedExitPerson}
                      now={now}
                      latestAccessAction={latestAccessByPerson.get(selectedExitPerson.id)?.action}
                      accessSummary={accessSummaryByPerson.get(selectedExitPerson.id)}
                      highlighted
                      unitLabel={getPersonUnitLabel(selectedExitPerson, accessibleUnitsMap)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setOpenExitModal(false); setExitForm(initialExitForm); }} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (exitForm.personIds.length > 1) {
                    setOpenBatchExitConfirm(true);
                    return;
                  }
                  void handleRegisterExitFromModal();
                }}
                disabled={savingExit || exitForm.personIds.length === 0}
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingExit ? 'Registrando...' : exitForm.personIds.length > 1 ? 'Confirmar saídas' : 'Confirmar saída'}
              </button>
            </div>
          </div>
        </CrudModal>

        <CrudModal open={openOccurrence} title="Nova ocorrência operacional" description="Registre um evento acompanhado pela portaria." onClose={() => setOpenOccurrence(false)} maxWidth="lg">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await handleCreateOccurrence();
            }}
            className="space-y-5"
          >
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Título</span>
              <input
                value={occurrenceForm.title}
                onChange={(event) => setOccurrenceForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Ex.: Movimentação suspeita na entrada"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Descrição</span>
              <textarea
                value={occurrenceForm.description}
                onChange={(event) => setOccurrenceForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-32 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Descreva o ocorrido e a ação tomada pela portaria"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Prioridade</span>
              <select
                value={occurrenceForm.priority}
                onChange={(event) =>
                  setOccurrenceForm((current) => ({
                    ...current,
                    priority: event.target.value as OccurrenceFormData['priority'],
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Vinculo da ocorrência</span>
              <select
                value={occurrenceForm.scopeType}
                onChange={(event) =>
                  setOccurrenceForm((current) => ({
                    ...current,
                    scopeType: event.target.value as OccurrenceFormData['scopeType'],
                    unitId: event.target.value === 'UNIT' ? current.unitId || selectedOperationUnitId || selectedSearchPerson?.unitId || '' : '',
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="CONDOMINIUM">Condomínio inteiro</option>
                <option value="UNIT">Unidade específica</option>
              </select>
            </label>

            {occurrenceForm.scopeType === 'UNIT' ? (
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Unidade</span>
                <select
                  value={occurrenceForm.unitId}
                  onChange={(event) => setOccurrenceForm((current) => ({ ...current, unitId: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                  required
                >
                  <option value="">Selecione a unidade</option>
                  {effectiveUnits.map((unit) => (
                    <option key={`occurrence-unit-${unit.id}`} value={unit.id}>
                      {getCompleteUnitLabel(unit, unit.label)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setOpenOccurrence(false)} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
                Cancelar
              </button>
              <button type="submit" disabled={savingOccurrence} className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
                {savingOccurrence ? 'Salvando...' : 'Registrar ocorrência'}
              </button>
            </div>
          </form>
        </CrudModal>

        <CrudModal
          open={openBatchExitConfirm}
          title="Confirmar saída coletiva"
          description="Revise a baixa coletiva antes de registrar a saída de várias pessoas."
          onClose={() => setOpenBatchExitConfirm(false)}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Você está prestes a registrar a saída coletiva de {selectedExitPeople.length} pessoas. Essa ação vai gerar um registro individual de saída para cada uma.
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pessoas selecionadas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedExitPeople.map((person) => (
                  <span key={person.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white">
                    {person.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenBatchExitConfirm(false)}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
              >
                Revisar selecao
              </button>
              <button
                type="button"
                onClick={() => void handleRegisterExitFromModal()}
                disabled={savingExit || selectedExitPeople.length < 2}
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingExit ? 'Registrando...' : 'Confirmar saída coletiva'}
              </button>
            </div>
          </div>
        </CrudModal>

        <CrudModal
          open={Boolean(selectedSearchPerson)}
          title="Detalhes da pessoa"
          description="Consulte a ficha operacional e execute a ação adequada."
          onClose={() => setSelectedSearchPerson(null)}
          maxWidth="xl"
        >
          {selectedSearchPerson ? (
            (() => {
              const latestAccess = latestAccessByPerson.get(selectedSearchPerson.id);
              const accessSummary = accessSummaryByPerson.get(selectedSearchPerson.id);
              const scheduleState = getScheduleState(selectedSearchPerson, now);
              const canManageAccess = ['VISITOR', 'SERVICE_PROVIDER', 'RENTER', 'DELIVERER'].includes(selectedSearchPerson.category);
              const canRegisterEntry = canManageAccess && latestAccess?.action !== 'ENTRY';
              const canRegisterExit =
                canManageAccess &&
                selectedSearchPerson.status === 'ACTIVE' &&
                (latestAccess?.action === 'ENTRY' || !latestAccess);

              return (
                <div className="space-y-5">
                  <OperationalPersonSummaryCard
                    person={selectedSearchPerson}
                    now={now}
                    latestAccessAction={latestAccess?.action}
                    accessSummary={accessSummary}
                    highlighted
                    unitLabel={getPersonUnitLabel(selectedSearchPerson, accessibleUnitsMap)}
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSearchPerson(null);
                        openEditOperationalPerson(selectedSearchPerson);
                      }}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Editar cadastro
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOccurrenceForm({
                           title: `Ocorrencia com ${selectedSearchPerson.name}`,
                          description: `${getPersonLabel(selectedSearchPerson)} vinculado a ${getPersonUnitLabel(selectedSearchPerson, accessibleUnitsMap)}.`,
                           priority: scheduleState.label === 'Permanencia vencida' ? 'high' : 'medium',
                           scopeType: selectedSearchPerson.unitId ? 'UNIT' : 'CONDOMINIUM',
                           unitId: selectedSearchPerson.unitId ?? '',
                        });
                        setSelectedAlert(null);
                        setSelectedSearchPerson(null);
                        setOpenOccurrence(true);
                      }}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                       Gerar ocorrência
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTogglePersonAccess(selectedSearchPerson)}
                      disabled={personUpdatingId === selectedSearchPerson.id}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      {personUpdatingId === selectedSearchPerson.id
                        ? 'Atualizando...'
                        : selectedSearchPerson.status === 'BLOCKED'
                          ? 'Liberar acesso'
                          : 'Bloquear acesso'}
                    </button>
                    {canRegisterEntry ? (
                      <button
                        type="button"
                        onClick={() => void handleRegisterEntry(selectedSearchPerson)}
                        disabled={personUpdatingId === selectedSearchPerson.id}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${brandClasses.softAccent}`}
                      >
                        {personUpdatingId === selectedSearchPerson.id ? 'Registrando...' : 'Registrar entrada'}
                      </button>
                    ) : null}
                    {canRegisterExit ? (
                      <button
                        type="button"
                        onClick={() => void handleRegisterExit(selectedSearchPerson)}
                        disabled={personUpdatingId === selectedSearchPerson.id}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        {personUpdatingId === selectedSearchPerson.id ? 'Registrando...' : 'Registrar saída'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })()
          ) : null}
        </CrudModal>

        <CrudModal
          open={Boolean(selectedResidentPerson)}
          title={selectedResidentIsUnitConversation ? 'Mensagens da unidade' : 'Detalhes do morador'}
          description={selectedResidentIsUnitConversation ? 'Conversa recebida sem morador identificado.' : 'Consulta operacional do morador.'}
          onClose={() => {
            setSelectedResidentPerson(null);
            setResidentMessageText('');
            setResidentMessageChannel('PORTARIA');
          }}
          maxWidth="xl"
        >
          {selectedResidentPerson ? (
            <div className="space-y-5">
              <OperationalPersonSummaryCard
                person={selectedResidentPerson}
                now={now}
                latestAccessAction={latestAccessByPerson.get(selectedResidentPerson.id)?.action}
                accessSummary={accessSummaryByPerson.get(selectedResidentPerson.id)}
                highlighted
                revealSensitive
                unitLabel={getPersonUnitLabel(selectedResidentPerson, accessibleUnitsMap)}
              />

              <div className={`rounded-2xl border p-4 ${brandClasses.softAccentPanel}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className={`text-xs uppercase tracking-[0.18em] ${brandClasses.accentTextSoft}`}>Mensagens</p>
                    <p className="mt-1 text-sm text-slate-300">Histórico recente da unidade.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadResidentMessagesCount > 0 ? (
                      <span className="rounded-full border border-amber-400/25 bg-amber-400/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                        {unreadResidentMessagesCount} não lida{unreadResidentMessagesCount > 1 ? 's' : ''}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void refetchResidentMessages()}
                      disabled={!selectedResidentUnitId || residentMessagesLoading}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10 disabled:opacity-60"
                    >
                      Atualizar
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-emerald-300" />
                        <p className="text-sm font-medium text-white">Conexao WhatsApp</p>
                      </div>
                      <p className="text-sm text-slate-300">
                        {residentPhone ? `Telefone do morador: ${residentPhone}` : 'Morador sem telefone cadastrado para o WhatsApp.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${residentWhatsAppReady ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/30 bg-amber-500/10 text-amber-100'}`}>
                          {getWhatsAppConnectionLabel(residentWhatsAppConnection?.state, residentWhatsAppConnection?.enabled)}
                        </span>
                        {residentWhatsAppConnection?.instance ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                            Instancia {residentWhatsAppConnection.instance}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleConnectResidentWhatsApp()}
                      disabled={!selectedResidentUnitId || residentWhatsAppConnecting}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${brandClasses.softAccent}`}
                    >
                      {residentWhatsAppConnecting ? 'Preparando...' : residentWhatsAppReady ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
                    </button>
                  </div>

                  {residentWhatsAppError ? (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                      Não foi possível consultar a conexão do WhatsApp agora.
                    </div>
                  ) : null}

                  {residentWhatsAppLoading && !residentWhatsAppConnection ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">Carregando status do WhatsApp...</div>
                  ) : null}

                  {residentWhatsAppQrCodeImage ? (
                    <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
                      <div className="rounded-2xl border border-white/10 bg-white p-3">
                        <Image
                          src={residentWhatsAppQrCodeImage}
                          alt="QR code do WhatsApp"
                          width={220}
                          height={220}
                          unoptimized
                          className="h-auto w-full rounded-xl"
                        />
                      </div>
                      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-white">
                          <QrCode className="h-4 w-4 text-emerald-300" />
                          <p className="text-sm font-medium">Leia o QR code no celular da portaria para concluir a conexao.</p>
                        </div>
                        <p className="text-sm text-slate-300">
                          A tela atualiza sozinha ate a conexao ficar pronta.
                        </p>
                        {residentWhatsAppPairingCode ? (
                          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Codigo de pareamento</p>
                            <p className="mt-2 break-all font-mono text-sm text-white">{residentWhatsAppPairingCode}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : residentWhatsAppConnection?.enabled ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                      {residentWhatsAppReady ? 'WhatsApp conectado e pronto para uso.' : 'A conexão está em preparação. Assim que o QR Code ficar disponível, ele aparecerá aqui.'}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {!selectedResidentUnitId ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">Morador sem unidade vinculada.</div>
                  ) : residentMessagesLoading ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">Carregando mensagens...</div>
                  ) : residentMessagesError ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">As mensagens ainda não estão disponíveis no momento.</div>
                  ) : residentMessages.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">Nenhuma mensagem para esta unidade.</div>
                  ) : (
                    residentMessages.map((message) => (
                      <div key={message.id} className={`rounded-xl border p-3 text-sm ${message.direction === 'OUTBOUND' ? `${brandClasses.softAccentPanel} text-white` : !message.readAt ? 'border-amber-400/30 bg-amber-400/10 text-amber-50' : 'border-white/10 bg-white/5 text-slate-200'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{message.direction === 'OUTBOUND' ? 'Portaria' : message.senderName || 'Morador'}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                              {getOperationMessageChannelLabel(message.channel)}
                            </span>
                            {!message.readAt ? (
                              <span className="rounded-full border border-amber-400/25 bg-amber-400/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                                Nova
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">{new Date(message.createdAt).toLocaleString('pt-BR')}</span>
                            {!message.readAt ? (
                              <button
                                type="button"
                                onClick={() => void handleMarkResidentMessageRead(message)}
                                disabled={residentMessageUpdatingId === message.id}
                                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:opacity-60"
                              >
                                {residentMessageUpdatingId === message.id ? '...' : 'Lida'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-1">{message.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSendResidentMessageV55();
                  }}
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"
                >
                  <div className="grid gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setResidentMessageChannel('PORTARIA')}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${residentMessageChannel === 'PORTARIA' ? `${brandClasses.softAccent} text-white` : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5" />
                          Aplicativo
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setResidentMessageChannel('WHATSAPP')}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${residentMessageChannel === 'WHATSAPP' ? `${brandClasses.softAccent} text-white` : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5" />
                          WhatsApp
                        </span>
                      </button>
                    </div>
                    <input
                      value={residentMessageText}
                      onChange={(event) => setResidentMessageText(event.target.value)}
                      disabled={!selectedResidentUnitId}
                      placeholder={residentMessageChannel === 'WHATSAPP' ? 'Mensagem para enviar pelo WhatsApp' : 'Mensagem para a unidade'}
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
                    />
                    {residentMessageChannel === 'WHATSAPP' ? (
                      <div className={`rounded-xl border p-3 text-xs ${residentWhatsAppReady ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/20 bg-amber-500/10 text-amber-100'}`}>
                        {!residentWhatsAppCanSend
                          ? 'Cadastre um telefone no morador para liberar o envio por WhatsApp.'
                          : residentWhatsAppReady
                            ? 'WhatsApp conectado. A mensagem sera enviada no mesmo historico da conversa.'
                            : 'Conecte o WhatsApp da unidade para liberar esse envio.'}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    disabled={
                      !selectedResidentUnitId ||
                      residentMessageSaving ||
                      !residentMessageText.trim() ||
                      (residentMessageChannel === 'WHATSAPP' && (!residentWhatsAppCanSend || !residentWhatsAppReady))
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${brandClasses.softAccent}`}
                  >
                    {residentMessageSaving ? 'Enviando...' : 'Enviar'}
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPeopleSearch(selectedResidentPerson.name);
                    setSelectedResidentPerson(null);
                    setOpenResidentsModal(false);
                    consultationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Buscar na operação
                </button>
              </div>
            </div>
          ) : null}
        </CrudModal>

        <CrudModal open={Boolean(selectedAlert)} title="Tratamento da ocorrência" description="Registre a ocorrência sem perder rascunho e finalize somente quando houver validação." onClose={() => setSelectedAlert(null)} maxWidth="lg">
          {selectedAlert ? (
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${getAlertTone(selectedAlert.type)}`}>
                <p className="font-medium">{selectedAlert.title || 'Alerta'}</p>
                <p className="mt-2 text-sm opacity-90">{selectedAlert.description || 'Sem descrição complementar.'}</p>
              </div>

              {alertResolutionError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  Não foi possível encerrar a ocorrência: {alertResolutionError}
                </div>
              ) : null}

              {selectedAlertMediaItems.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">Evidências de câmera</p>
                      <p className="mt-1 text-xs text-slate-400">Snapshot do evento e replay de pré-alarme quando enviados pelo backend.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      {selectedAlertMediaItems.length} câmera(s)
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedAlertMediaItems.map((media) => {
                      const mediaSnapshotUnavailable = Boolean(media.snapshotUrl && brokenAlertImageUrls[media.snapshotUrl]);
                      return (
                        <div key={media.key} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-3 py-2">
                            <span className="truncate text-xs font-medium text-white">{media.cameraName || 'Câmera do alerta'}</span>
                            {media.cameraId ? <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">vinculada</span> : null}
                          </div>
                          {media.snapshotUrl && !mediaSnapshotUnavailable ? (
                            <img
                              src={media.snapshotUrl}
                              alt={media.cameraName || selectedAlert.title || 'Snapshot do alerta'}
                              className="h-56 w-full object-cover"
                              onError={() => markAlertImageAsUnavailable(media.snapshotUrl)}
                            />
                          ) : (
                            <div className="flex h-40 items-center justify-center p-4 text-center text-sm text-slate-300">
                              {mediaSnapshotUnavailable ? 'Snapshot indisponível no momento.' : 'Snapshot não enviado para esta câmera.'}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 p-3">
                            {media.replayUrl ? (
                              <a
                                href={media.replayUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${brandClasses.softAccent}`}
                              >
                                Ver replay
                              </a>
                            ) : null}
                            {media.cameraId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10"
                                onClick={() => {
                                  openCameraMonitorForAlert(selectedAlert);
                                  setSelectedAlert(null);
                                }}
                              >
                                Abrir no monitor externo
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedAlertImageUrl && !selectedAlertImageUnavailable ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <img
                    src={selectedAlertImageUrl}
                    alt={selectedAlert.title || 'Registro do alerta'}
                    className="h-72 w-full object-cover"
                    onError={() => markAlertImageAsUnavailable(selectedAlertImageUrl)}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  {selectedAlertImageUnavailable ? 'A imagem desta ocorrência não está disponível no momento.' : 'Nenhuma imagem foi enviada para esta ocorrência.'}
                </div>
              )}

              {selectedAlertReplayUrl ? (
                <div className={`rounded-2xl border p-4 ${brandClasses.softAccentPanel}`}>
                  <p className={`text-xs uppercase tracking-[0.18em] ${brandClasses.accentTextSoft}`}>Pré-alarme</p>
                  <p className="mt-2 text-sm text-slate-100">Foi gerado um replay curto para confirmar o que originou o alerta.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href={selectedAlertReplayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center rounded-xl border px-4 py-3 text-sm font-medium transition ${brandClasses.softAccent}`}
                    >
                      Abrir pré-alarme
                    </a>
                    {selectedAlert.cameraId ? (
                      <Button
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                          openCameraMonitorForAlert(selectedAlert);
                          setSelectedAlert(null);
                        }}
                      >
                        Abrir monitor externo
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Status operacional</p><p className="mt-2 text-sm font-medium text-white">{getAlertWorkflowLabel(selectedAlert, selectedAlertWorkflow)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Prioridade</p><p className="mt-2 text-sm font-medium text-white">{getAlertSeverityRank(selectedAlert) >= 3 ? 'Crítico' : getAlertSeverityRank(selectedAlert) === 2 ? 'Atenção' : 'Informativo'}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Tipo</p><p className="mt-2 text-sm font-medium text-white">{getAlertTypeLabel(selectedAlert.type)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Câmera</p><p className="mt-2 text-sm font-medium text-white">{selectedAlertCamera?.name || (selectedAlert.cameraId ? 'Associada ao evento' : 'Sem câmera vinculada')}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Pessoa</p><p className="mt-2 text-sm font-medium text-white">{selectedAlertPerson?.name || (selectedAlert.personId ? 'Associada ao evento' : 'Sem pessoa vinculada')}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Unidade</p><p className="mt-2 text-sm font-medium text-white">{selectedAlertUnitLabel}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Hora da chegada</p><p className="mt-2 text-sm font-medium text-white">{formatOptionalDateTime(selectedAlertWorkflow?.arrivedAt ?? selectedAlert.timestamp)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Hora de abertura</p><p className="mt-2 text-sm font-medium text-white">{formatOptionalDateTime(selectedAlertWorkflow?.openedAt)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Hora de resolução</p><p className="mt-2 text-sm font-medium text-white">{formatOptionalDateTime(selectedAlertWorkflow?.resolvedAt)}</p></div>
                {selectedAlertWorkflow?.openedByName ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Aberto por</p><p className="mt-2 text-sm font-medium text-white">{selectedAlertWorkflow.openedByName}</p></div> : null}
                {selectedAlertWorkflow?.resolvedByName ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Resolvido por</p><p className="mt-2 text-sm font-medium text-white">{selectedAlertWorkflow.resolvedByName}</p></div> : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Respostas sugeridas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {alertResolutionPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAlertResolutionPreset(preset);
                        setAlertResolutionText((current) => current.trim() ? current : preset);
                        setAlertResolutionError(null);
                        window.requestAnimationFrame(() => alertResolutionTextareaRef.current?.focus());
                      }}
                      className={`rounded-full border px-3 py-2 text-xs transition ${alertResolutionPreset === preset ? brandClasses.softAccent : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/10'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Resolução da ocorrência <span className="text-red-300">*</span></span>
                <textarea
                  ref={alertResolutionTextareaRef}
                  value={alertResolutionText}
                  onChange={(event) => {
                    setAlertResolutionText(event.target.value);
                    if (`${alertResolutionPreset} ${event.target.value}`.trim()) {
                      setAlertResolutionError(null);
                    }
                  }}
                  rows={5}
                  placeholder="Descreva o que gerou o disparo, o que foi verificado e como a ocorrência foi tratada."
                  className={`w-full rounded-2xl border bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 ${alertResolutionError ? 'border-red-500/40' : 'border-white/10'}`}
                />
                <p className="text-xs text-slate-500">Esse preenchimento é obrigatório para encerrar a ocorrência.</p>
              </label>

              {selectedAlertWorkflow?.resolutionNote || selectedAlertWorkflow?.resolutionPreset ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Última resolução registrada</p>
                  <p className="mt-2 text-sm text-white">{selectedAlertWorkflow?.resolutionNote || selectedAlertWorkflow?.resolutionPreset}</p>
                </div>
              ) : null}

              {selectedAlertWorkflow?.draftSavedAt ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-100">Rascunho salvo</p>
                  <p className="mt-2 text-sm text-white">{formatOptionalDateTime(selectedAlertWorkflow.draftSavedAt)}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                {selectedAlert.cameraId ? (
                  <Button
                    variant="outline"
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                      openCameraMonitorForAlert(selectedAlert);
                      setSelectedAlert(null);
                    }}
                  >
                    Abrir monitor externo
                  </Button>
                ) : null}
                {selectedAlertPerson ? (
                  <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => { setPeopleSearch(selectedAlertPerson.name); setSelectedAlert(null); consultationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                    Focar pessoa
                  </Button>
                ) : null}
                <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={handleSaveSelectedAlertDraft}>
                  Salvar rascunho
                </Button>
                <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={handleHoldSelectedAlert}>
                  Colocar em espera
                </Button>
                <Button onClick={() => void handleResolveSelectedAlert()} disabled={alertUpdating} className={brandClasses.solidAccent}>
                  {alertUpdating ? 'Salvando...' : 'Resolver ocorrência'}
                </Button>
              </div>
            </div>
          ) : null}
        </CrudModal>
      </div>
    </div>
  );
}


