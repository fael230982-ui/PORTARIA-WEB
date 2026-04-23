export type UserScopeType = 'GLOBAL' | 'ASSIGNED' | 'RESIDENT' | 'UNSCOPED';
export type ApiUserRole = 'MASTER' | 'PARCEIRO' | 'ADMIN' | 'OPERACIONAL' | 'CENTRAL' | 'MORADOR';

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  personName?: string | null;
  role: ApiUserRole;
  permissions: string[];
  scopeType?: UserScopeType | null;
  condominiumId?: string | null;
  condominiumIds?: string[];
  unitId?: string | null;
  unitName?: string | null;
  unitIds?: string[];
  unitNames?: string[];
  personId?: string | null;
  selectedUnitId?: string | null;
  selectedUnitName?: string | null;
  requiresUnitSelection?: boolean;
  streetIds?: string[];
  profileSource?: 'CANONICAL_RESIDENT_PROFILE' | string | null;
};

export type UserCreateRequest = {
  name: string;
  email: string;
  password: string;
  role: ApiUserRole;
  condominiumId?: string | null;
  condominiumIds?: string[];
  unitId?: string | null;
  unitIds?: string[];
  personId?: string | null;
  streetIds?: string[];
};

export type UserUpdateRequest = Partial<UserCreateRequest>;

export type PermissionMatrixItem = {
  role: ApiUserRole;
  permissions?: string[];
};

export type AuthSyncCapabilities = {
  reconcileSupported?: boolean;
  tokenRequired?: boolean;
  supportedAggregates?: string[] | null;
};

export type OperationStreamFieldRequirement = 'REQUIRED' | 'CONDITIONAL' | 'OPTIONAL' | 'LEGACY_TEMPORARY' | string;

export type OperationStreamFieldRule = {
  canonical?: boolean;
  requirement: OperationStreamFieldRequirement;
  aliasFor?: string | null;
};

export type OperationStreamCapabilities = {
  canonicalTypeField?: string;
  canonicalTimeField?: string;
  permissionsMatrixPrimary?: boolean;
  effectiveAccessCompanion?: boolean;
  fieldRules?: Record<string, OperationStreamFieldRule> | null;
};
