import type { UserRole } from '@/store/auth.store';

export type UserScope =
  | 'global'
  | 'single_condominium'
  | 'multi_condominium'
  | 'single_unit';

export type UserCapability =
  | 'manage_people'
  | 'manage_deliveries'
  | 'manage_alerts'
  | 'manage_logs'
  | 'manage_cameras'
  | 'manage_secondary_users'
  | 'manage_structures'
  | 'handle_events'
  | 'manage_own_unit_contacts';

export type RolePolicy = {
  role: UserRole;
  label: string;
  scope: UserScope;
  capabilities: UserCapability[];
};

export const ROLE_POLICIES: Record<UserRole, RolePolicy> = {
  MASTER: {
    role: 'MASTER',
    label: 'Master',
    scope: 'global',
    capabilities: [
      'manage_people',
      'manage_deliveries',
      'manage_alerts',
      'manage_logs',
      'manage_cameras',
      'manage_secondary_users',
      'manage_structures',
      'handle_events',
      'manage_own_unit_contacts',
    ],
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Admin',
    scope: 'single_condominium',
    capabilities: [
      'manage_people',
      'manage_deliveries',
      'manage_alerts',
      'manage_logs',
      'manage_cameras',
      'manage_secondary_users',
      'manage_structures',
      'handle_events',
    ],
  },
  OPERADOR: {
    role: 'OPERADOR',
    label: 'Operacional',
    scope: 'single_condominium',
    capabilities: [
      'manage_people',
      'manage_deliveries',
      'manage_alerts',
      'handle_events',
    ],
  },
  CENTRAL: {
    role: 'CENTRAL',
    label: 'Central',
    scope: 'multi_condominium',
    capabilities: [
      'manage_people',
      'manage_deliveries',
      'manage_alerts',
      'handle_events',
    ],
  },
  MORADOR: {
    role: 'MORADOR',
    label: 'Morador',
    scope: 'single_unit',
    capabilities: ['manage_own_unit_contacts'],
  },
};

export function getRolePolicy(role?: UserRole | null) {
  if (!role) return null;
  return ROLE_POLICIES[role];
}

export function hasCapability(
  role: UserRole | null | undefined,
  capability: UserCapability
) {
  const policy = getRolePolicy(role);
  if (!policy) return false;
  return policy.capabilities.includes(capability);
}
