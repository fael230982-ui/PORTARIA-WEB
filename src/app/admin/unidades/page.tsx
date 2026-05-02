'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Cctv, Car, Eye, Home, Package, Pencil, Plus, RefreshCw, Users } from 'lucide-react';
import { maskDocument, maskEmail, maskPhone } from '@/features/legal/data-masking';
import { getApiErrorMessage } from '@/features/http/api-error';
import { getStructureTypeLabel } from '@/features/people/morador-normalizers';
import { brandClasses } from '@/config/brand-classes';
import { CrudModal } from '@/components/admin/CrudModal';
import { TimedAlert } from '@/components/ui/timed-alert';
import { useOfflineOperationQueue } from '@/hooks/use-offline-operation-queue';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAllPeople } from '@/hooks/use-people';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useVehicles } from '@/hooks/use-vehicles';
import { useCameras } from '@/hooks/use-cameras';
import { useDeliveries } from '@/hooks/use-deliveries';
import { useAccessLogs } from '@/hooks/use-access-logs';
import { ensureResidenceUnit, updateResidenceUnit } from '@/services/residence.service';
import type { Unit, UnitStructureType } from '@/types/condominium';
import type { Camera as CameraRecord } from '@/types/camera';
import type { Delivery } from '@/types/delivery';
import type { AccessLog } from '@/types/access-log';
import type { Person, PersonCategory } from '@/types/person';
import type { Vehicle } from '@/types/vehicle';

type UnitFormState = {
  structureType: UnitStructureType;
  structureLabel: string;
  unitLabel: string;
};

type UnitImportRow = UnitFormState & {
  line: number;
  existingUnit?: Unit | null;
  selected: boolean;
};

type UnidadesSnapshotCache = {
  condominiums: Unit['condominium'][];
  units: Unit[];
  people: Person[];
  vehicles: Vehicle[];
  deliveries: Delivery[];
  cameras: CameraRecord[];
  accessLogs: AccessLog[];
  cachedAt: string | null;
};

const defaultForm: UnitFormState = {
  structureType: 'STREET',
  structureLabel: '',
  unitLabel: '',
};

const personCategoryGroups: Array<{ key: PersonCategory | 'OTHER'; title: string }> = [
  { key: 'RESIDENT', title: 'Moradores' },
  { key: 'SERVICE_PROVIDER', title: 'Prestadores' },
  { key: 'RENTER', title: 'Locatários' },
  { key: 'VISITOR', title: 'Visitantes' },
  { key: 'DELIVERER', title: 'Entregadores' },
  { key: 'OTHER', title: 'Outras categorias' },
];

const unitCsvTemplate = 'tipo_estrutura;estrutura;unidade\nSTREET;RUA 1;101\nBLOCK;A;202\nQUAD;QUADRA 2;LOTE 15\n';

function toUpperTrim(value: string) {
  return value.trim().toUpperCase();
}

function normalizeUnitRef(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
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

function parseUnitCsv(content: string, existingUnits: Unit[]): UnitImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => ({ raw: line, trimmed: line.trim() }))
    .filter((line) => Boolean(line.trimmed));

  if (lines.length < 2) return [];

  const delimiter = detectCsvDelimiter(lines[0].trimmed);
  const headers = parseCsvLine(lines[0].trimmed, delimiter).map(normalizeCsvHeader);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line.trimmed, delimiter);
    const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? '']));
    const structureType = String(row.tipo_estrutura || row.tipo || row.structure_type || 'STREET').trim().toUpperCase() as UnitStructureType;
    const structureLabel = toUpperTrim(String(row.estrutura || row.rua || row.bloco || row.quadra || row.structure || ''));
    const unitLabel = toUpperTrim(String(row.unidade || row.casa || row.apartamento || row.unit || ''));
    const existingUnit =
      existingUnits.find((unit) =>
        normalizeUnitRef(unit.label) === normalizeUnitRef(unitLabel) &&
        normalizeUnitRef(unit.structure?.label) === normalizeUnitRef(structureLabel)
      ) ?? null;

    return {
      line: index + 2,
      structureType: ['STREET', 'BLOCK', 'QUAD', 'LOT'].includes(structureType) ? structureType : 'STREET',
      structureLabel,
      unitLabel,
      existingUnit,
      selected: !existingUnit,
    };
  }).filter((row) => row.structureLabel && row.unitLabel);
}

function buildFriendlyUnitImportError(
  failedRows: Array<{ row: UnitImportRow; message: string }>,
  successCount: number
) {
  const previewItems = failedRows.slice(0, 3).map(({ row }) => `${row.structureLabel} / ${row.unitLabel}`);
  const remainingCount = Math.max(failedRows.length - previewItems.length, 0);
  const previewText = previewItems.length > 0 ? previewItems.join(', ') : '';
  const tailText = remainingCount > 0 ? ` e mais ${remainingCount}` : '';
  const successText =
    successCount > 0 ? `${successCount} unidade(s) já foram importadas ou atualizadas.` : 'Nenhuma unidade foi importada nesta tentativa.';

  return `Importação parcial. ${successText} ${failedRows.length} linha(s) precisam de revisão.${previewText ? ` Exemplos: ${previewText}${tailText}.` : ''}`;
}

