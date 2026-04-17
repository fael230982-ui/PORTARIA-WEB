'use client';

import { useMemo, useState } from 'react';
import { Car, Pencil, Plus, Search, ShieldBan, Trash2 } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { PageContainer } from '@/components/layout/page-container';
import { getCondominiumEnabledModules, getCurrentCondominium, isModuleEnabled } from '@/features/condominiums/condominium-contract';
import { formatVehiclePlate, isValidVehiclePlate, normalizeVehiclePlate } from '@/features/vehicles/plate';
import { useAuth } from '@/hooks/use-auth';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useVehicles } from '@/hooks/use-vehicles';
import { createVehicle, deleteVehicle, updateVehicle } from '@/services/vehicles.service';
import type { Vehicle, VehiclePayload, VehicleStatus, VehicleType } from '@/types/vehicle';

type VehicleFormState = {
  plate: string;
  brand: string;
  model: string;
  color: string;
  type: VehicleType;
  status: VehicleStatus;
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
  tag: '',
  notes: '',
};

const vehicleTypeLabels: Record<VehicleType, string> = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhao',
  outro: 'Outro',
};

const vehicleStatusLabels: Record<VehicleStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  bloqueado: 'Bloqueado',
};

function vehicleToForm(vehicle: Vehicle): VehicleFormState {
  return {
    plate: formatVehiclePlate(vehicle.plate),
    brand: vehicle.brand || '',
    model: vehicle.model || '',
    color: vehicle.color || '',
    type: vehicle.type,
    status: vehicle.status,
    tag: vehicle.tag || '',
    notes: vehicle.notes || '',
  };
}

