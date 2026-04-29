'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Camera,
  Cpu,
  DoorClosed,
  DoorOpen,
  Fingerprint,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Router,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/features/http/api-error';
import { useAuth } from '@/hooks/use-auth';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { devicesService } from '@/services/devices.service';
import { accessGroupsService } from '@/services/access-groups.service';
import { faceEquipmentCatalogService, type FaceEquipmentCatalogEntry } from '@/services/face-equipment-catalog.service';
import { getAllPeople } from '@/services/people.service';
import type { AccessGroup } from '@/types/access-group';
import type {
  Device,
  DeviceControlResponse,
  DevicePayload,
  DeviceStatus,
  DeviceType,
  DeviceUsageType,
} from '@/types/device';
import type { Person } from '@/types/person';

type DeviceForm = {
  name: string;
  type: DeviceType;
  vendor: string;
  model: string;
  host: string;
  aiPort: string;
  webPort: string;
  username: string;
  password: string;
  streamUrl: string;
  snapshotUrl: string;
  monitoringEnabled: boolean;
  residentVisible: boolean;
  cameraEnabled: boolean;
  deviceUsageType: '' | DeviceUsageType;
  actionOneLabel: string;
  actionTwoLabel: string;
  actionOneEnabled: boolean;
  actionTwoEnabled: boolean;
  interlockEnabled: boolean;
  interlockBlockedDeviceIds: string[];
  interlockOpenStateTtlSeconds: string;
  accessGroupIds: string[];
  status: DeviceStatus;
};

type ControlForm = {
  remoteAddress: string;
  monitorHost: string;
  monitorPort: string;
  monitorPath: string;
  serverId: string;
  serverAddress: string;
  serverName: string;
  doorNumber: string;
  secboxId: string;
  portalId: string;
  personId: string;
  personSearch: string;
};

type ActionFeedback = 'success' | 'pending' | 'error';

const initialForm: DeviceForm = {
  name: '',
  type: 'FACIAL_DEVICE',
  vendor: '',
  model: '',
  host: '',
  aiPort: '80',
  webPort: '80',
  username: '',
  password: '',
  streamUrl: '',
  snapshotUrl: '',
  monitoringEnabled: true,
  residentVisible: false,
  cameraEnabled: false,
  deviceUsageType: 'ENTRY',
  actionOneLabel: 'Acionamento 1',
  actionTwoLabel: 'Acionamento 2',
  actionOneEnabled: true,
  actionTwoEnabled: true,
  interlockEnabled: false,
  interlockBlockedDeviceIds: [],
  interlockOpenStateTtlSeconds: '180',
  accessGroupIds: [],
  status: 'OFFLINE',
};

const initialControlForm: ControlForm = {
  remoteAddress: '',
  monitorHost: '',
  monitorPort: '3000',
  monitorPath: 'api/notifications',
  serverId: '1',
  serverAddress: '',
  serverName: 'sapinho',
  doorNumber: '1',
  secboxId: '',
  portalId: '',
  personId: '',
  personSearch: '',
};

const DEVICES_PENDING_SYNC_STORAGE_KEY = 'admin-devices-pending-sync';
const DEVICES_PENDING_ENTRIES_STORAGE_KEY = 'admin-devices-pending-entries';

function getDeviceCacheKey(condominiumId?: string | null) {
  return condominiumId ? `admin-devices:${condominiumId}` : 'admin-devices:global';
}

function readCachedDevices(condominiumId?: string | null): Device[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getDeviceCacheKey(condominiumId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Device[]) : [];
  } catch {
    return [];
  }
}

function readCachedDevicesTimestamp(condominiumId?: string | null) {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(`${getDeviceCacheKey(condominiumId)}:updatedAt`);
  } catch {
    return null;
  }
}

