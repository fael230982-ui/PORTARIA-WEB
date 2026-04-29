'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Button } from '@/components/ui/button';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAllPeople } from '@/hooks/use-people';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useVehicles } from '@/hooks/use-vehicles';
import {
  detectVehiclePlateFormat,
  formatVehiclePlate,
  getVehiclePlateFormatLabel,
  isValidVehiclePlate,
  normalizeVehiclePlate,
} from '@/features/vehicles/plate';
import { createVehicle, deleteVehicle, lookupVehiclePlate, updateVehicle } from '@/services/vehicles.service';
import type { Unit } from '@/types/condominium';
import type { Person } from '@/types/person';
import type { Vehicle, VehiclePayload, VehicleStatus, VehicleType } from '@/types/vehicle';

type VehicleFormState = {
  plate: string;
  brand: string;
  model: string;
  color: string;
  type: VehicleType;
  status: VehicleStatus;
  ownerId: string;
  unitId: string;
  tag: string;
  notes: string;
};

const defaultForm: VehicleFormState = {
  plate: '',
  brand: '',
  model: '',
  color: '',
  type: 'carro',
  status: 'ativo',
  ownerId: '',
  unitId: '',
  tag: '',
  notes: '',
};

const vehicleTypeLabels: Record<VehicleType, string> = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhão',
  outro: 'Outro',
};

const vehicleStatusLabels: Record<VehicleStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  bloqueado: 'Bloqueado',
};

const VEHICLES_SNAPSHOT_STORAGE_KEY = 'admin-vehicles-snapshot';

