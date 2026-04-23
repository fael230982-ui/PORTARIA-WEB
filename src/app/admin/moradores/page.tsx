'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Filter,
  Plus,
  Eye,
  Pencil,
  Home,
  UserCheck,
  UserX,
  Clock3,
  MoreHorizontal,
  KeyRound,
  CircleOff,
  Mail,
  Phone,
  FileText,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCameras } from '@/hooks/use-cameras';
import { useAllPeople } from '@/hooks/use-people';
import { useUsers } from '@/hooks/use-users';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useReports } from '@/hooks/use-reports';
import { useOfflineOperationQueue } from '@/hooks/use-offline-operation-queue';
import { CrudModal } from '@/components/admin/CrudModal';
import MoradorForm, { MoradorFormData } from '@/components/admin/morador-form';
import { maskDocument, maskEmail, maskPhone } from '@/features/legal/data-masking';
import {
  buildPersonUpsertPayload,
  mapUiStatusToApi,
  matchesMoradorText,
  normalizeMoradorCategory,
  normalizeMoradorStatus,
  normalizePerson,
  normalizePeople,
  safeText,
  type MoradorRow,
} from '@/features/people/morador-normalizers';
import { getPersonStatusBadgeClass } from '@/features/people/status-badges';
import { api } from '@/lib/axios';
import { getPersonById, uploadPersonPhoto, syncPersonFace } from '@/services/people.service';
import { camerasService } from '@/services/cameras.service';
import { ensureResidenceUnit } from '@/services/residence.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Person, PersonCategory } from '@/types/person';
import type { Unit } from '@/types/condominium';
import type { Report } from '@/types/report';

type Filters = {
  search: string;
  status: string;
  category: string;
};

type PersonImportRow = {
  line: number;
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  tipo: string;
  unitLabel: string;
  structureLabel: string;
  unit?: Unit | null;
  existing?: MoradorRow | null;
  selected: boolean;
};

type AccessAction = 'ENTRY' | 'EXIT';

type AccessEvent = {
  action: AccessAction;
  personId: string;
  createdAt: string;
};

type PersonAccessSummary = {
  entryAt: string | null;
  exitAt: string | null;
};

type MoradoresSnapshotCache = {
  moradores: MoradorRow[];
  appAccessEntries: Array<{ residentId: string; id: string; email: string }>;
  accessSummaryEntries: Array<[string, PersonAccessSummary]>;
  cachedAt: string | null;
};

const accessReportMarker = 'PORTARIA_ACCESS';
const peopleCsvTemplate = 'tipo;nome;email;telefone;documento;estrutura;unidade\nmorador;Maria Silva;maria@email.com;11999999999;12345678909;A;101\nvisitante;João Souza;;;98765432100;A;101\nprestador;Empresa Manutenção;contato@empresa.com;1133334444;;A;102\nlocatario;Ana Locatária;ana@email.com;11888888888;11122233344;B;201\n';

function extractCloudflareRayId(value: string) {
  const match = value.match(/Cloudflare Ray ID:\s*<strong[^>]*>([^<]+)<\/strong>/i);
  return match?.[1]?.trim() ?? null;
}

function getFriendlyGatewayMessage(errorHtml: string) {
  const rayId = extractCloudflareRayId(errorHtml);
  return rayId
    ? `Servidor externo indisponível no momento. Cloudflare Ray ID: ${rayId}`
    : 'Servidor externo indisponível no momento. Tente novamente em alguns minutos.';
}

function getFriendlyPeopleRequestMessage() {
  return 'Não foi possível cadastrar o morador com os dados informados. Verifique nome, documento, categoria e unidade antes de tentar novamente.';
}

function getFriendlyDuplicateDocumentMessage() {
  return 'Documento já cadastrado. Verifique se o morador já foi criado e atualize a lista antes de tentar novamente.';
}

function getFriendlyFaceSyncMessage() {
  return 'Morador salvo, mas a sincronização facial não foi concluída. Verifique a integração de face e tente sincronizar novamente.';
}

function getFriendlyPhotoUploadMessage() {
  return 'Não foi possível processar a foto do morador antes de salvar. Verifique o upload de foto ou a captura da câmera do condomínio.';
}

function parseAccessReport(report: Report): AccessEvent | null {
  const markerLine = report.description
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(accessReportMarker));

  if (!markerLine) return null;

  const payload = markerLine.slice(accessReportMarker.length).trim();
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as {
      action?: string;
      personId?: string;
      category?: PersonCategory | null;
    };

    if (!parsed.personId) return null;
    if (parsed.action !== 'ENTRY' && parsed.action !== 'EXIT') return null;

    return {
      action: parsed.action,
      personId: parsed.personId,
      createdAt: report.createdAt,
    };
  } catch {
    return null;
  }
}

function isMoreRecent(nextValue: string, currentValue: string | null) {
  if (!currentValue) return true;
  return new Date(nextValue).getTime() > new Date(currentValue).getTime();
}

function formatAccessDateTime(value: string | null | undefined) {
  if (!value) return 'Sem registro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem registro';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isMinorBirthDate(value?: string | null) {
  if (!value) return false;
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age < 18;
}

function isPublicFaceSyncCandidate(photoUrl?: string | null) {
  const normalized = photoUrl?.trim() ?? '';

  if (!normalized) return false;
  if (normalized.startsWith('data:')) return false;

  return normalized.startsWith('/media/') || /^https?:\/\//i.test(normalized);
}

function getFaceListSyncLabel(value?: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return 'Não informado';
  if (normalized === 'SYNCED') return 'Sincronizada';
  if (normalized === 'PENDING') return 'Pendente';
  if (normalized === 'PROCESSING') return 'Processando';
  if (normalized === 'ERROR' || normalized === 'FAILED') return 'Com erro';
  return normalized;
}

function getFaceStatusLabel(value?: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized || normalized === 'NO_PHOTO') return '';
  if (normalized === 'PHOTO_ONLY') return 'Foto cadastrada';
  if (normalized === 'FACE_PENDING_SYNC') return 'Reconhecimento facial pendente';
  if (normalized === 'FACE_SYNCED') return 'Reconhecimento facial ativo';
  if (normalized === 'FACE_ERROR') return 'Falha no reconhecimento facial';
  return '';
}

