import type {
  PeopleListResponse,
  Person,
  PersonCategory,
  PersonDocumentType,
  MinorFacialAuthorization,
  PersonStatus,
} from '../../types/person';
import type {
  Condominium,
  ResidenceFormData,
  Street,
  Unit,
  UnitStructureType,
} from '../../types/condominium';

export type MoradorRow = {
  id: string;
  nome: string;
  email?: string;
  unidade?: string;
  bloco?: string;
  telefone?: string;
  documento?: string;
  documentType?: Person['documentType'];
  categoria?: string;
  status?: string;
  avatarUrl?: string;
  condominio?: string;
  estruturaTipo?: string;
  estruturaLabel?: string;
  localizacao?: string;
  unit?: Unit | null;
  faceStatus?: Person['faceStatus'];
  faceUpdatedAt?: string | null;
  faceErrorMessage?: string | null;
  faceListSyncStatus?: string | null;
  faceListSyncError?: string | null;
};

type PersonWithLegacyPhotoFields = Person & {
  avatarUrl?: string | null;
  avatar_url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  facePhotoUrl?: string | null;
  face_photo_url?: string | null;
  profilePhotoUrl?: string | null;
  profile_photo_url?: string | null;
  pictureUrl?: string | null;
  picture_url?: string | null;
  photo?: unknown;
  avatar?: unknown;
  image?: unknown;
  facePhoto?: unknown;
  profilePhoto?: unknown;
  media?: unknown;
  photos?: unknown;
  images?: unknown;
  files?: unknown;
  attachments?: unknown;
};

type ResidenceCatalog = {
  condominiums?: Condominium[];
  streets?: Street[];
  units?: Unit[];
};

const structureTypeLabels: Record<UnitStructureType, string> = {
  STREET: 'rua',
  BLOCK: 'bloco',
  QUAD: 'quadra',
  LOT: 'lote',
};

export function safeText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function normalizeUpperText(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized.length > 0 ? normalized : '';
}

function normalizeTitleText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function normalizeFilterText(value: unknown) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getUnitReference(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    return normalized.slice(0, 8);
  }

  return normalized;
}

export function splitLegacyUnitId(unitId?: string | null) {
  const normalizedUnitId = getUnitReference(unitId);
  if (!normalizedUnitId) return { bloco: '', unidade: '' };

  if (/^[0-9a-f]{8}$/i.test(normalizedUnitId)) {
    return { bloco: '', unidade: normalizedUnitId };
  }

  const [bloco = '', ...rest] = normalizedUnitId.split('-');
  return {
    bloco,
    unidade: rest.join('-'),
  };
}

export function mapApiCategoryToUi(category?: string | null, categoryLabel?: string | null) {
  if (categoryLabel) return categoryLabel.toLowerCase();

  switch (category) {
    case 'VISITOR':
      return 'visitante';
    case 'SERVICE_PROVIDER':
      return 'prestador';
    case 'DELIVERER':
      return 'entregador';
    case 'RENTER':
      return 'locatario';
    case 'RESIDENT':
    default:
      return 'morador';
  }
}

export function mapUiCategoryToApi(value: string): PersonCategory {
  switch (value) {
    case 'visitante':
      return 'VISITOR';
    case 'funcionario':
      return 'DELIVERER';
    case 'locatario':
      return 'RENTER';
    case 'proprietario':
      return 'RESIDENT';
    case 'morador':
    default:
      return 'RESIDENT';
  }
}

export function mapApiStatusToUi(status?: string | null, statusLabel?: string | null) {
  if (statusLabel) return statusLabel.toLowerCase();

  switch (status) {
    case 'EXPIRED':
      return 'vencido';
    case 'INACTIVE':
      return 'inativo';
    case 'BLOCKED':
      return 'bloqueado';
    case 'ACTIVE':
    default:
      return 'ativo';
  }
}

export function mapUiStatusToApi(value: string): PersonStatus {
  switch (value) {
    case 'inativo':
    case 'pendente':
      return 'INACTIVE';
    case 'bloqueado':
      return 'BLOCKED';
    case 'vencido':
      return 'EXPIRED';
    case 'ativo':
    default:
      return 'ACTIVE';
  }
}

export function getStructureTypeLabel(type?: UnitStructureType | null) {
  if (!type) return '';
  return structureTypeLabels[type] ?? '';
}

