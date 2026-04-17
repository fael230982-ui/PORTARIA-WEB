import { api } from '@/lib/axios';
import type {
  Condominium,
  ResidenceFormData,
  Street,
  Unit,
  UnitStructureType,
} from '@/types/condominium';

type UnitApiResponse = {
  id: string;
  name: string;
  address?: string | null;
  streetId?: string | null;
  condominiumId?: string | null;
  condominiumName?: string | null;
  structureLabel?: string | null;
  legacyUnitId?: string | null;
};

function normalizeName(value: string) {
  return value.trim();
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUpper(value: string) {
  return value.trim().toUpperCase();
}

function parseStreetStructure(name: string | null | undefined): {
  type: UnitStructureType;
  label: string;
} {
  const raw = normalizeUpper(name ?? '');

  if (raw.startsWith('BLOCK:')) {
    return { type: 'BLOCK', label: raw.slice('BLOCK:'.length) };
  }

  if (raw.startsWith('QUAD:')) {
    return { type: 'QUAD', label: raw.slice('QUAD:'.length) };
  }

  if (raw.startsWith('LOT:')) {
    return { type: 'LOT', label: raw.slice('LOT:'.length) };
  }

  return { type: 'STREET', label: raw };
}

export function mapUnitApiToDomain(
  unit: UnitApiResponse,
  streets: Street[] = [],
  condominiums: Condominium[] = []
): Unit {
  const street = streets.find((item) => item.id === unit.streetId);
  const parsedStructure = parseStreetStructure(street?.name);
  const condominium = condominiums.find(
    (item) => item.id === (unit.condominiumId ?? street?.condominiumId)
  );

  return {
    id: unit.id,
    label: unit.name,
    condominiumName: unit.condominiumName ?? condominium?.name ?? null,
    condominiumId: unit.condominiumId ?? street?.condominiumId ?? null,
    condominium: condominium ?? null,
    structureType: street ? parsedStructure.type : null,
    structureLabel: unit.structureLabel ?? (street ? parsedStructure.label : null),
    structure: street
      ? {
          id: street.id,
          type: parsedStructure.type,
          label: parsedStructure.label,
        }
      : null,
    streetId: unit.streetId ?? null,
    legacyUnitId: unit.legacyUnitId ?? (street ? `${street.name}-${unit.name}` : unit.name),
  };
}

export async function getCondominiums(): Promise<Condominium[]> {
  const response = await api.get<Condominium[]>('/condominiums');
  return response.data;
}

export async function getResidentCondominium(): Promise<Condominium> {
  const response = await api.get<Condominium>('/resident/condominium');
  return response.data;
}

export async function createCondominium(name: string): Promise<Condominium> {
  const response = await api.post<Condominium>('/condominiums', {
    name: normalizeName(name),
  });
  return response.data;
}

export async function getStreets(condominiumId?: string): Promise<Street[]> {
  const response = await api.get<Street[]>('/streets', {
    params: condominiumId ? { condominiumId } : undefined,
  });
  return response.data;
}

export async function createStreet(name: string, condominiumId: string): Promise<Street> {
  const response = await api.post<Street>('/streets', {
    name: normalizeUpper(name),
    condominiumId,
  });
  return response.data;
}

export async function getUnits(params?: {
  condominiumId?: string;
  streetId?: string;
}): Promise<Unit[]> {
  const response = await api.get<UnitApiResponse[]>('/units', {
    params,
  });
  return response.data.map((item) => mapUnitApiToDomain(item));
}

export async function createUnit(payload: {
  name: string;
  streetId: string;
  address?: string | null;
}): Promise<UnitApiResponse> {
  const response = await api.post<UnitApiResponse>('/units', {
    name: normalizeUpper(payload.name),
    streetId: payload.streetId,
    address: payload.address ?? null,
  });
  return response.data;
}

export async function updateUnit(
  id: string,
  payload: {
    name?: string;
    address?: string | null;
    streetId?: string | null;
    blockId?: string | null;
    quadId?: string | null;
    lotId?: string | null;
  }
): Promise<UnitApiResponse> {
  try {
    const response = await api.patch<UnitApiResponse>(`/units/${id}`, {
      ...payload,
      name: payload.name ? normalizeUpper(payload.name) : undefined,
    });
    return response.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 404) {
      throw new Error('Endpoint de edicao de unidades ainda nao esta publicado neste ambiente.');
    }
    throw error;
  }
}

async function ensureCondominium(name: string) {
  const condominiums = await getCondominiums();
  const existing = condominiums.find(
    (item) => normalizeLookup(item.name) === normalizeLookup(name)
  );

  if (existing) return existing;
  return createCondominium(name);
}

async function resolveCondominium(form: ResidenceFormData) {
  if (form.condominiumId) {
    return {
      id: form.condominiumId,
      name: normalizeName(form.condominiumName),
    } satisfies Condominium;
  }

  return ensureCondominium(form.condominiumName);
}

async function ensureStreet(name: string, condominiumId: string) {
  const streets = await getStreets(condominiumId);
  const existing = streets.find(
    (item) => normalizeLookup(item.name) === normalizeLookup(name)
  );

  if (existing) return existing;
  return createStreet(name, condominiumId);
}

async function ensureUnit(name: string, streetId: string) {
  const units = await getUnits({ streetId });
  const existing = units.find(
    (item) => normalizeLookup(item.label) === normalizeLookup(name)
  );

  if (existing) return existing;

  const created = await createUnit({
    name,
    streetId,
  });

  return mapUnitApiToDomain(created);
}

function mapStructureToStreetName(structureType: UnitStructureType, structureLabel: string) {
  const label = normalizeUpper(structureLabel);

  if (structureType === 'STREET') {
    return label;
  }

  return `${structureType}:${label}`;
}

export async function ensureResidenceUnit(form: ResidenceFormData) {
  const condominium = await resolveCondominium(form);
  const street = await ensureStreet(
    mapStructureToStreetName(form.structureType, form.structureLabel),
    condominium.id
  );
  const unit = await ensureUnit(form.unitLabel, street.id);

  return {
    condominium,
    street,
    unit,
  };
}

export async function updateResidenceUnit(unitId: string, form: ResidenceFormData) {
  const condominium = await resolveCondominium(form);
  const street = await ensureStreet(
    mapStructureToStreetName(form.structureType, form.structureLabel),
    condominium.id
  );
  const updated = await updateUnit(unitId, {
    name: form.unitLabel,
    streetId: street.id,
  });

  return {
    condominium,
    street,
    unit: mapUnitApiToDomain(updated, [street], [condominium]),
  };
}