function buildUnitImportDetail(
  failedRows: Array<{ row: UnitImportRow; message: string }>,
  successCount: number
) {
  const headline =
    successCount > 0
      ? `${successCount} unidade(s) deram certo. ${failedRows.length} ficaram pendentes.`
      : `${failedRows.length} linha(s) ficaram pendentes.`;

  const detailLines = failedRows.map(
    ({ row, message }) => `Linha ${row.line} - ${row.structureLabel} / ${row.unitLabel}: ${message}`
  );

  return `${headline} ${detailLines.join(' | ')}`;
}

function isLinkedToUnit(person: Person, unit: Unit) {
  const unitRefs = new Set(
    [unit.id, unit.legacyUnitId, unit.label]
      .map(normalizeUnitRef)
      .filter(Boolean)
  );

  return [person.unitId, person.unitName, person.unit?.id, person.unit?.legacyUnitId, person.unit?.label]
    .map(normalizeUnitRef)
    .some((value) => unitRefs.has(value));
}

function isVehicleLinkedToUnit(vehicle: Vehicle, unit: Unit) {
  const unitRefs = new Set(
    [unit.id, unit.legacyUnitId, unit.label]
      .map(normalizeUnitRef)
      .filter(Boolean)
  );

  return [vehicle.unitId, vehicle.unitLabel]
    .map(normalizeUnitRef)
    .some((value) => unitRefs.has(value));
}

function isDeliveryLinkedToUnit(delivery: Delivery, unit: Unit) {
  const unitRefs = new Set(
    [unit.id, unit.legacyUnitId, unit.label]
      .map(normalizeUnitRef)
      .filter(Boolean)
  );

  return [delivery.recipientUnitId]
    .map(normalizeUnitRef)
    .some((value) => unitRefs.has(value));
}

function isCameraLinkedToUnit(camera: CameraRecord, unit: Unit) {
  const unitRefs = new Set(
    [unit.id, unit.legacyUnitId, unit.label]
      .map(normalizeUnitRef)
      .filter(Boolean)
  );

  return [camera.unitId]
    .map(normalizeUnitRef)
    .some((value) => unitRefs.has(value));
}

function getPersonCategoryLabel(category: PersonCategory | string) {
  if (category === 'RESIDENT') return 'Morador';
  if (category === 'SERVICE_PROVIDER') return 'Prestador';
  if (category === 'RENTER') return 'Locatário';
  if (category === 'VISITOR') return 'Visitante';
  if (category === 'DELIVERER') return 'Entregador';
  return String(category || 'Pessoa');
}

function getMaskedPersonQuickContact(person: Person) {
  if (person.document?.trim()) return maskDocument(person.document);
  if (person.phone?.trim()) return maskPhone(person.phone);
  if (person.email?.trim()) return maskEmail(person.email);
  return 'Sem contato/documento';
}

function getUnidadesSnapshotKey(userId?: string | null) {
  return userId ? `admin-unidades-snapshot:${userId}` : null;
}

function readUnidadesSnapshot(userId?: string | null): UnidadesSnapshotCache {
  if (typeof window === 'undefined') {
    return { condominiums: [], units: [], people: [], vehicles: [], deliveries: [], cameras: [], accessLogs: [], cachedAt: null };
  }

  const key = getUnidadesSnapshotKey(userId);
  if (!key) {
    return { condominiums: [], units: [], people: [], vehicles: [], deliveries: [], cameras: [], accessLogs: [], cachedAt: null };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { condominiums: [], units: [], people: [], vehicles: [], deliveries: [], cameras: [], accessLogs: [], cachedAt: null };
    const parsed = JSON.parse(raw) as Partial<UnidadesSnapshotCache>;
    return {
      condominiums: Array.isArray(parsed.condominiums) ? parsed.condominiums : [],
      units: Array.isArray(parsed.units) ? parsed.units : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
      cameras: Array.isArray(parsed.cameras) ? parsed.cameras : [],
      accessLogs: Array.isArray(parsed.accessLogs) ? parsed.accessLogs : [],
      cachedAt: typeof parsed.cachedAt === 'string' ? parsed.cachedAt : null,
    };
  } catch {
    return { condominiums: [], units: [], people: [], vehicles: [], deliveries: [], cameras: [], accessLogs: [], cachedAt: null };
  }
}