export default function ResidentVehiclesPage() {
  const { user } = useAuth();
  const activeUnitId = user?.selectedUnitId ?? user?.unitId ?? null;
  const activeUnitLabel = user?.selectedUnitName || user?.unitName || 'Nenhuma unidade selecionada';
  const { condominiums } = useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);
  const currentCondominium = getCurrentCondominium(condominiums, user?.condominiumId);
  const enabledModules = getCondominiumEnabledModules(currentCondominium);
  const vehiclesEnabled = isModuleEnabled(enabledModules, 'vehicles');
  const { data: vehiclesResponse, isLoading, error, refetch } = useVehicles(Boolean(user));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [openForm, setOpenForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormState>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unitVehicles = useMemo(() => {
    const allVehicles = vehiclesResponse?.data ?? [];
    if (!activeUnitId) return [];

    return allVehicles.filter((vehicle) => {
      return vehicle.unitId === activeUnitId || vehicle.unitLabel === activeUnitLabel;
    });
  }, [activeUnitId, activeUnitLabel, vehiclesResponse?.data]);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return unitVehicles.filter((vehicle) => {
      const matchesStatus = statusFilter === 'all' ? true : vehicle.status === statusFilter;
      const matchesSearch = normalizedSearch
        ? [vehicle.plate, vehicle.brand, vehicle.model, vehicle.color, vehicle.tag, vehicle.ownerName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        : true;

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, unitVehicles]);

  const stats = useMemo(() => {
    return {
      total: unitVehicles.length,
      active: unitVehicles.filter((vehicle) => vehicle.status === 'ativo').length,
      blocked: unitVehicles.filter((vehicle) => vehicle.status === 'bloqueado').length,
    };
  }, [unitVehicles]);

  function resetForm() {
    setEditingVehicle(null);
    setForm(defaultForm);
    setFormError(null);
  }

  function openCreate() {
    resetForm();
    setOpenForm(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setForm(vehicleToForm(vehicle));
    setFormError(null);
    setOpenForm(true);
  }

  function setField(field: keyof VehicleFormState, value: string) {
    setFormError(null);
    setMessage(null);
    setForm((current) => ({
      ...current,
      [field]: field === 'plate' ? formatVehiclePlate(value) : value,
    }));
  }

  function buildPayload(): VehiclePayload {
    return {
      plate: normalizeVehiclePlate(form.plate),
      brand: form.brand.trim(),
      model: form.model.trim(),
      color: form.color.trim(),
      type: form.type,
      status: form.status,
      tag: form.tag.trim(),
      notes: form.notes.trim(),
      unitId: activeUnitId ?? undefined,
      unitLabel: activeUnitLabel,
    };
  }

  async function handleSave() {
    if (!activeUnitId) {
      setFormError('Selecione uma unidade ativa antes de cadastrar um veiculo.');
      return;
    }

    if (!isValidVehiclePlate(form.plate)) {
      setFormError('Informe uma placa valida.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setMessage(null);

    try {
      const payload = buildPayload();
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload);
        setMessage(`Veiculo ${payload.plate} atualizado com sucesso.`);
      } else {
        await createVehicle(payload);
        setMessage(`Veiculo ${payload.plate} cadastrado com sucesso.`);
      }

      setOpenForm(false);
      resetForm();
      await refetch();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar o veiculo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    const confirmed = window.confirm(`Remover o veiculo ${vehicle.plate}?`);
    if (!confirmed) return;

    try {
      await deleteVehicle(vehicle.id);
      setMessage(`Veiculo ${vehicle.plate} removido com sucesso.`);
      await refetch();
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : 'Nao foi possivel remover o veiculo.');
    }
  }

  async function handleToggleBlock(vehicle: Vehicle) {
    try {
      await updateVehicle(vehicle.id, {
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        color: vehicle.color,
        type: vehicle.type,
        status: vehicle.status === 'bloqueado' ? 'ativo' : 'bloqueado',
        tag: vehicle.tag,
        notes: vehicle.notes,
        unitId: vehicle.unitId,
      });

      setMessage(
        vehicle.status === 'bloqueado'
          ? `Veiculo ${vehicle.plate} reativado com sucesso.`
          : `Veiculo ${vehicle.plate} bloqueado com sucesso.`
      );
      await refetch();
    } catch (updateError) {
      setMessage(updateError instanceof Error ? updateError.message : 'Nao foi possivel atualizar o veiculo.');
    }
  }

  return (
    <PageContainer
      title="Veiculos"
      description="Cadastre, atualize e acompanhe os veiculos vinculados a sua unidade."
    >
      {!vehiclesEnabled ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          A gestao de veiculos nao esta disponivel para a sua unidade neste momento.
        </div>
      ) : !activeUnitId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          Selecione uma unidade ativa para consultar e cadastrar veiculos.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Veiculos ativos</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.active}</p>
              <p className="mt-1 text-xs text-slate-400">Prontos para uso.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Veiculos bloqueados</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.blocked}</p>
              <p className="mt-1 text-xs text-slate-400">Exigem revisao antes de voltar ao uso.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por placa, marca, modelo ou cor"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'ativo', label: 'Ativos' },
                  { value: 'bloqueado', label: 'Bloqueados' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value as 'all' | VehicleStatus)}
                    className={`rounded-xl px-4 py-2 text-sm transition ${
                      statusFilter === option.value
                        ? 'bg-white text-slate-950'
                        : 'border border-white/10 bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  Novo veiculo
                </button>
              </div>
            </div>

            {message ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                Nao foi possivel carregar os veiculos agora.
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                  Carregando veiculos...
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
                  <Car className="mx-auto h-10 w-10 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-300">Nenhum veiculo encontrado.</p>
                  <p className="mt-1 text-xs text-slate-500">Cadastre o primeiro veiculo da unidade para facilitar a identificacao.</p>
                </div>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-white">{vehicle.plate}</p>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-slate-200">
                            {vehicleStatusLabels[vehicle.status]}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-slate-200">
                            {vehicleTypeLabels[vehicle.type]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          {[vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' • ') || 'Sem detalhes complementares'}
                        </p>
                        {vehicle.tag ? <p className="mt-1 text-xs text-slate-400">Tag ou controle: {vehicle.tag}</p> : null}
                        {vehicle.notes ? <p className="mt-1 text-xs text-slate-500">{vehicle.notes}</p> : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(vehicle)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleBlock(vehicle)}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/15"
                        >
                          <ShieldBan className="h-4 w-4" />
                          {vehicle.status === 'bloqueado' ? 'Reativar' : 'Bloquear'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(vehicle)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-100 transition hover:bg-red-500/15"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <CrudModal
        open={openForm}
        title={editingVehicle ? 'Editar veiculo' : 'Novo veiculo'}
        description="Preencha os dados principais do veiculo vinculado a sua unidade."
        onClose={() => {
          setOpenForm(false);
          resetForm();
        }}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Placa</span>
              <input
                value={form.plate}
                onChange={(event) => setField('plate', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                placeholder="ABC1D23"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Tipo</span>
              <select
                value={form.type}
                onChange={(event) => setField('type', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Marca</span>
              <input
                value={form.brand}
                onChange={(event) => setField('brand', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                placeholder="Ex.: Toyota"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Modelo</span>
              <input
                value={form.model}
                onChange={(event) => setField('model', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                placeholder="Ex.: Corolla"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Cor</span>
              <input
                value={form.color}
                onChange={(event) => setField('color', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                placeholder="Ex.: Prata"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Tag ou controle</span>
              <input
                value={form.tag}
                onChange={(event) => setField('tag', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Observacoes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setField('notes', event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              placeholder="Informacoes adicionais do veiculo"
            />
          </label>

          {editingVehicle ? (
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Situacao</span>
              <select
                value={form.status}
                onChange={(event) => setField('status', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                {Object.entries(vehicleStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {formError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenForm(false);
                resetForm();
              }}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Salvando...' : editingVehicle ? 'Salvar alteracoes' : 'Cadastrar veiculo'}
            </button>
          </div>
        </div>
      </CrudModal>
    </PageContainer>
  );
}
