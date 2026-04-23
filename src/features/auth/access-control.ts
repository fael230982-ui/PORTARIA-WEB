import type { UserRole } from '../../store/auth.store';

export type AuthSnapshot = {
  token: string | null;
  user: {
    role: UserRole;
  } | null;
  isAuthenticated: boolean;
  loading: boolean;
  hydrated: boolean;
};

export function getRouteForRole(role?: UserRole | null) {
  switch (role) {
    case 'OPERADOR':
    case 'CENTRAL':
      return '/operacao';
    case 'ADMIN':
      return '/admin';
    case 'MASTER':
      return '/master';
    case 'PARCEIRO':
      return '/parceiro';
    case 'MORADOR':
      return '/dashboard/profile';
    default:
      return '/login';
  }
}

export function resolveAuthenticatedRoute(auth: AuthSnapshot) {
  if (!auth.hydrated || auth.loading) {
    return null;
  }

  if (!auth.token || !auth.user || !auth.isAuthenticated) {
    return '/login';
  }

  return getRouteForRole(auth.user.role);
}

export function canAccessRole(
  role: UserRole | null | undefined,
  allowedRoles?: readonly UserRole[]
) {
  if (!role) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role);
}
