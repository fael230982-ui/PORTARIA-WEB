'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  Users,
  Shield,
  BadgeCheck,
  Clock3,
  Eye,
  Building2,
  KeyRound,
  MapPin,
  Mail,
  Pencil,
} from 'lucide-react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useUsers } from '@/hooks/use-users';
import { useAllPeople } from '@/hooks/use-people';
import {
  groupPermissions,
  normalizePermissions,
  summarizePermissionMatrix,
} from '@/features/auth/permission-normalizer';
import { maskEmail } from '@/features/legal/data-masking';
import { masterService } from '@/services/master.service';
import { createUser, updateUser } from '@/services/users.service';
import { CrudModal } from '@/components/admin/CrudModal';
import type { UserRole } from '@/store/auth.store';
import type { Unit } from '@/types/condominium';
import type { Person } from '@/types/person';
import type { ApiUserRole, PermissionMatrixItem, UserCreateRequest, UserResponse, UserUpdateRequest } from '@/types/user';

type NormalizedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ativo' | 'pendente';
  permissions: string[];
  scopeType: string;
  condominium: string;
  unit: string;
  location: string;
  personId: string | null;
};

type Filters = {
  search: string;
  role: string;
  scope: string;
};

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  condominiumId: string;
  unitId: string;
  personId: string;
};

const initialForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: 'OPERADOR',
  condominiumId: '',
  unitId: '',
  personId: '',
};

function getResidentAccessInitialData(): Partial<UserFormData> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  if (params.get('create') !== 'resident-access') return {};

  return {
    role: 'MORADOR',
    personId: params.get('residentId') ?? '',
    name: params.get('name') ?? '',
    email: params.get('email') ?? '',
    unitId: params.get('unitId') ?? '',
  };
}

function normalizeString(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function resolveUnit(unitId: string | null | undefined, units: Unit[]) {
  const normalizedUnitId = String(unitId ?? '').trim();
  if (!normalizedUnitId) return null;

  return (
    units.find((entry) => entry.id === normalizedUnitId) ||
    units.find((entry) => entry.legacyUnitId === normalizedUnitId) ||
    null
  );
}

function formatUnitLocation(unit: Unit | null, fallbackUnitId: string | null) {
  if (unit) {
    return (
      [unit.condominium?.name, unit.structure?.label, unit.label].filter(Boolean).join(' / ') ||
      unit.legacyUnitId ||
      unit.label
    );
  }

  const normalizedFallback = String(fallbackUnitId ?? '').trim();
  return normalizedFallback ? 'Unidade não identificada' : '';
}

function humanizeUserApiMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('request failed with status code 500')) {
    return 'O backend retornou erro interno ao salvar o usuário. Tente novamente ou acione o suporte técnico.';
  }
  if (normalized.includes('request failed with status code 403')) {
    return 'Você não tem permissão para criar usuário com esse perfil ou escopo.';
  }
  if (normalized.includes('email') && (normalized.includes('already') || normalized.includes('duplic') || normalized.includes('cadastrado'))) {
    return 'Já existe um usuário cadastrado com este e-mail.';
  }
  if (normalized.includes('password') || normalized.includes('senha')) {
    return 'Informe uma senha válida para criar o usuário.';
  }
  if (normalized.includes('unitid') || normalized.includes('unitids')) {
    return 'Selecione uma unidade válida para este usuário.';
  }
  if (normalized.includes('condominiumid')) {
    return 'Selecione um condomínio válido para este usuário.';
  }
  if (normalized.includes('role')) {
    return 'Selecione um perfil válido para este usuário.';
  }

  return message;
}

function getUserErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as {
      response: {
        status: number;
        data: { detail: unknown; message: unknown; error: unknown };
      };
    }).response;
    const data = response.data;
    const rawMessage =
      (typeof data.detail === 'string' && data.detail.trim()) ||
      (typeof data.message === 'string' && data.message.trim()) ||
      (typeof data.error === 'string' && data.error.trim()) ||
      '';

    if (rawMessage) return humanizeUserApiMessage(rawMessage);
    if (response.status === 400) return 'Confira os dados obrigatórios antes de salvar o usuário.';
    if (response.status === 403) return 'Você não tem permissão para criar usuário com esse perfil ou escopo.';
    if (response.status === 500) return 'O backend retornou erro interno ao salvar o usuário. Tente novamente ou acione o suporte técnico.';
  }

  if (error instanceof Error && error.message && !error.message.includes('Request failed with status code')) {
    return humanizeUserApiMessage(error.message);
  }

  return fallback;
}

function getRoleLabel(role: UserRole | string) {
  const normalized = normalizeString(role);

  if (normalized === 'master') return 'Master';
  if (normalized === 'parceiro') return 'Parceiro';
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'operador' || normalized === 'operacional') return 'Operação';
  if (normalized === 'central') return 'Central';
  if (normalized === 'morador') return 'Morador';

  return String(role || 'Sem perfil');
}

function roleMatchesFilter(role: UserRole | string, filter: string) {
  if (!filter) return true;
  const normalizedRole = normalizeString(role);
  const normalizedFilter = normalizeString(filter);

  if (normalizedFilter === 'operador') {
    return normalizedRole === 'operador' || normalizedRole === 'operacional';
  }

  return normalizedRole === normalizedFilter;
}

function scopeMatchesFilter(scopeType: string, filter: string) {
  if (!filter) return true;
  const normalizedScope = normalizeString(scopeType);
  const normalizedFilter = normalizeString(filter);

  if (normalizedFilter === 'assigned') {
    return normalizedScope === 'assigned' || normalizedScope === 'escopo atribuido';
  }
  if (normalizedFilter === 'global') {
    return normalizedScope === 'global' || normalizedScope === 'acesso global';
  }
  if (normalizedFilter === 'resident') {
    return normalizedScope === 'resident' || normalizedScope === 'morador';
  }
  if (normalizedFilter === 'unscoped') {
    return normalizedScope === 'unscoped' || normalizedScope === 'sem restricao definida';
  }

  return normalizedScope === normalizedFilter;
}

function mapApiRoleToUi(role: ApiUserRole): UserRole {
  if (role === 'OPERACIONAL') return 'OPERADOR';
  return role;
}

function mapUiRoleToApi(role: UserRole): ApiUserRole {
  if (role === 'OPERADOR') return 'OPERACIONAL';
  return role;
}

function getScopeLabel(scopeType: string | null) {
  const normalized = normalizeString(scopeType);

  if (normalized === 'global') return 'Acesso global';
  if (normalized === 'assigned') return 'Escopo atribuído';
  if (normalized === 'resident') return 'Morador';
  if (normalized === 'unscoped') return 'Sem restrição definida';

  return scopeType || 'Sem restrição definida';
}

function getStatusBadge(status: string) {
  if (normalizeString(status) === 'ativo') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  }

  return 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300';
}

function getRoleBadgeClass(role: UserRole | string) {
  const normalized = normalizeString(role);

  if (normalized === 'master') return 'border-violet-400/30 bg-violet-500/15 text-violet-100';
  if (normalized === 'parceiro') return 'border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-100';
  if (normalized === 'admin') return 'border-sky-400/30 bg-sky-500/15 text-sky-100';
  if (normalized === 'operador' || normalized === 'operacional') return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100';
  if (normalized === 'central') return 'border-amber-400/30 bg-amber-500/15 text-amber-100';
  if (normalized === 'morador') return 'border-rose-400/30 bg-rose-500/15 text-rose-100';

  return 'border-white/10 bg-white/10 text-white';
}

function getOfficialPermissionsForRole(role: UserRole | string, matrix: PermissionMatrixItem[]) {
  const apiRole = mapUiRoleToApi(role as UserRole);
  return normalizePermissions(matrix.find((item) => item.role === apiRole)?.permissions ?? []);
}

