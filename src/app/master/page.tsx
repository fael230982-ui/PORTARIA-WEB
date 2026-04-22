'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  Cpu,
  Download,
  Home,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Pencil,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CrudModal } from '@/components/admin/CrudModal';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/features/http/api-error';
import {
  masterService,
  type MasterModuleCatalogItem,
  type MasterOperationDevice,
  type MasterSummary,
} from '@/services/master.service';
import { createUser, getUsers, requestUserPasswordReset, updateUser, updateUserPassword } from '@/services/users.service';
import { brandClasses } from '@/config/brand-classes';
import { LOCAL_OPERATION_PRESENCE_EVENT, isLocalOperationPresenceFresh, readLocalOperationPresence, type LocalOperationPresenceRecord } from '@/features/operation/local-operation-presence';
import type { Condominium } from '@/types/condominium';
import type { UserResponse } from '@/types/user';

type MasterSection = 'overview' | 'create' | 'licenses' | 'admins' | 'modules' | 'monitoring';
type ClientKind = 'CONDOMINIUM' | 'RESIDENCE';
type LicensePlan = 'BASIC' | 'PRO' | 'ENTERPRISE';
type LicenseStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED';
type ClientSort = 'name' | 'expires' | 'offline';

type BootstrapClientForm = {
  clientKind: ClientKind;
  condominiumName: string;
  document: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

type LicenseForm = {
  licensePlan: LicensePlan;
  licenseStatus: LicenseStatus;
  licenseMonthlyValue: string;
  licenseStartsAt: string;
  licenseDueDay: string;
  licenseExpiresAt: string;
};

type ClientProfileForm = {
  clientKind: ClientKind;
  name: string;
  document: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
};

type AdminUserForm = {
  name: string;
  email: string;
};

type AdminPasswordForm = {
  temporaryPassword: string;
};

type CreateAdminForm = {
  name: string;
  email: string;
  password: string;
};

type ModuleConfig = {
  key: string;
  label: string;
  description: string;
  required?: boolean;
  backendSupported?: boolean;
};

const platformModules: ModuleConfig[] = [
  { key: 'units', label: 'Unidades', description: 'Estruturas, casas, apartamentos, quadras, lotes e vínculos.' },
  { key: 'people', label: 'Pessoas', description: 'Moradores, visitantes, prestadores, locatários e entregadores.', backendSupported: true },
  { key: 'users', label: 'Usuários', description: 'Usuários, perfis, permissões e acessos.', required: true, backendSupported: true },
  { key: 'operation', label: 'Operação portaria', description: 'Tela operacional da guarita, entrada, saída e atendimento.', backendSupported: true },
  { key: 'deliveries', label: 'Encomendas', description: 'Registro, notificação, retirada e histórico de encomendas.', backendSupported: true },
  { key: 'cameras', label: 'Câmeras', description: 'Cadastro, monitoramento, snapshots, VMS e painel externo.', backendSupported: true },
  { key: 'vehicles', label: 'Veículos', description: 'Cadastro de veículos, placas, vínculos e bloqueios.', backendSupported: true },
  { key: 'alerts', label: 'Alertas', description: 'Ocorrências, eventos críticos, pânico e pendências.' },
  { key: 'reports', label: 'Relatórios', description: 'Relatórios operacionais, auditoria e exportações.' },
  { key: 'facialRecognition', label: 'Reconhecimento facial', description: 'Motor facial, cadastro biométrico e eventos de perímetro.', backendSupported: true },
  { key: 'messages', label: 'Mensagens', description: 'Comunicação portaria, morador, app e WhatsApp.' },
  { key: 'actions', label: 'Acionamentos', description: 'Portões, garagem, sirene, clausura e comandos físicos.' },
  { key: 'residentApp', label: 'App morador', description: 'Recursos disponíveis para o morador no aplicativo.' },
  { key: 'guardApp', label: 'App guarita', description: 'OCR de encomendas, cadastro de faces e rotinas móveis.' },
];

const licenseStatuses: Array<{ value: LicenseStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Ativa' },
  { value: 'TRIAL', label: 'Teste' },
  { value: 'SUSPENDED', label: 'Suspensa' },
  { value: 'EXPIRED', label: 'Expirada' },
];

const licensePlans: Array<{ value: LicensePlan; label: string }> = [
  { value: 'BASIC', label: 'Básico' },
  { value: 'PRO', label: 'Profissional' },
  { value: 'ENTERPRISE', label: 'Empresarial' },
];

const licenseDueDays = ['01', '05', '10', '15', '20', '25', '30'].map((day) => ({
  value: day,
  label: `Dia ${day}`,
}));

const initialForm: BootstrapClientForm = {
  clientKind: 'CONDOMINIUM',
  condominiumName: '',
  document: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

const initialClientProfileForm: ClientProfileForm = {
  clientKind: 'CONDOMINIUM',
  name: '',
  document: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
};

const initialAdminUserForm: AdminUserForm = {
  name: '',
  email: '',
};

const initialAdminPasswordForm: AdminPasswordForm = {
  temporaryPassword: '',
};

const initialCreateAdminForm: CreateAdminForm = {
  name: '',
  email: '',
  password: '',
};

const initialLicenseForm: LicenseForm = {
  licensePlan: 'BASIC',
  licenseStatus: 'ACTIVE',
  licenseMonthlyValue: '',
  licenseStartsAt: '',
  licenseDueDay: '',
  licenseExpiresAt: '',
};

const initialModules = platformModules.reduce<Record<string, boolean>>((acc, module) => {
  acc[module.key] = true;
  return acc;
}, {});

const newClientModuleDefaults = platformModules.reduce<Record<string, boolean>>((acc, module) => {
  acc[module.key] = Boolean(module.required);
  return acc;
}, {});

const menuItems: Array<{ key: MasterSection; label: string; description: string; icon: React.ElementType }> = [
  { key: 'overview', label: 'Resumo geral', description: 'Visão executiva dos clientes', icon: LayoutDashboard },
  { key: 'create', label: 'Cadastrar cliente', description: 'Condomínio ou residência', icon: Building2 },
  { key: 'licenses', label: 'Gerenciar licenças', description: 'Planos, validade e bloqueios', icon: KeyRound },
  { key: 'modules', label: 'Configurar módulos', description: 'Recursos por cliente', icon: Puzzle },
  { key: 'monitoring', label: 'Monitoramento', description: 'Portarias conectadas', icon: Cpu },
];

function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, {
    fallback,
    byStatus: {
      405: 'Este ambiente ainda não aceitou a forma de gravação solicitada. Atualize a tela e tente novamente; se persistir, o backend precisa publicar esse recurso.',
      409: 'Já existe um usuário com este e-mail. Use outro e-mail para evitar conflito no login.',
    },
  });
}

function isUnsupportedContract(error: unknown) {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 400 || status === 404 || status === 405 || status === 422;
}

function enabledModuleKeys(modules: Record<string, boolean>) {
  return Object.entries(modules).filter(([, enabled]) => enabled).map(([key]) => key);
}

function normalizeModulesFromCondominium(condominium?: Condominium | null) {
  const settings = condominium?.moduleSettings;
  const enabledModules = Array.isArray(condominium?.enabledModules)
    ? condominium.enabledModules.map((value) => String(value).trim().toLowerCase())
    : null;
  const moduleAliases: Record<string, string> = {
    access_logs: 'accesslogs',
    visit_forecasts: 'visitforecasts',
    facial: 'facialrecognition',
    monitoring: 'operation',
  };

  return platformModules.reduce<Record<string, boolean>>((acc, module) => {
    if (module.required) {
      acc[module.key] = true;
      return acc;
    }
    if (settings && typeof settings[module.key] === 'boolean') {
      acc[module.key] = settings[module.key];
      return acc;
    }
    if (Array.isArray(enabledModules)) {
      const normalizedKey = module.key.toLowerCase();
      const expected = Object.entries(moduleAliases)
        .filter(([, target]) => target === normalizedKey)
        .map(([alias]) => alias);
      acc[module.key] = enabledModules.includes(normalizedKey) || expected.some((alias) => enabledModules.includes(alias));
      return acc;
    }
    acc[module.key] = true;
    return acc;
  }, {});
}

function getClientKind(condominium: Condominium): ClientKind {
  return condominium.clientKind === 'RESIDENCE' ? 'RESIDENCE' : 'CONDOMINIUM';
}

function getLicenseStatus(condominium: Condominium): LicenseStatus {
  const value = condominium.licenseStatus;
  if (value === 'TRIAL' || value === 'SUSPENDED' || value === 'EXPIRED') return value;
  return 'ACTIVE';
}

