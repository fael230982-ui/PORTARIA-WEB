'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Save, Search, ServerCog } from 'lucide-react';
import { CrudModal } from '@/components/admin/CrudModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { faceEngineServersService } from '@/services/face-engine-servers.service';
import type { FaceEngineServer, FaceEngineServerPayload, FaceEngineServerStatus } from '@/types/face-engine-server';

type FormState = {
  name: string;
  vendor: string;
  model: string;
  coreBaseUrl: string;
  faceBaseUrl: string;
  username: string;
  password: string;
  verifySsl: boolean;
  status: FaceEngineServerStatus;
};

const initialForm: FormState = {
  name: '',
  vendor: '',
  model: '',
  coreBaseUrl: '',
  faceBaseUrl: '',
  username: '',
  password: '',
  verifySsl: false,
  status: 'OFFLINE',
};

function toNullable(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function buildPayload(form: FormState, condominiumId?: string | null): FaceEngineServerPayload {
  return {
    name: form.name.trim(),
    vendor: toNullable(form.vendor),
    model: toNullable(form.model),
    coreBaseUrl: toNullable(form.coreBaseUrl),
    faceBaseUrl: toNullable(form.faceBaseUrl),
    username: toNullable(form.username),
    password: toNullable(form.password),
    verifySsl: form.verifySsl,
    condominiumId: condominiumId ?? null,
    status: form.status,
  };
}

function formFromServer(server: FaceEngineServer): FormState {
  return {
    name: server.name ?? '',
    vendor: server.vendor ?? '',
    model: server.model ?? '',
    coreBaseUrl: server.coreBaseUrl ?? '',
    faceBaseUrl: server.faceBaseUrl ?? '',
    username: server.username ?? '',
    password: '',
    verifySsl: Boolean(server.verifySsl),
    status: server.status ?? 'OFFLINE',
  };
}

export default function AdminFaceServersPage() {
  const { canAccess, isChecking } = useProtectedRoute({ allowedRoles: ['ADMIN', 'MASTER'] });
  const { user } = useAuth();
  const [servers, setServers] = useState<FaceEngineServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FaceEngineServer | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return servers;
    return servers.filter((server) =>
      [server.name, server.vendor, server.model, server.coreBaseUrl, server.faceBaseUrl]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [search, servers]);

  async function loadServers() {
    setLoading(true);
    setError(null);
    try {
      setServers(await faceEngineServersService.list());
    } catch {
      setError('Não foi possível carregar os servidores faciais agora.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canAccess) return;
    void loadServers();
  }, [canAccess]);

  function openCreate() {
    setSelected(null);
    setForm(initialForm);
    setModalOpen(true);
    setError(null);
    setMessage(null);
  }

  function openEdit(server: FaceEngineServer) {
    setSelected(server);
    setForm(formFromServer(server));
    setModalOpen(true);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(form, user?.condominiumId ?? user?.condominiumIds?.[0] ?? null);
      if (selected) {
        await faceEngineServersService.update(selected.id, payload);
        setMessage('Servidor facial atualizado.');
      } else {
        await faceEngineServersService.create(payload);
        setMessage('Servidor facial cadastrado.');
      }
      setModalOpen(false);
      await loadServers();
    } catch {
      setError('Não foi possível salvar o servidor facial.');
    } finally {
      setSaving(false);
    }
  }

  if (isChecking) {
    return <div className="flex min-h-[50vh] items-center justify-center text-white">Carregando servidores faciais...</div>;
  }

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Integração facial</p>
          <h1 className="mt-2 text-2xl font-semibold">Servidores faciais</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Cadastre o servidor facial separadamente e depois vincule a câmera VMS na tela Câmeras.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => void loadServers()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo servidor facial
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
              placeholder="Buscar por nome, fornecedor, modelo ou URL"
              className="h-11 border-white/10 bg-slate-950 pl-11 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {message ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <Card className="border-white/10 bg-white/5 text-white"><CardContent className="py-10 text-center text-slate-400">Carregando servidores faciais...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="border-white/10 bg-white/5 text-white"><CardContent className="py-10 text-center text-slate-400">Nenhum servidor facial cadastrado.</CardContent></Card>
        ) : (
          filtered.map((server) => (
            <Card key={server.id} className="border-white/10 bg-white/5 text-white">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-lg">{server.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-400">{[server.vendor, server.model].filter(Boolean).join(' · ') || 'Sem fabricante/modelo informado'}</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs ${server.status === 'ONLINE' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/20 bg-amber-500/10 text-amber-200'}`}>
                  {server.status === 'ONLINE' ? 'Online' : server.status === 'MAINTENANCE' ? 'Manutenção' : 'Offline'}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <div><span className="text-slate-500">Core:</span> {server.coreBaseUrl || 'Não informado'}</div>
                <div><span className="text-slate-500">Face:</span> {server.faceBaseUrl || 'Não informado'}</div>
                <div><span className="text-slate-500">Usuário:</span> {server.username || 'Não informado'}</div>
                <div><span className="text-slate-500">SSL:</span> {server.verifySsl ? 'Validar certificado' : 'Ignorar certificado'}</div>
                <div className="pt-2">
                  <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => openEdit(server)}>
                    <ServerCog className="mr-2 h-4 w-4" />
                    Editar servidor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? 'Editar servidor facial' : 'Novo servidor facial'}
        description="Configure o servidor facial e depois selecione-o no cadastro da câmera."
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
              <Input value={form.vendor} onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Modelo</span>
              <Input value={form.model} onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Status</span>
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as FaceEngineServerStatus }))} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="OFFLINE">Offline</option>
                <option value="ONLINE">Online</option>
                <option value="MAINTENANCE">Manutenção</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">URL base do núcleo</span>
              <Input value={form.coreBaseUrl} onChange={(event) => setForm((prev) => ({ ...prev, coreBaseUrl: event.target.value }))} className="border-white/10 bg-slate-950 text-white" placeholder="https://servidor-core" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">URL base do facial</span>
              <Input value={form.faceBaseUrl} onChange={(event) => setForm((prev) => ({ ...prev, faceBaseUrl: event.target.value }))} className="border-white/10 bg-slate-950 text-white" placeholder="https://servidor-face" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Usuário</span>
              <Input value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} className="border-white/10 bg-slate-950 text-white" autoComplete="off" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Senha</span>
              <Input type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} className="border-white/10 bg-slate-950 text-white" autoComplete="new-password" />
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
              {saving ? 'Salvando...' : selected ? 'Salvar alterações' : 'Cadastrar servidor'}
            </Button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}