function mapUserToRow(
  user: Partial<UserResponse> | null | undefined,
  context: {
    condominiumName: string;
    unitLabel: string;
    location: string;
  }
): NormalizedUser {
  return {
    id: String(user?.id ?? ''),
    name: user?.name?.trim() || user?.personName?.trim() || 'Usuário sem nome',
    email: user?.email?.trim() || 'sem-email@nao-informado.local',
    role: mapApiRoleToUi((user?.role ?? 'OPERACIONAL') as ApiUserRole),
    status: 'ativo',
    permissions: Array.isArray(user?.permissions) ? user.permissions : [],
    scopeType: getScopeLabel(user?.scopeType ?? null),
    condominium: context.condominiumName,
    unit: context.unitLabel,
    location: context.location,
    personId: user?.personId ?? null,
  };
}

function UserForm({
  onSubmit,
  onCancel,
  loading,
  condominiumOptions,
  unitOptions,
  residentOptions,
  roleOptions,
  condominiumLocked = false,
  initialData,
  passwordRequired = true,
  submitLabel = 'Criar usuário',
}: {
  onSubmit: (data: UserFormData) => Promise<void> | void;
  onCancel: () => void;
  loading: boolean;
  condominiumOptions: Array<{ id: string; name: string }>;
  unitOptions: Array<{ id: string; label: string; condominiumId: string }>;
  residentOptions: Array<{ id: string; name: string; email: string | null; document: string | null; unitId: string | null; unitLabel: string | null }>;
  roleOptions: Array<{ value: UserRole; label: string }>;
  condominiumLocked: boolean;
  initialData: Partial<UserFormData>;
  passwordRequired: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<UserFormData>({
    ...initialForm,
    ...initialData,
  });

  const filteredUnits = useMemo(() => {
    if (!form.condominiumId) return unitOptions;
    return unitOptions.filter((unit) => unit.condominiumId === form.condominiumId);
  }, [form.condominiumId, unitOptions]);

  const setField = (field: keyof UserFormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'condominiumId' ? { unitId: '', personId: '' } : null),
    }));
  };

  const setResident = (personId: string) => {
    const resident = residentOptions.find((item) => item.id === personId);
    setForm((prev) => ({
      ...prev,
      personId,
      name: resident.name || prev.name,
      email: resident.email || prev.email,
      unitId: resident.unitId || prev.unitId,
    }));
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
            placeholder="Nome completo"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="usuario@condominio.com"
            required={passwordRequired}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Senha inicial</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder={passwordRequired ? 'Senha temporaria' : 'Deixe em branco para manter a senha atual'}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Perfil</span>
          <select
            value={form.role}
            onChange={(e) => setField('role', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Condomínio</span>
          <select
            value={form.condominiumId}
            onChange={(e) => setField('condominiumId', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            disabled={condominiumLocked}
          >
            {!condominiumLocked ? <option value="">Sem vinculo especifico</option> : null}
            {condominiumOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Unidade</span>
          <select
            value={form.unitId}
            onChange={(e) => setField('unitId', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="">Sem unidade específica</option>
            {filteredUnits.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {form.role === 'MORADOR' ? (
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Morador vinculado ao login do app</span>
            <select
              value={form.personId}
              onChange={(e) => setResident(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            >
              <option value="">Selecionar morador cadastrado</option>
              {residentOptions
                .filter((resident) => !form.condominiumId || filteredUnits.some((unit) => unit.id === resident.unitId))
                .map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {[resident.name, resident.unitLabel, resident.document].filter(Boolean).join(' | ')}
                  </option>
                ))}
            </select>
            <p className="text-xs text-slate-500">
              Para testar o app, crie o usuário com perfil Morador, e-mail, senha inicial e vínculo com o morador real.
            </p>
          </label>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
        {passwordRequired ? 'A senha inicial é enviada somente na criação do usuário.' : 'Na edição, a senha em branco não é enviada para a API. Use "Senha do app" para trocar a senha.'}
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
          {loading ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
      <p className="text-base font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-center text-3xl font-semibold tabular-nums text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminUsuariosPage() {
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'MASTER'],
  });
  const currentUserRole = user?.role ?? 'ADMIN';
  const [filters, setFilters] = useState<Filters>({
    search: '',
    role: '',
    scope: '',
  });
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openPasswordHelp, setOpenPasswordHelp] = useState(false);
  const [openEditHelp, setOpenEditHelp] = useState(false);
  const [createInitialData, setCreateInitialData] = useState<Partial<UserFormData>>({});
  const [handledResidentAccessQuery, setHandledResidentAccessQuery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<NormalizedUser | null>(null);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrixItem[]>([]);

  const { data: usersData, isLoading, error, refetch } = useUsers();
  const { data: peopleData } = useAllPeople({ limit: 100 });
  const { condominiums, units } = useResidenceCatalog();

  useEffect(() => {
    if (handledResidentAccessQuery) return;

    const initialData = getResidentAccessInitialData();
    if (initialData.personId) {
      setCreateInitialData(initialData);
      setOpenCreate(true);
    }

    setHandledResidentAccessQuery(true);
  }, [handledResidentAccessQuery]);

  useEffect(() => {
    let active = true;

    masterService.getPermissionsMatrix().then((data) => {
      if (active) setPermissionMatrix(data);
    }).catch(() => {
      if (active) setPermissionMatrix([]);
    });

    return () => {
      active = false;
    };
  }, []);

  const users = useMemo(() => {
    return (usersData ?? []).filter((item): item is UserResponse => Boolean(item && typeof item === 'object')).map((item) => {
      const condominiumName =
        condominiums.filter(Boolean).find((condominium) => condominium.id === item.condominiumId)?.name ?? '';
      const unit = resolveUnit(item.unitId, units);
      const location = formatUnitLocation(unit, item.unitId) || condominiumName;

      return mapUserToRow(item, {
        condominiumName,
        unitLabel: location,
        location,
      });
    });
  }, [condominiums, units, usersData]);

  const filteredUsers = useMemo(() => {
    const search = normalizeString(filters.search);

    return users.filter((item) => {
      const matchesSearch =
        !search ||
        normalizeString(item.name).includes(search) ||
        normalizeString(item.email).includes(search) ||
        normalizeString(item.condominium).includes(search) ||
        normalizeString(item.unit).includes(search) ||
        normalizeString(item.location).includes(search) ||
        normalizeString(item.scopeType).includes(search);

      const matchesRole = roleMatchesFilter(item.role, filters.role);
      const matchesScope = scopeMatchesFilter(item.scopeType, filters.scope);

      return matchesSearch && matchesRole && matchesScope;
    });
  }, [users, filters]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((item) => item.role === 'ADMIN').length;
    const operation = users.filter((item) => ['OPERADOR', 'CENTRAL'].includes(item.role)).length;
    const residents = users.filter((item) => item.role === 'MORADOR').length;

    return { total, admins, operation, residents };
  }, [users]);
  const selectedOfficialPermissions = useMemo(
    () => (selectedUser ? getOfficialPermissionsForRole(selectedUser.role, permissionMatrix) : []),
    [permissionMatrix, selectedUser]
  );
  const selectedPermissionSummary = useMemo(
    () => summarizePermissionMatrix(selectedUser?.permissions ?? [], selectedOfficialPermissions),
    [selectedOfficialPermissions, selectedUser]
  );

  const condominiumOptions = useMemo(
    () => condominiums.filter(Boolean).map((item) => ({ id: item.id, name: item.name ?? 'Condomínio sem nome' })),
    [condominiums]
  );
  const allowedRoleOptions = useMemo(() => {
    if (currentUserRole === 'ADMIN') {
      return [
        { value: 'ADMIN' as const, label: 'Admin' },
        { value: 'OPERADOR' as const, label: 'Operação' },
        { value: 'MORADOR' as const, label: 'Morador' },
      ];
    }

    return [
      { value: 'ADMIN' as const, label: 'Admin' },
      { value: 'OPERADOR' as const, label: 'Operação' },
      { value: 'CENTRAL' as const, label: 'Central' },
      { value: 'MORADOR' as const, label: 'Morador' },
    ];
  }, [currentUserRole]);
  const unitOptions = useMemo(
    () =>
      units
        .filter((item): item is typeof item & { condominiumId: string } => Boolean(item && item.condominiumId))
        .map((item) => ({
          id: item.id,
          label:
            [item.condominium?.name, item.structure?.label, item.label].filter(Boolean).join(' / ') ||
            item.legacyUnitId ||
            item.label,
          condominiumId: item.condominiumId,
        })),
    [units]
  );
  const unitLabelById = useMemo(
    () => new Map(unitOptions.map((unit) => [unit.id, unit.label])),
    [unitOptions]
  );
  const residentOptions = useMemo(
    () =>
      (peopleData?.data ?? [])
        .filter(Boolean)
        .filter((person): person is Person & { unitId: string | null } => person.category === 'RESIDENT')
        .map((person) => ({
          id: person.id,
          name: person.name,
          email: person.email,
          document: person.document,
          unitId: person.unitId ?? null,
          unitLabel:
            (person.unitId ? unitLabelById.get(person.unitId) : null) ||
            person.unitName ||
            [person.unit?.condominium?.name, person.unit?.structure?.label, person.unit?.label].filter(Boolean).join(' / ') ||
            null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [peopleData?.data, unitLabelById]
  );

  async function handleCreateUser(form: UserFormData) {
    setSaving(true);
    setSubmitError(null);

    try {
      const effectiveRole =
        currentUserRole === 'ADMIN' && !['ADMIN', 'OPERADOR', 'MORADOR'].includes(form.role)
          ? 'OPERADOR'
          : form.role;
      const effectiveCondominiumId =
        currentUserRole === 'ADMIN'
          ? user.condominiumId ?? null
          : form.condominiumId || null;

      const payload: UserCreateRequest = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: mapUiRoleToApi(effectiveRole),
        condominiumId: effectiveCondominiumId,
        unitId: form.unitId || null,
        unitIds: effectiveRole === 'MORADOR' && form.unitId ? [form.unitId] : undefined,
        personId: effectiveRole === 'MORADOR' ? form.personId || null : undefined,
      };

      await createUser(payload);
      setOpenCreate(false);
      await refetch();
    } catch (createError) {
      setSubmitError(getUserErrorMessage(createError, 'Não foi possível criar o usuário.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUser(form: UserFormData) {
    if (!editingUser || !user) return;

    setSaving(true);
    setSubmitError(null);

    try {
      const effectiveRole =
        currentUserRole === 'ADMIN' && !['ADMIN', 'OPERADOR', 'MORADOR'].includes(form.role)
          ? 'OPERADOR'
          : form.role;
      const effectiveCondominiumId =
        currentUserRole === 'ADMIN'
          ? user.condominiumId ?? null
          : form.condominiumId || null;

      const payload: UserUpdateRequest = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: mapUiRoleToApi(effectiveRole),
        condominiumId: effectiveCondominiumId,
        condominiumIds: effectiveCondominiumId ? [effectiveCondominiumId] : [],
        unitId: form.unitId || null,
        unitIds: effectiveRole === 'MORADOR' && form.unitId ? [form.unitId] : [],
        personId: effectiveRole === 'MORADOR' ? form.personId || null : null,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      await updateUser(editingUser.id, payload);
      setOpenEditHelp(false);
      setEditingUser(null);
      setSelectedUser(null);
      await refetch();
    } catch (updateError) {
      setSubmitError(getUserErrorMessage(updateError, 'Não foi possível editar o usuário.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveUserPassword() {
    if (!selectedUser || !passwordValue.trim()) {
      setPasswordError('Informe a nova senha.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);

    try {
      await updateUser(selectedUser.id, { password: passwordValue });
      setPasswordValue('');
      setOpenPasswordHelp(false);
    } catch (error) {
      setPasswordError(getUserErrorMessage(error, 'Não foi possível salvar a nova senha.'));
    } finally {
      setPasswordSaving(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando usuários...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de usuários" value={isLoading ? '...' : String(stats.total)} subtitle="Registros reais de /users" icon={Users} />
        <StatCard title="Admins" value={isLoading ? '...' : String(stats.admins)} subtitle="Gestão condominial" icon={Shield} />
        <StatCard title="Operação e central" value={isLoading ? '...' : String(stats.operation)} subtitle="Fluxo operacional" icon={BadgeCheck} />
        <StatCard title="Moradores com acesso" value={isLoading ? '...' : String(stats.residents)} subtitle="Usuários residentes" icon={Clock3} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gestão de usuários</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Usuários do sistema</h1>
            <p className="mt-2 text-sm text-slate-400">
              Contas que fazem login na plataforma: administradores, operadores e moradores do app.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateInitialData({});
                setSubmitError(null);
                setOpenCreate(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              <UserPlus className="h-4 w-4" />
              Novo usuário
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateInitialData({
                  role: 'MORADOR',
                  condominiumId: currentUserRole === 'ADMIN' ? user?.condominiumId ?? '' : '',
                });
                setSubmitError(null);
                setOpenCreate(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/20"
            >
              <KeyRound className="h-4 w-4" />
              Criar acesso de morador
            </button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, condomínio, unidade ou escopo..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Shield className="h-4 w-4 text-slate-400" />
            <select
              className="w-full bg-transparent text-sm text-white outline-none"
              value={filters.role}
              onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="">Todos os perfis</option>
              <option value="MASTER">Master</option>
              <option value="PARCEIRO">Parceiro</option>
              <option value="ADMIN">Admin</option>
              <option value="OPERADOR">Operação</option>
              <option value="CENTRAL">Central</option>
              <option value="MORADOR">Morador</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              className="w-full bg-transparent text-sm text-white outline-none"
              value={filters.scope}
              onChange={(e) => setFilters((prev) => ({ ...prev, scope: e.target.value }))}
            >
              <option value="">Todos os escopos</option>
              <option value="GLOBAL">Acesso global</option>
              <option value="escopo atribuido">Escopo atribuído</option>
              <option value="morador">Morador</option>
              <option value="sem restricao definida">Sem restrição definida</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setFilters({ search: '', role: '', scope: '' })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
          >
            Limpar
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        {error ? (
          <EmptyState
            title="Não foi possível carregar os usuários"
            description="Verifique o endpoint /users, autenticação e permissões do perfil atual."
          />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Ajuste os filtros ou crie um novo usuário para este escopo."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-400">
              <div className="col-span-3">Usuário</div>
              <div className="col-span-2">Perfil</div>
              <div className="col-span-2">Abrangencia</div>
              <div className="col-span-3">Localização</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>

            <div className="divide-y divide-white/10">
              {filteredUsers.map((item) => (
                <div key={item.id} className="grid grid-cols-12 items-center px-4 py-4 text-sm">
                  <div className="col-span-3">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{maskEmail(item.email)}</p>
                  </div>

                  <div className="col-span-2">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getRoleBadgeClass(item.role)}`}>
                      <Shield className="h-3.5 w-3.5" />
                      {getRoleLabel(item.role)}
                    </div>
                  </div>

                  <div className="col-span-2 text-slate-300">
                    <p>{item.scopeType}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.permissions.length} permissão(ões)</p>
                    {permissionMatrix.length ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Matriz {getOfficialPermissionsForRole(item.role, permissionMatrix).length || 0}
                      </p>
                    ) : null}
                  </div>

                  <div className="col-span-3 text-slate-300">
                    <p>{item.location || item.condominium || 'Sem localização atribuída'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.unit && item.unit !== item.location ? item.unit : item.condominium || '-'}
                    </p>
                  </div>

                  <div className="col-span-1">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(item);
                        setEditingUser((usersData ?? []).find((candidate) => candidate.id === item.id) ?? null);
                        setSubmitError(null);
                        setOpenEditHelp(true);
                      }}
                      className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/15"
                      aria-label="Editar usuário"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(item);
                        setOpenView(true);
                      }}
                      className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/15"
                      aria-label="Visualizar usuário"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <CrudModal
        open={openCreate}
        title={createInitialData.role === 'MORADOR' ? 'Criar acesso de morador' : 'Novo usuário'}
        description={createInitialData.role === 'MORADOR' ? 'Importe um morador já cadastrado e crie apenas o login do app.' : 'Crie uma conta autenticável via endpoint /users.'}
        onClose={() => {
          setOpenCreate(false);
          setCreateInitialData({});
        }}
        maxWidth="xl"
      >
        {submitError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </div>
        ) : null}

        <UserForm
          key={`${createInitialData.role ?? 'default'}-${createInitialData.personId ?? 'new'}`}
          onSubmit={handleCreateUser}
          onCancel={() => {
            setOpenCreate(false);
            setCreateInitialData({});
          }}
          loading={saving}
          condominiumOptions={
            currentUserRole === 'ADMIN' && user?.condominiumId
              ? condominiumOptions.filter((item) => item.id === user.condominiumId)
              : condominiumOptions
          }
          unitOptions={unitOptions}
          residentOptions={residentOptions}
          roleOptions={allowedRoleOptions}
          condominiumLocked={currentUserRole === 'ADMIN'}
          passwordRequired={true}
          submitLabel="Criar usuário"
          initialData={{
            condominiumId: currentUserRole === 'ADMIN' ? user?.condominiumId ?? '' : '',
            role: allowedRoleOptions[0]?.value ?? 'OPERADOR',
            ...createInitialData,
          }}
        />
      </CrudModal>

      <CrudModal
        open={openView}
        title="Detalhes do usuário"
        description="Resumo do usuário real retornado pela API."
        onClose={() => setOpenView(false)}
        maxWidth="lg"
      >
        {selectedUser ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Nome</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{selectedUser.name}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">E-mail</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{selectedUser.email}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Shield className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Perfil</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{getRoleLabel(selectedUser.role)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <KeyRound className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Permissões</span>
              </div>
              {selectedOfficialPermissions.length ? (
                <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Matriz oficial do perfil</p>
                  <p className="mt-2 text-sm text-white">
                    {selectedOfficialPermissions.length} permissões base para {getRoleLabel(selectedUser.role)}.
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-cyan-50 sm:grid-cols-3">
                    <span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
                      Alinhadas: {selectedPermissionSummary.aligned}
                    </span>
                    <span className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-amber-50">
                      Extras: {selectedPermissionSummary.custom}
                    </span>
                    <span className="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                      Ausentes: {selectedPermissionSummary.missing}
                    </span>
                  </div>
                </div>
              ) : null}
              {selectedUser.permissions.length ? (
                <div className="mt-3 space-y-3">
                  {groupPermissions(selectedUser.permissions).map((group) => (
                    <div key={group.module}>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{group.module}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.labels.map((label) => (
                          <span
                            key={`${group.module}-${label}`}
                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-base font-medium text-white">Sem permissões declaradas</p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Condomínio</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{selectedUser.condominium || 'Não vinculado'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Abrangencia</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{selectedUser.scopeType}</p>
              <button
                type="button"
                onClick={() => setOpenPasswordHelp(true)}
                className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
              >
                Senha do app
              </button>
              <p className="mt-1 text-sm text-slate-400">{selectedUser.location || 'Sem localização atribuída'}</p>
            </div>
          </div>
        ) : null}
      </CrudModal>

      <CrudModal
        open={openPasswordHelp}
        title="Senha do app do morador"
        description="Defina uma nova senha pelo endpoint PATCH /users/{id}."
        onClose={() => {
          setOpenPasswordHelp(false);
          setPasswordValue('');
          setPasswordError(null);
        }}
        maxWidth="lg"
      >
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">{selectedUser?.name ?? 'Usuário selecionado'}</p>
            <p className="mt-1 text-slate-400">{selectedUser?.email ?? 'E-mail não informado'}</p>
          </div>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Nova senha</span>
            <input
              type="password"
              value={passwordValue}
              onChange={(event) => {
                setPasswordValue(event.target.value);
                setPasswordError(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="Digite a nova senha"
            />
          </label>
          {passwordError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {passwordError}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => void handleSaveUserPassword()}
              disabled={passwordSaving || !passwordValue.trim()}
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordSaving ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </div>
        </div>
      </CrudModal>

      <CrudModal
        open={false}
        title="Senha do app do morador"
        description="Reset/reenvio de senha ainda depende de endpoint do backend."
        onClose={() => setOpenPasswordHelp(false)}
        maxWidth="lg"
      >
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
            A API atual já cobre criação e troca administrativa de senha, mas reset assistido e reenvio por e-mail ainda dependem de fechamento adicional do backend.
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">Contrato solicitado ao backend</p>
            <p className="mt-2">POST /api/v1/users/{'{id}'}/password-reset para enviar e-mail de redefinição.</p>
            <p className="mt-1">PATCH /api/v1/users/{'{id}'}/password para admin definir senha temporária.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400 opacity-70">
              Reenviar senha por e-mail
            </button>
            <button type="button" disabled className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 opacity-60">
              Definir senha temporária
            </button>
          </div>
        </div>
      </CrudModal>

      <CrudModal
        open={openEditHelp && Boolean(editingUser)}
        title="Editar usuário"
        description="Atualize os dados reais pelo endpoint PATCH /users/{id}."
        onClose={() => {
          setOpenEditHelp(false);
          setEditingUser(null);
          setSubmitError(null);
        }}
        maxWidth="xl"
      >
        {submitError ? (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </div>
        ) : null}
        {editingUser ? (
          <UserForm
            key={editingUser.id}
            onSubmit={handleUpdateUser}
            onCancel={() => {
              setOpenEditHelp(false);
              setEditingUser(null);
              setSubmitError(null);
            }}
            loading={saving}
            condominiumOptions={
              currentUserRole === 'ADMIN' && user?.condominiumId
                ? condominiumOptions.filter((item) => item.id === user.condominiumId)
                : condominiumOptions
            }
            unitOptions={unitOptions}
            residentOptions={residentOptions}
            roleOptions={allowedRoleOptions}
            condominiumLocked={currentUserRole === 'ADMIN'}
            passwordRequired={false}
            submitLabel="Salvar usuário"
            initialData={{
              name: editingUser.name,
              email: editingUser.email,
              password: '',
              role: mapApiRoleToUi(editingUser.role),
              condominiumId: currentUserRole === 'ADMIN' ? user?.condominiumId ?? '' : editingUser.condominiumId ?? '',
              unitId: editingUser.unitId ?? editingUser.unitIds?.[0] ?? '',
              personId: editingUser.personId ?? '',
            }}
          />
        ) : null}
      </CrudModal>

      <CrudModal
        open={openEditHelp && !editingUser}
        title="Editar usuário"
        description="A tela já está preparada visualmente, mas a API ainda precisa publicar o endpoint de edição."
        onClose={() => setOpenEditHelp(false)}
        maxWidth="lg"
      >
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
            Este ambiente ainda não retornou um contrato de edição utilizável para o usuário selecionado. Quando isso acontecer, o front já está preparado para salvar as alterações.
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">Contrato necessário</p>
            <p className="mt-2">PATCH /api/v1/users/{'{id}'} para editar nome, e-mail, perfil, condomínio, unidade, `unitIds` e `personId`.</p>
            <p className="mt-1">Opcional: PATCH /api/v1/users/{'{id}'}/status para ativar, bloquear ou inativar usuário.</p>
          </div>
          {selectedUser ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Usuário selecionado</p>
              <p className="mt-2 text-white">{selectedUser.name}</p>
              <p className="mt-1 text-slate-400">{selectedUser.email}</p>
            </div>
          ) : null}
        </div>
      </CrudModal>
    </div>
  );
}