function readPendingDeviceIds() {
  if (typeof window === 'undefined') return [] as string[];

  try {
    const raw = window.localStorage.getItem(DEVICES_PENDING_SYNC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function persistPendingDeviceIds(deviceIds: string[]) {
  if (typeof window === 'undefined') return;

  try {
    if (deviceIds.length > 0) {
      window.localStorage.setItem(DEVICES_PENDING_SYNC_STORAGE_KEY, JSON.stringify(deviceIds));
    } else {
      window.localStorage.removeItem(DEVICES_PENDING_SYNC_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and keep normal page flow.
  }
}

function readPendingDevices() {
  if (typeof window === 'undefined') return [] as Device[];

  try {
    const raw = window.localStorage.getItem(DEVICES_PENDING_ENTRIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Device[]) : [];
  } catch {
    return [];
  }
}

function persistPendingDevices(devices: Device[]) {
  if (typeof window === 'undefined') return;

  try {
    if (devices.length > 0) {
      window.localStorage.setItem(DEVICES_PENDING_ENTRIES_STORAGE_KEY, JSON.stringify(devices));
    } else {
      window.localStorage.removeItem(DEVICES_PENDING_ENTRIES_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and keep normal page flow.
  }
}

function persistCachedDevices(condominiumId: string | null | undefined, devices: Device[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getDeviceCacheKey(condominiumId), JSON.stringify(devices));
    window.localStorage.setItem(`${getDeviceCacheKey(condominiumId)}:updatedAt`, new Date().toISOString());
  } catch {
    // Ignore cache failures and keep normal page flow.
  }
}

function mergeDeviceList(devices: Device[], nextDevice: Device) {
  if (!nextDevice?.id) return devices;

  const nextIndex = devices.findIndex((device) => device.id === nextDevice.id);
  if (nextIndex === -1) {
    return [nextDevice, ...devices];
  }

  const nextDevices = [...devices];
  nextDevices[nextIndex] = nextDevice;
  return nextDevices;
}

function updateDeviceStatus(devices: Device[], deviceId: string, status: DeviceStatus) {
  return devices.map((device) => (device.id === deviceId ? { ...device, status } : device));
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function mergePendingDevices(serverDevices: Device[], pendingDevices: Device[], pendingIds: string[]) {
  if (!pendingDevices.length || !pendingIds.length) return serverDevices;

  const confirmedIds = new Set(serverDevices.map((device) => device.id));
  const visiblePendingDevices = pendingDevices.filter(
    (device) => device.id && pendingIds.includes(device.id) && !confirmedIds.has(device.id)
  );

  return visiblePendingDevices.reduce((devices, device) => mergeDeviceList(devices, device), serverDevices);
}

function shouldPreserveDevices(currentDevices: Device[], nextDevices: Device[]) {
  return currentDevices.length > 0 && nextDevices.length === 0;
}

const deviceTypeOptions: Array<{ value: DeviceType; label: string }> = [
  { value: 'FACIAL_DEVICE', label: 'Dispositivo facial' },
];

const usageOptions: Array<{ value: DeviceUsageType; label: string }> = [
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'EXIT', label: 'Saída' },
  { value: 'MONITORING', label: 'Monitoramento' },
  { value: 'PASSAGE', label: 'Passagem' },
];

function toNullableString(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toNullableNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, {
    fallback,
    byStatus: {
      400: 'Confira os dados informados.',
      401: 'Sua sessão expirou. Entre novamente.',
      403: 'Seu perfil não tem permissão para esta ação.',
      404: 'O backend não localizou este dispositivo para concluir a ação.',
      405: 'Essa ação ainda não está disponível para este tipo de dispositivo no backend.',
      502: 'O equipamento não respondeu. Verifique rede, endereço e credenciais.',
      503: 'O servidor está indisponível no momento. Tente novamente em instantes.',
    },
  });
}

function getDeviceTypeLabel(type: DeviceType | string) {
  return deviceTypeOptions.find((option) => option.value === type)?.label ?? 'Dispositivo';
}

function getUsageLabel(type?: DeviceUsageType | null) {
  return usageOptions.find((option) => option.value === type)?.label ?? 'Não configurado';
}

function isCameraOnlyDevice(device: Device) {
  return device.type === 'CAMERA' || device.type === 'CAMERA_IA';
}

function getDeviceVisual(device: Device): { Icon: LucideIcon; className: string; label: string } {
  if (device.type === 'FACIAL_DEVICE' || device.type === 'IA_FACES') {
    return {
      Icon: Fingerprint,
      className: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
      label: 'Leitor facial',
    };
  }

  if (device.type === 'CAMERA' || device.type === 'CAMERA_IA') {
    return {
      Icon: Camera,
      className: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
      label: 'Câmera',
    };
  }

  if (device.deviceUsageType === 'ENTRY') {
    return {
      Icon: LogIn,
      className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
      label: 'Entrada',
    };
  }

  if (device.deviceUsageType === 'EXIT') {
    return {
      Icon: LogOut,
      className: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
      label: 'Saída',
    };
  }

  if (device.deviceUsageType === 'PASSAGE') {
    return {
      Icon: ArrowRightLeft,
      className: 'border-violet-400/25 bg-violet-400/10 text-violet-100',
      label: 'Passagem',
    };
  }

  if (device.deviceUsageType === 'MONITORING') {
    return {
      Icon: KeyRound,
      className: 'border-slate-400/25 bg-slate-400/10 text-slate-100',
      label: 'Monitoramento',
    };
  }

  return {
    Icon: Cpu,
    className: 'border-white/10 bg-white/5 text-slate-100',
    label: 'Dispositivo',
  };
}

function buildPayload(
  form: DeviceForm,
  condominiumId?: string | null,
  options?: { preserveBlankCredentials?: boolean }
): DevicePayload {
  const payload: DevicePayload = {
    name: form.name.trim(),
    type: form.type,
    vendor: toNullableString(form.vendor),
    model: toNullableString(form.model),
    host: toNullableString(form.host),
    aiPort: toNullableNumber(form.aiPort),
    webPort: toNullableNumber(form.webPort),
    streamUrl: toNullableString(form.streamUrl),
    snapshotUrl: toNullableString(form.snapshotUrl),
    monitoringEnabled: form.monitoringEnabled,
    residentVisible: form.residentVisible,
    cameraEnabled: form.cameraEnabled,
    deviceUsageType: form.deviceUsageType || null,
    remoteAccessConfig: {
      targetType: 'DOOR',
      actionOneLabel: toNullableString(form.actionOneLabel),
      actionTwoLabel: toNullableString(form.actionTwoLabel),
      actionOneEnabled: form.actionOneEnabled,
      actionTwoEnabled: form.actionTwoEnabled,
      interlockConfig: {
        enabled: form.interlockEnabled,
        blockedByDeviceIds: form.interlockBlockedDeviceIds,
        openStateTtlSeconds: toNullableNumber(form.interlockOpenStateTtlSeconds) ?? 180,
      },
    },
    accessGroupIds: form.accessGroupIds,
    condominiumId: condominiumId || null,
    status: form.status,
  };

  const username = toNullableString(form.username);
  const password = toNullableString(form.password);

  if (!options?.preserveBlankCredentials || username !== null) {
    payload.username = username;
  }

  if (!options?.preserveBlankCredentials || password !== null) {
    payload.password = password;
  }

  return payload;
}

function formFromDevice(device: Device): DeviceForm {
  const normalizedType = device.type === 'IA_FACES' ? 'FACIAL_DEVICE' : device.type ?? 'FACIAL_DEVICE';

  return {
    name: device.name ?? '',
    type: normalizedType,
    vendor: device.vendor ?? '',
    model: device.model ?? '',
    host: device.host ?? '',
    aiPort: device.aiPort ? String(device.aiPort) : '',
    webPort: device.webPort ? String(device.webPort) : '',
    username: device.username ?? '',
    password: '',
    streamUrl: device.streamUrl ?? '',
    snapshotUrl: device.snapshotUrl ?? '',
    monitoringEnabled: Boolean(device.monitoringEnabled),
    residentVisible: Boolean(device.residentVisible),
    cameraEnabled: Boolean(device.cameraEnabled),
    deviceUsageType: device.deviceUsageType ?? '',
    actionOneLabel: device.remoteAccessConfig?.actionOneLabel ?? 'Acionamento 1',
    actionTwoLabel: device.remoteAccessConfig?.actionTwoLabel ?? 'Acionamento 2',
    actionOneEnabled: device.remoteAccessConfig?.actionOneEnabled ?? true,
    actionTwoEnabled: device.remoteAccessConfig?.actionTwoEnabled ?? true,
    interlockEnabled: device.remoteAccessConfig?.interlockConfig?.enabled ?? false,
    interlockBlockedDeviceIds: device.remoteAccessConfig?.interlockConfig?.blockedByDeviceIds ?? [],
    interlockOpenStateTtlSeconds: String(device.remoteAccessConfig?.interlockConfig?.openStateTtlSeconds ?? 180),
    accessGroupIds: device.accessGroupIds ?? [],
    status: device.status ?? 'OFFLINE',
  };
}

export default function AdminDevicesPage() {
  const { isChecking, canAccess } = useProtectedRoute({ allowedRoles: ['ADMIN', 'MASTER'] });
  const { user } = useAuth();
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(null);
  const [pendingDeviceIds, setPendingDeviceIds] = useState<string[]>([]);
  const [pendingDevices, setPendingDevices] = useState<Device[]>([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState<FaceEquipmentCatalogEntry[]>([]);
  const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [form, setForm] = useState<DeviceForm>(initialForm);
  const [controlForm, setControlForm] = useState<ControlForm>(initialControlForm);
  const [modal, setModal] = useState<'form' | 'control' | null>(null);
  const [focusAccessGroupsOnOpen, setFocusAccessGroupsOnOpen] = useState(false);
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<Record<string, ActionFeedback>>({});
  const [verifiedOnlineDeviceIds, setVerifiedOnlineDeviceIds] = useState<string[]>([]);
  const devicesRef = useRef<Device[]>([]);
  const pendingDeviceIdsRef = useRef<string[]>([]);
  const pendingDevicesRef = useRef<Device[]>([]);
  const accessGroupsSectionRef = useRef<HTMLDivElement | null>(null);

  const devices = useMemo(() => allDevices.filter((device) => !isCameraOnlyDevice(device)), [allDevices]);
  const hiddenCameraCount = allDevices.length - devices.length;
  const scopedCondominiumId = user?.condominiumId ?? user?.condominiumIds?.[0] ?? null;
  const usingSnapshot = Boolean(error && allDevices.length > 0);

  const filteredDevices = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return devices;
    return devices.filter((device) =>
      [
        device.name,
        device.vendor,
        device.model,
        device.host,
        device.cameraName,
        getDeviceTypeLabel(device.type),
        getUsageLabel(device.deviceUsageType),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [devices, search]);

  const onlineCount = devices.filter((device) => device.status === 'ONLINE').length;
  const commandReadyCount = devices.filter((device) => device.host || device.remoteAccessConfig).length;
  const catalogVendors = useMemo(
    () => Array.from(new Set(equipmentCatalog.map((entry) => entry.vendor))).sort((a, b) => a.localeCompare(b)),
    [equipmentCatalog]
  );
  const catalogVendorLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const entry of equipmentCatalog) {
      labels.set(entry.vendor, entry.vendorLabel || entry.vendor);
    }
    return labels;
  }, [equipmentCatalog]);
  const catalogModels = useMemo(() => {
    if (!form.vendor.trim()) return [];
    return equipmentCatalog
      .filter((entry) => entry.vendor === form.vendor.trim())
      .sort((a, b) => (a.modelLabel || a.model).localeCompare(b.modelLabel || b.model));
  }, [equipmentCatalog, form.vendor]);
  const selectedCatalogModel = useMemo(
    () => equipmentCatalog.find((entry) => entry.vendor === form.vendor.trim() && entry.model === form.model.trim()) ?? null,
    [equipmentCatalog, form.model, form.vendor]
  );
  const selectedActionOneLabel = selectedDevice?.remoteAccessConfig?.actionOneLabel?.trim() || 'Acionamento 1';
  const selectedActionTwoLabel = selectedDevice?.remoteAccessConfig?.actionTwoLabel?.trim() || 'Acionamento 2';
  const selectedActionOneEnabled = selectedDevice?.remoteAccessConfig?.actionOneEnabled ?? true;
  const selectedActionTwoEnabled = selectedDevice?.remoteAccessConfig?.actionTwoEnabled ?? true;
  const scopedAccessGroups = useMemo(() => {
    if (!scopedCondominiumId) return accessGroups;
    return accessGroups.filter((group) => !group.condominiumId || group.condominiumId === scopedCondominiumId);
  }, [accessGroups, scopedCondominiumId]);
  const selectablePeople = useMemo(
    () => people,
    [people]
  );
  const filteredSelectablePeople = useMemo(() => {
    const normalized = controlForm.personSearch.trim().toLowerCase();
    if (!normalized) return selectablePeople;
    return selectablePeople.filter((person) =>
      [person.name, person.unitName, person.document, person.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [controlForm.personSearch, selectablePeople]);

function getActionButtonClass(actionKey: string) {
    const feedback = actionFeedback[actionKey];
    if (feedback === 'success') {
      return 'w-full border-emerald-400/50 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30';
    }
    if (feedback === 'pending') {
      return 'w-full border-amber-400/50 bg-amber-500/20 text-amber-50 hover:bg-amber-500/30';
    }
    if (feedback === 'error') {
      return 'w-full border-red-400/50 bg-red-500/20 text-red-50 hover:bg-red-500/30';
    }
    return 'w-full';
  }

  function getDoorIndicatorClass(actionKey: string) {
    const feedback = actionFeedback[actionKey];
    if (feedback === 'success') return 'border-emerald-300/40 bg-emerald-300/20 text-emerald-50';
    if (feedback === 'pending') return 'border-amber-300/40 bg-amber-300/20 text-amber-50';
    if (feedback === 'error') return 'border-red-300/40 bg-red-300/20 text-red-50';
    return 'border-white/15 bg-white/10 text-slate-200';
  }

  function getDoorStateLabel(actionKey: string) {
    const feedback = actionFeedback[actionKey];
    if (feedback === 'success') return 'Comando confirmado';
    if (feedback === 'pending') return 'Aguardando confirmação';
    if (feedback === 'error') return 'Falha no comando';
    return 'Sensor não monitorado';
  }

  useEffect(() => {
    devicesRef.current = allDevices;
  }, [allDevices]);

  useEffect(() => {
    pendingDeviceIdsRef.current = pendingDeviceIds;
  }, [pendingDeviceIds]);

  useEffect(() => {
    pendingDevicesRef.current = pendingDevices;
  }, [pendingDevices]);

  useEffect(() => {
    if (!message && !error) return;
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [message, error]);

  async function loadDevices(options?: { preserveExistingOnEmpty?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const nextDevices = await devicesService.list({ condominiumId: scopedCondominiumId });
      const mergedDevices = mergePendingDevices(nextDevices, pendingDevicesRef.current, pendingDeviceIdsRef.current);
      setAllDevices((currentDevices) => {
        if (options?.preserveExistingOnEmpty && shouldPreserveDevices(currentDevices, nextDevices)) {
          persistCachedDevices(scopedCondominiumId, currentDevices);
          setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
          return currentDevices;
        }

        setPendingDeviceIds((currentPending) => {
          const confirmedIds = new Set(nextDevices.map((device) => device.id));
          const nextPending = currentPending.filter((id) => !confirmedIds.has(id));
          persistPendingDeviceIds(nextPending);
          return nextPending;
        });
        setPendingDevices((currentPendingDevices) => {
          const confirmedIds = new Set(nextDevices.map((device) => device.id));
          const nextPendingDevices = currentPendingDevices.filter((device) => !confirmedIds.has(device.id));
          persistPendingDevices(nextPendingDevices);
          return nextPendingDevices;
        });
        persistCachedDevices(scopedCondominiumId, mergedDevices);
        setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        return mergedDevices;
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Não foi possível carregar os dispositivos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canAccess) return;
    const cachedDevices = readCachedDevices(scopedCondominiumId);
    setPendingDeviceIds(readPendingDeviceIds());
    setPendingDevices(readPendingDevices());
    if (cachedDevices.length > 0) {
      setAllDevices(cachedDevices);
      setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
      setLoading(false);
    }
    void loadDevices();
  }, [canAccess, scopedCondominiumId]);

  useEffect(() => {
    if (!canAccess) return;
    void faceEquipmentCatalogService
      .list()
      .then((entries) => setEquipmentCatalog(entries))
      .catch(() => setEquipmentCatalog([]));
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    void accessGroupsService
      .list()
      .then((groups) => setAccessGroups(groups))
      .catch(() => setAccessGroups([]));
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    void getAllPeople({ limit: 100 })
      .then((response) => setPeople(response.data))
      .catch(() => setPeople([]));
  }, [canAccess]);

  useEffect(() => {
    if (!selectedDevice?.id) return;
    const refreshedSelectedDevice = allDevices.find((device) => device.id === selectedDevice.id);
    if (refreshedSelectedDevice) {
      setSelectedDevice(refreshedSelectedDevice);
    }
  }, [allDevices, selectedDevice?.id]);

  useEffect(() => {
    if (modal !== 'form' || !focusAccessGroupsOnOpen) return;
    const timeoutId = window.setTimeout(() => {
      accessGroupsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(timeoutId);
  }, [modal, focusAccessGroupsOnOpen]);

  function openCreateModal() {
    setSelectedDevice(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
    setControlError(null);
    setControlMessage(null);
    setModal('form');
  }

  function openEditModal(device: Device) {
    setSelectedDevice(device);
    setForm(formFromDevice(device));
    setFocusAccessGroupsOnOpen(false);
    setError(null);
    setMessage(null);
    setModal('form');
  }

  function openAccessGroupsModal(device: Device) {
    setSelectedDevice(device);
    setForm(formFromDevice(device));
    setFocusAccessGroupsOnOpen(true);
    setError(null);
    setMessage(null);
    setModal('form');
  }

  function openControlModal(device: Device) {
    setSelectedDevice(device);
    setControlForm({
      ...initialControlForm,
      remoteAddress: device.host ?? '',
      monitorHost: device.host ?? '',
      serverAddress: device.host ?? '',
      doorNumber: String(device.remoteAccessConfig?.doorNumber ?? 1),
      secboxId: device.remoteAccessConfig?.secboxId ?? '',
      portalId: device.remoteAccessConfig?.portalId ? String(device.remoteAccessConfig.portalId) : '',
    });
    setError(null);
    setMessage(null);
    setControlError(null);
    setControlMessage(null);
    setActionFeedback({});
    setModal('control');
  }

  async function saveDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (!form.name.trim()) {
        throw new Error('Informe o nome do dispositivo.');
      }

      if (selectedDevice) {
        const updatedDevice = await devicesService.update(
          selectedDevice.id,
          buildPayload(form, scopedCondominiumId, { preserveBlankCredentials: true })
        );
        const nextDevices = mergeDeviceList(allDevices, updatedDevice);
        setAllDevices(nextDevices);
        setPendingDevices((currentPendingDevices) => {
          const nextPendingDevices = mergeDeviceList(currentPendingDevices, updatedDevice);
          persistPendingDevices(nextPendingDevices);
          return nextPendingDevices;
        });
        persistCachedDevices(scopedCondominiumId, nextDevices);
        setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        setMessage('Dispositivo atualizado. Se a lista do servidor oscilar, o item continuará visível com a última atualização salva.');
      } else {
        const createResult = await devicesService.create(buildPayload(form, scopedCondominiumId));
        const createdDevice = createResult.device;
        const nextDevices = mergeDeviceList(allDevices, createdDevice);
        setAllDevices(nextDevices);
        setPendingDevices((currentPendingDevices) => {
          const nextPendingDevices = mergeDeviceList(currentPendingDevices, createdDevice);
          persistPendingDevices(nextPendingDevices);
          return nextPendingDevices;
        });
        persistCachedDevices(scopedCondominiumId, nextDevices);
        setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        setPendingDeviceIds((current) => {
          const nextPending = Array.from(new Set([createdDevice.id, ...current]));
          persistPendingDeviceIds(nextPending);
          return nextPending;
        });
        setMessage(
          createResult.controlIdProvisioning?.ok === false
            ? `Device salvo, mas o provisionamento online do Control iD falhou. ${createResult.controlIdProvisioning.message}`
            : 'Dispositivo cadastrado. Ele ficará como sincronização pendente até o servidor confirmar esse registro na lista.'
        );
      }

      setModal(null);
      void loadDevices({ preserveExistingOnEmpty: true });
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Não foi possível salvar o dispositivo.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteDevice(device: Device) {
    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(`Excluir o dispositivo "${device.name}"? Essa ação remove o equipamento da lista.`);

    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await devicesService.remove(device.id);

      const nextDevices = allDevices.filter((item) => item.id !== device.id);
      setAllDevices(nextDevices);
      persistCachedDevices(scopedCondominiumId, nextDevices);
      setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));

      setPendingDevices((currentPendingDevices) => {
        const nextPendingDevices = currentPendingDevices.filter((item) => item.id !== device.id);
        persistPendingDevices(nextPendingDevices);
        return nextPendingDevices;
      });

      setPendingDeviceIds((currentIds) => {
        const nextIds = currentIds.filter((id) => id !== device.id);
        persistPendingDeviceIds(nextIds);
        return nextIds;
      });

      if (selectedDevice?.id === device.id) {
        setSelectedDevice(null);
        setModal(null);
      }

      setMessage('Dispositivo excluído com sucesso.');
      void loadDevices({ preserveExistingOnEmpty: true });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Não foi possível excluir o dispositivo agora.'));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    setActionLoading(label);
    setError(null);
    setMessage(null);
    setControlError(null);
    setControlMessage(null);
    try {
      const result = await action();
      if (selectedDevice) {
        const nextStatus =
          label === 'test' || label === 'online'
            ? 'ONLINE'
            : label === 'offline'
              ? 'OFFLINE'
              : null;

        if (nextStatus) {
          const nextDevices = updateDeviceStatus(allDevices, selectedDevice.id, nextStatus);
          setAllDevices(nextDevices);
          persistCachedDevices(scopedCondominiumId, nextDevices);
          setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        }

        if (label === 'test' || label === 'online') {
          setVerifiedOnlineDeviceIds((current) => Array.from(new Set([selectedDevice.id, ...current])));
        }
        if (label === 'offline') {
          setVerifiedOnlineDeviceIds((current) => current.filter((id) => id !== selectedDevice.id));
        }
      }
      const successMessage =
        label === 'test'
          ? 'Conexão validada com sucesso.'
          : label === 'online'
            ? 'Monitoramento online ativado com sucesso.'
            : label === 'offline'
              ? 'Monitoramento online desativado com sucesso.'
              : (result as { ok?: boolean; message?: string })?.ok === false
                ? ((result as { message?: string }).message || 'Comando enviado, mas o equipamento não confirmou a abertura.')
                : 'Comando enviado com sucesso.';
      setControlMessage(successMessage);
      setMessage(successMessage);
      if (label !== 'test') {
        void loadDevices({ preserveExistingOnEmpty: true });
      }
    } catch (actionError) {
      setControlError(getErrorMessage(actionError, 'Não foi possível executar o comando.'));
      setError(getErrorMessage(actionError, 'Não foi possível executar o comando.'));
    } finally {
      setActionLoading(null);
    }
  }

  function isQueuedControlResult(result: Partial<DeviceControlResponse> | undefined) {
    const deviceResult = result?.result?.deviceResult as { queued?: boolean } | undefined;
    const controlResult = result?.result as { queued?: boolean } | undefined;
    return deviceResult?.queued === true || controlResult?.queued === true;
  }

  function getControlJobId(result: Partial<DeviceControlResponse> | undefined) {
    const controlResult = result?.result as { jobId?: unknown; deviceResult?: { jobId?: unknown } } | undefined;
    const jobId = controlResult?.jobId ?? controlResult?.deviceResult?.jobId;
    return typeof jobId === 'string' && jobId.trim() ? jobId.trim() : null;
  }

  function getControlJobStatus(result: Partial<DeviceControlResponse> | undefined) {
    const responseStatus = result?.status;
    const controlResult = result?.result as { status?: unknown; finalStatus?: unknown; job?: { status?: unknown } } | undefined;
    const status = responseStatus ?? controlResult?.status ?? controlResult?.finalStatus ?? controlResult?.job?.status;
    return typeof status === 'string' ? status.toUpperCase() : null;
  }

  function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function runDeviceAction(label: string, action: () => Promise<unknown>) {
    const startedAt = performance.now();
    setActionLoading(label);
    setError(null);
    setMessage(null);
    setControlError(null);
    setControlMessage(null);
    setActionFeedback((current) => {
      const nextFeedback = { ...current };
      delete nextFeedback[label];
      return nextFeedback;
    });

    try {
      const result = (await action()) as Partial<DeviceControlResponse> | undefined;
      const elapsedMs = Math.round(performance.now() - startedAt);
      if (result?.ok === false) {
        throw new Error(result.message || 'O equipamento não confirmou a operação.');
      }

      if (selectedDevice) {
        const nextStatus =
          label === 'test' || label === 'online'
            ? 'ONLINE'
            : label === 'offline'
              ? 'OFFLINE'
              : null;

        if (nextStatus) {
          const nextDevices = updateDeviceStatus(allDevices, selectedDevice.id, nextStatus);
          setAllDevices(nextDevices);
          persistCachedDevices(scopedCondominiumId, nextDevices);
          setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        }
      }

      const successMessage =
        label === 'test'
          ? 'Conexão validada pelo backend.'
          : label === 'push'
            ? 'Callback de eventos configurado no equipamento.'
            : label === 'monitor'
              ? 'Monitoramento configurado no equipamento.'
              : label === 'online'
                ? 'Modo online ativado no equipamento.'
                : label === 'offline'
                  ? 'Modo online desativado no equipamento.'
                  : label.startsWith('open-')
                    ? 'Acionamento enviado ao backend.'
                    : 'Comando executado pela API.';
      const resultMessage = result?.message ? ` ${result.message}` : '';
      const queued = isQueuedControlResult(result);
      const jobId = getControlJobId(result);
      const finalMessage = queued
        ? `Comando enviado ao backend. Aguardando confirmação física do equipamento. Tempo de resposta da API: ${elapsedMs} ms.`
        : `${successMessage}${resultMessage} Tempo de resposta da API: ${elapsedMs} ms.`;
      setControlMessage(finalMessage);
      setActionFeedback((current) => ({ ...current, [label]: queued ? 'pending' : 'success' }));
      setMessage(successMessage);
      if (queued && jobId && selectedDevice && label.startsWith('open-')) {
        for (let attempt = 0; attempt < 15; attempt += 1) {
          await wait(2000);
          const job = await devicesService.getControlIdJob(selectedDevice.id, jobId);
          const status = getControlJobStatus(job);

          if (status === 'SUCCEEDED') {
            setActionFeedback((current) => ({ ...current, [label]: 'success' }));
            setControlMessage(`Acionamento confirmado pelo equipamento. Tempo de resposta da API: ${elapsedMs} ms.`);
            setMessage('Acionamento confirmado pelo equipamento.');
            return;
          }

          if (status === 'FAILED') {
            throw new Error(job.message || 'O equipamento recusou ou falhou ao executar o acionamento.');
          }
        }
        setControlMessage(`Acionamento ainda pendente no backend. O Control iD ainda não consumiu ou confirmou o comando. Tempo de resposta da API: ${elapsedMs} ms.`);
      }
    } catch (actionError) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      const errorMessage = `${getErrorMessage(actionError, 'Não foi possível executar o comando.')} Tempo de resposta da API: ${elapsedMs} ms.`;
      setActionFeedback((current) => ({ ...current, [label]: 'error' }));
      setControlError(errorMessage);
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  }

  if (isChecking || !canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">Configurações operacionais</p>
              <h1 className="mt-2 text-3xl font-semibold">Dispositivos e comandos físicos</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Cadastre equipamentos faciais, configure comunicação Control-ID e deixe a abertura remota pronta para a operação.
                As câmeras ficam separadas na tela Câmeras.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => void loadDevices()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button type="button" onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Novo dispositivo
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="text-center text-sm text-slate-300">Dispositivos cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-4xl font-semibold">{devices.length}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="text-center text-sm text-slate-300">Online agora</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-4xl font-semibold text-emerald-300">{onlineCount}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="text-center text-sm text-slate-300">Prontos para comando</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-4xl font-semibold text-cyan-200">{commandReadyCount}</p>
            </CardContent>
          </Card>
        </section>

        {(message || error) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
            {error || message}
          </div>
        )}

        {usingSnapshot ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Mostrando a última atualização disponível de dispositivos. O servidor está instável agora e novas alterações podem demorar para refletir.
            {snapshotUpdatedAt ? ` Última sincronização: ${new Date(snapshotUpdatedAt).toLocaleString('pt-BR')}.` : ''}
          </div>
        ) : null}

        {pendingDeviceIds.length > 0 ? (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {pendingDeviceIds.length} dispositivo(s) ainda aguardam confirmação do servidor. Eles permanecem visíveis para facilitar o acompanhamento.
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Dispositivos</h2>
              <p className="text-sm text-slate-400">Use esta tela para equipamentos, ramais físicos e abertura remota.</p>
              {hiddenCameraCount > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {hiddenCameraCount} câmera(s) retornada(s) pelo cadastro de equipamentos foram ocultadas aqui para evitar duplicidade.
                </p>
              )}
            </div>
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, fabricante, modelo ou endereço"
                className="border-white/10 bg-slate-950 pl-10 text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-slate-300">
              Carregando dispositivos...
            </div>
          ) : filteredDevices.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredDevices.map((device) => {
                const isDeviceOnline = device.status === 'ONLINE' || verifiedOnlineDeviceIds.includes(device.id);
                const visual = getDeviceVisual(device);
                const DeviceIcon = visual.Icon;

                return (
                <article key={device.id} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${visual.className}`} title={visual.label}>
                          <DeviceIcon className="h-5 w-5" />
                        </span>
                        <h3 className="text-lg font-semibold">{device.name}</h3>
                        <Badge className={visual.className}>{visual.label}</Badge>
                        <Badge className={isDeviceOnline ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}>
                          {isDeviceOnline ? 'Online' : 'Offline'}
                        </Badge>
                        {pendingDeviceIds.includes(device.id) ? (
                          <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-100">
                            Sincronização pendente
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {getDeviceTypeLabel(device.type)} · {getUsageLabel(device.deviceUsageType)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[device.vendor, device.model, device.host].filter(Boolean).join(' · ') || 'Sem detalhes de conexão cadastrados'}
                      </p>
                      {device.accessGroupNames?.length ? (
                        <p className="mt-2 text-xs text-emerald-200">
                          Grupos de acesso: {device.accessGroupNames.join(', ')}
                        </p>
                      ) : device.accessGroupIds?.length ? (
                        <p className="mt-2 text-xs text-emerald-200">
                          {device.accessGroupIds.length} grupo(s) de acesso vinculado(s)
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-amber-200">
                          Sem grupo de acesso vinculado.
                        </p>
                      )}
                      {pendingDeviceIds.includes(device.id) ? (
                        <p className="mt-2 text-xs text-amber-200">
                          O cadastro já foi salvo localmente. Assim que o servidor confirmar esse item na lista, esse aviso desaparece.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => openEditModal(device)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => openAccessGroupsModal(device)}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Vincular grupo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openControlModal(device)}
                      >
                        <DoorOpen className="mr-2 h-4 w-4" />
                        Comandos
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                        onClick={() => void deleteDevice(device)}
                        disabled={saving}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-slate-300">
              {error
                ? 'Nenhum dispositivo disponível agora. O servidor não retornou a lista neste momento.'
                : pendingDeviceIds.length
                  ? 'Os dispositivos salvos localmente ainda aguardam confirmação do servidor.'
                  : 'Nenhum dispositivo encontrado.'}
            </div>
          )}
        </section>
      </div>

      <CrudModal
        open={modal === 'form'}
        title={selectedDevice ? 'Editar dispositivo' : 'Novo dispositivo'}
        description="Informe os dados de comunicação e uso operacional do equipamento."
        onClose={() => setModal(null)}
        maxWidth="xl"
      >
        <form onSubmit={saveDevice} className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            Preencha primeiro o essencial: <span className="font-medium text-white">nome, IP, porta web, usuário e senha</span>.
            Os outros campos são opcionais.
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            Motor facial agora é configurado em{' '}
            <Link href="/admin/servidores-faciais" className="font-medium underline decoration-cyan-200/70 underline-offset-2">
              Servidores faciais
            </Link>{' '}
            e vinculado na câmera correspondente.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              Nome
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="border-white/10 bg-slate-900 text-white" required />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Tipo
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as DeviceType })} className="h-10 w-full rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-white">
                {deviceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Fabricante
              {catalogVendors.length > 0 ? (
                <select
                  value={form.vendor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vendor: event.target.value,
                      model: '',
                    }))
                  }
                  className="h-10 w-full rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-white"
                >
                  <option value="">Selecione o fabricante</option>
                  {catalogVendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {catalogVendorLabels.get(vendor) ?? vendor}
                    </option>
                  ))}
                </select>
              ) : (
                <Input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} className="border-white/10 bg-slate-900 text-white" />
              )}
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Modelo
              {catalogModels.length > 0 ? (
                <select
                  value={form.model}
                  onChange={(event) => setForm({ ...form, model: event.target.value })}
                  className="h-10 w-full rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-white"
                >
                  <option value="">Selecione o modelo</option>
                  {catalogModels.map((entry) => (
                    <option key={`${entry.vendor}-${entry.model}`} value={entry.model}>
                      {entry.modelLabel || entry.model}
                    </option>
                  ))}
                </select>
              ) : (
                <Input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} className="border-white/10 bg-slate-900 text-white" />
              )}
              {selectedCatalogModel ? (
                <span className="block text-xs text-slate-500">
                  Tipo: {selectedCatalogModel.deviceType || 'não informado'}
                  {selectedCatalogModel.eventWebhookPath ? ` | Webhook: ${selectedCatalogModel.eventWebhookPath}` : ''}
                </span>
              ) : null}
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Endereço do equipamento
              <Input value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} placeholder="192.168.0.10" className="border-white/10 bg-slate-900 text-white" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Uso
              <select value={form.deviceUsageType} onChange={(event) => setForm({ ...form, deviceUsageType: event.target.value as DeviceForm['deviceUsageType'] })} className="h-10 w-full rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-white">
                <option value="">Não configurado</option>
                {usageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Porta de comunicação
              <Input value={form.aiPort} onChange={(event) => setForm({ ...form, aiPort: event.target.value })} inputMode="numeric" className="border-white/10 bg-slate-900 text-white" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Porta web
              <Input value={form.webPort} onChange={(event) => setForm({ ...form, webPort: event.target.value })} inputMode="numeric" className="border-white/10 bg-slate-900 text-white" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Usuário
              <Input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                className="border-white/10 bg-slate-900 text-white"
                autoComplete="off"
                name="device-username"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Senha do equipamento
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={selectedDevice ? 'Deixe em branco para manter' : ''}
                className="border-white/10 bg-slate-900 text-white"
                autoComplete="new-password"
                name="device-password"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['monitoringEnabled', 'Monitorar equipamento'],
              ['residentVisible', 'Visível ao morador'],
              ['cameraEnabled', 'Usa câmera integrada'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(form[key as keyof DeviceForm])}
                  onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-sm font-medium text-white">Acionamentos exibidos na portaria</p>
            <p className="mt-1 text-xs text-slate-400">
              Defina os nomes dos botões e escolha quais acionamentos ficam visíveis para o operador.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <label className="space-y-1 text-sm text-slate-300">
                  Nome do acionamento 1
                  <Input
                    value={form.actionOneLabel}
                    onChange={(event) => setForm({ ...form, actionOneLabel: event.target.value.toUpperCase() })}
                    className="border-white/10 bg-slate-900 text-white"
                    data-preserve-case="true"
                    placeholder="Ex.: Portão principal"
                  />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.actionOneEnabled}
                    onChange={(event) => setForm({ ...form, actionOneEnabled: event.target.checked })}
                  />
                  Mostrar acionamento 1 na portaria
                </label>
              </div>
              <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <label className="space-y-1 text-sm text-slate-300">
                  Nome do acionamento 2
                  <Input
                    value={form.actionTwoLabel}
                    onChange={(event) => setForm({ ...form, actionTwoLabel: event.target.value.toUpperCase() })}
                    className="border-white/10 bg-slate-900 text-white"
                    data-preserve-case="true"
                    placeholder="Ex.: Garagem"
                  />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.actionTwoEnabled}
                    onChange={(event) => setForm({ ...form, actionTwoEnabled: event.target.checked })}
                  />
                  Mostrar acionamento 2 na portaria
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-sm font-medium text-white">Intertravamento de portas</p>
            <p className="mt-1 text-xs text-slate-400">
              Use quando um acionamento deve ser bloqueado enquanto outro equipamento estiver em estado aberto ou pendente.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.interlockEnabled}
                    onChange={(event) => setForm({ ...form, interlockEnabled: event.target.checked })}
                  />
                  Ativar intertravamento para este equipamento
                </label>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Equipamentos que bloqueiam este acionamento</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {devices.filter((device) => device.id !== selectedDevice?.id && device.type === 'FACIAL_DEVICE').map((device) => {
                      const checked = form.interlockBlockedDeviceIds.includes(device.id);
                      return (
                        <label key={`interlock-${device.id}`} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((current) => ({
                                ...current,
                                interlockBlockedDeviceIds: toggleId(current.interlockBlockedDeviceIds, device.id),
                              }))
                            }
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-medium text-white">{device.name}</span>
                            <span className="text-xs text-slate-500">{device.host || 'Sem endereço informado'}</span>
                          </span>
                        </label>
                      );
                    })}
                    {devices.filter((device) => device.id !== selectedDevice?.id && device.type === 'FACIAL_DEVICE').length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhum outro leitor facial disponível para bloqueio.</p>
                    ) : null}
                  </div>
                </div>
              </div>
              <label className="space-y-1 text-sm text-slate-300">
                Tempo de retenção do estado aberto
                <Input
                  value={form.interlockOpenStateTtlSeconds}
                  onChange={(event) => setForm({ ...form, interlockOpenStateTtlSeconds: event.target.value.replace(/\D/g, '') })}
                  inputMode="numeric"
                  className="border-white/10 bg-slate-950 text-white"
                />
                <span className="block text-xs text-slate-500">Valor em segundos. Padrão do contrato: 180.</span>
              </label>
            </div>
          </div>

          <div ref={accessGroupsSectionRef} className={`rounded-2xl border p-4 ${focusAccessGroupsOnOpen ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/10 bg-slate-900/70'}`}>
            <p className="text-sm font-medium text-white">Grupos de acesso físico</p>
            <p className="mt-1 text-xs text-slate-400">
              Vincule este equipamento aos grupos que podem receber permissão facial neste dispositivo.
            </p>
            {scopedAccessGroups.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {scopedAccessGroups.map((group) => {
                  const checked = form.accessGroupIds.includes(group.id);
                  return (
                    <label key={group.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-200 hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setForm((current) => ({ ...current, accessGroupIds: toggleId(current.accessGroupIds, group.id) }))}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium text-white">{group.name}</span>
                        <span className="text-xs text-slate-400">
                          {(group.personIds?.length ?? 0)} pessoa(s) vinculada(s)
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Nenhum grupo de acesso foi cadastrado para este condomínio.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CrudModal>

      <CrudModal
        open={modal === 'control' && Boolean(selectedDevice)}
        title="Comandos do equipamento"
        description={selectedDevice ? selectedDevice.name : undefined}
        onClose={() => setModal(null)}
        maxWidth="xl"
      >
        <div className="space-y-5">
          {(controlMessage || controlError) && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                controlError
                  ? 'border-red-500/30 bg-red-500/10 text-red-100'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
              }`}
            >
              {controlError || controlMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/10 bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Wifi className="h-4 w-4" /> Comunicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={controlForm.remoteAddress} onChange={(event) => setControlForm({ ...controlForm, remoteAddress: event.target.value })} placeholder="Endereço para envio" className="border-white/10 bg-slate-950 text-white" />
                <Button type="button" className={getActionButtonClass('push')} disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runDeviceAction('push', () => devicesService.configureControlIdPush(selectedDevice.id, { remoteAddress: controlForm.remoteAddress, requestTimeout: 4000, requestPeriod: 5 }))}>
                  Configurar callback
                </Button>
                <Button type="button" variant="secondary" className={getActionButtonClass('test')} disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runDeviceAction('test', () => devicesService.testControlIdConnection(selectedDevice.id))}>
                  Testar conexão
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Router className="h-4 w-4" /> Monitoramento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={controlForm.monitorHost} onChange={(event) => setControlForm({ ...controlForm, monitorHost: event.target.value })} placeholder="Endereço" className="border-white/10 bg-slate-950 text-white" />
                  <Input value={controlForm.monitorPort} onChange={(event) => setControlForm({ ...controlForm, monitorPort: event.target.value })} placeholder="Porta" inputMode="numeric" className="border-white/10 bg-slate-950 text-white" />
                </div>
                <Input value={controlForm.monitorPath} onChange={(event) => setControlForm({ ...controlForm, monitorPath: event.target.value })} placeholder="Caminho" className="border-white/10 bg-slate-950 text-white" />
                <Button type="button" className={getActionButtonClass('monitor')} disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runDeviceAction('monitor', () => devicesService.configureControlIdMonitor(selectedDevice.id, { hostname: controlForm.monitorHost, port: Number(controlForm.monitorPort), path: controlForm.monitorPath, requestTimeout: 5000 }))}>
                  Configurar monitoramento
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Modo online</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={controlForm.serverId} onChange={(event) => setControlForm({ ...controlForm, serverId: event.target.value })} placeholder="Servidor" inputMode="numeric" className="border-white/10 bg-slate-950 text-white" />
                  <Input value={controlForm.serverAddress} onChange={(event) => setControlForm({ ...controlForm, serverAddress: event.target.value })} placeholder="Endereço" className="border-white/10 bg-slate-950 text-white" />
                </div>
                <Input value={controlForm.serverName} onChange={(event) => setControlForm({ ...controlForm, serverName: event.target.value })} placeholder="Nome do servidor" className="border-white/10 bg-slate-950 text-white" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="button" className={getActionButtonClass('online')} disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runDeviceAction('online', () => devicesService.enableControlIdOnline(selectedDevice.id, { serverId: Number(controlForm.serverId), serverAddress: controlForm.serverAddress, serverName: controlForm.serverName, localIdentification: true, extractTemplate: false, maxRequestAttempts: 5 }))}>
                    <Wifi className="mr-2 h-4 w-4" />
                    Ativar online
                  </Button>
                  <Button type="button" variant="secondary" className={getActionButtonClass('offline')} disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runDeviceAction('offline', () => devicesService.disableControlIdOnline(selectedDevice.id))}>
                    <WifiOff className="mr-2 h-4 w-4" />
                    Desativar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><DoorOpen className="h-4 w-4" /> Abertura remota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDevice && selectedDevice.hasPassword === false ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    Este equipamento está sem usuário configurado. Edite o dispositivo, preencha usuário e senha do Control ID e salve antes de tentar abrir.
                  </div>
                ) : null}
                <p className="text-sm text-slate-400">
                  Escolha o acionamento desejado. O operador não precisa preencher campos manuais.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedActionOneEnabled ? (
                    <Button
                      type="button"
                      className={getActionButtonClass('open-1')}
                      disabled={!selectedDevice || actionLoading !== null}
                      onClick={() =>
                        selectedDevice &&
                        runDeviceAction('open-1', () =>
                          devicesService.remoteOpenControlId(selectedDevice.id, {
                            doorNumber: 1,
                            secboxId: selectedDevice.remoteAccessConfig?.secboxId ?? null,
                            portalId: selectedDevice.remoteAccessConfig?.portalId ?? null,
                            reason: selectedDevice.remoteAccessConfig?.reason ?? 1,
                          })
                        )
                      }
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${getDoorIndicatorClass('open-1')}`}>
                            <DoorClosed className="h-4 w-4" />
                          </span>
                          {selectedActionOneLabel}
                        </span>
                        <span className="text-[10px] font-medium opacity-80">{getDoorStateLabel('open-1')}</span>
                      </span>
                    </Button>
                  ) : null}
                  {selectedActionTwoEnabled ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className={getActionButtonClass('open-2')}
                      disabled={!selectedDevice || actionLoading !== null}
                      onClick={() =>
                        selectedDevice &&
                        runDeviceAction('open-2', () =>
                          devicesService.remoteOpenControlId(selectedDevice.id, {
                            doorNumber: 2,
                            secboxId: selectedDevice.remoteAccessConfig?.secboxId ?? null,
                            portalId: selectedDevice.remoteAccessConfig?.portalId ?? null,
                            reason: selectedDevice.remoteAccessConfig?.reason ?? 1,
                          })
                        )
                      }
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${getDoorIndicatorClass('open-2')}`}>
                            <DoorClosed className="h-4 w-4" />
                          </span>
                          {selectedActionTwoLabel}
                        </span>
                        <span className="text-[10px] font-medium opacity-80">{getDoorStateLabel('open-2')}</span>
                      </span>
                    </Button>
                  ) : null}
                </div>
                {!selectedActionOneEnabled && !selectedActionTwoEnabled ? (
                  <p className="text-sm text-slate-500">
                    Nenhum acionamento foi habilitado para este dispositivo.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-base">Sincronizar pessoa no equipamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-400">
                Selecione uma pessoa cadastrada para enviar a face ao equipamento selecionado.
              </p>
              <Input
                value={controlForm.personSearch}
                onChange={(event) => setControlForm({ ...controlForm, personSearch: event.target.value })}
                placeholder="Buscar por nome, unidade, CPF ou e-mail"
                className="border-white/10 bg-slate-950 text-white"
              />
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <select
                  value={controlForm.personId}
                  onChange={(event) => setControlForm({ ...controlForm, personId: event.target.value })}
                  className="h-11 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none"
                >
                  <option value="">
                    {filteredSelectablePeople.length ? 'Selecione a pessoa' : 'Nenhuma pessoa encontrada'}
                  </option>
                  {filteredSelectablePeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {[person.name, person.unitName, person.document].filter(Boolean).join(' | ')}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className={`h-11 shrink-0 px-5 md:w-auto ${getActionButtonClass('sync-person')}`}
                  disabled={!selectedDevice || !controlForm.personId.trim() || actionLoading !== null}
                  onClick={() => selectedDevice && runDeviceAction('sync-person', () => devicesService.syncPersonToControlId(selectedDevice.id, controlForm.personId.trim()))}
                >
                  Sincronizar
                </Button>
              </div>
              {!selectablePeople.length ? (
                <p className="text-sm text-amber-200">
                  Nenhuma pessoa disponível para sincronização neste condomínio.
                </p>
              ) : controlForm.personSearch.trim() && !filteredSelectablePeople.length ? (
                <p className="text-sm text-amber-200">
                  Nenhuma pessoa encontrada para a busca informada.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </CrudModal>
    </main>
  );
}