function isTechnicalIdentifier(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  if (/^[0-9a-f]{8,}$/i.test(normalized)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f-]{13,}$/i.test(normalized)) return true;
  return false;
}

export function getResidenceDisplay(unit?: Unit | null, legacyUnitId?: string | null) {
  const effectiveReference = getUnitReference(safeText(unit?.legacyUnitId, safeText(legacyUnitId)));
  const legacy = splitLegacyUnitId(effectiveReference);
  const unitLabel = safeText(unit?.label, isTechnicalIdentifier(legacy.unidade) ? '' : safeText(legacy.unidade));
  const structureLabel = safeText(unit?.structure?.label, legacy.bloco);
  const structureType = getStructureTypeLabel(unit?.structureType ?? unit?.structure?.type);
  const condominium = safeText(unit?.condominium?.name, '');
  const localizacao = [condominium, structureType && structureLabel ? `${structureType} ${structureLabel}` : structureLabel]
    .filter(Boolean)
    .join(' • ');

  return {
    unidade: unitLabel,
    bloco: structureType === 'bloco' ? structureLabel : legacy.bloco,
    condominio: condominium,
    estruturaTipo: structureType,
    estruturaLabel: structureLabel,
    localizacao: localizacao || (unitLabel && !isTechnicalIdentifier(unitLabel) ? unitLabel : 'Unidade não identificada'),
  };
}

export function buildLegacyUnitId(structureLabel: string, unitLabel: string) {
  const normalizedStructure = normalizeUpperText(structureLabel);
  const normalizedUnit = normalizeUpperText(unitLabel);

  if (normalizedStructure && normalizedUnit) {
    return `${normalizedStructure}-${normalizedUnit}`;
  }

  return normalizedStructure || normalizedUnit || null;
}

export function optionalText(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D+/g, '').trim();
}

export function normalizePhoneInput(value: string | null | undefined) {
  const digits = onlyDigits(value);
  return digits.length > 0 ? digits : null;
}

export function normalizeDocumentInput(value: string | null | undefined) {
  const digits = onlyDigits(value);
  return digits.length > 0 ? digits : null;
}

export function buildResidenceInput(form: ResidenceFormData) {
  return {
    condominiumName: normalizeTitleText(form.condominiumName),
    structureType: form.structureType,
    structureLabel: normalizeUpperText(form.structureLabel),
    unitLabel: normalizeUpperText(form.unitLabel),
  };
}

export function buildPersonUpsertPayload(input: {
  nome: string;
  email?: string;
  telefone?: string;
  documento?: string;
  documentType?: PersonDocumentType | null;
  birthDate?: string | null;
  tipo: string;
  photoUrl?: string | null;
  minorFacialAuthorization?: MinorFacialAuthorization | null;
  source?: string | null;
  residence?: ResidenceFormData;
  unitId?: string | null;
}) {
  const payload: {
    name: string;
    category: PersonCategory;
    email?: string;
    phone?: string;
    document?: string;
    documentType?: PersonDocumentType | null;
    birthDate?: string | null;
    unitId?: string;
    photoUrl?: string | null;
    minorFacialAuthorization?: MinorFacialAuthorization | null;
    source?: string | null;
  } = {
    name: input.nome.trim(),
    category: mapUiCategoryToApi(input.tipo),
  };

  const phone = normalizePhoneInput(input.telefone);
  const document = normalizeDocumentInput(input.documento);
  const email = optionalText(input.email);
  const residence = input.residence ? buildResidenceInput(input.residence) : null;
  const legacyUnitId = residence
    ? buildLegacyUnitId(residence.structureLabel, residence.unitLabel)
    : null;

  if (email) {
    payload.email = email;
  }

  if (phone) {
    payload.phone = phone;
  }

  if (document) {
    payload.document = document;
  }

  if (input.documentType) {
    payload.documentType = input.documentType;
  }

  const birthDate = optionalText(input.birthDate);
  if (birthDate) {
    payload.birthDate = birthDate;
  }

  if (typeof input.photoUrl === 'string') {
    payload.photoUrl = input.photoUrl.trim() || null;
  }

  if (input.minorFacialAuthorization) {
    payload.minorFacialAuthorization = input.minorFacialAuthorization;
  }

  if (input.source) {
    payload.source = input.source;
  }

  if (input.unitId) {
    payload.unitId = input.unitId;
  } else if (legacyUnitId) {
    payload.unitId = legacyUnitId;
  }

  return payload;
}

