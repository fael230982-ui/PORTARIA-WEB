export type UnitStructureType = 'STREET' | 'BLOCK' | 'QUAD' | 'LOT';

export type Condominium = {
  id: string;
  name: string;
  code?: string | null;
  enabledModules?: string[] | null;
  moduleSettings?: Record<string, boolean> | null;
  residentManagementSettings?: Record<string, boolean> | null;
  visitForecastSettings?: {
    allowDeliverer?: boolean;
    releaseMode?: string | null;
  } | null;
  slimMode?: boolean | null;
  clientKind?: 'CONDOMINIUM' | 'RESIDENCE' | null;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  licensePlan?: string | null;
  licenseStatus?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED' | string | null;
  licenseExpiresAt?: string | null;
  peopleCount?: number | null;
  residentsCount?: number | null;
  camerasCount?: number | null;
  operationStatus?: 'ONLINE' | 'OFFLINE' | string | null;
  operationLastSeenAt?: string | null;
  operationDeviceName?: string | null;
  metrics?: {
    people: number;
    residents: number;
    cameras: number;
    onlineCameras: number;
    offlineCameras: number;
    units: number;
  } | null;
};

export type Street = {
  id: string;
  name: string;
  condominiumId: string;
};

export type UnitStructureRef = {
  id?: string | null;
  type: UnitStructureType;
  label: string;
};

export type Unit = {
  id: string;
  label: string;
  condominiumName?: string | null;
  condominiumId?: string | null;
  condominium?: Condominium | null;
  structureType?: UnitStructureType | null;
  structureLabel?: string | null;
  structure?: UnitStructureRef | null;
  streetId?: string | null;
  legacyUnitId?: string | null;
};

export type ResidenceFormData = {
  condominiumId?: string | null;
  condominiumName: string;
  structureType: UnitStructureType;
  structureLabel: string;
  unitLabel: string;
};
