'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Save, Search, Trash2, Wifi } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedbackDialog } from '@/components/ui/feedback-dialog';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/features/http/api-error';
import { useAuth } from '@/hooks/use-auth';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { vmsServersService } from '@/services/vms-servers.service';
import type { VmsServer, VmsServerAuthType, VmsServerPayload, VmsServerStatus, VmsServerVendor } from '@/types/vms-server';

type FormState = {
  name: string;
  vendor: VmsServerVendor;
  baseUrl: string;
  internalScheme: string;
  internalIp: string;
  internalPort: string;
  externalScheme: string;
  externalIp: string;
  externalPort: string;
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
  internalScheme: 'https',
  internalIp: '',
  internalPort: '2443',
  externalScheme: 'https',
  externalIp: '',
  externalPort: '',
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

function composeBaseUrl(scheme: string, host: string, port: string) {
  const normalizedScheme = scheme.trim() || 'https';
  const normalizedHost = host.trim();
  const normalizedPort = Number(port);

  if (!normalizedHost) return null;

  const shouldAppendPort = Number.isFinite(normalizedPort) && normalizedPort > 0;
  return `${normalizedScheme}://${normalizedHost}${shouldAppendPort ? `:${normalizedPort}` : ''}`;
}

function parseBaseUrl(value?: string | null) {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return {
      scheme: parsed.protocol.replace(':', '') || 'https',
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'http:' ? '80' : '443'),
    };
  } catch {
    return null;
  }
}

