'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/features/http/api-error';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { accessGroupsService } from '@/services/access-groups.service';
import { camerasService } from '@/services/cameras.service';
import { getAllPeople } from '@/services/people.service';
import type { AccessGroup } from '@/types/access-group';
import type { Camera } from '@/types/camera';
import type { Person } from '@/types/person';

type AccessGroupForm = {
  name: string;
  personIds: string[];
  cameraIds: string[];
};

const initialForm: AccessGroupForm = {
  name: '',
  personIds: [],
  cameraIds: [],
};

function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, {
    fallback,
    byStatus: {
      400: 'Confira os dados informados.',
      401: 'Sua sessão expirou. Entre novamente.',
      403: 'Seu perfil não tem permissão para esta ação.',
      404: 'Grupo não encontrado.',
      409: 'Já existe um grupo com dados conflitantes.',
    },
  });
}

function categoryLabel(person: Person) {
  if (person.categoryLabel) return person.categoryLabel;
  if (person.category === 'RESIDENT') return 'Morador';
  if (person.category === 'VISITOR') return 'Visitante';
  if (person.category === 'SERVICE_PROVIDER') return 'Prestador';
  if (person.category === 'RENTER') return 'Locatário';
  return 'Pessoa';
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

export default function AdminAccessGroupsPage() {
  const { isChecking, canAccess } = useProtectedRoute({ allowedRoles: ['ADMIN', 'MASTER'] });
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AccessGroup | null>(null);
  const [form, setForm] = useState<AccessGroupForm>(initialForm);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(normalized));
  }, [groups, search]);

  const filteredPeople = useMemo(() => {
    const normalized = pickerSearch.trim().toLowerCase();
    return people
      .filter((person) => {
        if (!normalized) return true;
        return [person.name, person.document, person.email, person.unitName, categoryLabel(person)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .slice(0, 80);
  }, [people, pickerSearch]);

  const filteredCameras = useMemo(() => {
    const normalized = pickerSearch.trim().toLowerCase();
    return cameras
      .filter((camera) => {
        if (!normalized) return true;
        return [camera.name, camera.location, camera.provider]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .slice(0, 80);
  }, [cameras, pickerSearch]);

  const linkedPeople = groups.reduce((total, group) => total + (group.personIds?.length ?? 0), 0);
  const linkedCameras = groups.reduce((total, group) => total + (group.cameraIds?.length ?? 0), 0);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [groupList, peopleList, cameraList] = await Promise.all([
        accessGroupsService.list(),
        getAllPeople({ limit: 100 }),
        camerasService.list(),
      ]);
      setGroups(groupList);
      setPeople(peopleList.data);
      setCameras(cameraList.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Não foi possível carregar os grupos de acesso.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canAccess) return;
    void loadData();
  }, [canAccess]);

  function openCreateModal() {
    setSelectedGroup(null);
    setForm(initialForm);
    setPickerSearch('');
    setModalOpen(true);
    setError(null);
    setMessage(null);
  }

  function openEditModal(group: AccessGroup) {
    setSelectedGroup(group);
    setForm({
      name: group.name,
      personIds: group.personIds ?? [],
      cameraIds: group.cameraIds ?? [],
    });
    setPickerSearch('');
    setModalOpen(true);
    setError(null);
    setMessage(null);
  }

  async function saveGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        name: form.name.trim(),
        personIds: form.personIds,
        cameraIds: form.cameraIds,
      };

      if (!payload.name) {
        throw new Error('Informe o nome do grupo.');
      }

      if (selectedGroup) {
        await accessGroupsService.update(selectedGroup.id, payload);
        setMessage('Grupo atualizado.');
      } else {
        await accessGroupsService.create(payload);
        setMessage('Grupo criado.');
      }

      setModalOpen(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : getErrorMessage(saveError, 'Não foi possível salvar o grupo.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup(group: AccessGroup) {
    const confirmed = window.confirm(`Remover o grupo "${group.name}"?`);
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    try {
      await accessGroupsService.remove(group.id);
      setMessage('Grupo removido.');
      await loadData();
    } catch (removeError) {
      setError(getErrorMessage(removeError, 'Não foi possível remover o grupo.'));
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
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">Controle de acesso</p>
              <h1 className="mt-2 text-3xl font-semibold">Grupos de acesso</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Organize quem pode ser sincronizado com câmeras, equipamentos faciais e listas de reconhecimento.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={loadData} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button type="button" onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Novo grupo
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader><CardTitle className="text-center text-sm text-slate-300">Grupos</CardTitle></CardHeader>
            <CardContent><p className="text-center text-4xl font-semibold">{groups.length}</p></CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader><CardTitle className="text-center text-sm text-slate-300">Pessoas vinculadas</CardTitle></CardHeader>
            <CardContent><p className="text-center text-4xl font-semibold text-cyan-200">{linkedPeople}</p></CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader><CardTitle className="text-center text-sm text-slate-300">Câmeras vinculadas</CardTitle></CardHeader>
            <CardContent><p className="text-center text-4xl font-semibold text-emerald-300">{linkedCameras}</p></CardContent>
          </Card>
        </section>

        {(message || error) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
            {error || message}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Lista de grupos</h2>
              <p className="text-sm text-slate-400">Cadastre grupos para padronizar sincronização e permissões.</p>
            </div>
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo" className="border-white/10 bg-slate-950 pl-10 text-white" />
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-slate-300">Carregando grupos...</div>
          ) : filteredGroups.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredGroups.map((group) => (
                <article key={group.id} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-cyan-200" />
                        <h3 className="text-lg font-semibold">{group.name}</h3>
                        {group.faceListSyncStatus && <Badge className="bg-cyan-500/15 text-cyan-100">{group.faceListSyncStatus}</Badge>}
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {group.personIds?.length ?? 0} pessoa(s) · {group.cameraIds?.length ?? 0} câmera(s)
                      </p>
                      {group.faceListName && <p className="mt-1 text-sm text-slate-500">Lista facial: {group.faceListName}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => openEditModal(group)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => removeGroup(group)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-slate-300">
              Nenhum grupo encontrado.
            </div>
          )}
        </section>
      </div>

      <CrudModal
        open={modalOpen}
        title={selectedGroup ? 'Editar grupo' : 'Novo grupo'}
        description="Selecione as pessoas e câmeras que fazem parte deste grupo."
        onClose={() => setModalOpen(false)}
        maxWidth="2xl"
      >
        <form onSubmit={saveGroup} className="space-y-5">
          <label className="space-y-1 text-sm text-slate-300">
            Nome do grupo
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="border-white/10 bg-slate-900 text-white" required />
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input value={pickerSearch} onChange={(event) => setPickerSearch(event.target.value)} placeholder="Buscar pessoa, unidade ou câmera" className="border-white/10 bg-slate-900 pl-10 text-white" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Pessoas</h3>
                <Badge className="bg-white/10 text-white">{form.personIds.length}</Badge>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredPeople.map((person) => (
                  <label key={person.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
                    <input type="checkbox" checked={form.personIds.includes(person.id)} onChange={() => setForm({ ...form, personIds: toggleId(form.personIds, person.id) })} className="mt-1" />
                    <span>
                      <span className="block font-medium text-white">{person.name}</span>
                      <span className="text-xs text-slate-400">{categoryLabel(person)} {person.unitName ? `· ${person.unitName}` : ''}</span>
                    </span>
                  </label>
                ))}
                {!filteredPeople.length && <p className="text-sm text-slate-400">Nenhuma pessoa encontrada.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Câmeras</h3>
                <Badge className="bg-white/10 text-white">{form.cameraIds.length}</Badge>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredCameras.map((camera) => (
                  <label key={camera.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
                    <input type="checkbox" checked={form.cameraIds.includes(camera.id)} onChange={() => setForm({ ...form, cameraIds: toggleId(form.cameraIds, camera.id) })} className="mt-1" />
                    <span>
                      <span className="block font-medium text-white">{camera.name}</span>
                      <span className="text-xs text-slate-400">{camera.location || camera.provider || 'Sem localização informada'}</span>
                    </span>
                  </label>
                ))}
                {!filteredCameras.length && <p className="text-sm text-slate-400">Nenhuma câmera encontrada.</p>}
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar grupo'}</Button>
          </div>
        </form>
      </CrudModal>
    </main>
  );
}
