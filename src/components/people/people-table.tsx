'use client';

import { useMemo, useState } from 'react';
import { CircleOff, Clock3, Filter, Pencil, Phone, Plus, ShieldBan, UserRound } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Badge } from '@/components/ui/badge';
import { PeopleFilters } from '@/components/people/people-filters';
import { maskDocument, maskPhone } from '@/features/legal/data-masking';
import {
  buildAccessEvents,
  buildAccessSummaryByPerson,
  formatAccessDateTime,
} from '@/features/people/access-history';
import { useVisitorDocumentRequirement } from '@/features/people/visitor-document-policy';
import {
  matchesMoradorText,
  normalizeMoradorCategory,
  normalizeMoradorStatus,
  normalizePeople,
  safeText,
} from '@/features/people/morador-normalizers';
import { getPersonStatusBadgeClass } from '@/features/people/status-badges';
import { useAuth } from '@/hooks/use-auth';
import { useAllPeople } from '@/hooks/use-people';
import { useReports } from '@/hooks/use-reports';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { createPerson, updatePerson, updatePersonStatus } from '@/services/people.service';
import type { MoradorRow } from '@/features/people/morador-normalizers';

type ResidentContactForm = {
  name: string;
  email: string;
  phone: string;
  document: string;
  category: 'VISITOR' | 'SERVICE_PROVIDER' | 'DELIVERER' | 'RENTER';
  startDate: string;
  endDate: string;
};

const initialResidentContactForm: ResidentContactForm = {
  name: '',
  email: '',
  phone: '',
  document: '',
  category: 'VISITOR',
  startDate: '',
  endDate: '',
};

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function looksLikeTechnicalUnit(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  return normalized.length > 20 || /^[0-9a-f]{8}-/i.test(normalized);
}

function resolveUserSelectedUnitLabel(user: ReturnType<typeof useAuth>['user'], units: ReturnType<typeof useResidenceCatalog>['units']) {
  if (!user?.selectedUnitId) {
    return user?.selectedUnitName || 'Nenhuma unidade ativa';
  }

  const matchedUnit =
    units.find((unit) => unit.id === user.selectedUnitId) ||
    units.find((unit) => unit.legacyUnitId === user.selectedUnitId);

  if (matchedUnit) {
    return [matchedUnit.condominium?.name, matchedUnit.structure?.label, matchedUnit.label]
      .filter(Boolean)
      .join(' / ');
  }

  const selectedIndex = (user.unitIds ?? []).findIndex((item) => item === user.selectedUnitId);
  if (selectedIndex >= 0) {
    const mappedName = user.unitNames?.[selectedIndex]?.trim();
    if (mappedName) return mappedName;
  }

  return user.selectedUnitName || user.selectedUnitId;
}

function matchesCategory(category: string | undefined, filter: string) {
  if (filter === 'ALL') return true;

  const normalized = normalizeMoradorCategory(category);

  switch (filter) {
    case 'RESIDENT':
      return normalized === 'morador' || normalized === 'proprietario';
    case 'VISITOR':
      return normalized === 'visitante';
    case 'SERVICE_PROVIDER':
      return normalized === 'prestador' || normalized === 'funcionario';
    case 'RENTER':
      return normalized === 'locatario';
    case 'DELIVERER':
      return normalized === 'entregador' || normalized === 'funcionario';
    default:
      return true;
  }
}

function matchesStatus(status: string | undefined, filter: string) {
  if (filter === 'ALL') return true;

  const normalized = normalizeMoradorStatus(status);

  switch (filter) {
    case 'ACTIVE':
      return normalized === 'ativo';
    case 'INACTIVE':
      return normalized === 'inativo' || normalized === 'pendente';
    case 'BLOCKED':
      return normalized === 'bloqueado';
    case 'EXPIRED':
      return normalized === 'vencido';
    default:
      return true;
  }
}