function buildPayload(form: FormState): VmsServerPayload {
  const internalPort = Number(form.internalPort);
  const externalPort = Number(form.externalPort);
  const internalBaseUrl = composeBaseUrl(form.internalScheme, form.internalIp, form.internalPort);

  return {
    name: form.name.trim(),
    vendor: form.vendor,
    baseUrl: internalBaseUrl ?? toNullable(form.baseUrl),
    internalScheme: toNullable(form.internalScheme),
    internalIp: toNullable(form.internalIp),
    internalPort: Number.isFinite(internalPort) && internalPort > 0 ? internalPort : null,
    externalScheme: toNullable(form.externalScheme),
    externalIp: toNullable(form.externalIp),
    externalPort: Number.isFinite(externalPort) && externalPort > 0 ? externalPort : null,
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
  const [formError, setFormError] = useState<string | null>(null);
  const [modalFeedback, setModalFeedback] = useState<{ title: string; message: string; tone: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingServer, setEditingServer] = useState<VmsServer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const source = normalized
      ? servers.filter((server) =>
          [server.name, server.vendor, server.baseUrl, server.operationMode]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalized))
        )
      : servers;

    return [...source].sort((first, second) => String(first.name ?? '').localeCompare(String(second.name ?? ''), 'pt-BR'));
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
    setFormError(null);

    try {
      if (editingServer) {
        const payload = buildPayload(form);
        if (!form.apiToken.trim()) {
          delete payload.apiToken;
        }

        const updatedServer = await vmsServersService.update(editingServer.id, payload);
        setServers((current) => current.map((server) => (server.id === updatedServer.id ? updatedServer : server)));
        setMessage('Servidor VMS atualizado.');
        setModalFeedback({
          title: 'Servidor VMS atualizado',
          message: 'As alterações foram salvas com sucesso.',
          tone: 'success',
        });
      } else {
        const createdServer = await vmsServersService.create(buildPayload(form));
        setServers((current) => [createdServer, ...current.filter((server) => server.id !== createdServer.id)]);
        setMessage('Servidor VMS cadastrado.');
        setModalFeedback({
          title: 'Servidor VMS cadastrado',
          message: 'O servidor foi cadastrado com sucesso.',
          tone: 'success',
        });
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingServer(null);
      void loadServers({ silentOnError: true });
    } catch (submitError) {
      const friendlyMessage = getApiErrorMessage(submitError, {
        fallback: 'Não foi possível salvar o servidor VMS.',
        byStatus: {
          400: 'Os dados do servidor VMS não foram aceitos. Verifique IP interno, IP externo, porta, URL e token.',
          401: 'Sua sessão expirou ou não tem autorização para salvar este servidor VMS.',
          403: 'Seu perfil não tem permissão para salvar este servidor VMS.',
          502: 'O backend/VMS não respondeu corretamente ao salvar este servidor. Tente novamente ou verifique o VMS.',
          503: 'O serviço do backend está temporariamente indisponível para salvar o servidor VMS.',
        },
      });
      setFormError(friendlyMessage);
      setModalFeedback({
        title: 'Falha ao salvar servidor VMS',
        message: friendlyMessage,
        tone: 'error',
      });
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
    setFormError(null);
  }

  function openEditModal(server: VmsServer) {
    const parsedBaseUrl = parseBaseUrl(server.baseUrl);
    setEditingServer(server);
    setForm({
      name: server.name ?? '',
      vendor: server.vendor ?? 'INCORESOFT',
      baseUrl: server.baseUrl ?? '',
      internalScheme: server.internalScheme ?? parsedBaseUrl?.scheme ?? 'https',
      internalIp: server.internalIp ?? parsedBaseUrl?.host ?? '',
      internalPort: server.internalPort ? String(server.internalPort) : parsedBaseUrl?.port ?? '2443',
      externalScheme: server.externalScheme ?? 'https',
      externalIp: server.externalIp ?? '',
      externalPort: server.externalPort ? String(server.externalPort) : '',
      apiToken: '',
      authType: server.authType ?? 'API_TOKEN',
      verifySsl: Boolean(server.verifySsl),
      timeoutSeconds: String(server.timeoutSeconds ?? 45),
      status: server.status ?? 'ONLINE',
    });
    setModalOpen(true);
    setMessage(null);
    setError(null);
    setFormError(null);
  }

  async function handleDelete(server: VmsServer) {
    if (typeof window !== 'undefined') {
      try {
        const impact = await vmsServersService.getDeleteImpact(server.id);
        if (impact.requiresConfirmation || impact.linkedCameraCount > 0) {
          const typedConfirmation = window.prompt(
            `${impact.message}\n\nPara confirmar a exclusão, digite exatamente: ${impact.requiredConfirmationText}`,
          );
          if (typedConfirmation !== impact.requiredConfirmationText) return;
        } else if (!window.confirm(`Excluir o servidor VMS "${server.name}"?`)) {
          return;
        }
      } catch {
        const confirmed = window.confirm(
          `Não foi possível calcular o impacto da exclusão do servidor VMS "${server.name}". Deseja tentar excluir mesmo assim?`,
        );
        if (!confirmed) return;
      }
    }

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

  async function handleTestCommunication(server: VmsServer) {
    setTestingServerId(server.id);
    setMessage(null);
    setError(null);

    try {
      const response = await vmsServersService.listExistingCameras(server.id);
      const count = response.foundCount ?? response.items.length;
      setMessage(
        count > 0
          ? `Comunicação com VMS validada. ${count} câmera(s) encontrada(s).`
          : response.message || 'Comunicação com VMS validada, mas nenhuma câmera foi retornada.'
      );
    } catch (testError) {
      const maybeApiError = testError as { response?: { data?: { message?: string; detail?: string } } };
      setError(
        maybeApiError.response?.data?.message ||
          maybeApiError.response?.data?.detail ||
          'Não foi possível comunicar com o servidor VMS agora.'
      );
    } finally {
      setTestingServerId(null);
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
                  {server.status === 'ONLINE' ? 'Online' : 'Offline'}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <div><span className="text-slate-500">Base URL:</span> {server.baseUrl || 'Não informado'}</div>
                <div><span className="text-slate-500">IP interno:</span> {server.internalBaseUrl || [server.internalScheme, server.internalIp, server.internalPort].filter(Boolean).join(' / ') || 'Não informado'}</div>
                <div><span className="text-slate-500">IP externo:</span> {server.externalBaseUrl || [server.externalScheme, server.externalIp, server.externalPort].filter(Boolean).join(' / ') || 'Não informado'}</div>
                <div><span className="text-slate-500">Auth:</span> {server.authType || 'Não informado'}</div>
                <div><span className="text-slate-500">Provisionamento:</span> {server.capabilities?.supportsProvisioning ? 'Sim' : 'Não'}</div>
                <div><span className="text-slate-500">Lookup:</span> {server.capabilities?.supportsCameraLookup ? 'Sim' : 'Não'}</div>
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => openEditModal(server)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20" onClick={() => void handleTestCommunication(server)} disabled={testingServerId === server.id}>
                    <Wifi className="mr-2 h-4 w-4" />
                    {testingServerId === server.id ? 'Testando...' : 'Testar comunicação'}
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
          setFormError(null);
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
          {formError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {formError}
            </div>
          ) : null}

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
              <span className="text-sm text-slate-300">Base URL calculada</span>
              <Input
                value={composeBaseUrl(form.internalScheme, form.internalIp, form.internalPort) ?? form.baseUrl}
                readOnly
                className="border-white/10 bg-slate-900 text-slate-300"
                placeholder="Preencha IP interno e porta para gerar automaticamente"
              />
              <p className="text-xs text-slate-500">
                A Base URL enviada ao backend usa o endereço interno do VMS, conforme o contrato atual.
              </p>
            </label>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-white">Endereço interno</p>
                <p className="mt-1 text-xs text-slate-400">Usado quando backend/VMS precisam se comunicar pela rede local.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[120px_1fr_140px]">
                <label className="space-y-2">
                  <span className="text-xs text-slate-400">Protocolo</span>
                  <select value={form.internalScheme} onChange={(event) => setForm((prev) => ({ ...prev, internalScheme: event.target.value }))} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                    <option value="http">http</option>
                    <option value="https">https</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-slate-400">IP/host interno</span>
                  <Input value={form.internalIp} onChange={(event) => setForm((prev) => ({ ...prev, internalIp: event.target.value }))} className="border-white/10 bg-slate-950 text-white" placeholder="192.168.0.160" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-slate-400">Porta interna</span>
                  <Input value={form.internalPort} onChange={(event) => setForm((prev) => ({ ...prev, internalPort: event.target.value }))} className="border-white/10 bg-slate-950 text-white" inputMode="numeric" placeholder="2443" />
                </label>
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-white">Endereço externo</p>
                <p className="mt-1 text-xs text-slate-400">Usado quando o navegador/cliente precisa acessar o VMS fora da rede local.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[120px_1fr_140px]">
                <label className="space-y-2">
                  <span className="text-xs text-slate-400">Protocolo</span>
                  <select value={form.externalScheme} onChange={(event) => setForm((prev) => ({ ...prev, externalScheme: event.target.value }))} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                    <option value="http">http</option>
                    <option value="https">https</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-slate-400">IP/host externo</span>
                  <Input value={form.externalIp} onChange={(event) => setForm((prev) => ({ ...prev, externalIp: event.target.value }))} className="border-white/10 bg-slate-950 text-white" placeholder="vms.seudominio.com.br" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-slate-400">Porta externa</span>
                  <Input value={form.externalPort} onChange={(event) => setForm((prev) => ({ ...prev, externalPort: event.target.value }))} className="border-white/10 bg-slate-950 text-white" inputMode="numeric" placeholder="443" />
                </label>
              </div>
            </div>
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

      <FeedbackDialog
        open={Boolean(modalFeedback)}
        title={modalFeedback?.title ?? ''}
        message={modalFeedback?.message ?? ''}
        tone={modalFeedback?.tone ?? 'info'}
        onClose={() => setModalFeedback(null)}
      />
    </div>
  );
}