function normalizePersonPhotoUrl(value?: string | null) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/api/proxy/')) return url;
  if (url.startsWith('/api/v1/')) return `/api/proxy/${url.slice('/api/v1/'.length)}`;
  if (url.startsWith('api/v1/')) return `/api/proxy/${url.slice('api/v1/'.length)}`;
  if (url.startsWith('/people/') || url.startsWith('/media/') || url.startsWith('/uploads/') || url.startsWith('/files/') || url.startsWith('/storage/')) {
    return `/api/proxy${url}`;
  }

  try {
    const parsed = new URL(url);
    const pathWithQuery = `${parsed.pathname}${parsed.search}`;
    if (parsed.pathname.startsWith('/api/v1/')) return `/api/proxy/${pathWithQuery.slice('/api/v1/'.length)}`;
    if (
      parsed.pathname.startsWith('/people/') ||
      parsed.pathname.startsWith('/media/') ||
      parsed.pathname.startsWith('/uploads/') ||
      parsed.pathname.startsWith('/files/') ||
      parsed.pathname.startsWith('/storage/')
    ) {
      return `/api/proxy${pathWithQuery}`;
    }
  } catch {
    // Keep original value when it is not a URL we know how to proxy.
  }

  return url;
}

function readObjectString(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const normalized = normalizePersonPhotoUrl(typeof record[key] === 'string' ? record[key] : null);
    if (normalized) return normalized;
  }

  return '';
}

function readArrayPhotoUrl(value: unknown) {
  if (!Array.isArray(value)) return '';

  for (const item of value) {
    if (typeof item === 'string') {
      const normalized = normalizePersonPhotoUrl(item);
      if (normalized) return normalized;
      continue;
    }

    const normalized = readObjectString(item, [
      'photoUrl',
      'photo_url',
      'url',
      'path',
      'publicUrl',
      'public_url',
      'signedUrl',
      'signed_url',
      'downloadUrl',
      'download_url',
      'imageUrl',
      'image_url',
    ]);
    if (normalized) return normalized;
  }

  return '';
}

function getPersonPhotoUrl(person: PersonWithLegacyPhotoFields) {
  return (
    normalizePersonPhotoUrl(person.photoUrl) ||
    normalizePersonPhotoUrl(person.photo_url) ||
    normalizePersonPhotoUrl(person.avatarUrl) ||
    normalizePersonPhotoUrl(person.avatar_url) ||
    normalizePersonPhotoUrl(person.imageUrl) ||
    normalizePersonPhotoUrl(person.image_url) ||
    normalizePersonPhotoUrl(person.facePhotoUrl) ||
    normalizePersonPhotoUrl(person.face_photo_url) ||
    normalizePersonPhotoUrl(person.profilePhotoUrl) ||
    normalizePersonPhotoUrl(person.profile_photo_url) ||
    normalizePersonPhotoUrl(person.pictureUrl) ||
    normalizePersonPhotoUrl(person.picture_url) ||
    readObjectString(person.photo, ['url', 'path', 'photoUrl', 'photo_url', 'publicUrl', 'public_url', 'signedUrl', 'signed_url']) ||
    readObjectString(person.avatar, ['url', 'path', 'photoUrl', 'photo_url', 'publicUrl', 'public_url', 'signedUrl', 'signed_url']) ||
    readObjectString(person.image, ['url', 'path', 'imageUrl', 'image_url', 'publicUrl', 'public_url', 'signedUrl', 'signed_url']) ||
    readObjectString(person.facePhoto, ['url', 'path', 'photoUrl', 'photo_url', 'publicUrl', 'public_url', 'signedUrl', 'signed_url']) ||
    readObjectString(person.profilePhoto, ['url', 'path', 'photoUrl', 'photo_url', 'publicUrl', 'public_url', 'signedUrl', 'signed_url']) ||
    readObjectString(person.media, ['url', 'path', 'photoUrl', 'photo_url', 'publicUrl', 'public_url', 'signedUrl', 'signed_url']) ||
    readArrayPhotoUrl(person.photos) ||
    readArrayPhotoUrl(person.images) ||
    readArrayPhotoUrl(person.files) ||
    readArrayPhotoUrl(person.attachments)
  );
}