export function PeopleTable() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);
  const [selectedResidentContact, setSelectedResidentContact] = useState<MoradorRow | null>(null);
  const [residentContactForm, setResidentContactForm] = useState<ResidentContactForm>(initialResidentContactForm);
  const { required: visitorDocumentRequired, setRequired: setVisitorDocumentRequired } = useVisitorDocumentRequirement();

  const { data: peopleData, isLoading: peopleLoading, error: peopleError, refetch: refetchPeople } = useAllPeople({ limit: 100 });
  const { data: reportsData } = useReports();
  const { condominiums, streets, units } = useResidenceCatalog();

  const people = useMemo(
    () =>
      normalizePeople(peopleData, {
        condominiums,
        streets,
        units,
      }),
    [condominiums, peopleData, streets, units]
  );

  const accessSummaryByPerson = useMemo(() => {
    const accessEvents = buildAccessEvents(reportsData?.data ?? []);
    return buildAccessSummaryByPerson(accessEvents);
  }, [reportsData]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      return (
        matchesMoradorText(person, search) &&
        matchesCategory(person.categoria, category) &&
        matchesStatus(person.status, status)
      );
    });
  }, [category, people, search, status]);

  const isResidentPortal = user?.role === 'MORADOR';
  const activeResidentUnit = useMemo(
    () => resolveUserSelectedUnitLabel(user, units),
    [units, user]
  );
  const canCreateResidentContacts = Boolean(isResidentPortal && user?.selectedUnitId && !user.requiresUnitSelection);
  const residentScopedPeople = useMemo(() => {
    if (!isResidentPortal || !user?.selectedUnitId) return filteredPeople;
    return filteredPeople.filter((person) => person.unit?.id === user.selectedUnitId || person.unit?.legacyUnitId === user.selectedUnitId || person.unit?.label === user.selectedUnitName || person.unidade === user.selectedUnitName);
  }, [filteredPeople, isResidentPortal, user?.selectedUnitId, user?.selectedUnitName]);

  function fillResidentContactForm(person: MoradorRow) {
    setResidentContactForm({
      name: person.nome,
      email: person.email || '',
      phone: person.telefone || '',
      document: person.documento || '',
      category:
        person.categoria === 'prestador'
          ? 'SERVICE_PROVIDER'
          : person.categoria === 'entregador'
            ? 'DELIVERER'
            : person.categoria === 'locatario'
              ? 'RENTER'
              : 'VISITOR',
      startDate: '',
      endDate: '',
    });
  }

  async function handleCreateResidentContact() {
    if (!user?.selectedUnitId) {
      setCreateError('Selecione uma unidade ativa antes de cadastrar uma pessoa.');
      return;
    }

    setIsSaving(true);
    setCreateError(null);

    try {
      if (residentContactForm.category === 'VISITOR' && visitorDocumentRequired && !residentContactForm.document.trim()) {
        setCreateError('CPF/documento está obrigatório para visitante nesta tela.');
        return;
      }

      const createdPerson = await createPerson({
        name: residentContactForm.name.trim(),
        email: residentContactForm.email.trim() || null,
        phone: residentContactForm.phone.trim() || null,
        document: residentContactForm.document.trim() || null,
        category: residentContactForm.category,
        unitId: user.selectedUnitId,
        startDate: toIsoOrNull(residentContactForm.startDate),
        endDate: toIsoOrNull(residentContactForm.endDate),
      });

      setPageNotice({ tone: 'success', text: `${residentContactForm.name.trim()} cadastrado com sucesso em ${activeResidentUnit}.` });
      setHighlightedPersonId(createdPerson.id);
      setResidentContactForm(initialResidentContactForm);
      setOpenCreateModal(false);
      await refetchPeople();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível cadastrar a pessoa.';
      setCreateError(
        message.includes('403')
          ? 'A unidade ativa não pertence ao vínculo permitido para este morador.'
          : message
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateResidentContact() {
    if (!selectedResidentContact) return;

    setIsSaving(true);
    setCreateError(null);

    try {
      if (residentContactForm.category === 'VISITOR' && visitorDocumentRequired && !residentContactForm.document.trim()) {
        setCreateError('CPF/documento está obrigatório para visitante nesta tela.');
        return;
      }

      await updatePerson(selectedResidentContact.id, {
        name: residentContactForm.name.trim(),
        email: residentContactForm.email.trim() || null,
        phone: residentContactForm.phone.trim() || null,
        document: residentContactForm.document.trim() || null,
        category: residentContactForm.category,
        unitId: user?.selectedUnitId ?? null,
        startDate: toIsoOrNull(residentContactForm.startDate),
        endDate: toIsoOrNull(residentContactForm.endDate),
      });

      setPageNotice({ tone: 'success', text: `${residentContactForm.name.trim()} atualizado com sucesso.` });
      setHighlightedPersonId(selectedResidentContact.id);
      setSelectedResidentContact(null);
      setResidentContactForm(initialResidentContactForm);
      setOpenEditModal(false);
      await refetchPeople();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a pessoa.';
      setCreateError(message.includes('403') ? 'A unidade ativa não pertence ao vínculo permitido para este morador.' : message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleResidentStatus(person: MoradorRow) {
    const nextStatus = normalizeMoradorStatus(person.status) === 'bloqueado' ? 'ACTIVE' : 'BLOCKED';
    setIsUpdatingStatus(person.id);
    setPageNotice(null);
    try {
      await updatePersonStatus(person.id, { status: nextStatus });
      setPageNotice({
        tone: 'success',
        text: nextStatus === 'BLOCKED' ? `${person.nome} bloqueado com sucesso.` : `${person.nome} liberado com sucesso.`,
      });
      setHighlightedPersonId(person.id);
      await refetchPeople();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o status.';
      setPageNotice({ tone: 'error', text: message.includes('403') ? 'A unidade ativa não pertence ao vínculo permitido para este morador.' : message });
    } finally {
      setIsUpdatingStatus(null);
    }
  }

  return (
    <div className="space-y-5">
      {pageNotice ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${pageNotice.tone === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-100'}`}>
          {pageNotice.text}
        </div>
      ) : null}

      {isResidentPortal ? (
        <div className="flex flex-col gap-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Unidade ativa</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{activeResidentUnit}</h2>
            <p className="mt-1 text-sm text-cyan-50/85">
              Cadastros de visitantes, prestadores, entregadores e locatários usam a unidade selecionada nesta sessão.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setPageNotice(null);
              setSelectedResidentContact(null);
              setResidentContactForm(initialResidentContactForm);
              setOpenCreateModal(true);
            }}
            disabled={!canCreateResidentContacts}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Novo cadastro
          </button>
        </div>
      ) : null}

      <PeopleFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        status={status}
        setStatus={setStatus}
      />

      {peopleError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          Não foi possível carregar as pessoas.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Lista de pessoas</h2>
            <p className="text-sm text-slate-400">
              {peopleLoading ? 'Carregando...' : `${residentScopedPeople.length} registro(s) encontrado(s)`}
            </p>
          </div>
          <Filter className="h-5 w-5 text-slate-400" />
        </div>

        {peopleLoading ? (
          <div className="px-5 py-10 text-sm text-slate-300">Carregando pessoas...</div>
        ) : residentScopedPeople.length === 0 ? (
          <div className="px-5 py-10">
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-center">
              <CircleOff className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-base font-medium text-white">Nenhuma pessoa encontrada</h3>
              <p className="mt-1 text-sm text-slate-400">Ajuste a busca ou os filtros.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {residentScopedPeople.map((person) => {
              const accessSummary = accessSummaryByPerson.get(person.id);
              const isHighlighted = highlightedPersonId === person.id;
              const hasUnresolvedUnit = !person.unit && looksLikeTechnicalUnit(person.unidade);
              const isResidentManagedContact =
                isResidentPortal &&
                !!user?.selectedUnitId &&
                normalizeMoradorCategory(person.categoria) !== 'morador' &&
                (person.unit?.id === user.selectedUnitId ||
                  person.unit?.legacyUnitId === user.selectedUnitId ||
                  person.unidade === user.selectedUnitName);

              return (
                <div
                  key={person.id}
                  className={`grid gap-4 px-5 py-4 transition lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.9fr_auto] ${isHighlighted ? 'bg-cyan-500/10' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-2 text-slate-300">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{person.nome}</p>
                        <p className="text-sm text-slate-400">
                          {safeText(person.categoria, 'Pessoa')} • {safeText(person.localizacao, 'Sem localização')}
                        </p>
                        {hasUnresolvedUnit ? (
                          <p className="mt-1 text-xs font-medium text-amber-200">
                            Unidade inconsistente: {person.unidade}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-300">
                    <p>{person.documento?.trim() ? maskDocument(person.documento) : 'Sem documento'}</p>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="h-4 w-4" />
                      <span>{person.telefone?.trim() ? maskPhone(person.telefone) : 'Sem telefone'}</span>
                    </div>
                  </div>

                  <div>
                    <Badge className={getPersonStatusBadgeClass(person.status)}>
                      {safeText(person.status, 'ativo')}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock3 className="h-4 w-4" />
                      <span>Última entrada</span>
                    </div>
                    <p className="text-white">{formatAccessDateTime(accessSummary?.entryAt)}</p>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock3 className="h-4 w-4" />
                      <span>Última saída</span>
                    </div>
                    <p className="text-white">{formatAccessDateTime(accessSummary?.exitAt)}</p>
                  </div>

                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {isResidentManagedContact ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateError(null);
                            setPageNotice(null);
                            setSelectedResidentContact(person);
                            fillResidentContactForm(person);
                            setOpenEditModal(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleResidentStatus(person)}
                          disabled={isUpdatingStatus === person.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-60"
                        >
                          <ShieldBan className="h-3.5 w-3.5" />
                          {isUpdatingStatus === person.id
                            ? 'Atualizando...'
                            : normalizeMoradorStatus(person.status) === 'bloqueado'
                              ? 'Liberar'
                              : 'Bloquear'}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CrudModal
        open={openCreateModal}
        title="Novo cadastro da unidade"
        description="O cadastro será criado na unidade ativa selecionada pelo morador."
        onClose={() => {
          setOpenCreateModal(false);
          setCreateError(null);
          setResidentContactForm(initialResidentContactForm);
        }}
        maxWidth="lg"
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await handleCreateResidentContact();
          }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade vinculada</p>
            <p className="mt-2 text-sm text-white">{activeResidentUnit}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Nome</span>
              <input
                value={residentContactForm.name}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Nome completo"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Categoria</span>
              <select
                value={residentContactForm.category}
                onChange={(event) =>
                  setResidentContactForm((current) => ({
                    ...current,
                    category: event.target.value as ResidentContactForm['category'],
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="VISITOR">Visitante</option>
                <option value="SERVICE_PROVIDER">Prestador</option>
                <option value="DELIVERER">Entregador</option>
                <option value="RENTER">Locatário</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Documento</span>
              <input
                value={residentContactForm.document}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, document: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="CPF ou documento"
              />
              {residentContactForm.category === 'VISITOR' ? (
                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={visitorDocumentRequired}
                    onChange={(event) => setVisitorDocumentRequired(event.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>Exigir CPF/documento para visitante nesta tela.</span>
                </label>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Telefone</span>
              <input
                value={residentContactForm.phone}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Telefone"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">E-mail</span>
              <input
                type="email"
                value={residentContactForm.email}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="email@exemplo.com"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Início previsto</span>
              <input
                type="datetime-local"
                value={residentContactForm.startDate}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, startDate: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Fim previsto</span>
              <input
                type="datetime-local"
                value={residentContactForm.endDate}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, endDate: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>

          {createError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {createError}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenCreateModal(false);
                setCreateError(null);
                setResidentContactForm(initialResidentContactForm);
              }}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !canCreateResidentContacts}
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Salvando...' : 'Cadastrar pessoa'}
            </button>
          </div>
        </form>
      </CrudModal>

      <CrudModal
        open={openEditModal}
        title="Editar cadastro da unidade"
        description="Atualize os dados do contato vinculado à unidade ativa."
        onClose={() => {
          setOpenEditModal(false);
          setSelectedResidentContact(null);
          setCreateError(null);
          setResidentContactForm(initialResidentContactForm);
        }}
        maxWidth="lg"
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await handleUpdateResidentContact();
          }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade vinculada</p>
            <p className="mt-2 text-sm text-white">{activeResidentUnit}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Nome</span>
              <input
                value={residentContactForm.name}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Nome completo"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Categoria</span>
              <select
                value={residentContactForm.category}
                onChange={(event) =>
                  setResidentContactForm((current) => ({
                    ...current,
                    category: event.target.value as ResidentContactForm['category'],
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="VISITOR">Visitante</option>
                <option value="SERVICE_PROVIDER">Prestador</option>
                <option value="DELIVERER">Entregador</option>
                <option value="RENTER">Locatário</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Documento</span>
              <input
                value={residentContactForm.document}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, document: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="CPF ou documento"
              />
              {residentContactForm.category === 'VISITOR' ? (
                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={visitorDocumentRequired}
                    onChange={(event) => setVisitorDocumentRequired(event.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>Exigir CPF/documento para visitante nesta tela.</span>
                </label>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Telefone</span>
              <input
                value={residentContactForm.phone}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Telefone"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">E-mail</span>
              <input
                type="email"
                value={residentContactForm.email}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="email@exemplo.com"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Início previsto</span>
              <input
                type="datetime-local"
                value={residentContactForm.startDate}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, startDate: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Fim previsto</span>
              <input
                type="datetime-local"
                value={residentContactForm.endDate}
                onChange={(event) => setResidentContactForm((current) => ({ ...current, endDate: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>

          {createError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {createError}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenEditModal(false);
                setSelectedResidentContact(null);
                setCreateError(null);
                setResidentContactForm(initialResidentContactForm);
              }}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !canCreateResidentContacts}
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}
