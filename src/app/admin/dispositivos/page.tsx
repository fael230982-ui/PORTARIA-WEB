'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Cpu,
  DoorOpen,
  Pencil,
  Plus,
  RefreshCw,
  Router,
  Save,
  Search,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/features/http/api-error';
import { useAuth } from '@/hooks/use-auth';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { devicesService } from '@/services/devices.service';
import type {
  Device,
  DevicePayload,
  DeviceStatus,
  DeviceType,
  DeviceUsageType,
} from '@/types/device';

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
};

const initialForm: DeviceForm = {
  name: '',
  type: 'FACIAL_DEVICE',
  vendor: 'Control iD',
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
};

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

function shouldPreserveDevices(currentDevices: Device[], nextDevices: Device[]) {
  return currentDevices.length > 0 && nextDevices.length === 0;
}

const deviceTypeOptions: Array<{ value: DeviceType; label: string }> = [
  { value: 'FACIAL_DEVICE', label: 'Dispositivo facial' },
  { value: 'IA_FACES', label: 'IA Faces' },
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
      404: 'Dispositivo não encontrado.',
      502: 'O equipamento não respondeu. Verifique rede, endereço e credenciais.',
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

function buildPayload(form: DeviceForm): DevicePayload {
  return {
    name: form.name.trim(),
    type: form.type,
    vendor: toNullableString(form.vendor),
    model: toNullableString(form.model),
    host: toNullableString(form.host),
    aiPort: toNullableNumber(form.aiPort),
    webPort: toNullableNumber(form.webPort),
    username: toNullableString(form.username),
    password: toNullableString(form.password),
    streamUrl: toNullableString(form.streamUrl),
    snapshotUrl: toNullableString(form.snapshotUrl),
    monitoringEnabled: form.monitoringEnabled,
    residentVisible: form.residentVisible,
    cameraEnabled: form.cameraEnabled,
    deviceUsageType: form.deviceUsageType || null,
    status: form.status,
  };
}

function formFromDevice(device: Device): DeviceForm {
  return {
    name: device.name ?? '',
    type: device.type ?? 'FACIAL_DEVICE',
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
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [form, setForm] = useState<DeviceForm>(initialForm);
  const [controlForm, setControlForm] = useState<ControlForm>(initialControlForm);
  const [modal, setModal] = useState<'form' | 'control' | null>(null);

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

  async function loadDevices(options?: { preserveExistingOnEmpty?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const nextDevices = await devicesService.list({ condominiumId: scopedCondominiumId });
      setAllDevices((currentDevices) => {
        if (options?.preserveExistingOnEmpty && shouldPreserveDevices(currentDevices, nextDevices)) {
          persistCachedDevices(scopedCondominiumId, currentDevices);
          setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
          return currentDevices;
        }

        persistCachedDevices(scopedCondominiumId, nextDevices);
        setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        return nextDevices;
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
    if (cachedDevices.length > 0) {
      setAllDevices(cachedDevices);
      setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
      setLoading(false);
    }
    void loadDevices();
  }, [canAccess, scopedCondominiumId]);

  function openCreateModal() {
    setSelectedDevice(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
    setModal('form');
  }

  function openEditModal(device: Device) {
    setSelectedDevice(device);
    setForm(formFromDevice(device));
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
        const updatedDevice = await devicesService.update(selectedDevice.id, buildPayload(form));
        const nextDevices = mergeDeviceList(allDevices, updatedDevice);
        setAllDevices(nextDevices);
        persistCachedDevices(scopedCondominiumId, nextDevices);
        setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        setMessage('Dispositivo atualizado. Se a lista do servidor oscilar, o item continuará visível com a última atualização salva.');
      } else {
        const createdDevice = await devicesService.create(buildPayload(form));
        const nextDevices = mergeDeviceList(allDevices, createdDevice);
        setAllDevices(nextDevices);
        persistCachedDevices(scopedCondominiumId, nextDevices);
        setSnapshotUpdatedAt(readCachedDevicesTimestamp(scopedCondominiumId));
        setMessage('Dispositivo cadastrado. Se ele não reaparecer após atualizar, a listagem do servidor ainda não devolveu esse registro.');
      }

      setModal(null);
      void loadDevices({ preserveExistingOnEmpty: true });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : getErrorMessage(saveError, 'Não foi possível salvar o dispositivo.'));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    setActionLoading(label);
    setError(null);
    setMessage(null);
    try {
      await action();
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
      setMessage('Comando enviado com sucesso.');
      void loadDevices({ preserveExistingOnEmpty: true });
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Não foi possível executar o comando.'));
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
              {filteredDevices.map((device) => (
                <article key={device.id} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Cpu className="h-5 w-5 text-cyan-200" />
                        <h3 className="text-lg font-semibold">{device.name}</h3>
                        <Badge className={device.status === 'ONLINE' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}>
                          {device.status === 'ONLINE' ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {getDeviceTypeLabel(device.type)} · {getUsageLabel(device.deviceUsageType)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[device.vendor, device.model, device.host].filter(Boolean).join(' · ') || 'Sem detalhes de conexão cadastrados'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => openEditModal(device)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button type="button" size="sm" onClick={() => openControlModal(device)}>
                        <DoorOpen className="mr-2 h-4 w-4" />
                        Comandos
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-slate-300">
              {error
                ? 'Nenhum dispositivo disponível agora. O servidor não retornou a lista neste momento.'
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
              <Input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} className="border-white/10 bg-slate-900 text-white" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Modelo
              <Input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} className="border-white/10 bg-slate-900 text-white" />
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/10 bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Wifi className="h-4 w-4" /> Comunicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={controlForm.remoteAddress} onChange={(event) => setControlForm({ ...controlForm, remoteAddress: event.target.value })} placeholder="Endereço para envio" className="border-white/10 bg-slate-950 text-white" />
                <Button type="button" className="w-full" disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runAction('push', () => devicesService.configureControlIdPush(selectedDevice.id, { remoteAddress: controlForm.remoteAddress, requestTimeout: 4000, requestPeriod: 5 }))}>
                  Configurar envio
                </Button>
                <Button type="button" variant="secondary" className="w-full" disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runAction('test', () => devicesService.testControlIdConnection(selectedDevice.id))}>
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
                <Button type="button" className="w-full" disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runAction('monitor', () => devicesService.configureControlIdMonitor(selectedDevice.id, { hostname: controlForm.monitorHost, port: Number(controlForm.monitorPort), path: controlForm.monitorPath, requestTimeout: 5000 }))}>
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
                  <Button type="button" disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runAction('online', () => devicesService.enableControlIdOnline(selectedDevice.id, { serverId: Number(controlForm.serverId), serverAddress: controlForm.serverAddress, serverName: controlForm.serverName, localIdentification: true, extractTemplate: false, maxRequestAttempts: 5 }))}>
                    <Wifi className="mr-2 h-4 w-4" />
                    Ativar online
                  </Button>
                  <Button type="button" variant="secondary" disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runAction('offline', () => devicesService.disableControlIdOnline(selectedDevice.id))}>
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
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input value={controlForm.doorNumber} onChange={(event) => setControlForm({ ...controlForm, doorNumber: event.target.value })} placeholder="Porta" inputMode="numeric" className="border-white/10 bg-slate-950 text-white" />
                  <Input value={controlForm.secboxId} onChange={(event) => setControlForm({ ...controlForm, secboxId: event.target.value })} placeholder="Secbox" className="border-white/10 bg-slate-950 text-white" />
                  <Input value={controlForm.portalId} onChange={(event) => setControlForm({ ...controlForm, portalId: event.target.value })} placeholder="Portal" inputMode="numeric" className="border-white/10 bg-slate-950 text-white" />
                </div>
                <Button type="button" className="w-full" disabled={!selectedDevice || actionLoading !== null} onClick={() => selectedDevice && runAction('open', () => devicesService.remoteOpenControlId(selectedDevice.id, { doorNumber: toNullableNumber(controlForm.doorNumber), secboxId: toNullableString(controlForm.secboxId), portalId: toNullableNumber(controlForm.portalId), reason: 1 }))}>
                  Abrir agora
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-base">Sincronizar pessoa no equipamento</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row">
              <Input value={controlForm.personId} onChange={(event) => setControlForm({ ...controlForm, personId: event.target.value })} placeholder="Código da pessoa" className="border-white/10 bg-slate-950 text-white" />
              <Button type="button" disabled={!selectedDevice || !controlForm.personId.trim() || actionLoading !== null} onClick={() => selectedDevice && runAction('sync-person', () => devicesService.syncPersonToControlId(selectedDevice.id, controlForm.personId.trim()))}>
                Sincronizar
              </Button>
            </CardContent>
          </Card>
        </div>
      </CrudModal>
    </main>
  );
}
