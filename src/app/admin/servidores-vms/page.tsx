'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { vmsServersService } from '@/services/vms-servers.service';
import type { VmsServer, VmsServerAuthType, VmsServerPayload, VmsServerStatus, VmsServerVendor } from '@/types/vms-server';

type FormState = {
  name: string;
  vendor: VmsServerVendor;
  baseUrl: string;
  apiToken: string;
  authType: VmsServerAuthType;
  verifySsl: boolean;
  timeoutSeconds: string;
  status: VmsServerStatus;
};

const initialForm: FormState = {
  name: '',
  vendor: 'INCORESOFT',
  baseUrl: '',
  apiToken: '',
  authType: 'API_TOKEN',
  verifySsl: false,
  timeoutSeconds: '45',
  status: 'ONLINE',
};

const VMS_SERVERS_STORAGE_KEY = 'admin-vms-servers-snapshot';

function toNullable(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function buildPayload(form: FormState): VmsServerPayload {
  return {
    name: form.name.trim(),
    vendor: form.vendor,
    baseUrl: toNullable(form.baseUrl),
    apiToken: toNullable(form.apiToken),
    authType: form.authType,
    verifySsl: form.verifySsl,
    timeoutSeconds: Number(form.timeoutSeconds) || 45,
    status: form.status,
  };
}

function readCachedVmsServers() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(VMS_SERVERS_STORAGE_KEY);
    const cached = raw ? (JSON.parse(raw) as VmsServer[]) : [];
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

export default function AdminVmsServersPage() {
  const { canAccess, isChecking } = useProtectedRoute({ allowedRoles: ['ADMIN', 'MASTER'] });
  useAuth();
  const [servers, setServers] = useState<VmsServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingServer, setEditingServer] = useState<VmsServer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return servers;
    return servers.filter((server) =>
      [server.name, server.vendor, server.baseUrl, server.operationMode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [search, servers]);

  async function loadServers(options?: { silentOnError?: boolean }) {
    setLoading(true);
    if (!options?.silentOnError) {
      setError(null);
    }

    try {
      setServers(await vmsServersService.list());
    } catch {
      if (!options?.silentOnError) {
        setError('Não foi possível carregar os servidores VMS agora.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canAccess) return;

    const cached = readCachedVmsServers();
    if (cached.length > 0) {
      setServers(cached);
      setLoading(false);
    }

    void loadServers({ silentOnError: cached.length > 0 });
  }, [canAccess]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (servers.length > 0) {
        window.localStorage.setItem(VMS_SERVERS_STORAGE_KEY, JSON.stringify(servers));
      } else {
        window.localStorage.removeItem(VMS_SERVERS_STORAGE_KEY);
      }
    } catch {
      // Ignore local cache errors.
    }
  }, [servers]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      if (editingServer) {
        const updatedServer = await vmsServersService.update(editingServer.id, buildPayload(form));
        setServers((current) => current.map((server) => (server.id === updatedServer.id ? updatedServer : server)));
        setMessage('Servidor VMS atualizado.');
      } else {
        const createdServer = await vmsServersService.create(buildPayload(form));
        setServers((current) => [createdServer, ...current.filter((server) => server.id !== createdServer.id)]);
        setMessage('Servidor VMS cadastrado.');
      }
      setModalOpen(false);
      setForm(initialForm);
      setEditingServer(null);
      void loadServers({ silentOnError: true });
    } catch {
      setError('Não foi possível salvar o servidor VMS.');
    } finally {
      setSaving(false);
    }
  }

  function openCreateModal() {
    setEditingServer(null);
    setForm(initialForm);
    setModalOpen(true);
    setMessage(null);
    setError(null);
  }

  function openEditModal(server: VmsServer) {
    setEditingServer(server);
    setForm({
      name: server.name ?? '',
      vendor: server.vendor ?? 'INCORESOFT',
      baseUrl: server.baseUrl ?? '',
      apiToken: '',
      authType: server.authType ?? 'API_TOKEN',
      verifySsl: Boolean(server.verifySsl),
      timeoutSeconds: String(server.timeoutSeconds ?? 45),
      status: server.status ?? 'ONLINE',
    });
    setModalOpen(true);
    setMessage(null);
    setError(null);
  }

  async function handleDelete(server: VmsServer) {
    const confirmed = typeof window === 'undefined' ? true : window.confirm(`Excluir o servidor VMS "${server.name}"?`);
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await vmsServersService.remove(server.id);
      setServers((current) => current.filter((item) => item.id !== server.id));
      setMessage('Servidor VMS excluído.');
      if (editingServer?.id === server.id) {
        setEditingServer(null);
        setForm(initialForm);
        setModalOpen(false);
      }
    } catch {
      setError('Não foi possível excluir o servidor VMS agora.');
    } finally {
      setSaving(false);
    }
  }

  if (isChecking) {
    return <div className="flex min-h-[50vh] items-center justify-center text-white">Carregando servidores VMS...</div>;
  }

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Integração VMS</p>
          <h1 className="mt-2 text-2xl font-semibold">Servidores VMS</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Cadastre o servidor VMS e depois selecione uma câmera já existente para reaproveitar no backend local.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => void loadServers()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Novo servidor VMS
          </Button>
        </div>
      </div>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, fornecedor, URL ou modo"
              className="h-11 border-white/10 bg-slate-950 pl-11 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {message ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <Card className="border-white/10 bg-white/5 text-white"><CardContent className="py-10 text-center text-slate-400">Carregando servidores VMS...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="border-white/10 bg-white/5 text-white"><CardContent className="py-10 text-center text-slate-400">Nenhum servidor VMS cadastrado.</CardContent></Card>
        ) : (
          filtered.map((server) => (
            <Card key={server.id} className="border-white/10 bg-white/5 text-white">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-lg">{server.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-400">{[server.vendor, server.operationMode].filter(Boolean).join(' • ') || 'Sem dados de vendor/mode'}</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs ${server.status === 'ONLINE' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/20 bg-amber-500/10 text-amber-200'}`}>
                  {server.status === 'ONLINE' ? 'Online' : server.status === 'MAINTENANCE' ? 'Manutenção' : 'Offline'}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <div><span className="text-slate-500">Base URL:</span> {server.baseUrl || 'Não informado'}</div>
                <div><span className="text-slate-500">Auth:</span> {server.authType || 'Não informado'}</div>
                <div><span className="text-slate-500">Provisionamento:</span> {server.capabilities?.supportsProvisioning ? 'Sim' : 'Não'}</div>
                <div><span className="text-slate-500">Lookup:</span> {server.capabilities?.supportsCameraLookup ? 'Sim' : 'Não'}</div>
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => openEditModal(server)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20" onClick={() => void handleDelete(server)} disabled={saving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CrudModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingServer(null);
          setForm(initialForm);
        }}
        title={editingServer ? 'Editar servidor VMS' : 'Novo servidor VMS'}
        description="Cadastre o servidor VMS para consultar câmeras existentes do Incoresoft."
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Nome</span>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="border-white/10 bg-slate-950 text-white" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Fornecedor</span>
              <select value={form.vendor} onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value as VmsServerVendor }))} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="INCORESOFT">Incoresoft</option>
                <option value="DGUARD">DGuard</option>
                <option value="DIGIFORT">Digifort</option>
                <option value="INTELBRAS_MONUV">Intelbras Monuv</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Base URL</span>
              <Input value={form.baseUrl} onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))} className="border-white/10 bg-slate-950 text-white" placeholder="https://vms.seudominio.local" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Tipo de autenticação</span>
              <select value={form.authType} onChange={(event) => setForm((prev) => ({ ...prev, authType: event.target.value as VmsServerAuthType }))} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="API_TOKEN">API Token</option>
                <option value="BASIC">Usuário e senha</option>
                <option value="NONE">Sem autenticação</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Status</span>
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as VmsServerStatus }))} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="OFFLINE">Offline</option>
                <option value="ONLINE">Online</option>
                <option value="MAINTENANCE">Manutenção</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Token da API</span>
              <Input type="password" value={form.apiToken} onChange={(event) => setForm((prev) => ({ ...prev, apiToken: event.target.value }))} className="border-white/10 bg-slate-950 text-white" autoComplete="new-password" placeholder={editingServer ? 'Deixe em branco para manter' : ''} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Timeout em segundos</span>
              <Input value={form.timeoutSeconds} onChange={(event) => setForm((prev) => ({ ...prev, timeoutSeconds: event.target.value }))} className="border-white/10 bg-slate-950 text-white" inputMode="numeric" />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" checked={form.verifySsl} onChange={(event) => setForm((prev) => ({ ...prev, verifySsl: event.target.checked }))} />
            Validar certificado SSL
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : editingServer ? 'Salvar alterações' : 'Cadastrar servidor'}
            </Button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}