export function normalizePerson(person: Person): MoradorRow {
  const residence = getResidenceDisplay(person.unit, person.unitName ?? person.unitId);
  const personWithPhotoFields = person as PersonWithLegacyPhotoFields;

  return {
    id: person.id,
    nome: person.name,
    email: person.email ?? '',
    unidade: residence.unidade || (!isTechnicalIdentifier(person.unitName) ? person.unitName : '') || (!isTechnicalIdentifier(person.unitId) ? person.unitId : '') || '',
    bloco: residence.bloco,
    telefone: person.phone ?? '',
    documento: person.document ?? '',
    documentType: person.documentType ?? null,
    categoria: mapApiCategoryToUi(person.category, person.categoryLabel),
    status: mapApiStatusToUi(person.status, person.statusLabel),
    avatarUrl: getPersonPhotoUrl(personWithPhotoFields),
    condominio: residence.condominio,
    estruturaTipo: residence.estruturaTipo,
    estruturaLabel: residence.estruturaLabel,
    localizacao: residence.localizacao,
    unit: person.unit ?? null,
    faceStatus: person.faceStatus ?? null,
    faceUpdatedAt: person.faceUpdatedAt ?? null,
    faceErrorMessage: person.faceErrorMessage ?? null,
    faceListSyncStatus: person.faceListSyncStatus ?? null,
    faceListSyncError: person.faceListSyncError ?? null,
  };
}

function enrichPersonResidence(person: Person, catalog?: ResidenceCatalog): Person {
  if (person.unit || !person.unitId || !catalog?.units?.length) {
    return person;
  }

  const matchedUnit =
    catalog.units.find((item) => item.id === person.unitId) ||
    catalog.units.find((item) => item.legacyUnitId === person.unitId) ||
    catalog.units.find((item) => item.legacyUnitId === getUnitReference(person.unitId));

  if (!matchedUnit) {
    return person;
  }

  const condominium =
    matchedUnit.condominium ??
    catalog.condominiums?.find((item) => item.id === matchedUnit.condominiumId) ??
    null;

  const structure =
    matchedUnit.structure ??
    catalog.streets
      ?.filter((item) => item.id === matchedUnit.streetId)
      .map((item) => ({
        id: item.id,
        type: 'STREET' as const,
        label: item.name,
      }))[0] ??
    null;

  return {
    ...person,
    unit: {
      ...matchedUnit,
      condominium,
      structure,
      structureType: matchedUnit.structureType ?? structure?.type ?? null,
    },
    unitName: person.unitName ?? matchedUnit.label,
  };
}

export function normalizePeople(data?: PeopleListResponse, catalog?: ResidenceCatalog): MoradorRow[] {
  if (!data?.data) return [];
  return data.data.map((person) => normalizePerson(enrichPersonResidence(person, catalog)));
}

export function normalizeMoradorStatus(value: unknown) {
  const normalized = normalizeFilterText(value || 'ativo');

  if (normalized === 'active' || normalized === 'ativo') return 'ativo';
  if (normalized === 'blocked' || normalized === 'bloqueado') return 'bloqueado';
  if (normalized === 'inactive' || normalized === 'inativo' || normalized === 'pendente') return 'inativo';
  if (normalized === 'expired' || normalized === 'vencido') return 'vencido';

  return normalized || 'ativo';
}

export function normalizeMoradorCategory(value: unknown) {
  const normalized = normalizeFilterText(value || 'morador');

  if (normalized === 'resident' || normalized === 'morador' || normalized === 'proprietario') return 'morador';
  if (normalized === 'visitor' || normalized === 'visitante') return 'visitante';
  if (normalized === 'service_provider' || normalized === 'prestador' || normalized === 'prestador de servico') return 'prestador';
  if (normalized === 'deliverer' || normalized === 'funcionario' || normalized === 'entregador') return 'funcionario';
  if (normalized === 'renter' || normalized === 'locatario') return 'locatario';

  return normalized || 'morador';
}

export function matchesMoradorText(row: MoradorRow, term: string) {
  if (!term) return true;
  const query = normalizeFilterText(term);
  return [
    row.nome,
    row.email,
    row.unidade,
    row.bloco,
    row.telefone,
    row.documento,
    row.categoria,
    row.status,
    row.condominio,
    row.estruturaTipo,
    row.estruturaLabel,
    row.localizacao,
  ]
    .filter(Boolean)
    .some((value) => normalizeFilterText(value).includes(query));
}