function normalizeSearch(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatUnitLabel(unit: Unit | null) {
  if (!unit) return '';
  return [
    unit.condominium?.name ?? unit.condominiumName,
    unit.structure?.label ?? unit.structureLabel,
    unit.label,
  ].filter(Boolean).join(' / ') || unit.label;
}

function vehicleToForm(vehicle: Vehicle): VehicleFormState {
  return {
    plate: formatVehiclePlate(vehicle.plate),
    brand: vehicle.brand,
    model: vehicle.model,
    color: vehicle.color,
    type: vehicle.type,
    status: vehicle.status,
    ownerId: vehicle.ownerId ?? '',
    unitId: vehicle.unitId ?? '',
    tag: vehicle.tag ?? '',
    notes: vehicle.notes ?? '',
  };
}

function getVehicleErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function VehicleForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  units,
  people,
  loading,
  lookupLoading,
  lookupMessage,
  onPlateLookup,
}: {
  value: VehicleFormState;
  onChange: (field: keyof VehicleFormState, nextValue: string) => void;
  onSubmit: () => Promise<void> | void;
  onCancel: () => void;
  units: Unit[];
  people: Person[];
  loading: boolean;
  lookupLoading: boolean;
  lookupMessage: string | null;
  onPlateLookup: () => Promise<void> | void;
}) {
  const peopleOptions = useMemo(
    () => people.filter((person) => !value.unitId || person.unitId === value.unitId),
    [people, value.unitId]
  );
  const plateFormat = detectVehiclePlateFormat(value.plate);
  const plateHintClass =
    plateFormat === 'invalid'
      ? 'text-red-300'
      : plateFormat === 'old' || plateFormat === 'mercosul'
        ? 'text-emerald-300'
        : 'text-slate-500';

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
          <span className="text-sm text-slate-300">Placa</span>
          <div className="flex gap-2">
            <input
              value={value.plate}
              onChange={(event) => onChange('plate', event.target.value)}
              maxLength={8}
              autoCapitalize="characters"
              inputMode="text"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="ABC-1234 ou ABC1D23"
              required
            />
            <button
              type="button"
              onClick={onPlateLookup}
              disabled={lookupLoading || !isValidVehiclePlate(value.plate)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lookupLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          <p className={`text-xs ${plateHintClass}`}>
            {getVehiclePlateFormatLabel(value.plate)}
          </p>
          {lookupMessage ? (
            <p className="text-xs text-cyan-200">{lookupMessage}</p>
          ) : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Tipo</span>
          <select
            value={value.type}
            onChange={(event) => onChange('type', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            {Object.entries(vehicleTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Marca</span>
          <input
            value={value.brand}
            onChange={(event) => onChange('brand', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Toyota"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Modelo</span>
          <input
            value={value.model}
            onChange={(event) => onChange('model', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Corolla"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Cor</span>
          <input
            value={value.color}
            onChange={(event) => onChange('color', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Prata"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Status</span>
          <select
            value={value.status}
            onChange={(event) => onChange('status', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            {Object.entries(vehicleStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Unidade vinculada</span>
          <select
            value={value.unitId}
            onChange={(event) => onChange('unitId', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            required
          >
            <option value="">Selecione uma unidade</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Responsável</span>
          <select
            value={value.ownerId}
            onChange={(event) => onChange('ownerId', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="">Sem responsável específico</option>
            {peopleOptions.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Tag / credencial</span>
          <input
            value={value.tag}
            onChange={(event) => onChange('tag', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Opcional"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-slate-300">Observações</span>
          <textarea
            value={value.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Informações úteis para portaria"
          />
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Salvando...' : 'Salvar veículo'}
        </button>
      </div>
    </form>
  );
}

export default function AdminVeiculosPage() {
  const router = useRouter();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'GERENTE', 'MASTER'],
  });
  const { units } = useResidenceCatalog(Boolean(user), ['ADMIN', 'GERENTE'].includes(user.role) ? user.condominiumId ?? undefined : undefined);
  const { data: peopleData } = useAllPeople({ limit: 200, enabled: Boolean(user) });
  const { data: vehiclesData, isLoading, error, refetch } = useVehicles(Boolean(user));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [issueFilter, setIssueFilter] = useState<'all' | 'invalid-plate' | 'duplicates' | 'without-unit'>('all');
  const [openForm, setOpenForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [handledInitialQuery, setHandledInitialQuery] = useState(false);
  const [snapshotVehicles, setSnapshotVehicles] = useState<Vehicle[]>([]);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(null);
  const [activeUnitId, setActiveUnitId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('unitId') ?? '';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(VEHICLES_SNAPSHOT_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        data?: Vehicle[];
        updatedAt?: string;
      };

      setSnapshotVehicles(Array.isArray(parsed.data) ? parsed.data : []);
      setSnapshotUpdatedAt(typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null);
    } catch {
      setSnapshotVehicles([]);
      setSnapshotUpdatedAt(null);
    }
  }, []);

  const people = useMemo(() => peopleData?.data ?? [], [peopleData?.data]);
  const vehicles = useMemo(() => vehiclesData?.data ?? [], [vehiclesData?.data]);
  const usingSnapshot = Boolean(error && snapshotVehicles.length > 0);
  const visibleVehicles = usingSnapshot ? snapshotVehicles : vehicles;

  useEffect(() => {
    if (typeof window === 'undefined' || vehicles.length === 0) return;

    const payload = {
      data: vehicles,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(VEHICLES_SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
    setSnapshotVehicles(vehicles);
    setSnapshotUpdatedAt(payload.updatedAt);
  }, [vehicles]);

  const allowedCondominiumIds = useMemo(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'GERENTE') return [];
    return [user.condominiumId, ...(user.condominiumIds ?? [])].filter(Boolean) as string[];
  }, [user?.condominiumId, user?.condominiumIds, user?.role]);
  const allowedUnitIds = useMemo(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'GERENTE') return [];
    return [user.unitId, ...(user.unitIds ?? [])].filter(Boolean) as string[];
  }, [user?.role, user?.unitId, user?.unitIds]);
  const scopedUnits = useMemo(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'GERENTE') return units;
    if (allowedUnitIds.length > 0) {
      return units.filter((unit) => allowedUnitIds.includes(unit.id) || Boolean(unit.legacyUnitId && allowedUnitIds.includes(unit.legacyUnitId)));
    }
    if (allowedCondominiumIds.length === 0) return [];
    return units.filter((unit) => unit.condominiumId && allowedCondominiumIds.includes(unit.condominiumId));
  }, [allowedCondominiumIds, allowedUnitIds, units, user?.role]);
  const unitsById = useMemo(() => new Map(scopedUnits.map((unit) => [unit.id, unit])), [scopedUnits]);
  const activeUnit = activeUnitId ? unitsById.get(activeUnitId) ?? null : null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const duplicatePlateSet = useMemo(() => {
    const counts = new Map<string, number>();
    visibleVehicles.forEach((vehicle) => {
      const plate = normalizeVehiclePlate(vehicle.plate);
      if (!plate) return;
      counts.set(plate, (counts.get(plate) ?? 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([plate]) => plate));
  }, [visibleVehicles]);

  const filteredVehicles = useMemo(() => {
    const query = normalizeSearch(search);
    const unitScoped = activeUnitId
      ? visibleVehicles.filter((vehicle) => vehicle.unitId === activeUnitId || vehicle.unitLabel === activeUnitId)
      : visibleVehicles;

    return unitScoped.filter((vehicle) => {
      const normalizedPlate = normalizeVehiclePlate(vehicle.plate);
      const statusOk = statusFilter === 'all' || vehicle.status === statusFilter;
      const issueOk =
        issueFilter === 'all' ||
        (issueFilter === 'invalid-plate' && !isValidVehiclePlate(vehicle.plate)) ||
        (issueFilter === 'duplicates' && duplicatePlateSet.has(normalizedPlate)) ||
        (issueFilter === 'without-unit' && !vehicle.unitId);
      const searchOk =
        !query ||
        [
        vehicle.plate,
        vehicle.brand,
        vehicle.model,
        vehicle.color,
        vehicle.type,
        vehicle.status,
        vehicle.ownerName,
        vehicle.unitLabel,
        vehicle.tag,
      ]
        .filter(Boolean)
        .some((value) => normalizeSearch(value).includes(query));

      return statusOk && issueOk && searchOk;
    });
  }, [activeUnitId, duplicatePlateSet, issueFilter, search, statusFilter, visibleVehicles]);

  const stats = useMemo(() => ({
    total: visibleVehicles.length,
    active: visibleVehicles.filter((vehicle) => vehicle.status === 'ativo').length,
    blocked: visibleVehicles.filter((vehicle) => vehicle.status === 'bloqueado').length,
    invalid: visibleVehicles.filter((vehicle) => !isValidVehiclePlate(vehicle.plate)).length,
    duplicates: duplicatePlateSet.size,
    withoutUnit: visibleVehicles.filter((vehicle) => !vehicle.unitId).length,
  }), [duplicatePlateSet.size, visibleVehicles]);

  useEffect(() => {
    if (handledInitialQuery || scopedUnits.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const unitId = params.get('unitId');
    if (!unitId) {
      setHandledInitialQuery(true);
      return;
    }

    const unit = unitsById.get(unitId);
    if (!unit) {
      setHandledInitialQuery(true);
      return;
    }

    setForm({
      ...defaultForm,
      unitId: unit.id,
    });
    setActiveUnitId(unit.id);
    setSearch((current) => current || formatUnitLabel(unit));

    if (params.get('new') === '1') {
      setOpenForm(true);
    }

    setHandledInitialQuery(true);
  }, [handledInitialQuery, scopedUnits.length, unitsById]);

  function setField(field: keyof VehicleFormState, nextValue: string) {
    setFormError(null);
    setMessage(null);
    if (field === 'plate') {
      setLookupMessage(null);
    }
    const normalizedValue = field === 'plate' ? formatVehiclePlate(nextValue) : nextValue;

    setForm((current) => ({
      ...current,
      [field]: normalizedValue,
      ...(field === 'unitId' ? { ownerId: '' } : null),
    }));
  }

  async function handlePlateLookup() {
    if (!isValidVehiclePlate(form.plate)) {
      setFormError('Informe uma placa válida antes de buscar os dados.');
      return;
    }

    setLookupLoading(true);
    setLookupMessage(null);
    setFormError(null);

    try {
      const response = await lookupVehiclePlate(normalizeVehiclePlate(form.plate));
      const vehicle = response.data;
      const details = [
        vehicle.year ? `Ano: ${vehicle.year}` : null,
        vehicle.city || vehicle.state ? `Local: ${[vehicle.city, vehicle.state].filter(Boolean).join('/')}` : null,
        vehicle.situation ? `Situação: ${vehicle.situation}` : null,
        vehicle.stolen === true ? 'Alerta: possível roubo/furto' : null,
      ].filter(Boolean);

      setForm((current) => ({
        ...current,
        plate: formatVehiclePlate(vehicle.plate || current.plate),
        brand: vehicle.brand || current.brand,
        model: vehicle.model || current.model,
        color: vehicle.color || current.color,
        type: vehicle.type || current.type,
        notes: details.length ? [current.notes, details.join(' | ')].filter(Boolean).join('\n') : current.notes,
      }));

      setLookupMessage(`Dados preenchidos${vehicle.source ? ` via ${vehicle.source}` : ''}.`);
    } catch (lookupError) {
      setLookupMessage(null);
      setFormError(getVehicleErrorMessage(lookupError, 'Não foi possível consultar a placa agora.'));
    } finally {
      setLookupLoading(false);
    }
  }

  function openCreateForm() {
    setEditingVehicle(null);
    setForm(defaultForm);
    setFormError(null);
    setOpenForm(true);
  }

  function openEditForm(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setForm(vehicleToForm(vehicle));
    setFormError(null);
    setOpenForm(true);
  }

  function buildPayload(): VehiclePayload {
    const unit = unitsById.get(form.unitId);
    const owner = form.ownerId ? peopleById.get(form.ownerId) : null;

    return {
      plate: normalizeVehiclePlate(form.plate),
      brand: form.brand,
      model: form.model,
      color: form.color,
      type: form.type,
      status: form.status,
      ownerId: owner?.id || undefined,
      ownerName: owner?.name || undefined,
      unitId: unit?.id ?? form.unitId,
      unitLabel: unit?.label ?? '',
      structureLabel: unit?.structure?.label ?? '',
      condominiumName: unit?.condominium?.name ?? '',
      tag: form.tag,
      notes: form.notes,
    };
  }

  async function handleSaveVehicle() {
    if (!isValidVehiclePlate(form.plate)) {
      setFormError('Informe uma placa válida: ABC-1234 para placa antiga ou ABC1D23 para Mercosul.');
      return;
    }

    if (!form.unitId) {
      setFormError('Selecione uma unidade para vincular o veículo.');
      return;
    }

    const normalizedPlate = normalizeVehiclePlate(form.plate);
    const duplicated = visibleVehicles.some((vehicle) => vehicle.id !== editingVehicle?.id && normalizeVehiclePlate(vehicle.plate) === normalizedPlate);
    if (duplicated) {
      setFormError('Já existe outro veículo cadastrado com esta placa.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setMessage(null);

    try {
      const payload = buildPayload();
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload);
        setMessage('Veículo atualizado com sucesso.');
      } else {
        await createVehicle(payload);
        setMessage('Veículo cadastrado e vinculado com sucesso.');
      }

      setOpenForm(false);
      setEditingVehicle(null);
      setForm(defaultForm);
      await refetch();
    } catch (saveError) {
      setFormError(getVehicleErrorMessage(saveError, 'Não foi possível salvar o veículo.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm(`Remover veículo ${vehicle.plate}`);
    if (!confirmed) return;

    setMessage(null);
    setFormError(null);

    try {
      await deleteVehicle(vehicle.id);
      setMessage('Veículo removido com sucesso.');
      await refetch();
    } catch (deleteError) {
      setMessage(getVehicleErrorMessage(deleteError, 'Não foi possível remover o veículo.'));
    }
  }

  function openDeleteVehicleDialog(vehicle: Vehicle) {
    setDeleteTarget(vehicle);
  }

  async function confirmDeleteVehicleDialog() {
    if (!deleteTarget) return;

    setMessage(null);
    setFormError(null);
    setDeleting(true);

    try {
      await deleteVehicle(deleteTarget.id);
      setMessage('Veículo removido com sucesso.');
      setDeleteTarget(null);
      await refetch();
    } catch (deleteError) {
      setMessage(getVehicleErrorMessage(deleteError, 'Não foi possível remover o veículo.'));
    } finally {
      setDeleting(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando veículos...
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
            <h1 className="mt-2 text-2xl font-semibold">Veículos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Cadastre placas, responsáveis e unidade para aparecerem no resumo da unidade e apoiar a portaria.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-950 hover:bg-slate-200">
              <Plus className="h-4 w-4" />
              Novo veículo
            </Button>
            <Button variant="outline" onClick={() => refetch()} className="inline-flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      {usingSnapshot ? (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Mostrando a última atualização disponível de veículos. O servidor está instável agora, então novos cadastros e exclusões podem demorar para aparecer.
          {snapshotUpdatedAt ? ` Última sincronização: ${new Date(snapshotUpdatedAt).toLocaleString('pt-BR')}.` : ''}
        </div>
      ) : null}

      {!usingSnapshot && error ? (
        <div className="rounded-3xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {getVehicleErrorMessage(error, 'Não foi possível carregar os veículos agora.')}
        </div>
      ) : null}

      {activeUnitId ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-sm text-cyan-50 md:flex-row md:items-center md:justify-between">
          <span>Filtro ativo: {formatUnitLabel(activeUnit) || 'Unidade filtrada'}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(activeUnitId)}`); }} className="rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-medium text-cyan-50 transition hover:bg-cyan-200/20">
              Abrir unidade
            </button>
            <button type="button" onClick={() => { router.push('/admin/veiculos'); }} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15">
              Limpar filtro
            </button>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Total</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.total}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Ativos</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.active}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Bloqueados</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.blocked}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button type="button" onClick={() => setIssueFilter(issueFilter === 'invalid-plate' ? 'all' : 'invalid-plate')} className={`rounded-3xl border p-5 text-left transition ${issueFilter === 'invalid-plate' ? 'border-amber-400/40 bg-amber-400/15 text-amber-50' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
          <p className="text-sm text-slate-300">Placas inválidas</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.invalid}</p>
        </button>
        <button type="button" onClick={() => setIssueFilter(issueFilter === 'duplicates' ? 'all' : 'duplicates')} className={`rounded-3xl border p-5 text-left transition ${issueFilter === 'duplicates' ? 'border-red-400/40 bg-red-400/15 text-red-50' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
          <p className="text-sm text-slate-300">Placas duplicadas</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.duplicates}</p>
        </button>
        <button type="button" onClick={() => setIssueFilter(issueFilter === 'without-unit' ? 'all' : 'without-unit')} className={`rounded-3xl border p-5 text-left transition ${issueFilter === 'without-unit' ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-50' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
          <p className="text-sm text-slate-300">Sem unidade</p>
          <p className="mt-2 text-center text-2xl font-semibold tabular-nums">{isLoading ? '...' : stats.withoutUnit}</p>
        </button>
      </section>

      {message ? (
        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-sm text-cyan-100">{message}</div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">Não foi possível carregar os veículos.</div>
      ) : null}

      {(user.role === 'ADMIN' || user.role === 'GERENTE') && !scopedUnits.length ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          Não encontramos unidades liberadas para o seu acesso. Para cadastrar veículos, este administrador precisa estar vinculado às unidades corretas.
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por placa, modelo, unidade, responsável ou tag..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
            <option value="all">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="bloqueado">Bloqueados</option>
          </select>
          <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setIssueFilter('all'); }} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-12 bg-white/5 px-5 py-3 text-xs uppercase tracking-[0.16em] text-slate-400">
          <div className="col-span-3">Veículo</div>
          <div className="col-span-3">Unidade</div>
          <div className="col-span-2">Responsável</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        <div className="divide-y divide-white/10">
          {filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="grid grid-cols-12 items-center gap-3 px-5 py-4 text-sm">
              <div className="col-span-3">
                <p className="font-semibold text-white">{vehicle.plate}</p>
                <p className="mt-1 text-xs text-slate-400">{[vehicleTypeLabels[vehicle.type], vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' | ')}</p>
              </div>
              <div className="col-span-3 text-slate-300">{(vehicle.condominiumName || vehicle.structureLabel || vehicle.unitLabel) ? [vehicle.condominiumName, vehicle.structureLabel, vehicle.unitLabel].filter(Boolean).join(' / ') : 'Sem unidade'}</div>
              <div className="col-span-2 text-slate-300">{vehicle.ownerName || 'Sem responsável'}</div>
              <div className="col-span-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs ${vehicle.status === 'bloqueado' ? 'border-red-500/30 bg-red-500/10 text-red-100' : vehicle.status === 'ativo' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                  {vehicleStatusLabels[vehicle.status]}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                {vehicle.unitId ? (
                  <button type="button" onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(vehicle.unitId ?? '')}`); }} className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25">
                    Unidade
                  </button>
                ) : null}
                <button type="button" onClick={() => openEditForm(vehicle)} className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/15" aria-label="Editar veículo">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => openDeleteVehicleDialog(vehicle)} className="rounded-lg bg-red-500/15 p-2 text-red-100 transition hover:bg-red-500/25" aria-label="Remover veículo">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {!filteredVehicles.length ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Nenhum veículo encontrado.
            </div>
          ) : null}
        </div>
      </section>

      <CrudModal
        open={openForm}
        title={editingVehicle ? 'Editar veículo' : 'Novo veículo'}
        description="Vincule o veículo a uma unidade existente. O vínculo aparecerá no resumo da unidade."
        onClose={() => {
          setOpenForm(false);
          setEditingVehicle(null);
          setForm(defaultForm);
          setFormError(null);
        }}
        maxWidth="xl"
      >
        {formError ? (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{formError}</div>
        ) : null}
        <VehicleForm
          value={form}
          onChange={setField}
          onSubmit={handleSaveVehicle}
          onCancel={() => {
            setOpenForm(false);
            setEditingVehicle(null);
            setForm(defaultForm);
            setFormError(null);
          }}
          loading={saving}
          lookupLoading={lookupLoading}
          lookupMessage={lookupMessage}
          onPlateLookup={handlePlateLookup}
          units={scopedUnits}
          people={people}
        />
      </CrudModal>

      <CrudModal
        open={Boolean(deleteTarget)}
        title="Excluir veículo"
        description="Confirme se deseja remover este veículo do cadastro."
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
        }}
        maxWidth="md"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteVehicleDialog()}
              disabled={deleting}
              className="rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Excluindo...' : 'Excluir veículo'}
            </button>
          </>
        )}
      >
        {deleteTarget ? (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Veículo selecionado</p>
              <p className="mt-2 text-lg font-semibold text-white">{deleteTarget.plate}</p>
              <p className="mt-1 text-slate-400">
                {[vehicleTypeLabels[deleteTarget.type], deleteTarget.brand, deleteTarget.model, deleteTarget.color].filter(Boolean).join(' / ') || 'Sem detalhes complementares'}
              </p>
              <p className="mt-2 text-slate-400">
                {[deleteTarget.condominiumName, deleteTarget.structureLabel, deleteTarget.unitLabel].filter(Boolean).join(' / ') || 'Sem unidade vinculada'}
              </p>
            </div>
            <p className="text-slate-400">Esta ação remove o veículo da lista e do vínculo com a unidade.</p>
          </div>
        ) : null}
      </CrudModal>
    </div>
  );
}