function getCategoryLabel(value?: string | null) {
  const normalized = normalizeMoradorCategory(value);
  if (normalized === 'visitante') return 'Visitante';
  if (normalized === 'prestador') return 'Prestador';
  if (normalized === 'locatario') return 'Locatário';
  if (normalized === 'funcionario') return 'Funcionário';
  return 'Morador';
}

function isTechnicalIdentifier(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  if (/^[0-9a-f]{8,}$/i.test(normalized)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f-]{13,}$/i.test(normalized)) return true;
  return false;
}

function getFriendlyLocation(row: MoradorRow) {
  const candidates = [
    row.localizacao,
    [row.condominio, row.estruturaLabel, row.unidade].filter(Boolean).join(' / '),
    [row.bloco, row.unidade].filter(Boolean).join(' / '),
    row.unidade,
  ];

  const friendly = candidates.find((candidate) => {
    const value = String(candidate ?? '').trim();
    return value && !isTechnicalIdentifier(value);
  });

  return friendly || 'Unidade não identificada';
}

function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function detectCsvDelimiter(line: string) {
  const semicolonCount = (line.match(/;/g) ?? []).length;
  const commaCount = (line.match(/,/g) ?? []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCsvLine(line: string, delimiter = ',') {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeImportText(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

function parsePeopleCsv(content: string, units: Unit[], existingPeople: MoradorRow[]): PersonImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeCsvHeader);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? '']));
    const tipo = normalizeMoradorCategory(row.tipo || row.categoria || 'morador');
    const nome = String(row.nome || row.name || '').trim();
    const email = String(row.email || row.e_mail || '').trim();
    const telefone = String(row.telefone || row.celular || row.phone || '').trim();
    const documento = String(row.documento || row.cpf || row.rg || '').trim();
    const structureLabel = String(row.estrutura || row.bloco || row.rua || row.quadra || '').trim();
    const unitLabel = String(row.unidade || row.casa || row.apartamento || '').trim();
    const unit =
      units.find((item) =>
        normalizeImportText(item.label) === normalizeImportText(unitLabel) &&
        (!structureLabel || normalizeImportText(item.structure?.label) === normalizeImportText(structureLabel))
      ) ?? null;
    const existing =
      existingPeople.find((person) =>
        (documento && normalizeImportText(person.documento) === normalizeImportText(documento)) ||
        (email && normalizeImportText(person.email) === normalizeImportText(email))
      ) ?? null;

    return {
      line: index + 2,
      nome,
      email,
      telefone,
      documento,
      tipo,
      unitLabel,
      structureLabel,
      unit,
      existing,
      selected: Boolean(nome && !existing && (unit || (structureLabel && unitLabel))),
    };
  }).filter((row) => row.nome);
}

function getMoradoresSnapshotKey(userId?: string | null) {
  return userId ? `admin-moradores-snapshot:${userId}` : null;
}

function readMoradoresSnapshot(userId?: string | null): MoradoresSnapshotCache {
  if (typeof window === 'undefined') {
    return { moradores: [], appAccessEntries: [], accessSummaryEntries: [], cachedAt: null };
  }

  const key = getMoradoresSnapshotKey(userId);
  if (!key) {
    return { moradores: [], appAccessEntries: [], accessSummaryEntries: [], cachedAt: null };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { moradores: [], appAccessEntries: [], accessSummaryEntries: [], cachedAt: null };
    const parsed = JSON.parse(raw) as Partial<MoradoresSnapshotCache>;
    return {
      moradores: Array.isArray(parsed.moradores) ? parsed.moradores : [],
      appAccessEntries: Array.isArray(parsed.appAccessEntries) ? parsed.appAccessEntries : [],
      accessSummaryEntries: Array.isArray(parsed.accessSummaryEntries) ? parsed.accessSummaryEntries : [],
      cachedAt: typeof parsed.cachedAt === 'string' ? parsed.cachedAt : null,
    };
  } catch {
    return { moradores: [], appAccessEntries: [], accessSummaryEntries: [], cachedAt: null };
  }
}

function getMoradoresSnapshotSignature(snapshot: MoradoresSnapshotCache) {
  return JSON.stringify({
    moradores: snapshot.moradores,
    appAccessEntries: snapshot.appAccessEntries,
    accessSummaryEntries: snapshot.accessSummaryEntries,
  });
}

function persistMoradoresSnapshot(userId: string, snapshot: MoradoresSnapshotCache) {
  if (typeof window === 'undefined') return false;

  const key = getMoradoresSnapshotKey(userId);
  if (!key) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        window.localStorage.removeItem(key);
        window.localStorage.setItem(key, JSON.stringify(snapshot));
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null) return fallback;

  const axiosError = error as {
    response?: {
      status?: number;
      data?:
        | {
        detail?: string;
        message?: string;
        error?: string;
          errors?: Array<{ message?: string }>;
        }
        | string;
    };
    message?: string;
    config?: {
      url?: string;
      method?: string;
    };
  };

  if (typeof axiosError.response?.data === 'string') {
    if (axiosError.response.data.includes('<html') || axiosError.response.data.includes('<!DOCTYPE html')) {
      return getFriendlyGatewayMessage(axiosError.response.data);
    }

    if (
      axiosError.response?.status === 400 &&
      axiosError.response.data.toLowerCase().includes('documento já cadastrado')
    ) {
      return getFriendlyDuplicateDocumentMessage();
    }

    if (
      axiosError.response?.status === 500 &&
      axiosError.config?.url === '/people' &&
      axiosError.config?.method?.toLowerCase() === 'post'
    ) {
      return getFriendlyPeopleRequestMessage();
    }

    return axiosError.response.data;
  }

  const validationErrors = axiosError.response?.data?.errors
    ?.map((item) => item.message)
    .filter(Boolean)
    .join(', ');

  return (
    (typeof axiosError.response?.data?.message === 'string' &&
    axiosError.response.data.message.toLowerCase().includes('documento já cadastrado')
      ? getFriendlyDuplicateDocumentMessage()
      : null) ||
    (typeof axiosError.response?.data?.detail === 'string' &&
    axiosError.response.data.detail.toLowerCase().includes('documento já cadastrado')
      ? getFriendlyDuplicateDocumentMessage()
      : null) ||
    (axiosError.response?.status === 500 &&
    axiosError.config?.url === '/people' &&
    axiosError.config?.method?.toLowerCase() === 'post'
      ? getFriendlyPeopleRequestMessage()
      : null) ||
    axiosError.response?.data?.detail ||
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    validationErrors ||
    axiosError.message ||
    fallback
  );
}