function getUnidadesSnapshotSignature(snapshot: UnidadesSnapshotCache) {
  return JSON.stringify({
    condominiums: snapshot.condominiums,
    units: snapshot.units,
    people: snapshot.people,
    vehicles: snapshot.vehicles,
    deliveries: snapshot.deliveries,
    cameras: snapshot.cameras,
    accessLogs: snapshot.accessLogs,
  });
}

function persistUnidadesSnapshot(userId: string, snapshot: UnidadesSnapshotCache) {
  if (typeof window === 'undefined') return false;

  const key = getUnidadesSnapshotKey(userId);
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

export default function AdminUnidadesPage() {
  const router = useRouter();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'GERENTE', 'MASTER'],
  });
  const [snapshotCache, setSnapshotCache] = useState<UnidadesSnapshotCache>(() => readUnidadesSnapshot(null));
  const snapshotSignatureRef = useRef(
    getUnidadesSnapshotSignature({ condominiums: [], units: [], people: [], vehicles: [], deliveries: [], cameras: [], accessLogs: [], cachedAt: null })
  );
  const { isOnline } = useOfflineOperationQueue(Boolean(user));
  const { condominiums, units, refetchAll, isLoading } = useResidenceCatalog();
  const { data: peopleData } = useAllPeople({ limit: 100, enabled: Boolean(user) });
  const { data: vehiclesData } = useVehicles(Boolean(user));
  const { data: deliveriesData } = useDeliveries({ limit: 100, enabled: Boolean(user) });
  const { data: camerasData } = useCameras({ enabled: Boolean(user) });
  const [form, setForm] = useState<UnitFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [unitModalSearch, setUnitModalSearch] = useState('');
  const [handledInitialUnitQuery, setHandledInitialUnitQuery] = useState(false);
  const [unitImportRows, setUnitImportRows] = useState<UnitImportRow[]>([]);
  const [unitImportMessage, setUnitImportMessage] = useState<string | null>(null);
  const { data: accessLogsData } = useAccessLogs({ limit: 100, unitId: selectedUnit?.id, enabled: Boolean(user && selectedUnit) });

  const effectiveCondominiums = useMemo(
    () => (condominiums.length ? condominiums : !isOnline ? (snapshotCache.condominiums.filter(Boolean) as NonNullable<Unit['condominium']>[]) : []),
    [condominiums, isOnline, snapshotCache.condominiums]
  );
  const effectiveUnitsSource = useMemo(
    () => (units.length ? units : !isOnline ? snapshotCache.units : []),
    [isOnline, snapshotCache.units, units]
  );
  const effectivePeople = useMemo(
    () => (peopleData?.data?.length ? peopleData.data : !isOnline ? snapshotCache.people : []),
    [isOnline, peopleData?.data, snapshotCache.people]
  );
  const effectiveVehicles = useMemo(
    () => ((vehiclesData?.data ?? []).length ? vehiclesData?.data ?? [] : !isOnline ? snapshotCache.vehicles : []),
    [isOnline, snapshotCache.vehicles, vehiclesData?.data]
  );
  const effectiveDeliveries = useMemo(
    () => ((deliveriesData?.data ?? []).length ? deliveriesData?.data ?? [] : !isOnline ? snapshotCache.deliveries : []),
    [deliveriesData?.data, isOnline, snapshotCache.deliveries]
  );
  const effectiveCameras = useMemo(
    () => ((camerasData?.data ?? []).length ? camerasData?.data ?? [] : !isOnline ? snapshotCache.cameras : []),
    [camerasData?.data, isOnline, snapshotCache.cameras]
  );
  const effectiveAccessLogs = useMemo(
    () => ((accessLogsData?.data ?? []).length ? accessLogsData?.data ?? [] : !isOnline ? snapshotCache.accessLogs : []),
    [accessLogsData?.data, isOnline, snapshotCache.accessLogs]
  );

  const currentCondominium = useMemo(() => {
    if (!user?.condominiumId) return null;
    return effectiveCondominiums.find((item) => item?.id === user.condominiumId) ?? null;
  }, [effectiveCondominiums, user?.condominiumId]);

  const condominiumUnits = useMemo(() => {
    if (!user?.condominiumId) return effectiveUnitsSource;

    return effectiveUnitsSource
      .filter((unit) => unit.condominiumId === user.condominiumId)
      .sort((a, b) => {
        const structureCompare = (a.structure?.label ?? '').localeCompare(b.structure?.label ?? '', 'pt-BR');
        if (structureCompare !== 0) return structureCompare;
        return a.label.localeCompare(b.label, 'pt-BR');
      });
  }, [effectiveUnitsSource, user?.condominiumId]);

  useEffect(() => {
    const nextSnapshot = readUnidadesSnapshot(user?.id ?? null);
    snapshotSignatureRef.current = getUnidadesSnapshotSignature(nextSnapshot);
    setSnapshotCache(nextSnapshot);
  }, [user?.id]);

  useEffect(() => {
    if (!user || typeof window === 'undefined' || condominiumUnits.length === 0) return;
    const key = getUnidadesSnapshotKey(user.id);
    if (!key) return;

    const nextSnapshot: UnidadesSnapshotCache = {
      condominiums: effectiveCondominiums,
      units: condominiumUnits,
      people: effectivePeople,
      vehicles: effectiveVehicles,
      deliveries: effectiveDeliveries,
      cameras: effectiveCameras,
      accessLogs: effectiveAccessLogs,
      cachedAt: new Date().toISOString(),
    };
    const nextSnapshotSignature = getUnidadesSnapshotSignature(nextSnapshot);

    if (nextSnapshotSignature === snapshotSignatureRef.current) {
      return;
    }

    if (persistUnidadesSnapshot(user.id, nextSnapshot)) {
      snapshotSignatureRef.current = nextSnapshotSignature;
      setSnapshotCache((current) =>
        getUnidadesSnapshotSignature(current) === nextSnapshotSignature ? current : nextSnapshot
      );
    }
  }, [condominiumUnits, effectiveAccessLogs, effectiveCameras, effectiveCondominiums, effectiveDeliveries, effectivePeople, effectiveVehicles, user]);

  useEffect(() => {
    if (handledInitialUnitQuery || condominiumUnits.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const unitId = params.get('unitId');
    if (!unitId) {
      setHandledInitialUnitQuery(true);
      return;
    }

    const unit = condominiumUnits.find((item) => item.id === unitId || item.legacyUnitId === unitId);
    if (unit) {
      setSelectedUnit(unit);
    }

    setHandledInitialUnitQuery(true);
  }, [condominiumUnits, handledInitialUnitQuery]);

  const selectedUnitPeople = useMemo(() => {
    if (!selectedUnit) return [];
    return effectivePeople
      .filter((person) => isLinkedToUnit(person, selectedUnit))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [effectivePeople, selectedUnit]);

  const selectedUnitVehicles = useMemo(() => {
    if (!selectedUnit) return [];
    return effectiveVehicles
      .filter((vehicle) => isVehicleLinkedToUnit(vehicle, selectedUnit))
      .sort((a, b) => a.plate.localeCompare(b.plate, 'pt-BR'));
  }, [effectiveVehicles, selectedUnit]);
  const selectedUnitDeliveries = useMemo(() => {
    if (!selectedUnit) return [];
    return effectiveDeliveries
      .filter((delivery) => isDeliveryLinkedToUnit(delivery, selectedUnit))
      .sort((a, b) => new Date(b.receivedAt ?? '').getTime() - new Date(a.receivedAt ?? '').getTime());
  }, [effectiveDeliveries, selectedUnit]);
  const selectedUnitCameras = useMemo(() => {
    if (!selectedUnit) return [];
    return effectiveCameras
      .filter((camera) => isCameraLinkedToUnit(camera, selectedUnit))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [effectiveCameras, selectedUnit]);
  const selectedUnitAccessLogs = useMemo(() => {
    if (!selectedUnit) return [];

    const personIds = new Set(selectedUnitPeople.map((person) => person.id));
    const cameraIds = new Set(selectedUnitCameras.map((camera) => camera.id));
    const unitRefs = [selectedUnit.id, selectedUnit.legacyUnitId, selectedUnit.label]
      .map(normalizeUnitRef)
      .filter(Boolean);

    return effectiveAccessLogs
      .filter((log: AccessLog) => {
        if (log.personId && personIds.has(log.personId)) return true;
        if (log.cameraId && cameraIds.has(log.cameraId)) return true;
        const location = normalizeUnitRef(log.location);
        return Boolean(location && unitRefs.some((ref) => location.includes(ref)));
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [effectiveAccessLogs, selectedUnit, selectedUnitCameras, selectedUnitPeople]);
  const selectedUnitPending = useMemo(
    () => ({
      deliveries: selectedUnitDeliveries.filter((delivery) => delivery.status !== 'WITHDRAWN').length,
      blockedVehicles: selectedUnitVehicles.filter((vehicle) => vehicle.status === 'bloqueado').length,
      offlineCameras: selectedUnitCameras.filter((camera) => camera.status === 'OFFLINE').length,
      activeVisitors: selectedUnitPeople.filter((person) => ['VISITOR', 'SERVICE_PROVIDER', 'RENTER', 'DELIVERER'].includes(person.category) && person.status === 'ACTIVE').length,
    }),
    [selectedUnitCameras, selectedUnitDeliveries, selectedUnitPeople, selectedUnitVehicles]
  );
  const filteredSelectedUnitPeople = useMemo(() => {
    const query = unitModalSearch.trim().toLowerCase();
    if (!query) return selectedUnitPeople;

    return selectedUnitPeople.filter((person) =>
      [person.name, person.document, person.phone, person.email, getPersonCategoryLabel(person.category)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [selectedUnitPeople, unitModalSearch]);

  const selectedUnitPeopleByCategory = useMemo(() => {
    const grouped = new Map<PersonCategory | 'OTHER', Person[]>();

    for (const group of personCategoryGroups) {
      grouped.set(group.key, []);
    }

    for (const person of filteredSelectedUnitPeople) {
      const key = personCategoryGroups.some((group) => group.key === person.category)
        ? person.category
        : 'OTHER';
      grouped.set(key, [...(grouped.get(key) ?? []), person]);
    }

    return grouped;
  }, [filteredSelectedUnitPeople]);

  const getUnitLinksCount = (unit: Unit) => {
    const peopleCount = (peopleData?.data ?? []).filter((person) => isLinkedToUnit(person, unit)).length;
    const vehiclesCount = (vehiclesData?.data ?? []).filter((vehicle) => isVehicleLinkedToUnit(vehicle, unit)).length;
    const deliveriesCount = (deliveriesData?.data ?? []).filter((delivery) => isDeliveryLinkedToUnit(delivery, unit)).length;
    const camerasCount = (camerasData?.data ?? []).filter((camera) => isCameraLinkedToUnit(camera, unit)).length;
    return peopleCount + vehiclesCount + deliveriesCount + camerasCount;
  };

  const formatStructureLabel = (structureType?: UnitStructureType | null, structureLabel?: string | null) => {
    const typeLabel = getStructureTypeLabel(structureType ?? 'STREET');
    const label = String(structureLabel ?? '').trim();

    if (typeLabel && label) return `${typeLabel} / ${label}`;
    if (typeLabel) return typeLabel;
    return label || '-';
  };

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando unidades...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  const handleChange = (field: keyof UnitFormState, value: string) => {
    setMessage(null);
    setError(null);
    setForm((prev) => ({
      ...prev,
      [field]: field === 'structureType' ? value : value.toUpperCase(),
    }));
  };

  const openEditUnit = (unit: Unit) => {
    setMessage(null);
    setError(null);
    setEditingUnit(unit);
      setForm({
        structureType: unit.structureType ?? unit.structure?.type ?? 'STREET',
        structureLabel: toUpperTrim(unit.structure?.label ?? ''),
        unitLabel: toUpperTrim(unit.label),
      });
  };

  const handleCreateUnit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentCondominium) {
      setError('Admin sem condomínio vinculado.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        condominiumId: currentCondominium.id,
        condominiumName: currentCondominium.name,
        structureType: form.structureType,
        structureLabel: form.structureLabel,
        unitLabel: form.unitLabel,
      };

      const result = editingUnit
        ? await updateResidenceUnit(editingUnit.id, payload)
        : await ensureResidenceUnit(payload);

      setMessage(
        editingUnit
          ? `Unidade ${result.unit.label} atualizada com sucesso.`
          : `Unidade ${result.unit.label} vinculada a ${result.street.name} pronta para uso.`
      );
      setForm(defaultForm);
      setEditingUnit(null);
      await refetchAll();
    } catch (err) {
      const messageText =
        err instanceof Error && err.message
          ? err.message
          : getApiErrorMessage(err, {
              fallback: 'Não foi possível criar a unidade.',
              byStatus: {
                400: 'Confira os dados da unidade antes de salvar.',
                401: 'Sua sessão expirou. Entre novamente.',
                403: 'Seu perfil não tem permissão para criar unidades.',
                500: 'O backend falhou ao criar a unidade. Verifique a estrutura, a unidade e o cadastro-base do condomínio.',
              },
            });
      setError(messageText);
    } finally {
      setSaving(false);
    }
  };

  const downloadUnitTemplate = () => {
    const blob = new Blob([unitCsvTemplate], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-unidades.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUnitCsvSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setUnitImportMessage(null);
    setError(null);

    if (!file) return;

    const content = await file.text();
    const rows = parseUnitCsv(content, condominiumUnits);
    setUnitImportRows(rows);

    if (!rows.length) {
      setError('O arquivo não possui unidades válidas. Baixe o modelo e preencha estrutura e unidade.');
      return;
    }

    const existingCount = rows.filter((row) => row.existingUnit).length;
    setUnitImportMessage(
      existingCount
        ? `${rows.length} unidade(s) encontrada(s). ${existingCount} já existem e só serão atualizadas se você confirmar.`
        : `${rows.length} unidade(s) pronta(s) para importação.`
    );
  };

  const toggleUnitImportRow = (line: number) => {
    setUnitImportRows((current) =>
      current.map((row) => row.line === line ? { ...row, selected: !row.selected } : row)
    );
  };

  const applyUnitImport = async () => {
    if (!currentCondominium) {
      setError('Admin sem condomínio vinculado.');
      return;
    }

    const selectedRows = unitImportRows.filter((row) => row.selected);
    if (!selectedRows.length) {
      setError('Selecione ao menos uma unidade para importar ou atualizar.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const failedRows: Array<{ row: UnitImportRow; message: string }> = [];
      let successCount = 0;

      for (const row of selectedRows) {
        const payload = {
          condominiumId: currentCondominium.id,
          condominiumName: currentCondominium.name,
          structureType: row.structureType,
          structureLabel: row.structureLabel,
          unitLabel: row.unitLabel,
        };

        try {
          if (row.existingUnit) {
            await updateResidenceUnit(row.existingUnit.id, payload);
          } else {
            await ensureResidenceUnit(payload);
          }
          successCount += 1;
        } catch (rowError) {
          failedRows.push({
            row,
            message: getApiErrorMessage(rowError, {
              fallback: 'Não foi possível importar esta unidade.',
              byStatus: {
                400: 'O backend recusou os dados desta linha.',
                401: 'Sessão expirada.',
                403: 'Sem permissão para importar unidades.',
                500: 'O backend falhou ao criar esta unidade.',
              },
            }),
          });
        }
      }

      if (successCount > 0) {
        const successMessage =
          failedRows.length === 0
            ? `${successCount} unidade(s) importada(s) ou atualizada(s) com sucesso.`
            : `${successCount} unidade(s) importada(s) com sucesso. ${failedRows.length} falharam.`;
        setMessage(successMessage);
      } else {
        setMessage(null);
      }

      if (failedRows.length > 0) {
        setError(buildFriendlyUnitImportError(failedRows, successCount));
        setUnitImportMessage(buildUnitImportDetail(failedRows, successCount));
        setUnitImportRows((current) =>
          current.map((row) => ({
            ...row,
            selected: failedRows.some((failure) => failure.row.line === row.line),
          }))
        );
      } else {
        setError(null);
        setUnitImportRows([]);
        setUnitImportMessage(null);
      }

      await refetchAll();
    } catch (err) {
      setError(
        getApiErrorMessage(err, {
          fallback: 'Não foi possível importar as unidades.',
          byStatus: {
            400: 'O backend recusou os dados da importação.',
            401: 'Sua sessão expirou. Entre novamente.',
            403: 'Seu perfil não tem permissão para importar unidades.',
            500: 'O backend falhou ao processar a importação.',
          },
        })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isOnline ? (
        <section className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Modo offline em unidades</p>
          <p className="mt-1 text-xs opacity-90">
            A navegação consultiva está usando a última atualização salva{snapshotCache.cachedAt ? ` em ${new Date(snapshotCache.cachedAt).toLocaleString('pt-BR')}` : ''}. Novos cadastros e alterações podem demorar para refletir.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Condomínio</p>
              <p className="mt-2 text-xl font-semibold text-white">{currentCondominium?.name ?? 'Não vinculado'}</p>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Unidades</p>
              <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{isLoading ? '...' : String(condominiumUnits.length)}</p>
            </div>
            <Home className="h-5 w-5 text-slate-400" />
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <button
            type="button"
            onClick={() => refetchAll()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar catálogo
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estrutura física</p>
          <h1 className="mt-1 text-xl font-semibold text-white">{editingUnit ? `Editando unidade ${editingUnit.label}` : 'Unidades'}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cadastre unidades antes de vincular moradores. O formulario de moradores agora trabalha apenas com unidades existentes.
          </p>
        </div>

        {message && (
          <TimedAlert tone="success" onClose={() => setMessage(null)} className="mb-4">
            {message}
          </TimedAlert>
        )}

        {error && (
          <TimedAlert tone="error" onClose={() => setError(null)} className="mb-4">
            {error}
          </TimedAlert>
        )}

        <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Importar unidades por CSV</h2>
              <p className="mt-1 text-sm text-slate-400">
                Baixe o modelo, preencha os dados e confira a prévia antes de gravar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadUnitTemplate}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15"
              >
                Baixar modelo
              </button>
              <label className="cursor-pointer rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-200">
                Selecionar CSV
                <input type="file" accept=".csv,text/csv" onChange={handleUnitCsvSelected} className="hidden" />
              </label>
            </div>
          </div>

          {unitImportMessage ? (
            <p className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              {unitImportMessage}
            </p>
          ) : null}

          {unitImportRows.length ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                <div className="col-span-1 text-center">Usar</div>
                <div className="col-span-3">Unidade</div>
                <div className="col-span-3">Estrutura</div>
                <div className="col-span-3">Situação</div>
                <div className="col-span-2">Linha</div>
              </div>
              <div className="divide-y divide-white/10">
                {unitImportRows.map((row) => (
                  <label key={row.line} className="grid grid-cols-12 items-center px-3 py-3 text-sm">
                    <div className="col-span-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleUnitImportRow(row.line)}
                        className="h-4 w-4 accent-cyan-400"
                      />
                    </div>
                    <div className="col-span-3 font-medium text-white">{row.unitLabel}</div>
                    <div className="col-span-3 text-slate-300">{getStructureTypeLabel(row.structureType)} {row.structureLabel}</div>
                    <div className="col-span-3 text-slate-300">
                      {row.existingUnit ? 'Já existe. Marque para atualizar.' : 'Nova unidade'}
                    </div>
                    <div className="col-span-2 text-slate-500">{row.line}</div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setUnitImportRows([]);
                    setUnitImportMessage(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
                >
                  Cancelar importação
                </button>
                <button
                  type="button"
                  onClick={applyUnitImport}
                  disabled={saving}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  {saving ? 'Importando...' : 'Confirmar importação'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleCreateUnit} className="grid gap-3 md:grid-cols-[0.9fr_1.2fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Tipo de estrutura</span>
            <select
              value={form.structureType}
              onChange={(e) => handleChange('structureType', e.target.value as UnitStructureType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-white outline-none"
            >
              <option value="STREET">Rua</option>
              <option value="BLOCK">Bloco</option>
              <option value="QUAD">Quadra</option>
              <option value="LOT">Lote</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Estrutura</span>
            <input
              type="text"
              value={form.structureLabel}
              onChange={(e) => handleChange('structureLabel', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-white outline-none placeholder:text-slate-500"
              placeholder="Ex.: A, 3, Alameda Central"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Unidade</span>
            <input
              type="text"
              value={form.unitLabel}
              onChange={(e) => handleChange('unitLabel', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-white outline-none placeholder:text-slate-500"
              placeholder="Ex.: 101"
              required
            />
          </label>

          <div className="flex items-end gap-2">
            {editingUnit ? (
              <button
                type="button"
                onClick={() => {
                  setEditingUnit(null);
                  setForm(defaultForm);
                  setError(null);
                  setMessage(null);
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15"
              >
                Cancelar
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Salvando...' : editingUnit ? 'Salvar unidade' : 'Criar unidade'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-400">
            <div className="col-span-3">Unidade</div>
            <div className="col-span-4">Estrutura</div>
            <div className="col-span-3">Vínculos</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          <div className="divide-y divide-white/10">
            {condominiumUnits.map((unit) => (
              <div key={unit.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                <button
                  type="button"
                  onClick={() => setSelectedUnit(unit)}
                  className={`col-span-3 text-left font-medium text-white underline-offset-4 transition hover:underline ${brandClasses.accentTextSoft}`}
                >
                  {unit.label}
                </button>
                <div className="col-span-4 text-slate-300">
                  {formatStructureLabel(unit.structureType, unit.structure?.label)}
                </div>
                <div className="col-span-3 text-slate-300">
                  {getUnitLinksCount(unit)} vínculo(s)
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUnit(unit)}
                    className={`rounded-lg p-2 transition ${brandClasses.softAccentPanel} ${brandClasses.accentTextSoft}`}
                    aria-label="Ver vínculos da unidade"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditUnit(unit)}
                    className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/15"
                    aria-label="Editar unidade"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {!condominiumUnits.length && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Nenhuma unidade cadastrada para este condomínio.
              </div>
            )}
          </div>
        </div>
      </section>

      <CrudModal
        open={Boolean(selectedUnit)}
        title={selectedUnit ? `Vínculos da unidade ${selectedUnit.label}` : 'Vínculos da unidade'}
        description="Consulta operacional dos cadastros relacionados a esta unidade."
        onClose={() => {
          setSelectedUnit(null);
          setUnitModalSearch('');
        }}
        maxWidth="xl"
      >
        {selectedUnit ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Estrutura</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatStructureLabel(selectedUnit.structureType, selectedUnit.structure?.label)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Condomínio</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedUnit.condominium?.name ?? currentCondominium?.name ?? '-'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pessoas / veículos</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedUnitPeople.length} pessoa(s) e {selectedUnitVehicles.length} veículo(s)
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Operação</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedUnitDeliveries.length} encomenda(s) e {selectedUnitCameras.length} câmera(s)
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className={`rounded-2xl border p-3 ${selectedUnitPending.deliveries ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-white/[0.035]'}`}>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Encomendas pendentes</p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitPending.deliveries}</p>
              </div>
              <div className={`rounded-2xl border p-3 ${selectedUnitPending.blockedVehicles ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.035]'}`}>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Veículos bloqueados</p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitPending.blockedVehicles}</p>
              </div>
              <div className={`rounded-2xl border p-3 ${selectedUnitPending.offlineCameras ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.035]'}`}>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Câmeras offline</p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitPending.offlineCameras}</p>
              </div>
              <div className={`rounded-2xl border p-3 ${selectedUnitPending.activeVisitors ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-white/10 bg-white/[0.035]'}`}>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Acessos temporários ativos</p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitPending.activeVisitors}</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
              <input
                value={unitModalSearch}
                onChange={(event) => setUnitModalSearch(event.target.value)}
                placeholder="Buscar pessoa por nome, documento, telefone ou categoria..."
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => {
                  router.push('/admin/moradores');
                }}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
              >
                Ver moradores
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push('/dashboard/people');
                }}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
              >
                Ver pessoas
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push(`/admin/encomendas?unitId=${encodeURIComponent(selectedUnit.id)}&new=1`);
                }}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
              >
                Registrar encomenda
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push(`/admin/veiculos?unitId=${encodeURIComponent(selectedUnit.id)}&new=1`);
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${brandClasses.solidAccent}`}
              >
                Cadastrar veículo
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <Users className={`h-4 w-4 ${brandClasses.accentTextSoft}`} />
                  Pessoas
                </p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitPeople.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <Car className={`h-4 w-4 ${brandClasses.accentTextSoft}`} />
                  Veículos
                </p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitVehicles.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <Package className="h-4 w-4 text-amber-200" />
                  Encomendas
                </p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitDeliveries.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <Cctv className="h-4 w-4 text-emerald-200" />
                  Câmeras
                </p>
                <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white">{selectedUnitCameras.length}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {personCategoryGroups.map((group) => {
                const people = selectedUnitPeopleByCategory.get(group.key) ?? [];

                return (
                  <section key={group.key} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">{group.title}</h3>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{people.length}</span>
                    </div>

                    {people.length ? (
                      <div className="space-y-2">
                        {people.map((person) => (
                          <div key={person.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                            <p className="text-sm font-medium text-white">{person.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {getPersonCategoryLabel(person.category)} • {getMaskedPersonQuickContact(person)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                        Nenhum vínculo nesta categoria.
                      </p>
                    )}
                  </section>
                );
              })}

              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Car className={`h-4 w-4 ${brandClasses.accentTextSoft}`} />
                    Veículos
                  </h3>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{selectedUnitVehicles.length}</span>
                </div>

                {selectedUnitVehicles.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedUnitVehicles.map((vehicle) => (
                      <div key={vehicle.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                        <p className="text-sm font-medium text-white">{vehicle.plate}</p>
                        <p className="mt-1 text-xs text-slate-400 text-justify">
                          {[vehicle.brand, vehicle.model, vehicle.color, vehicle.ownerName].filter(Boolean).join(' • ') || 'Sem detalhes'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                    Nenhum veículo vinculado a esta unidade.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Package className="h-4 w-4 text-amber-200" />
                    Encomendas
                  </h3>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{selectedUnitDeliveries.length}</span>
                </div>

                {selectedUnitDeliveries.length ? (
                  <div className="space-y-2">
                    {selectedUnitDeliveries.slice(0, 8).map((delivery) => (
                      <div key={delivery.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                        <p className="text-sm font-medium text-white">{delivery.deliveryCompany || 'Encomenda'}</p>
                        <p className="mt-1 text-xs text-slate-400 text-justify">
                          {[delivery.trackingCode, delivery.status, delivery.receivedAt ? new Date(delivery.receivedAt).toLocaleDateString('pt-BR') : null].filter(Boolean).join(' • ') || 'Sem detalhes'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                    Nenhuma encomenda vinculada a esta unidade.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Cctv className="h-4 w-4 text-emerald-200" />
                    Câmeras
                  </h3>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{selectedUnitCameras.length}</span>
                </div>

                {selectedUnitCameras.length ? (
                  <div className="space-y-2">
                    {selectedUnitCameras.map((camera) => (
                      <div key={camera.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                        <p className="text-sm font-medium text-white">{camera.name}</p>
                        <p className="mt-1 text-xs text-slate-400 text-justify">
                          {[camera.location, camera.status, camera.snapshotUrl || camera.imageStreamUrl ? 'imagem configurada' : null].filter(Boolean).join(' • ') || 'Sem detalhes'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                    Nenhuma câmera vinculada a esta unidade.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">Histórico recente da unidade</h3>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{selectedUnitAccessLogs.length}</span>
                </div>

                {selectedUnitAccessLogs.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedUnitAccessLogs.slice(0, 8).map((log) => (
                      <div key={log.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                        <p className="text-sm font-medium text-white">{log.personName || log.cameraName || log.classificationLabel || 'Evento de acesso'}</p>
                        <p className="mt-1 text-xs text-slate-400 text-justify">
                          {[log.direction === 'ENTRY' ? 'Entrada' : 'Saída', log.result === 'ALLOWED' ? 'Liberado' : 'Negado', log.location, new Date(log.timestamp).toLocaleString('pt-BR')].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                    Nenhum evento recente encontrado para pessoas ou câmeras desta unidade.
                  </p>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </CrudModal>
    </div>
  );
}