function hasEditableLicense(condominium?: Condominium | null) {
  if (!condominium) return false;
  const status = getLicenseStatus(condominium);
  return status === 'ACTIVE' || status === 'TRIAL';
}

function isOperationOffline(condominium: Condominium) {
  if (condominium.operationStatus === 'OFFLINE') return true;
  if (!condominium.operationLastSeenAt) return false;
  const lastSeen = new Date(condominium.operationLastSeenAt).getTime();
  return !Number.isNaN(lastSeen) && Date.now() - lastSeen > 2 * 60 * 1000;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

function formatMonthlyValueInput(value: string) {
  return value
    .replace(/[^\d,.]/g, '')
    .replace(/\./g, ',')
    .replace(/(,.*),/g, '$1')
    .slice(0, 12);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeLicensePlan(value?: string | null): LicensePlan {
  if (value === 'PRO' || value === 'ENTERPRISE') return value;
  return 'BASIC';
}

function getLicenseExpiryTime(condominium: Condominium) {
  if (!condominium.licenseExpiresAt) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(condominium.licenseExpiresAt).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function getEnabledModuleLabels(condominium: Condominium) {
  const enabled = normalizeModulesFromCondominium(condominium);
  return platformModules
    .filter((module) => enabled[module.key])
    .map((module) => module.label);
}

function getBackendSupportedModuleCount(values: Record<string, boolean>) {
  return platformModules.filter((module) => module.backendSupported && values[module.key]).length;
}

function getDaysUntilExpiry(condominium: Condominium) {
  const expiryTime = getLicenseExpiryTime(condominium);
  if (!Number.isFinite(expiryTime)) return null;
  return Math.ceil((expiryTime - Date.now()) / 86_400_000);
}

function getApiCoverage(values: Record<string, boolean>) {
  const enabledTotal = enabledModuleKeys(values).length;
  if (enabledTotal === 0) return 0;
  return Math.round((getBackendSupportedModuleCount(values) / enabledTotal) * 100);
}

function getClientRiskScore(condominium: Condominium) {
  let score = 0;
  if (isOperationOffline(condominium)) score += 4;

  const expiryDays = getDaysUntilExpiry(condominium);
  if (expiryDays !== null) {
    if (expiryDays < 0) score += 4;
    else if (expiryDays <= 7) score += 3;
    else if (expiryDays <= 30) score += 1;
  }

  const status = getLicenseStatus(condominium);
  if (status === 'SUSPENDED' || status === 'EXPIRED') score += 3;
  if (status === 'TRIAL') score += 1;

  return score;
}

async function createClient(form: BootstrapClientForm) {
  const payload = {
    name: form.condominiumName.trim(),
    clientKind: form.clientKind,
    document: form.document.trim() || undefined,
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    zipCode: form.zipCode.trim() || undefined,
    responsibleName: form.responsibleName.trim() || undefined,
    responsibleEmail: form.responsibleEmail.trim() || undefined,
    responsiblePhone: form.responsiblePhone.trim() || undefined,
    licensePlan: 'BASIC',
    licenseStatus: 'SUSPENDED' as LicenseStatus,
    licenseExpiresAt: undefined,
    enabledModules: enabledModuleKeys(newClientModuleDefaults),
    moduleSettings: newClientModuleDefaults,
    slimMode: true,
    adminInitial: {
      name: form.adminName.trim(),
      email: normalizeEmail(form.adminEmail),
      password: form.adminPassword,
    },
  };

  const { client, fullContractPersisted } = await masterService.createClient(payload);
  return { condominium: client, fullContractPersisted };
}

async function updateClientProfile(id: string, payload: Partial<Condominium>) {
  return masterService.updateClientProfile(id, {
    name: payload.name,
    clientKind: payload.clientKind as ClientKind | undefined,
    document: payload.document,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    zipCode: payload.zipCode,
    responsibleName: payload.responsibleName,
    responsibleEmail: payload.responsibleEmail,
    responsiblePhone: payload.responsiblePhone,
  });
}

async function updateClientModules(id: string, payload: { enabledModules: string[]; moduleSettings: Record<string, boolean> }) {
  return masterService.updateModules(id, {
    enabledModules: payload.enabledModules,
    moduleSettings: payload.moduleSettings,
    slimMode: !payload.moduleSettings.people || !payload.moduleSettings.units,
  });
}

async function updateClientLicense(
  id: string,
  payload: {
    licensePlan: LicensePlan;
    licenseStatus: LicenseStatus;
    licenseMonthlyValue?: string | number | null;
    licenseStartsAt?: string | null;
    licenseDueDay?: string | number | null;
    licenseExpiresAt?: string | null;
  }
) {
  return masterService.updateLicense(id, payload);
}

function StatTile({
  title,
  value,
  description,
  icon: Icon,
  tone = 'cyan',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClass = {
    cyan: `${brandClasses.softAccentPanel} text-white`,
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/75">{title}</p>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-center text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-2 text-center text-xs text-white/65">{description}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  required = false,
  disabled = false,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-sm text-slate-300">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold leading-none text-white">{value}</p>
    </div>
  );
}

export default function MasterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<MasterSection>('overview');
  const [form, setForm] = useState<BootstrapClientForm>(initialForm);
  const [modules, setModules] = useState<Record<string, boolean>>(initialModules);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondominiumId, setSelectedCondominiumId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientKindFilter, setClientKindFilter] = useState<'all' | ClientKind>('all');
  const [clientHealthFilter, setClientHealthFilter] = useState<'all' | 'offline' | 'online' | 'no_heartbeat'>('all');
  const [clientSort, setClientSort] = useState<ClientSort>('offline');
  const [editingName, setEditingName] = useState('');
  const [editingModules, setEditingModules] = useState<Record<string, boolean>>(initialModules);
  const [licenseForm, setLicenseForm] = useState<LicenseForm>(initialLicenseForm);
  const [clientProfileForm, setClientProfileForm] = useState<ClientProfileForm>(initialClientProfileForm);
  const [adminUserForm, setAdminUserForm] = useState<AdminUserForm>(initialAdminUserForm);
  const [adminPasswordForm, setAdminPasswordForm] = useState<AdminPasswordForm>(initialAdminPasswordForm);
  const [createAdminForm, setCreateAdminForm] = useState<CreateAdminForm>(initialCreateAdminForm);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [editingAdminUser, setEditingAdminUser] = useState<UserResponse | null>(null);
  const [openClientProfileModal, setOpenClientProfileModal] = useState(false);
  const [openAdminUserModal, setOpenAdminUserModal] = useState(false);
  const [loadingCondominiums, setLoadingCondominiums] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingLicense, setSavingLicense] = useState(false);
  const [savingClientProfile, setSavingClientProfile] = useState(false);
  const [savingAdminUser, setSavingAdminUser] = useState(false);
  const [savingCreateAdmin, setSavingCreateAdmin] = useState(false);
  const [sendingAdminPasswordReset, setSendingAdminPasswordReset] = useState(false);
  const [savingAdminTemporaryPassword, setSavingAdminTemporaryPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiSummary, setApiSummary] = useState<MasterSummary | null>(null);
  const [moduleCatalog, setModuleCatalog] = useState<MasterModuleCatalogItem[]>([]);
  const [operationDevices, setOperationDevices] = useState<MasterOperationDevice[]>([]);
  const [localOperationPresence, setLocalOperationPresence] = useState<LocalOperationPresenceRecord[]>([]);
  const [presenceRefreshTick, setPresenceRefreshTick] = useState(0);
  const sectionFromUrl = searchParams.get('section');

  useEffect(() => {
    const validSections = new Set<MasterSection>(['overview', 'create', 'licenses', 'admins', 'modules', 'monitoring']);
    if (!sectionFromUrl || !validSections.has(sectionFromUrl as MasterSection)) {
      setActiveSection('overview');
      return;
    }
    setActiveSection(sectionFromUrl as MasterSection);
  }, [sectionFromUrl]);

  useEffect(() => {
    if (!message || error) return;
    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [error, message]);

  function selectSection(section: MasterSection) {
    setActiveSection(section);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('section', section);
    router.replace(`/master?${nextParams.toString()}`);
  }

  const selectedCondominium = useMemo(
    () => condominiums.find((item) => item.id === selectedCondominiumId) ?? null,
    [condominiums, selectedCondominiumId]
  );
  const selectedClientAdmins = useMemo(
    () =>
      users.filter((user) => {
        const role = String(user.role).toUpperCase();
        const hasClient =
          user.condominiumId === selectedCondominiumId ||
          (Array.isArray(user.condominiumIds) && user.condominiumIds.includes(selectedCondominiumId));
        return hasClient && role === 'ADMIN';
      }),
    [selectedCondominiumId, users]
  );
  const catalogSupportByKey = useMemo(() => {
    const entries = moduleCatalog.map((item) => [item.settingKey.trim().toLowerCase(), item.persistedByApi] as const);
    return new Map<string, boolean>(entries);
  }, [moduleCatalog]);
  const getCatalogBackedCount = (values: Record<string, boolean>) =>
    Object.entries(values).filter(([key, enabled]) => enabled && catalogSupportByKey.get(key.trim().toLowerCase())).length;
  const apiDevicesByCondominium = useMemo(() => {
    const grouped = new Map<string, MasterOperationDevice[]>();
    operationDevices.forEach((device) => {
      if (!device.condominiumId) return;
      const current = grouped.get(device.condominiumId) ?? [];
      current.push(device);
      grouped.set(device.condominiumId, current);
    });
    return grouped;
  }, [operationDevices]);
  const freshLocalPresence = useMemo(
    () => localOperationPresence.filter((item) => isLocalOperationPresenceFresh(item)),
    [localOperationPresence, presenceRefreshTick]
  );
  const localPresenceByCondominium = useMemo(() => {
    const grouped = new Map<string, LocalOperationPresenceRecord>();
    freshLocalPresence.forEach((item) => {
      grouped.set(item.condominiumId, item);
    });
    return grouped;
  }, [freshLocalPresence]);
  const monitoredClients = useMemo(() => {
    return [...condominiums]
      .map((client) => {
        const devices = apiDevicesByCondominium.get(client.id) ?? [];
        const latestDevice = [...devices].sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())[0];
        const localPresence = localPresenceByCondominium.get(client.id);
        const localPresenceTime = localPresence ? new Date(localPresence.lastSeenAt).getTime() : 0;
        const latestDeviceTime = latestDevice ? new Date(latestDevice.lastSeenAt).getTime() : 0;
        const useLocalPresence = Boolean(
          localPresence &&
          (!latestDevice ||
            latestDevice.status === 'OFFLINE' ||
            localPresenceTime >= latestDeviceTime)
        );

        if (useLocalPresence && localPresence) {
          return {
            ...client,
            operationStatus: 'ONLINE',
            operationLastSeenAt: localPresence.lastSeenAt,
            operationDeviceName: localPresence.deviceName ?? client.operationDeviceName,
          };
        }

        if (!latestDevice) return client;

        return {
          ...client,
          operationStatus: latestDevice.status ?? client.operationStatus,
          operationLastSeenAt: latestDevice.lastSeenAt ?? client.operationLastSeenAt,
          operationDeviceName: latestDevice.deviceName ?? client.operationDeviceName,
        };
      })
      .sort((a, b) => {
        const offlineDelta = Number(isOperationOffline(b)) - Number(isOperationOffline(a));
        if (offlineDelta !== 0) return offlineDelta;
        const noHeartbeatDelta = Number(!b.operationLastSeenAt) - Number(!a.operationLastSeenAt);
        if (noHeartbeatDelta !== 0) return noHeartbeatDelta;
        return (b.operationLastSeenAt ? new Date(b.operationLastSeenAt).getTime() : 0) - (a.operationLastSeenAt ? new Date(a.operationLastSeenAt).getTime() : 0);
      });
  }, [apiDevicesByCondominium, condominiums, localPresenceByCondominium]);

  const editingEnabledCount = useMemo(() => Object.values(editingModules).filter(Boolean).length, [editingModules]);
  const filteredClientList = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();
    return monitoredClients.filter((item) => {
      const matchesSearch =
        !search ||
        [
          item.name,
          item.document,
          item.responsibleName,
          item.responsibleEmail,
          item.responsiblePhone,
          item.address,
          item.city,
          item.state,
          item.zipCode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      const matchesKind = clientKindFilter === 'all' || getClientKind(item) === clientKindFilter;
      const offline = isOperationOffline(item);
      const noSignal = !item.operationLastSeenAt;
      const matchesHealth =
        clientHealthFilter === 'all' ||
        (clientHealthFilter === 'offline'
          ? offline
          : clientHealthFilter === 'online'
            ? !offline && !noSignal
            : noSignal);
      return matchesSearch && matchesKind && matchesHealth;
    }).sort((a, b) => {
      if (clientSort === 'offline') {
        const healthDelta =
          Number(isOperationOffline(b) || !b.operationLastSeenAt) -
          Number(isOperationOffline(a) || !a.operationLastSeenAt);
        if (healthDelta !== 0) return healthDelta;
        return a.name.localeCompare(b.name, 'pt-BR');
      }

      if (clientSort === 'expires') {
        const expiryDelta = getLicenseExpiryTime(a) - getLicenseExpiryTime(b);
        if (expiryDelta !== 0) return expiryDelta;
        return a.name.localeCompare(b.name, 'pt-BR');
      }

      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [clientHealthFilter, clientKindFilter, clientSearch, clientSort, monitoredClients]);
  const clientSearchSuggestions = useMemo(() => {
    const search = clientSearch.trim();
    if (search.length < 2) return [];
    return filteredClientList.slice(0, 6);
  }, [clientSearch, filteredClientList]);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncPresence = () => {
      setLocalOperationPresence(readLocalOperationPresence());
    };

    syncPresence();
    window.addEventListener('storage', syncPresence);
    window.addEventListener(LOCAL_OPERATION_PRESENCE_EVENT, syncPresence);

    const timer = window.setInterval(() => {
      setPresenceRefreshTick((value) => value + 1);
      syncPresence();
    }, 30000);

    return () => {
      window.removeEventListener('storage', syncPresence);
      window.removeEventListener(LOCAL_OPERATION_PRESENCE_EVENT, syncPresence);
      window.clearInterval(timer);
    };
  }, []);
  const summary = useMemo(() => {
    const clients = condominiums.length;
    const residences = condominiums.filter((item) => getClientKind(item) === 'RESIDENCE').length;
    const activeLicenses = condominiums.filter((item) => ['ACTIVE', 'TRIAL'].includes(getLicenseStatus(item))).length;
    const offlineOperationsLocal = monitoredClients.filter(isOperationOffline).length;
    const peopleCountLocal = condominiums.reduce((sum, item) => sum + (item.peopleCount ?? item.residentsCount ?? 0), 0);
    const cameraCountLocal = condominiums.reduce((sum, item) => sum + (item.camerasCount ?? 0), 0);
    const enabledModulesTotal = condominiums.reduce((sum, item) => sum + enabledModuleKeys(normalizeModulesFromCondominium(item)).length, 0);
    const backendSupportedModulesTotal = condominiums.reduce((sum, item) => {
      const normalized = normalizeModulesFromCondominium(item);
      return sum + (moduleCatalog.length ? getCatalogBackedCount(normalized) : getBackendSupportedModuleCount(normalized));
    }, 0);
    const offlineClientsFromDevices = new Set(
      operationDevices
        .filter((device) => String(device.status).toUpperCase() === 'OFFLINE')
        .map((device) => device.condominiumId?.trim())
        .filter((value): value is string => Boolean(value))
    ).size;
    const hasRealtimeOperationSignals = operationDevices.length > 0 || freshLocalPresence.length > 0;
    const offlineOperationsSummary =
      hasRealtimeOperationSignals
        ? offlineOperationsLocal
        : apiSummary?.offlineOperationDevices && apiSummary.offlineOperationDevices <= clients
        ? Math.min(apiSummary.offlineOperationDevices, offlineOperationsLocal || apiSummary.offlineOperationDevices)
        : offlineClientsFromDevices || offlineOperationsLocal;

    return {
      clients: apiSummary?.clients ?? clients,
      condominiums: apiSummary?.condominiums ?? (clients - residences),
      residences: apiSummary?.residences ?? residences,
      activeLicenses: apiSummary?.activeLicenses ?? activeLicenses,
      offlineOperations: offlineOperationsSummary,
      peopleCount: apiSummary?.peopleCount ?? peopleCountLocal,
      cameraCount: apiSummary?.camerasCount ?? cameraCountLocal,
      enabledModulesTotal,
      backendSupportedModulesTotal,
      plannedModulesTotal: Math.max(enabledModulesTotal - backendSupportedModulesTotal, 0),
    };
  }, [apiSummary, condominiums, freshLocalPresence.length, moduleCatalog.length, monitoredClients, operationDevices]);

  function hydrateSelectedClient(condominium: Condominium) {
    setSelectedCondominiumId(condominium.id);
    setEditingName(condominium.name);
    setClientProfileForm({
      clientKind: getClientKind(condominium),
      name: condominium.name ?? '',
      document: condominium.document ?? '',
      address: condominium.address ?? '',
      city: condominium.city ?? '',
      state: condominium.state ?? '',
      zipCode: condominium.zipCode ?? '',
      responsibleName: condominium.responsibleName ?? '',
      responsibleEmail: condominium.responsibleEmail ?? '',
      responsiblePhone: condominium.responsiblePhone ?? '',
    });
    setEditingModules(normalizeModulesFromCondominium(condominium));
    setLicenseForm({
      licensePlan: normalizeLicensePlan(condominium.licensePlan),
      licenseStatus: getLicenseStatus(condominium),
      licenseMonthlyValue: condominium.licenseMonthlyValue ? String(condominium.licenseMonthlyValue) : '',
      licenseStartsAt: condominium.licenseStartsAt?.slice(0, 10) || '',
      licenseDueDay: condominium.licenseDueDay ? String(condominium.licenseDueDay).padStart(2, '0') : '',
      licenseExpiresAt: condominium.licenseExpiresAt?.slice(0, 10) || '',
    });
    setCreateAdminForm((current) => ({
      name: current.name,
      email: current.email || condominium.responsibleEmail || '',
      password: current.password,
    }));
  }

  async function loadCondominiums() {
    setLoadingCondominiums(true);
    try {
      const [data, summaryResponse, moduleCatalogResponse, devicesResponse, usersResponse] = await Promise.all([
        masterService.listClients(),
        masterService.getSummary(),
        masterService.listModuleCatalog(),
        masterService.listOperationDevices(),
        getUsers().catch(() => []),
      ]);
      setCondominiums(data);
      setApiSummary(summaryResponse);
      setModuleCatalog(moduleCatalogResponse);
      setOperationDevices(devicesResponse);
      setUsers(usersResponse);
      const selectedStillExists = selectedCondominiumId && data.some((item) => item.id === selectedCondominiumId);
      const nextSelected = selectedStillExists ? data.find((item) => item.id === selectedCondominiumId) : data[0];
      if (nextSelected) hydrateSelectedClient(nextSelected);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Não foi possível carregar os clientes.'));
    } finally {
      setLoadingCondominiums(false);
    }
  }

  useEffect(() => {
    void loadCondominiums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectCondominium(id: string) {
    const condominium = condominiums.find((item) => item.id === id);
    if (!condominium) return;
    hydrateSelectedClient(condominium);
    setMessage(null);
    setError(null);
  }

  function setField(field: keyof BootstrapClientForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setClientProfileField(field: keyof ClientProfileForm, value: string) {
    setClientProfileForm((prev) => ({ ...prev, [field]: field === 'state' ? value.toUpperCase().slice(0, 2) : value }));
  }

  function openClientProfileEditor() {
    if (!selectedCondominium) return;
    setClientProfileForm({
      clientKind: getClientKind(selectedCondominium),
      name: selectedCondominium.name ?? '',
      document: selectedCondominium.document ?? '',
      address: selectedCondominium.address ?? '',
      city: selectedCondominium.city ?? '',
      state: selectedCondominium.state ?? '',
      zipCode: selectedCondominium.zipCode ?? '',
      responsibleName: selectedCondominium.responsibleName ?? '',
      responsibleEmail: selectedCondominium.responsibleEmail ?? '',
      responsiblePhone: selectedCondominium.responsiblePhone ?? '',
    });
    setOpenClientProfileModal(true);
  }

  function openAdminUserEditor(user: UserResponse) {
    setEditingAdminUser(user);
    setAdminUserForm({
      name: user.name ?? '',
      email: user.email ?? '',
    });
    setAdminPasswordForm(initialAdminPasswordForm);
    setOpenAdminUserModal(true);
  }

  function setModuleValue(target: 'create' | 'edit', key: string, enabled: boolean) {
    const moduleConfig = platformModules.find((item) => item.key === key);
    if (moduleConfig?.required) return;
    const setter = target === 'create' ? setModules : setEditingModules;
    setter((prev) => ({ ...prev, [key]: enabled }));
  }

  function enableAll(target: 'create' | 'edit') {
    if (target === 'create') setModules(initialModules);
    else setEditingModules(initialModules);
  }

  function enableCoreOnly(target: 'create' | 'edit') {
    const next = platformModules.reduce<Record<string, boolean>>((acc, module) => {
      acc[module.key] = Boolean(module.required);
      return acc;
    }, {});
    if (target === 'create') setModules(next);
    else setEditingModules(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const adminEmail = normalizeEmail(form.adminEmail);
      const users = await getUsers().catch(() => []);
      const emailAlreadyUsed = users.some((user) => normalizeEmail(user.email) === adminEmail);
      if (emailAlreadyUsed) {
        setError('Este e-mail já está vinculado a outro usuário. Use um e-mail diferente para o administrador deste cliente.');
        return;
      }

      const { condominium } = await createClient(form);

      const mergedCondominium: Condominium = {
        ...condominium,
        name: condominium.name || form.condominiumName,
        clientKind: form.clientKind,
        document: form.document,
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        responsibleName: form.responsibleName,
        responsibleEmail: form.responsibleEmail,
        responsiblePhone: form.responsiblePhone,
        licensePlan: 'BASIC',
        licenseStatus: 'SUSPENDED',
        licenseExpiresAt: null,
        enabledModules: enabledModuleKeys(newClientModuleDefaults),
        moduleSettings: newClientModuleDefaults,
      };

      setCondominiums((current) => [mergedCondominium, ...current.filter((item) => item.id !== condominium.id)]);
      hydrateSelectedClient(mergedCondominium);
      selectSection('licenses');
      setForm(initialForm);
      setModules(initialModules);
      setMessage(`Cliente "${mergedCondominium.name}" cadastrado. Configure a licença antes de liberar os módulos contratados.`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Não foi possível concluir o cadastro.'));
    } finally {
      setSaving(false);
    }
  }

  function handleExportClientsCsv() {
    if (!filteredClientList.length || typeof window === 'undefined') return;

    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'id',
      'nome',
      'tipo',
      'documento',
      'responsavel',
      'cidade',
      'uf',
      'licenca_status',
      'licenca_plano',
      'licenca_vencimento',
      'situacao_portaria',
      'ultimo_sinal',
      'recursos_habilitados',
    ];

    const lines = filteredClientList.map((item) => {
      const normalizedModules = normalizeModulesFromCondominium(item);
      return [
        item.id,
        item.name,
        getClientKind(item) === 'RESIDENCE' ? 'Residência' : 'Condomínio',
        item.document || '',
        item.responsibleName || '',
        item.city || '',
        item.state || '',
        getLicenseStatus(item),
        item.licensePlan || '',
        item.licenseExpiresAt || '',
        !item.operationLastSeenAt ? 'SEM_HEARTBEAT' : isOperationOffline(item) ? 'OFFLINE' : 'ONLINE',
        item.operationLastSeenAt || '',
        enabledModuleKeys(normalizedModules).join(' | '),
      ]
        .map(escapeCsv)
        .join(';');
    });

    const csv = [headers.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleSaveModules() {
    if (!selectedCondominium) return;
    if (!hasEditableLicense(selectedCondominium)) {
      setError('Ative a licença deste cliente antes de configurar os módulos contratados.');
      return;
    }
    const confirmed = window.confirm('Ao alterar os recursos contratados, confira se o valor da mensalidade continua correto antes de concluir.');
    if (!confirmed) return;

    setSavingEdit(true);
    setMessage(null);
    setError(null);

    try {
      const profilePayload = {
        name: editingName.trim(),
      };
      const modulesPayload = {
        enabledModules: enabledModuleKeys(editingModules),
        moduleSettings: editingModules,
      };
      const [profile, modulesResponse] = await Promise.all([
        updateClientProfile(selectedCondominium.id, profilePayload),
        updateClientModules(selectedCondominium.id, modulesPayload),
      ]);
      const merged = { ...selectedCondominium, ...profile, ...modulesResponse, name: profile.name || editingName, ...modulesPayload };
      setCondominiums((current) => current.map((item) => (item.id === selectedCondominium.id ? merged : item)));
      hydrateSelectedClient(merged);
      setMessage(`Módulos de "${merged.name}" atualizados. Revise a mensalidade se houver mudança no contrato.`);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Não foi possível atualizar os módulos.'));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSaveLicense() {
    if (!selectedCondominium) return;
    setSavingLicense(true);
    setMessage(null);
    setError(null);

    try {
      const profilePayload = {
        name: selectedCondominium.name,
      };
      const licensePayload = {
        licensePlan: licenseForm.licensePlan,
        licenseStatus: licenseForm.licenseStatus,
        licenseMonthlyValue: licenseForm.licenseMonthlyValue.trim() || null,
        licenseStartsAt: licenseForm.licenseStartsAt || null,
        licenseDueDay: licenseForm.licenseDueDay.trim() || null,
        licenseExpiresAt: licenseForm.licenseExpiresAt || null,
      };
      const [profile, license] = await Promise.all([
        updateClientProfile(selectedCondominium.id, profilePayload),
        updateClientLicense(selectedCondominium.id, licensePayload),
      ]);
      const merged = { ...selectedCondominium, ...profile, ...license, ...profilePayload, ...licensePayload };
      setCondominiums((current) => current.map((item) => (item.id === selectedCondominium.id ? merged : item)));
      hydrateSelectedClient(merged);
      setMessage(`Licença de "${merged.name}" atualizada.`);
    } catch (licenseError) {
      setError(getErrorMessage(licenseError, 'Não foi possível atualizar a licença.'));
    } finally {
      setSavingLicense(false);
    }
  }

  async function handleSaveClientProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCondominium) return;

    setSavingClientProfile(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: clientProfileForm.name.trim(),
        clientKind: clientProfileForm.clientKind,
        document: clientProfileForm.document.trim() || null,
        address: clientProfileForm.address.trim() || null,
        city: clientProfileForm.city.trim() || null,
        state: clientProfileForm.state.trim() || null,
        zipCode: clientProfileForm.zipCode.trim() || null,
        responsibleName: clientProfileForm.responsibleName.trim() || null,
        responsibleEmail: clientProfileForm.responsibleEmail.trim() || null,
        responsiblePhone: clientProfileForm.responsiblePhone.trim() || null,
      };
      const profile = await updateClientProfile(selectedCondominium.id, payload);
      const merged = { ...selectedCondominium, ...profile, ...payload };
      setCondominiums((current) => current.map((item) => (item.id === selectedCondominium.id ? merged : item)));
      hydrateSelectedClient(merged);
      setOpenClientProfileModal(false);
      setMessage(`Dados de "${merged.name}" atualizados.`);
    } catch (profileError) {
      setError(getErrorMessage(profileError, 'Nao foi possivel atualizar os dados do cliente.'));
    } finally {
      setSavingClientProfile(false);
    }
  }

  async function handleSaveAdminUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAdminUser || !selectedCondominium) return;

    setSavingAdminUser(true);
    setMessage(null);
    setError(null);

    try {
      const nextEmail = normalizeEmail(adminUserForm.email);
      const emailAlreadyUsed = users.some((user) => user.id !== editingAdminUser.id && normalizeEmail(user.email) === nextEmail);
      if (emailAlreadyUsed) {
        setError('Este e-mail ja esta vinculado a outro usuario.');
        return;
      }

      const updated = await updateUser(editingAdminUser.id, {
        name: adminUserForm.name.trim(),
        email: nextEmail,
        role: 'ADMIN',
        condominiumId: selectedCondominium.id,
      });

      setUsers((current) => current.map((user) => (user.id === updated.id ? { ...user, ...updated } : user)));
      setOpenAdminUserModal(false);
      setEditingAdminUser(null);
      setAdminUserForm(initialAdminUserForm);
      setMessage(`Administrador "${updated.name}" atualizado.`);
    } catch (adminError) {
      setError(getErrorMessage(adminError, 'Nao foi possivel atualizar o administrador.'));
    } finally {
      setSavingAdminUser(false);
    }
  }

  async function handleSendAdminPasswordReset() {
    if (!editingAdminUser) return;

    setSendingAdminPasswordReset(true);
    setMessage(null);
    setError(null);

    try {
      await requestUserPasswordReset(editingAdminUser.id);
      setMessage(`Envio de redefinicao solicitado para ${editingAdminUser.email}.`);
    } catch (resetError) {
      setError(getErrorMessage(resetError, 'Nao foi possivel reenviar a redefinicao de senha.'));
    } finally {
      setSendingAdminPasswordReset(false);
    }
  }

  async function handleSaveAdminTemporaryPassword() {
    if (!editingAdminUser) return;
    const password = adminPasswordForm.temporaryPassword.trim();
    if (password.length < 6) {
      setError('Informe uma senha provisoria com pelo menos 6 caracteres.');
      return;
    }

    setSavingAdminTemporaryPassword(true);
    setMessage(null);
    setError(null);

    try {
      await updateUserPassword(editingAdminUser.id, password);
      setAdminPasswordForm(initialAdminPasswordForm);
      setMessage(`Senha provisoria definida para ${editingAdminUser.email}.`);
    } catch (passwordError) {
      setError(getErrorMessage(passwordError, 'Nao foi possivel definir a senha provisoria.'));
    } finally {
      setSavingAdminTemporaryPassword(false);
    }
  }

  async function handleCreateAdminUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCondominium) return;

    const name = createAdminForm.name.trim();
    const email = normalizeEmail(createAdminForm.email);
    const password = createAdminForm.password.trim();

    if (!name || !email || password.length < 6) {
      setError('Informe nome, e-mail e uma senha provisoria com pelo menos 6 caracteres.');
      return;
    }

    setSavingCreateAdmin(true);
    setMessage(null);
    setError(null);

    try {
      const created = await createUser({
        name,
        email,
        password,
        role: 'ADMIN',
        condominiumId: selectedCondominium.id,
      });

      setUsers((current) => [created, ...current.filter((user) => user.id !== created.id)]);
      setCreateAdminForm(initialCreateAdminForm);
      setMessage(`Administrador "${created.name}" criado e vinculado ao cliente.`);
    } catch (createError) {
      setError(getErrorMessage(createError, 'Nao foi possivel criar ou vincular o administrador. Se este e-mail ja existir, o backend precisa retornar o usuario para edicao.'));
    } finally {
      setSavingCreateAdmin(false);
    }
  }

  function renderClientList() {
    return (
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Clientes</CardTitle>
            <button type="button" onClick={() => void loadCondominiums()} className="rounded-lg border border-white/10 bg-white/10 p-2 text-white hover:bg-white/15">
              <RefreshCw className={`h-4 w-4 ${loadingCondominiums ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-3">
            <input
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Buscar por nome, CNPJ, responsável, e-mail ou endereço"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            {clientSearchSuggestions.length ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-xl">
                {clientSearchSuggestions.map((client) => (
                  <button
                    key={`${client.id}-suggestion`}
                    type="button"
                    onClick={() => {
                      selectCondominium(client.id);
                      setClientSearch(client.name);
                    }}
                    className="block w-full border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/10"
                  >
                    <p className="text-sm font-medium text-white">{client.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {[client.document, client.responsibleName, client.city].filter(Boolean).join(' | ') || 'Cadastro sem detalhes adicionais'}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'CONDOMINIUM', label: 'Condomínios' },
                { key: 'RESIDENCE', label: 'Residências' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setClientKindFilter(option.key as 'all' | ClientKind)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    clientKindFilter === option.key ? brandClasses.activeButton : 'border border-white/10 bg-slate-950/45 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'online', label: 'Conectados' },
                { key: 'offline', label: 'Desconectados' },
                { key: 'no_heartbeat', label: 'Sem sinal' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setClientHealthFilter(option.key as 'all' | 'offline' | 'online' | 'no_heartbeat')}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    clientHealthFilter === option.key ? brandClasses.activeButton : 'border border-white/10 bg-slate-950/45 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'offline', label: 'Atenção primeiro' },
                { key: 'expires', label: 'Vencimento' },
                { key: 'name', label: 'Nome' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setClientSort(option.key as ClientSort)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    clientSort === option.key ? brandClasses.activeButton : 'border border-white/10 bg-slate-950/45 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loadingCondominiums ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">Carregando clientes...</div>
          ) : filteredClientList.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">Nenhum cliente encontrado.</div>
          ) : (
            filteredClientList.map((condominium) => {
              const kind = getClientKind(condominium);
              const offline = isOperationOffline(condominium);
              const moduleLabels = getEnabledModuleLabels(condominium);
              return (
                <button
                  key={condominium.id}
                  type="button"
                  onClick={() => selectCondominium(condominium.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedCondominiumId === condominium.id ? brandClasses.activeTab : 'border-white/10 bg-slate-950/45 hover:bg-white/10'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{condominium.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{kind === 'RESIDENCE' ? 'Residência' : 'Condomínio'} | {condominium.city || 'Cidade não informada'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${offline ? 'bg-rose-500/15 text-rose-100' : 'bg-emerald-500/15 text-emerald-100'}`}>
                      {offline ? 'Offline' : getLicenseStatus(condominium)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moduleLabels.slice(0, 3).map((label) => (
                      <span key={`${condominium.id}-${label}`} className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-slate-200">
                        {label}
                      </span>
                    ))}
                    {moduleLabels.length > 3 ? (
                      <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-400">
                        +{moduleLabels.length - 3}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                      <span>Recursos ativos</span>
                      <span>{enabledModuleKeys(normalizeModulesFromCondominium(condominium)).length}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${Math.min(100, (enabledModuleKeys(normalizeModulesFromCondominium(condominium)).length / platformModules.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">
                    {enabledModuleKeys(normalizeModulesFromCondominium(condominium)).length} recurso(s) habilitado(s)
                  </p>
                  <p className="mt-3 text-[11px] text-slate-500">
                    Vence em {formatDate(condominium.licenseExpiresAt)} {offline ? '| portaria offline' : ''}
                  </p>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    );
  }

  const moduleGrid = (target: 'create' | 'edit', values: Record<string, boolean>) => (
    <div className="space-y-3">
      {!values.units || !values.people ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs text-amber-100">
          Modo enxuto habilitado. Sem Unidades ou Pessoas, alguns recursos de condomínio tradicional podem ficar limitados,
          mas o contrato pode ser usado para cenários menores, como casa isolada com reconhecimento facial e alertas.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {platformModules.map((module) => (
          <div key={`${target}-${module.key}`} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{module.label}</p>
                <p className="mt-1 text-xs text-slate-400">{module.description}</p>
                {module.required ? <p className={`mt-2 text-[11px] uppercase tracking-[0.14em] ${brandClasses.accentTextSoft}`}>Obrigatório</p> : null}
              </div>
              <Switch checked={values[module.key]} onCheckedChange={(checked) => setModuleValue(target, module.key, checked)} className={module.required ? 'opacity-70' : ''} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  function renderOverview() {
    const expiring7 = condominiums.filter((item) => {
      const days = getDaysUntilExpiry(item);
      return days !== null && days >= 0 && days <= 7;
    }).length;
    const expiring30 = condominiums.filter((item) => {
      const days = getDaysUntilExpiry(item);
      return days !== null && days > 7 && days <= 30;
    }).length;
    const clientsWithoutHeartbeat = condominiums.filter((item) => !item.operationLastSeenAt).length;

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatTile title="Clientes" value={summary.clients} description={`${summary.condominiums} condomínios | ${summary.residences} residências`} icon={Building2} />
          <StatTile title="Moradores/Pessoas" value={summary.peopleCount} description="Total informado pelos clientes" icon={Users} tone="emerald" />
          <StatTile title="Câmeras" value={summary.cameraCount} description="Câmeras cadastradas nos clientes" icon={Camera} />
          <StatTile title="Portarias offline" value={summary.offlineOperations} description="Computadores sem sinal recente" icon={AlertTriangle} tone={summary.offlineOperations ? 'rose' : 'emerald'} />
          <StatTile title="Portarias online" value={Math.max(monitoredClients.length - summary.offlineOperations, 0)} description="Portarias com contato recente" icon={ShieldCheck} tone="emerald" />
          <StatTile title="Licencas ativas" value={summary.activeLicenses} description="Clientes liberados ou em teste" icon={Puzzle} tone="cyan" />
          <StatTile title="Vencendo em 7 dias" value={expiring7} description="Clientes para ação imediata" icon={AlertTriangle} tone={expiring7 ? 'rose' : 'emerald'} />
          <StatTile title="Vencendo em 30 dias" value={expiring30} description="Clientes para ação preventiva" icon={RefreshCw} tone={expiring30 ? 'amber' : 'cyan'} />
        </div>

        <div className="grid gap-4">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Leitura rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-sm font-medium text-white">Resumo executivo</p>
                <p className="mt-2 text-sm text-slate-300">
                  Use esta tela para acompanhar vencimentos, portarias sem contato e pontos que precisam de atenção.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Para editar cliente, revisar licença, recursos contratados ou dispositivos, use o menu lateral.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-100">Sem contato</p>
                  <p className="mt-2 text-center text-3xl font-semibold tabular-nums text-white">{clientsWithoutHeartbeat}</p>
                  <p className="mt-2 text-xs text-amber-100/80">Portarias aguardando o primeiro sinal.</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Online agora</p>
                  <p className="mt-2 text-center text-3xl font-semibold tabular-nums text-white">
                    {Math.max(summary.clients - summary.offlineOperations - clientsWithoutHeartbeat, 0)}
                  </p>
                  <p className="mt-2 text-xs text-emerald-100/80">Portarias com sinal recente.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderCreate() {
    const documentLabel = form.clientKind === 'RESIDENCE' ? 'CPF do responsável' : 'CNPJ do condomínio';

    return (
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-slate-300" />Cadastrar cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setField('clientKind', 'CONDOMINIUM')} className={`rounded-2xl border p-4 text-left transition ${form.clientKind === 'CONDOMINIUM' ? brandClasses.activeTab : 'border-white/10 bg-slate-950/45 hover:bg-white/10'}`}>
                <Building2 className={`h-5 w-5 ${brandClasses.accentTextSoft}`} />
                <p className="mt-3 font-medium text-white">Condomínio</p>
                <p className="mt-1 text-xs text-slate-400">Cadastro com CNPJ e estrutura condominial.</p>
              </button>
              <button type="button" onClick={() => setField('clientKind', 'RESIDENCE')} className={`rounded-2xl border p-4 text-left transition ${form.clientKind === 'RESIDENCE' ? brandClasses.activeTab : 'border-white/10 bg-slate-950/45 hover:bg-white/10'}`}>
                <Home className="h-5 w-5 text-emerald-200" />
                <p className="mt-3 font-medium text-white">Residência</p>
                <p className="mt-1 text-xs text-slate-400">Cadastro com CPF para motor facial residencial.</p>
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome do cliente" value={form.condominiumName} onChange={(value) => setField('condominiumName', value)} placeholder="Ex.: Reserva das Palmeiras" required />
              <Field label={documentLabel} value={form.document} onChange={(value) => setField('document', value)} placeholder={form.clientKind === 'RESIDENCE' ? '000.000.000-00' : '00.000.000/0000-00'} />
              <Field label="Endereço" value={form.address} onChange={(value) => setField('address', value)} placeholder="Rua, número e complemento" className="md:col-span-2" />
              <Field label="Cidade" value={form.city} onChange={(value) => setField('city', value)} placeholder="Cidade" />
              <Field label="UF" value={form.state} onChange={(value) => setField('state', value.toUpperCase().slice(0, 2))} placeholder="SP" />
              <Field label="CEP" value={form.zipCode} onChange={(value) => setField('zipCode', value)} placeholder="00000-000" />
              <Field label="Responsável" value={form.responsibleName} onChange={(value) => setField('responsibleName', value)} placeholder="Nome do contratante" />
              <Field label="E-mail do responsável" value={form.responsibleEmail} onChange={(value) => setField('responsibleEmail', value)} placeholder="financeiro@cliente.com" type="email" />
              <Field label="Telefone" value={form.responsiblePhone} onChange={(value) => setField('responsiblePhone', value)} placeholder="(00) 00000-0000" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-sm font-medium text-white">Administrador inicial</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field label="Nome" value={form.adminName} onChange={(value) => setField('adminName', value)} placeholder="Maria Gestora" required />
                <Field label="E-mail" value={form.adminEmail} onChange={(value) => setField('adminEmail', value)} placeholder="admin@cliente.com" type="email" required />
                <Field label="Senha temporaria" value={form.adminPassword} onChange={(value) => setField('adminPassword', value)} placeholder="Senha inicial" type="password" required />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50">
              Depois do cadastro, configure a licença. Os módulos contratados só devem ser liberados quando a licença estiver ativa ou em teste.
            </div>

            <button type="submit" disabled={saving} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${brandClasses.solidAccent}`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Cadastrar cliente
            </button>
          </CardContent>
        </Card>
      </form>
    );
  }

  function renderLicenses() {
    return (
      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {renderClientList()}
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className={`h-5 w-5 ${brandClasses.accentTextSoft}`} />Licença do cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCondominium ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <p className="text-sm font-medium text-white">{selectedCondominium.name}</p>
                    <button type="button" onClick={openClientProfileEditor} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15">
                      Editar dados
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {getClientKind(selectedCondominium) === 'RESIDENCE' ? 'Residência' : 'Condomínio'} | {selectedCondominium.document || 'Documento não informado'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-sm font-medium text-white">Administrador do cliente</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedClientAdmins.length ? `${selectedClientAdmins.length} administrador(es) vinculado(s)` : 'Nenhum administrador vinculado encontrado.'}
                  </p>
                  {selectedClientAdmins.length ? (
                    <div className="mt-3 space-y-2">
                      {selectedClientAdmins.map((admin) => (
                        <div key={admin.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{admin.name}</p>
                            <p className="mt-1 truncate text-xs text-slate-400">{admin.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => openAdminUserEditor(admin)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15">
                              Editar dados
                            </button>
                            <button type="button" onClick={() => openAdminUserEditor(admin)} className={`rounded-lg px-3 py-2 text-xs font-medium ${brandClasses.solidAccent}`}>
                              Senha e acesso
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-amber-100">Se o administrador foi criado em outro fluxo, confirme se ele esta vinculado a este cliente.</p>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <SelectField label="Plano" value={licenseForm.licensePlan} onChange={(value) => setLicenseForm((prev) => ({ ...prev, licensePlan: value as LicensePlan }))} options={licensePlans} />
                  <SelectField label="Status" value={licenseForm.licenseStatus} onChange={(value) => setLicenseForm((prev) => ({ ...prev, licenseStatus: value as LicenseStatus }))} options={licenseStatuses} />
                  <Field
                    label="Valor mensal"
                    value={licenseForm.licenseMonthlyValue}
                    onChange={(value) => setLicenseForm((prev) => ({ ...prev, licenseMonthlyValue: formatMonthlyValueInput(value) }))}
                    placeholder="Ex.: 499,90"
                    inputMode="decimal"
                  />
                  <Field label="Início do contrato" value={licenseForm.licenseStartsAt} onChange={(value) => setLicenseForm((prev) => ({ ...prev, licenseStartsAt: value }))} type="date" />
                  <SelectField label="Dia de vencimento" value={licenseForm.licenseDueDay} onChange={(value) => setLicenseForm((prev) => ({ ...prev, licenseDueDay: value }))} options={licenseDueDays} />
                  <Field label="Fim do contrato" value={licenseForm.licenseExpiresAt} onChange={(value) => setLicenseForm((prev) => ({ ...prev, licenseExpiresAt: value }))} type="date" />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <MiniInfo title="Situação" value={licenseStatuses.find((item) => item.value === licenseForm.licenseStatus)?.label ?? 'Ativa'} />
                  <MiniInfo title="Mensalidade" value={licenseForm.licenseMonthlyValue ? `R$ ${licenseForm.licenseMonthlyValue}` : 'A definir'} />
                  <MiniInfo title="Vencimento" value={licenseForm.licenseDueDay ? `Todo dia ${licenseForm.licenseDueDay}` : 'A definir'} />
                </div>

                <button type="button" onClick={() => void handleSaveLicense()} disabled={savingLicense} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${brandClasses.solidAccent}`}>
                  {savingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Salvar licença
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">Selecione um cliente para gerenciar a licença.</div>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderModules() {
    const licenseReady = hasEditableLicense(selectedCondominium);

    return (
      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {renderClientList()}
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg"><Pencil className={`h-5 w-5 ${brandClasses.accentTextSoft}`} />Configurar módulos</CardTitle>
                <p className="mt-2 text-sm text-slate-400">
                  {selectedCondominium
                    ? licenseReady
                      ? `${editingEnabledCount} recurso(s) contratado(s).`
                      : 'Ative a licença antes de liberar os módulos contratados.'
                    : 'Selecione um cliente para editar.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => enableAll('edit')} disabled={!selectedCondominium || !licenseReady} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15 disabled:opacity-50">Habilitar todos</button>
                <button type="button" onClick={() => enableCoreOnly('edit')} disabled={!selectedCondominium || !licenseReady} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50">Só essenciais</button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nome do cliente" value={editingName} onChange={setEditingName} disabled={!selectedCondominium} />
            {selectedCondominium && !licenseReady ? (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-50">
                Configure a licença como ativa ou em teste para liberar os módulos contratados deste cliente.
              </div>
            ) : (
              moduleGrid('edit', editingModules)
            )}
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
              Alterações em módulos podem mudar o pacote contratado. Confirme a mensalidade na aba Licenças depois de salvar.
            </div>
            <button type="button" onClick={() => void handleSaveModules()} disabled={!selectedCondominium || !licenseReady || savingEdit} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${brandClasses.solidAccent}`}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Salvar módulos
            </button>
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderAdmins() {
    return (
      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {renderClientList()}
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Users className={`h-5 w-5 ${brandClasses.accentTextSoft}`} />Administradores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCondominium ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-sm font-medium text-white">{selectedCondominium.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Gerencie os administradores vinculados a este cliente.
                  </p>
                </div>

                {selectedClientAdmins.length ? (
                  <div className="space-y-3">
                    {selectedClientAdmins.map((admin) => (
                      <div key={`${admin.id}-admin-section`} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{admin.name}</p>
                            <p className="mt-1 truncate text-xs text-slate-400">{admin.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => openAdminUserEditor(admin)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15">
                              Editar dados
                            </button>
                            <button type="button" onClick={() => openAdminUserEditor(admin)} className={`rounded-lg px-3 py-2 text-xs font-medium ${brandClasses.solidAccent}`}>
                              Senha e acesso
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-50">
                    <div>
                      <p className="font-medium text-white">Administrador nao localizado</p>
                      <p className="mt-2">
                        A lista de usuarios nao retornou um administrador vinculado a este cliente. Voce pode criar um administrador agora. Se o e-mail ja existir, o backend deve retornar conflito para evitar duplicidade.
                      </p>
                    </div>
                    <form onSubmit={handleCreateAdminUser} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4 md:grid-cols-3">
                      <Field label="Nome do administrador" value={createAdminForm.name} onChange={(value) => setCreateAdminForm((prev) => ({ ...prev, name: value }))} required />
                      <Field label="E-mail" value={createAdminForm.email} onChange={(value) => setCreateAdminForm((prev) => ({ ...prev, email: value }))} type="email" required />
                      <Field label="Senha provisoria" value={createAdminForm.password} onChange={(value) => setCreateAdminForm((prev) => ({ ...prev, password: value }))} type="password" required />
                      <button type="submit" disabled={savingCreateAdmin} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-60 md:col-span-3 ${brandClasses.solidAccent}`}>
                        {savingCreateAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                        Criar administrador para este cliente
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">Selecione um cliente para gerenciar administradores.</div>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderMonitoring() {
    const clientsWithoutHeartbeat = monitoredClients.filter((client) => !client.operationLastSeenAt).length;
    const onlineClients = monitoredClients.length - summary.offlineOperations - clientsWithoutHeartbeat;
    const priorityMonitoringClients = monitoredClients
      .filter((client) => isOperationOffline(client) || !client.operationLastSeenAt)
      .slice(0, 6);
    const healthyClients = monitoredClients.filter((client) => client.operationLastSeenAt && !isOperationOffline(client)).length;

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <StatTile title="Clientes monitorados" value={summary.clients} description="Condomínios e residências" icon={Cpu} />
          <StatTile title="Portarias offline" value={summary.offlineOperations} description="Sem sinal recente" icon={AlertTriangle} tone={summary.offlineOperations ? 'rose' : 'emerald'} />
          <StatTile title="Licenças ativas" value={summary.activeLicenses} description="Ativas ou em teste" icon={Activity} tone="emerald" />
          <StatTile title="Sem sinal" value={clientsWithoutHeartbeat} description="Cliente sem primeiro contato" icon={RefreshCw} tone={clientsWithoutHeartbeat ? 'amber' : 'cyan'} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Saudáveis</p>
            <p className="mt-2 text-3xl font-semibold text-white">{healthyClients}</p>
            <p className="mt-2 text-xs text-emerald-100/80">Com sinal recente e sem alerta operacional.</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-100">Sem primeiro sinal</p>
            <p className="mt-2 text-3xl font-semibold text-white">{clientsWithoutHeartbeat}</p>
            <p className="mt-2 text-xs text-amber-100/80">Cliente ainda aguardando o primeiro sinal.</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-rose-100">Exigem ação</p>
            <p className="mt-2 text-3xl font-semibold text-white">{priorityMonitoringClients.length}</p>
            <p className="mt-2 text-xs text-rose-100/80">Offline ou sem sinal.</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg"><Cpu className={`h-5 w-5 ${brandClasses.accentTextSoft}`} />Computadores da portaria</CardTitle>
                <div className="flex items-center gap-2">
                  {operationDevices.length ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                      {operationDevices.length} device(s) reais
                    </span>
                  ) : null}
                  <button type="button" onClick={() => void loadCondominiums()} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15">Atualizar</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {monitoredClients.length ? monitoredClients.map((client) => {
                const offline = isOperationOffline(client);
                const noHeartbeat = !client.operationLastSeenAt;
                return (
                  <div key={client.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div>
                      <p className="font-medium text-white">{client.name}</p>
                      <p className="mt-1 text-xs text-slate-400">Último sinal: {client.operationLastSeenAt ? `${formatDate(client.operationLastSeenAt)} ${new Date(client.operationLastSeenAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'aguardando sinal'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${noHeartbeat ? 'bg-amber-500/15 text-amber-100' : offline ? 'bg-rose-500/15 text-rose-100' : 'bg-emerald-500/15 text-emerald-100'}`}>{noHeartbeat ? 'Sem sinal' : offline ? 'Desconectado' : 'Conectado'}</span>
                    <span className="text-xs text-slate-500">{client.operationDeviceName || 'Portaria principal'}</span>
                  </div>
                );
              }) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">Nenhum cliente cadastrado para monitorar.</div>
              )}
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
                Para acompanhar desconexões em tempo real, cada computador da portaria precisa enviar sinais periódicos para a central.
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-emerald-200" />Resumo operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Online agora</p>
                <p className="mt-2 text-3xl font-semibold text-white">{Math.max(onlineClients, 0)}</p>
                <p className="mt-2 text-xs text-emerald-100/80">Clientes com sinal recente.</p>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-rose-100">Prioridade</p>
                <div className="mt-3 space-y-2">
                  {priorityMonitoringClients.map((client) => (
                    <button
                      key={`${client.id}-priority`}
                      type="button"
                      onClick={() => {
                        selectCondominium(client.id);
                        setActiveSection('licenses');
                      }}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-rose-500/20 bg-black/20 p-3 text-left transition hover:bg-black/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{client.name}</p>
                        <p className="mt-1 truncate text-[11px] text-rose-100/80">{client.operationDeviceName || 'Portaria principal'}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[10px] uppercase ${!client.operationLastSeenAt ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : 'border-rose-500/20 bg-rose-500/10 text-rose-100'}`}>
                        {!client.operationLastSeenAt ? 'Sem sinal' : 'Offline'}
                      </span>
                    </button>
                  ))}
                  {priorityMonitoringClients.length === 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-black/20 p-3 text-sm text-emerald-100">Nenhuma portaria crítica no momento.</div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {error || message ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <div
            role="status"
            className={`w-full max-w-xl rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur ${
              error
                ? 'border-red-500/30 bg-red-950/90 text-red-50 shadow-red-950/30'
                : 'border-emerald-400/30 bg-slate-950/95 text-white shadow-black/40'
            }`}
          >
            <div className="flex items-start gap-3">
              {error ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-200" /> : <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${brandClasses.accentTextSoft}`} />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{error ? 'Atenção' : 'Tudo certo'}</p>
                <p className="mt-1 text-sm text-white/80">{error ?? message}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                }}
                className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/75 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Painel Master</p>
            <h1 className="mt-1 text-2xl font-semibold">Gestão global de clientes</h1>
            <p className="mt-1 text-sm text-slate-400">
              Visão rápida dos clientes, licenças e portarias.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[520px]">
            <MiniInfo title="Clientes" value={String(summary.clients)} />
            <MiniInfo title="Licenças ativas" value={String(summary.activeLicenses)} />
            <MiniInfo title="Portarias online" value={String(Math.max(monitoredClients.length - summary.offlineOperations, 0))} />
            <MiniInfo title="Portarias offline" value={String(summary.offlineOperations)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportClientsCsv}
              disabled={!filteredClientList.length}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar clientes
            </button>
            <button type="button" onClick={() => void loadCondominiums()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
              <RefreshCw className={`h-4 w-4 ${loadingCondominiums ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <section>
        <main>
          {activeSection === 'overview' ? renderOverview() : null}
          {activeSection === 'create' ? renderCreate() : null}
          {activeSection === 'licenses' ? renderLicenses() : null}
          {activeSection === 'admins' ? renderAdmins() : null}
          {activeSection === 'modules' ? renderModules() : null}
          {activeSection === 'monitoring' ? renderMonitoring() : null}
        </main>
      </section>

      <CrudModal
        open={openClientProfileModal}
        title="Editar dados do cliente"
        description="Atualize cadastro, responsavel e endereco do cliente selecionado."
        onClose={() => setOpenClientProfileModal(false)}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveClientProfile} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setClientProfileField('clientKind', 'CONDOMINIUM')} className={`rounded-2xl border p-4 text-left transition ${clientProfileForm.clientKind === 'CONDOMINIUM' ? brandClasses.activeTab : 'border-white/10 bg-slate-950/45 hover:bg-white/10'}`}>
              <Building2 className={`h-5 w-5 ${brandClasses.accentTextSoft}`} />
              <p className="mt-3 font-medium text-white">Condominio</p>
              <p className="mt-1 text-xs text-slate-400">Cliente com estrutura condominial.</p>
            </button>
            <button type="button" onClick={() => setClientProfileField('clientKind', 'RESIDENCE')} className={`rounded-2xl border p-4 text-left transition ${clientProfileForm.clientKind === 'RESIDENCE' ? brandClasses.activeTab : 'border-white/10 bg-slate-950/45 hover:bg-white/10'}`}>
              <Home className="h-5 w-5 text-emerald-200" />
              <p className="mt-3 font-medium text-white">Residencia</p>
              <p className="mt-1 text-xs text-slate-400">Cliente residencial ou casa isolada.</p>
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nome do cliente" value={clientProfileForm.name} onChange={(value) => setClientProfileField('name', value)} required />
            <Field label={clientProfileForm.clientKind === 'RESIDENCE' ? 'CPF do responsavel' : 'CNPJ do cliente'} value={clientProfileForm.document} onChange={(value) => setClientProfileField('document', value)} />
            <Field label="Endereco" value={clientProfileForm.address} onChange={(value) => setClientProfileField('address', value)} className="md:col-span-2" />
            <Field label="Cidade" value={clientProfileForm.city} onChange={(value) => setClientProfileField('city', value)} />
            <Field label="UF" value={clientProfileForm.state} onChange={(value) => setClientProfileField('state', value)} />
            <Field label="CEP" value={clientProfileForm.zipCode} onChange={(value) => setClientProfileField('zipCode', value)} />
            <Field label="Responsavel" value={clientProfileForm.responsibleName} onChange={(value) => setClientProfileField('responsibleName', value)} />
            <Field label="E-mail do responsavel" value={clientProfileForm.responsibleEmail} onChange={(value) => setClientProfileField('responsibleEmail', value)} type="email" />
            <Field label="Telefone" value={clientProfileForm.responsiblePhone} onChange={(value) => setClientProfileField('responsiblePhone', value)} />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setOpenClientProfileModal(false)} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15">
              Cancelar
            </button>
            <button type="submit" disabled={savingClientProfile} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${brandClasses.solidAccent}`}>
              {savingClientProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Salvar dados
            </button>
          </div>
        </form>
      </CrudModal>

      <CrudModal
        open={openAdminUserModal}
        title="Administrador e senha"
        description="Atualize os dados do administrador ou use as opcoes de senha."
        onClose={() => {
          setOpenAdminUserModal(false);
          setEditingAdminUser(null);
          setAdminUserForm(initialAdminUserForm);
          setAdminPasswordForm(initialAdminPasswordForm);
        }}
        maxWidth="lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-sm font-medium text-white">Senha e acesso</p>
            <p className="mt-1 text-xs text-slate-400">Use quando o cliente perder acesso ou quando precisar criar uma senha provisoria.</p>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => void handleSendAdminPasswordReset()}
                disabled={sendingAdminPasswordReset}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-60"
              >
                {sendingAdminPasswordReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reenviar redefinicao de senha
              </button>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <Field
                  label="Senha provisoria"
                  value={adminPasswordForm.temporaryPassword}
                  onChange={(value) => setAdminPasswordForm({ temporaryPassword: value })}
                  type="password"
                  placeholder="Digite a senha provisoria"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveAdminTemporaryPassword()}
                  disabled={savingAdminTemporaryPassword}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${brandClasses.solidAccent}`}
                >
                  {savingAdminTemporaryPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Alterar senha
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveAdminUser} className="space-y-4">
            <p className="text-sm font-medium text-white">Dados do administrador</p>
            <Field label="Nome" value={adminUserForm.name} onChange={(value) => setAdminUserForm((prev) => ({ ...prev, name: value }))} required />
            <Field label="E-mail" value={adminUserForm.email} onChange={(value) => setAdminUserForm((prev) => ({ ...prev, email: value }))} type="email" required />

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50">
              Se alterar o e-mail, confirme que ele nao pertence a outro morador, operador ou administrador.
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setOpenAdminUserModal(false)} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15">
                Cancelar
              </button>
              <button type="submit" disabled={savingAdminUser} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${brandClasses.solidAccent}`}>
                {savingAdminUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Salvar administrador
              </button>
            </div>
          </form>
        </div>
      </CrudModal>
    </div>
  );
}