function serializeForLog(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

async function syncPersonStatus(id: string, status: string) {
  await api.patch(`/people/${id}/status`, {
    status: mapUiStatusToApi(status),
  });
}

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-center text-2xl font-semibold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function MoradoresPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const {
    data: peopleData,
    isLoading: peopleLoading,
    error: peopleError,
    refetch: refetchPeople,
  } = useAllPeople({ limit: 100 });
  const { data: camerasData } = useCameras();
  const { data: usersData } = useUsers();
  const { data: reportsData } = useReports(Boolean(user));
  const {
    condominiums,
    streets,
    units,
    isLoading: catalogLoading,
    refetchAll: refetchResidenceCatalog,
  } = useResidenceCatalog();

  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    category: 'all',
  });
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedMorador, setSelectedMorador] = useState<MoradorRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingFace, setSyncingFace] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [brokenMoradorImageUrls, setBrokenMoradorImageUrls] = useState<Record<string, boolean>>({});
  const [peopleImportRows, setPeopleImportRows] = useState<PersonImportRow[]>([]);
  const [peopleImportMessage, setPeopleImportMessage] = useState<string | null>(null);
  const [snapshotCache, setSnapshotCache] = useState<MoradoresSnapshotCache>(() => readMoradoresSnapshot(null));
  const snapshotSignatureRef = useRef(
    getMoradoresSnapshotSignature({ moradores: [], appAccessEntries: [], accessSummaryEntries: [], cachedAt: null })
  );
  const { isOnline } = useOfflineOperationQueue(Boolean(user));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (String(user.role) !== 'ADMIN') {
      router.replace('/admin');
    }
  }, [mounted, authLoading, isAuthenticated, user, router]);

  const currentCondominium = useMemo(() => {
    if (!user?.condominiumId) return null;
    return condominiums.find((item) => item.id === user.condominiumId) ?? null;
  }, [condominiums, user?.condominiumId]);

  const moradores = useMemo(
    () =>
      peopleData
        ? normalizePeople(
            peopleData,
            {
              condominiums,
              streets,
              units,
            }
          )
        : !isOnline
          ? snapshotCache.moradores
          : [],
    [condominiums, isOnline, peopleData, snapshotCache.moradores, streets, units]
  );

  const appAccessByResidentId = useMemo(() => {
    const map = new Map<string, { id: string; email: string }>();
    const residentUsers = usersData?.filter((item) => item.role === 'MORADOR') ?? [];

    if (residentUsers.length) {
      moradores.forEach((morador) => {
        const matchedUser = residentUsers.find((candidate) => candidate.personId === morador.id);

        if (matchedUser) {
          map.set(morador.id, {
            id: matchedUser.id,
            email: matchedUser.email,
          });
        }
      });
    } else if (!isOnline) {
      snapshotCache.appAccessEntries.forEach((entry) => {
        map.set(entry.residentId, {
          id: entry.id,
          email: entry.email,
        });
      });
    }

    return map;
  }, [isOnline, moradores, snapshotCache.appAccessEntries, usersData]);

  const availableUnits = useMemo(() => {
    if (!user?.condominiumId) return units;
    return units.filter((unit) => unit.condominiumId === user.condominiumId);
  }, [units, user?.condominiumId]);
  const cameras = useMemo(() => camerasData?.data ?? [], [camerasData]);
  const accessSummaryByPerson = useMemo(() => {
    const summaries = new Map<string, PersonAccessSummary>();

    const sourceReports = reportsData?.data ?? [];

    if (sourceReports.length === 0 && !isOnline) {
      snapshotCache.accessSummaryEntries.forEach(([personId, summary]) => {
        summaries.set(personId, summary);
      });
      return summaries;
    }

    for (const report of sourceReports) {
      const access = parseAccessReport(report);
      if (!access) continue;

      const current = summaries.get(access.personId) ?? {
        entryAt: null,
        exitAt: null,
      };

      if (access.action === 'ENTRY' && isMoreRecent(access.createdAt, current.entryAt)) {
        current.entryAt = access.createdAt;
      }

      if (access.action === 'EXIT' && isMoreRecent(access.createdAt, current.exitAt)) {
        current.exitAt = access.createdAt;
      }

      summaries.set(access.personId, current);
    }

    return summaries;
  }, [isOnline, reportsData, snapshotCache.accessSummaryEntries]);

  const filteredMoradores = useMemo(() => {
    return moradores.filter((row) => {
      const status = normalizeMoradorStatus(row.status);
      const category = normalizeMoradorCategory(row.categoria);
      const statusOk = filters.status === 'all' || status === filters.status;
      const categoryOk = filters.category === 'all' || category === filters.category;
      const searchOk = matchesMoradorText(row, filters.search);

      return statusOk && categoryOk && searchOk;
    });
  }, [moradores, filters]);

  const stats = useMemo(() => {
    const total = moradores.length;
    const ativos = moradores.filter((item) => normalizeMoradorStatus(item.status) === 'ativo').length;
    const inativos = moradores.filter((item) => normalizeMoradorStatus(item.status) === 'inativo').length;
    const bloqueados = moradores.filter((item) => normalizeMoradorStatus(item.status) === 'bloqueado').length;
    const appAccess = moradores.filter((item) => appAccessByResidentId.has(item.id)).length;

    return { total, ativos, inativos, bloqueados, appAccess };
  }, [appAccessByResidentId, moradores]);
  const selectedMoradorAccessSummary = useMemo(() => {
    if (!selectedMorador) return null;
    return (
      accessSummaryByPerson.get(selectedMorador.id) ?? {
        entryAt: null,
        exitAt: null,
      }
    );
  }, [accessSummaryByPerson, selectedMorador]);
  const selectedMoradorAppAccess = selectedMorador ? appAccessByResidentId.get(selectedMorador.id) ?? null : null;
  const selectedMoradorPhotoUnavailable = Boolean(selectedMorador?.avatarUrl && brokenMoradorImageUrls[selectedMorador.avatarUrl]);

  function markMoradorImageAsUnavailable(url?: string | null) {
    if (!url) return;
    setBrokenMoradorImageUrls((current) => (current[url] ? current : { ...current, [url]: true }));
  }

  const handleRefresh = async () => {
    await Promise.all([refetchPeople(), refetchResidenceCatalog()]);
  };

  const downloadPeopleTemplate = () => {
    const blob = new Blob([peopleCsvTemplate], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-pessoas.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePeopleCsvSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setSubmitError(null);
    setPeopleImportMessage(null);

    if (!file) return;

    const rows = parsePeopleCsv(await file.text(), availableUnits, moradores);
    setPeopleImportRows(rows);

    if (!rows.length) {
      setSubmitError('O arquivo não possui cadastros válidos. Baixe o modelo e preencha pelo menos nome, tipo e unidade.');
      return;
    }

    const existingCount = rows.filter((row) => row.existing).length;
    const missingUnitCount = rows.filter((row) => !row.unit).length;
    setPeopleImportMessage(
      `${rows.length} cadastro(s) encontrado(s). ${existingCount} já existem e ${missingUnitCount} precisam de unidade válida antes da importação.`
    );
  };

  const togglePeopleImportRow = (line: number) => {
    setPeopleImportRows((current) =>
      current.map((row) => row.line === line ? { ...row, selected: !row.selected } : row)
    );
  };

  const applyPeopleImport = async () => {
    const selectedRows = peopleImportRows.filter((row) => row.selected);
    if (!selectedRows.length) {
      setSubmitError('Selecione ao menos um cadastro válido para importar.');
      return;
    }

    if (!currentCondominium) {
      setSubmitError('Admin sem condomínio vinculado para importar cadastros.');
      return;
    }

    setSaving(true);
    setSubmitError(null);
    setPageNotice(null);

    try {
      for (const row of selectedRows) {
        let targetUnit = row.unit ?? null;

        if (!targetUnit) {
          if (!row.structureLabel || !row.unitLabel) {
            throw new Error(`Linha ${row.line}: informe estrutura e unidade para criar o vínculo.`);
          }

          const createdResidence = await ensureResidenceUnit({
            condominiumId: currentCondominium.id,
            condominiumName: currentCondominium.name,
            structureType: 'STREET',
            structureLabel: row.structureLabel,
            unitLabel: row.unitLabel,
          });
          targetUnit = createdResidence.unit;
        }

        await api.post<Person>('/people', {
          ...buildPersonUpsertPayload({
            nome: row.nome,
            email: row.email,
            telefone: row.telefone,
            documento: row.documento,
            documentType: row.documento.replace(/\D+/g, '').length === 11 ? 'CPF' : null,
            tipo: row.tipo,
            photoUrl: null,
            source: 'PORTARIA_WEB_CSV',
            unitId: targetUnit.id,
          }),
        });
      }

      setPeopleImportRows([]);
      setPeopleImportMessage(null);
      await handleRefresh();
      setPageNotice({ tone: 'success', message: `${selectedRows.length} cadastro(s) importado(s) com sucesso.` });
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Não foi possível importar os cadastros selecionados.'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const nextSnapshot = readMoradoresSnapshot(user?.id ?? null);
    snapshotSignatureRef.current = getMoradoresSnapshotSignature(nextSnapshot);
    setSnapshotCache(nextSnapshot);
  }, [user?.id]);

  useEffect(() => {
    if (!user || typeof window === 'undefined' || moradores.length === 0) return;
    const key = getMoradoresSnapshotKey(user.id);
    if (!key) return;

    const nextSnapshot: MoradoresSnapshotCache = {
      moradores,
      appAccessEntries: Array.from(appAccessByResidentId.entries()).map(([residentId, value]) => ({
        residentId,
        id: value.id,
        email: value.email,
      })),
      accessSummaryEntries: Array.from(accessSummaryByPerson.entries()),
      cachedAt: new Date().toISOString(),
    };
    const nextSnapshotSignature = getMoradoresSnapshotSignature(nextSnapshot);

    if (nextSnapshotSignature === snapshotSignatureRef.current) {
      return;
    }

    if (persistMoradoresSnapshot(user.id, nextSnapshot)) {
      snapshotSignatureRef.current = nextSnapshotSignature;
      setSnapshotCache((current) =>
        getMoradoresSnapshotSignature(current) === nextSnapshotSignature ? current : nextSnapshot
      );
    }
  }, [accessSummaryByPerson, appAccessByResidentId, moradores, user]);

  const openNewMorador = () => {
    setSelectedMorador(null);
    setSubmitError(null);
    setPageNotice(null);
    setOpenCreate(true);
  };

  async function loadMoradorDetails(morador: MoradorRow) {
    try {
      const person = await getPersonById(morador.id);
      const detailed = normalizePerson(person);
      setSelectedMorador({
        ...morador,
        ...detailed,
        avatarUrl: detailed.avatarUrl || morador.avatarUrl,
        unit: detailed.unit ?? morador.unit ?? null,
      });
    } catch {
      setSelectedMorador(morador);
    }
  }

  const openEditMorador = (morador: MoradorRow) => {
    setSelectedMorador(morador);
    setSubmitError(null);
    setPageNotice(null);
    setOpenEdit(true);
    void loadMoradorDetails(morador);
  };

  const openViewMorador = (morador: MoradorRow) => {
    setSelectedMorador(morador);
    setSubmitError(null);
    setOpenView(true);
    void loadMoradorDetails(morador);
  };

  const openResidentAppAccess = (morador: MoradorRow) => {
    const params = new URLSearchParams({
      create: 'resident-access',
      residentId: morador.id,
      name: morador.nome,
      unitId: morador.unit?.id ?? '',
    });

    if (morador.email) params.set('email', morador.email);
    router.push(`/admin/usuarios?${params.toString()}`);
  };

  const closeModals = () => {
    setOpenCreate(false);
    setOpenEdit(false);
    setOpenView(false);
    setSelectedMorador(null);
    setSubmitError(null);
    setSyncingFace(false);
  };

  async function syncPersonFaceIfNeeded(personId: string, photoUrl?: string | null, allowFaceSync = true) {
    if (!photoUrl?.trim()) {
      return null;
    }

    if (!allowFaceSync) {
      return 'Cadastro salvo sem envio para a integração facial. A autorização do responsável ainda precisa ser persistida oficialmente no backend.';
    }

    try {
      await syncPersonFace(personId);
      return null;
    } catch (error) {
      const axiosError =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as {
              response?: { data?: unknown; status?: number; headers?: unknown };
              config?: { url?: string; method?: string };
            })
          : undefined;

      console.error('[moradores:face-sync] failed', {
        personId,
        photoUrl,
        message: getErrorMessage(error, getFriendlyFaceSyncMessage()),
        status: axiosError?.response?.status,
        responseData: serializeForLog(axiosError?.response?.data),
        responseHeaders: serializeForLog(axiosError?.response?.headers),
        request: serializeForLog({
          method: axiosError?.config?.method,
          url: axiosError?.config?.url,
        }),
        error,
      });
      return getFriendlyFaceSyncMessage();
    }
  }

  async function resolvePersistedPhotoUrl(data: MoradorFormData) {
    const rawPhotoUrl = data.photoUrl.trim();

    if (!rawPhotoUrl) {
      return '';
    }

    if (data.photoSource === 'camera' && data.cameraId) {
      const response = await camerasService.capturePhoto(data.cameraId);
      return response.photoUrl;
    }

    if (rawPhotoUrl.startsWith('data:')) {
      const response = await uploadPersonPhoto(rawPhotoUrl, `${data.nome || 'morador'}.jpg`);
      return response.photoUrl;
    }

    return rawPhotoUrl;
  }

  async function createMorador(data: MoradorFormData) {
    setSaving(true);
    setSubmitError(null);
    setPageNotice(null);
    const targetCondominiumName = currentCondominium?.name ?? data.condominio;
    const selectedUnit = availableUnits.find((unit) => unit.id === data.unitId) ?? null;
    let resolvedResidence: { condominium?: unknown; street?: unknown; unit?: Unit } | null = null;
    let apiPayload: Record<string, unknown> | null = null;
    let resolvedPhotoUrl = data.photoUrl;
    try {
      if (!selectedUnit) {
        throw new Error('Selecione uma unidade existente para vincular o morador.');
      }

      resolvedPhotoUrl = await resolvePersistedPhotoUrl(data);

      resolvedResidence = {
        condominium: selectedUnit.condominium ?? currentCondominium ?? null,
        unit: selectedUnit,
      };
        const payload = {
          ...buildPersonUpsertPayload({
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
            documento: data.documento,
            documentType: data.documentType || null,
            birthDate: data.birthDate || null,
            tipo: data.tipo,
            photoUrl: resolvedPhotoUrl,
            minorFacialAuthorization:
              data.birthDate && isMinorBirthDate(data.birthDate) && data.allowMinorFaceSync
                ? {
                    authorized: true,
                    guardianName: data.guardianName.trim(),
                    guardianDocument: data.guardianDocument.replace(/\D+/g, ''),
                    relationship: data.guardianRelationship.trim() || null,
                    authorizationSource: 'PORTARIA_WEB',
                  }
                : null,
            source: 'PORTARIA_WEB',
            unitId: selectedUnit.id,
          }),
        };
      apiPayload = payload;
      const response = await api.post<Person>('/people', payload);

      if (data.status !== 'ativo') {
        await syncPersonStatus(response.data.id, data.status);
      }

      const syncWarning = await syncPersonFaceIfNeeded(response.data.id, resolvedPhotoUrl, !data.birthDate || !isMinorBirthDate(data.birthDate) || data.allowMinorFaceSync);

      setOpenCreate(false);
      await handleRefresh();
      if (syncWarning) {
        setPageNotice({ tone: 'warning', message: syncWarning });
      } else if (resolvedPhotoUrl?.trim()) {
        setPageNotice({ tone: 'success', message: 'Morador salvo e sincronizado com a integração facial.' });
      }
    } catch (error) {
      const message = getErrorMessage(error, getFriendlyPhotoUploadMessage());
      const axiosError =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as {
              response?: { data?: unknown; status?: number; headers?: unknown };
              config?: { url?: string; method?: string };
            })
          : undefined;

      const rawResponseData =
        typeof axiosError?.response?.data === 'string' ? axiosError.response.data : null;
      const cloudflareRayId = rawResponseData ? extractCloudflareRayId(rawResponseData) : null;

      console.error('[moradores:create] failed', {
        payload: serializeForLog({
          nome: data.nome,
          telefone: data.telefone,
          documento: data.documento,
          tipo: data.tipo,
          condominio: targetCondominiumName,
          estrutura: data.estrutura,
          unitId: data.unitId,
          photoSource: data.photoSource,
          cameraId: data.cameraId,
        }),
        apiPayload: serializeForLog(apiPayload),
        resolvedPhotoUrl,
        resolvedResidence: serializeForLog(resolvedResidence),
        message,
        cloudflareRayId,
        status: axiosError?.response?.status,
        responseData: serializeForLog(axiosError?.response?.data),
        responseHeaders: serializeForLog(axiosError?.response?.headers),
        request: serializeForLog({
          method: axiosError?.config?.method,
          url: axiosError?.config?.url,
        }),
        error,
      });
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateMorador(data: MoradorFormData) {
    if (!selectedMorador?.id) return;

    setSaving(true);
    setSubmitError(null);
    setPageNotice(null);
    let resolvedPhotoUrl = data.photoUrl;
    try {
      const selectedUnit = availableUnits.find((unit) => unit.id === data.unitId) ?? null;

      if (!selectedUnit) {
        throw new Error('Selecione uma unidade existente para vincular o morador.');
      }

      resolvedPhotoUrl = await resolvePersistedPhotoUrl(data);

        await api.put(`/people/${selectedMorador.id}`, {
          ...buildPersonUpsertPayload({
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
            documento: data.documento,
            documentType: data.documentType || null,
            birthDate: data.birthDate || null,
            tipo: data.tipo,
            photoUrl: resolvedPhotoUrl,
            minorFacialAuthorization:
              data.birthDate && isMinorBirthDate(data.birthDate) && data.allowMinorFaceSync
                ? {
                    authorized: true,
                    guardianName: data.guardianName.trim(),
                    guardianDocument: data.guardianDocument.replace(/\D+/g, ''),
                    relationship: data.guardianRelationship.trim() || null,
                    authorizationSource: 'PORTARIA_WEB',
                  }
                : null,
            source: 'PORTARIA_WEB',
            unitId: selectedUnit.id,
          }),
        });

      await syncPersonStatus(selectedMorador.id, data.status);
      const syncWarning = await syncPersonFaceIfNeeded(selectedMorador.id, resolvedPhotoUrl, !data.birthDate || !isMinorBirthDate(data.birthDate) || data.allowMinorFaceSync);

      setOpenEdit(false);
      setSelectedMorador(null);
      await handleRefresh();
      if (syncWarning) {
        setPageNotice({ tone: 'warning', message: syncWarning });
      } else if (resolvedPhotoUrl?.trim()) {
        setPageNotice({ tone: 'success', message: 'Morador atualizado e sincronizado com a integração facial.' });
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error, getFriendlyPhotoUploadMessage()));
    } finally {
      setSaving(false);
    }
  }

  async function deleteMorador(id: string) {
    const confirmed = window.confirm('Deseja inativar este morador?');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await syncPersonStatus(id, 'bloqueado');
      await handleRefresh();
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erro ao inativar morador'));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleManualFaceSync() {
    if (!selectedMorador?.id) return;

    setSyncingFace(true);
    setPageNotice(null);

    try {
      const syncWarning = await syncPersonFaceIfNeeded(
        selectedMorador.id,
        selectedMorador.avatarUrl ?? ''
      );

      if (syncWarning) {
        setPageNotice({ tone: 'warning', message: syncWarning });
        return;
      }

      setPageNotice({
        tone: 'success',
        message: 'Sincronização facial executada com sucesso para o morador selecionado.',
      });
    } finally {
      setSyncingFace(false);
    }
  }

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando painel...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Administração</p>
            <h1 className="mt-2 text-2xl font-semibold">Pessoas</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Cadastro, edição e gerenciamento de moradores com integração direta à API real.
            </p>
            <p className="mt-2 max-w-2xl text-xs text-cyan-100">
              Para o morador entrar no app, cadastre também uma conta em Admin &gt; Usuários com perfil Morador e vínculo com este cadastro.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={openNewMorador}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-950 hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              Novo
            </Button>

            <Button
              variant="outline"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      {!isOnline ? (
        <section className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Modo offline em moradores</p>
          <p className="mt-1 text-xs opacity-90">
            A tela está usando o último snapshot salvo{snapshotCache.cachedAt ? ` em ${formatAccessDateTime(snapshotCache.cachedAt)}` : ''}. Consultas continuam disponíveis, mas gravações dependem da API.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Pessoas cadastradas"
          value={peopleLoading ? '...' : String(stats.total)}
          icon={Home}
          hint="Moradores, visitantes e prestadores"
        />
        <StatCard
          title="Ativos"
          value={peopleLoading ? '...' : String(stats.ativos)}
          icon={UserCheck}
          hint="Pessoas liberadas"
        />
        <StatCard
          title="Inativos"
          value={peopleLoading ? '...' : String(stats.inativos)}
          icon={Clock3}
          hint="Cadastros sem atividade"
        />
        <StatCard
          title="Bloqueados"
          value={peopleLoading ? '...' : String(stats.bloqueados)}
          icon={UserX}
          hint="Acesso restrito"
        />
        <StatCard
          title="Com app"
          value={peopleLoading ? '...' : String(stats.appAccess)}
          icon={KeyRound}
          hint="Usuários com login"
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar por nome, unidade, telefone ou documento..."
              className="border-0 bg-transparent p-0 text-white shadow-none placeholder:text-slate-500 focus-visible:ring-0"
            />
          </label>

          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="vencido">Vencido</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </label>

          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="all">Todos os tipos</option>
              <option value="morador">Moradores</option>
              <option value="visitante">Visitantes</option>
              <option value="locatario">Locatários</option>
              <option value="prestador">Prestadores</option>
              <option value="funcionario">Funcionários</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Importar pessoas por CSV</h2>
            <p className="mt-1 text-sm text-slate-400">
              O arquivo pode trazer moradores, visitantes, locatários e prestadores. Se a unidade não existir, ela será criada antes do vínculo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadPeopleTemplate} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Baixar modelo
            </Button>
            <label className="cursor-pointer rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-200">
              Selecionar CSV
              <input type="file" accept=".csv,text/csv" onChange={handlePeopleCsvSelected} className="hidden" />
            </label>
          </div>
        </div>

        {peopleImportMessage ? (
          <p className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {peopleImportMessage}
          </p>
        ) : null}

        {peopleImportRows.length ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-400">
              <div className="col-span-1 text-center">Usar</div>
              <div className="col-span-3">Nome</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-3">Unidade</div>
              <div className="col-span-2">Situação</div>
              <div className="col-span-1">Linha</div>
            </div>
            <div className="divide-y divide-white/10">
              {peopleImportRows.map((row) => (
                <label key={row.line} className="grid grid-cols-12 items-center px-3 py-3 text-sm">
                  <div className="col-span-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => togglePeopleImportRow(row.line)}
                      disabled={Boolean(row.existing)}
                      className="h-4 w-4 accent-cyan-400 disabled:opacity-40"
                    />
                  </div>
                  <div className="col-span-3 font-medium text-white">{row.nome}</div>
                  <div className="col-span-2 text-slate-300">{getCategoryLabel(row.tipo)}</div>
                  <div className="col-span-3 text-slate-300">
                    {[row.structureLabel, row.unitLabel].filter(Boolean).join(' / ') || 'Não informada'}
                  </div>
                  <div className="col-span-2 text-slate-300">
                    {row.existing ? 'Já cadastrado' : row.unit ? 'Vincular unidade existente' : 'Criar unidade e vincular'}
                  </div>
                  <div className="col-span-1 text-slate-500">{row.line}</div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPeopleImportRows([]);
                  setPeopleImportMessage(null);
                }}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Cancelar importação
              </Button>
              <Button type="button" onClick={applyPeopleImport} disabled={saving} className="bg-white text-slate-950 hover:bg-slate-200">
                {saving ? 'Importando...' : 'Confirmar importação'}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {peopleError ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          Não foi possível carregar os moradores.
        </div>
      ) : null}

      {pageNotice ? (
        <div
          className={
            pageNotice.tone === 'warning'
              ? 'rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100'
              : 'rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-100'
          }
        >
          {pageNotice.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Pessoas cadastradas</h2>
            <p className="text-sm text-slate-400">
              {filteredMoradores.length} registro(s) encontrado(s)
            </p>
          </div>
          <Filter className="h-5 w-5 text-slate-400" />
        </div>

        {filteredMoradores.length === 0 ? (
          <div className="px-5 py-10">
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-center">
              <CircleOff className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-base font-medium">Nenhum cadastro encontrado</h3>
              <p className="mt-1 text-sm text-slate-400">
                Ajuste os filtros ou clique em Novo para cadastrar.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredMoradores.map((morador) => {
              const accessSummary = accessSummaryByPerson.get(morador.id);
              const appAccess = appAccessByResidentId.get(morador.id);

              return (
              <div
                key={morador.id}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[auto_1.2fr_0.7fr_0.7fr_0.6fr_auto] lg:items-center"
              >
                <button
                  type="button"
                  onClick={() => openViewMorador(morador)}
                  className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-xs text-slate-400"
                  aria-label={`Ver detalhes de ${morador.nome}`}
                >
                  {morador.avatarUrl && !brokenMoradorImageUrls[morador.avatarUrl] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={morador.avatarUrl}
                      alt={morador.nome}
                      className="h-full w-full object-cover"
                      onError={() => markMoradorImageAsUnavailable(morador.avatarUrl)}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">Sem foto</span>
                  )}
                </button>
                <div>
                  <p className="font-medium text-white">{morador.nome}</p>
                  <p className="text-sm text-slate-400">
                    {safeText(morador.localizacao, [safeText(morador.condominio), safeText(morador.estruturaLabel), safeText(morador.unidade)].filter(Boolean).join(' / ') || 'Localização não informada')}
                  </p>
                  {(getFaceStatusLabel(morador.faceStatus) || morador.faceListSyncStatus) ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {getFaceStatusLabel(morador.faceStatus) ? (
                        <span className={`rounded-full border px-2 py-1 ${
                          morador.faceStatus === 'FACE_SYNCED'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                            : morador.faceStatus === 'FACE_ERROR'
                              ? 'border-red-500/30 bg-red-500/10 text-red-100'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                        }`}>
                          {getFaceStatusLabel(morador.faceStatus)}
                        </span>
                      ) : null}
                      {morador.faceListSyncStatus ? (
                        <span className={`rounded-full border px-2 py-1 ${
                          String(morador.faceListSyncStatus).toUpperCase() === 'SYNCED'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                            : String(morador.faceListSyncStatus).toUpperCase() === 'ERROR' || String(morador.faceListSyncStatus).toUpperCase() === 'FAILED'
                              ? 'border-red-500/30 bg-red-500/10 text-red-100'
                              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'
                        }`}>
                          Lista facial: {getFaceListSyncLabel(morador.faceListSyncStatus)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <p>Última entrada: {formatAccessDateTime(accessSummary?.entryAt)}</p>
                    <p>Última saída: {formatAccessDateTime(accessSummary?.exitAt)}</p>
                  </div>
                </div>

                <div className="text-sm text-slate-300">
                  {morador.telefone?.trim() ? maskPhone(morador.telefone) : 'Sem telefone'}
                </div>

                <div className="text-sm text-slate-300">
                  {morador.documento?.trim() ? maskDocument(morador.documento) : 'Sem documento'}
                </div>

                <div>
                  <Badge className={getPersonStatusBadgeClass(morador.status)}>
                    {safeText(morador.status, 'ativo')}
                  </Badge>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openViewMorador(morador)}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    aria-label="Visualizar morador"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openResidentAppAccess(morador)}
                    className={
                      appAccess
                        ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-50 hover:bg-emerald-400/25'
                        : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20'
                    }
                    aria-label={appAccess ? 'Morador com acesso ao app' : 'Criar acesso ao app'}
                    title={appAccess ? `Com acesso ao app: ${maskEmail(appAccess.email)}` : 'Criar acesso ao app'}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openEditMorador(morador)}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    aria-label="Editar morador"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => deleteMorador(morador.id)}
                    disabled={deletingId === morador.id}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    aria-label="Inativar morador"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )})}
          </div>
        )}
      </section>

      <CrudModal
        open={openCreate}
        title="Novo morador"
        description="Cadastre um novo morador na API externa."
        onClose={closeModals}
        maxWidth="xl"
      >
        {submitError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </div>
        ) : null}
        <MoradorForm
          initialData={
            currentCondominium
              ? {
                  condominio: currentCondominium.name,
                  photoUrl: '',
                  photoSource: 'upload',
                  cameraId: '',
                  documentType: '',
                    birthDate: '',
                    allowMinorFaceSync: false,
                    guardianName: '',
                    guardianDocument: '',
                    guardianRelationship: '',
                  }
                : undefined
            }
          onSubmit={createMorador}
          onCancel={closeModals}
          loading={saving}
          condominiumLocked={!!currentCondominium}
          availableUnits={availableUnits}
          catalogLoading={catalogLoading}
          emailReadOnly={false}
          cameras={cameras}
          existingResidents={moradores}
        />
      </CrudModal>

      <CrudModal
        open={openView}
        title="Detalhes do cadastro"
        description="Informações completas da pessoa selecionada."
        onClose={closeModals}
        maxWidth="lg"
      >
        {selectedMorador ? (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => openResidentAppAccess(selectedMorador)}
                className={
                  selectedMoradorAppAccess
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/20'
                    : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20'
                }
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {selectedMoradorAppAccess ? 'Acesso ao app ativo' : 'Criar acesso ao app'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleManualFaceSync}
                disabled={syncingFace || !selectedMorador.avatarUrl}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                {syncingFace
                  ? 'Sincronizando face...'
                  : isPublicFaceSyncCandidate(selectedMorador.avatarUrl)
                    ? 'Sincronizar com reconhecimento facial'
                    : 'Foto fora do padrão de sincronização'}
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {!selectedMorador.avatarUrl
                ? 'Este morador ainda não possui foto vinculada para sincronização facial.'
                : isPublicFaceSyncCandidate(selectedMorador.avatarUrl)
                  ? 'A foto atual já está em formato aceito pelo backend para sincronização facial.'
                  : 'A foto atual não está no formato esperado pelo backend. Salve novamente o morador para processar a imagem via upload oficial ou captura da câmera.'}
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${selectedMoradorAppAccess ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'}`}>
              {selectedMoradorAppAccess
                ? `Este morador já tem acesso ao app pelo e-mail ${selectedMoradorAppAccess.email}.`
                : 'Este morador ainda não tem acesso ao app. Use o botão "Criar acesso ao app" para gerar login e senha.'}
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                selectedMorador.faceStatus === 'FACE_SYNCED'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                  : selectedMorador.faceStatus === 'FACE_ERROR'
                    ? 'border-red-500/30 bg-red-500/10 text-red-100'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              }`}
            >
              {selectedMorador.faceStatus === 'FACE_SYNCED'
                ? 'Face sincronizada com sucesso.'
                : selectedMorador.faceStatus === 'FACE_PENDING_SYNC'
                  ? 'Face pendente de sincronização.'
                  : selectedMorador.faceStatus === 'FACE_ERROR'
                    ? `Sincronização facial com erro${selectedMorador.faceErrorMessage ? `: ${selectedMorador.faceErrorMessage}` : '.'}`
                    : selectedMorador.faceStatus === 'PHOTO_ONLY'
                      ? 'Há foto cadastrada, mas a face ainda não foi sincronizada.'
                    : 'Morador sem foto processada para o fluxo facial.'}
            </div>

            {(selectedMorador.faceListSyncStatus || selectedMorador.faceListSyncError) ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  String(selectedMorador.faceListSyncStatus ?? '').toUpperCase() === 'SYNCED'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : String(selectedMorador.faceListSyncStatus ?? '').toUpperCase() === 'ERROR' || String(selectedMorador.faceListSyncStatus ?? '').toUpperCase() === 'FAILED'
                      ? 'border-red-500/30 bg-red-500/10 text-red-100'
                      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'
                }`}
              >
                <p className="font-medium">Sincronizacao da lista facial: {getFaceListSyncLabel(selectedMorador.faceListSyncStatus)}</p>
                {selectedMorador.faceListSyncError ? (
                  <p className="mt-1 text-xs opacity-90">{selectedMorador.faceListSyncError}</p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Nome</p>
              <p className="mt-2 text-base font-medium text-white">{selectedMorador.nome}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Foto</p>
              <div className="mt-3 flex items-center gap-4">
                {selectedMorador.avatarUrl && !selectedMoradorPhotoUnavailable ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedMorador.avatarUrl}
                    alt={selectedMorador.nome}
                    className="h-48 w-48 rounded-2xl object-cover"
                    onError={() => markMoradorImageAsUnavailable(selectedMorador.avatarUrl)}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 text-xs text-slate-400">
                    {selectedMoradorPhotoUnavailable ? 'Foto indisponível' : 'Sem foto'}
                  </div>
                )}
                <p className="text-sm text-slate-400">
                  A foto cadastrada aqui será usada futuramente na integração com leitores faciais e câmeras com IA.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Categoria</p>
              <p className="mt-2 text-base font-medium text-white">{getCategoryLabel(selectedMorador.categoria)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Telefone</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{safeText(selectedMorador.telefone, 'Não informado')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Documento</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{safeText(selectedMorador.documento, 'Não informado')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Localização</span>
              </div>
              <p className="mt-2 text-base font-medium text-white">{getFriendlyLocation(selectedMorador)}</p>
            </div>
             <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
               <div className="flex items-center gap-2 text-slate-400">
                 <Mail className="h-4 w-4" />
                 <span className="text-xs uppercase tracking-[0.18em]">E-mail</span>
               </div>
               <p className="mt-2 text-base font-medium text-white">{safeText(selectedMorador.email, 'Não informado')}</p>
             </div>
             <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
               <div className="flex items-center gap-2 text-slate-400">
                 <Clock3 className="h-4 w-4" />
                 <span className="text-xs uppercase tracking-[0.18em]">Última entrada</span>
               </div>
               <p className="mt-2 text-base font-medium text-white">
                 {formatAccessDateTime(selectedMoradorAccessSummary?.entryAt)}
               </p>
             </div>
             <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
               <div className="flex items-center gap-2 text-slate-400">
                 <Clock3 className="h-4 w-4" />
                 <span className="text-xs uppercase tracking-[0.18em]">Última saída</span>
               </div>
               <p className="mt-2 text-base font-medium text-white">
                 {formatAccessDateTime(selectedMoradorAccessSummary?.exitAt)}
               </p>
             </div>
             <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
               <div className="flex items-center gap-2 text-slate-400">
                 <Clock3 className="h-4 w-4" />
                 <span className="text-xs uppercase tracking-[0.18em]">Face atualizada em</span>
               </div>
               <p className="mt-2 text-base font-medium text-white">
                 {formatAccessDateTime(selectedMorador.faceUpdatedAt)}
               </p>
             </div>
             <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
               <div className="flex items-center gap-2 text-slate-400">
                 <Clock3 className="h-4 w-4" />
                 <span className="text-xs uppercase tracking-[0.18em]">Status da lista facial</span>
               </div>
               <p className="mt-2 text-base font-medium text-white">
                 {getFaceListSyncLabel(selectedMorador.faceListSyncStatus)}
               </p>
             </div>
             </div>
           </div>
         ) : null}
      </CrudModal>

      <CrudModal
        open={openEdit}
        title="Editar morador"
        description="Atualize os dados do morador selecionado."
        onClose={closeModals}
        maxWidth="xl"
      >
        {submitError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </div>
        ) : null}
        <MoradorForm
          initialData={
            selectedMorador
              ? (() => {
                  return {
                  nome: selectedMorador.nome,
                  email: selectedMorador.email ?? '',
                  telefone: selectedMorador.telefone ?? '',
                  documento: selectedMorador.documento ?? '',
                  documentType: selectedMorador.documentType ?? '',
                    birthDate: '',
                    allowMinorFaceSync: false,
                    guardianName: '',
                    guardianDocument: '',
                    guardianRelationship: '',
                    condominio: currentCondominium?.name ?? selectedMorador.condominio ?? '',
                  estrutura: `${selectedMorador.unit?.structureType ?? selectedMorador.unit?.structure?.type ?? 'STREET'}::${selectedMorador.estruturaLabel ?? selectedMorador.bloco ?? ''}`,
                  unitId: selectedMorador.unit?.id ?? '',
                  tipo: normalizeMoradorCategory(selectedMorador.categoria),
                  status: normalizeMoradorStatus(selectedMorador.status),
                  photoUrl: selectedMorador.avatarUrl ?? '',
                  photoSource: 'upload',
                  cameraId: '',
                };
              })()
              : undefined
          }
          onSubmit={updateMorador}
          onCancel={closeModals}
          loading={saving}
          condominiumLocked={!!currentCondominium}
          availableUnits={availableUnits}
          catalogLoading={catalogLoading}
          cameras={cameras}
          existingResidents={moradores}
        />
      </CrudModal>
    </div>
  );
}


