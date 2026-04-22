import { api } from '@/lib/axios';
import { normalizePermissions } from '@/features/auth/permission-normalizer';
import { getApiErrorMessage } from '@/features/http/api-error';
import type { AuthUser } from '@/store/auth.store';
import type { AuthSyncCapabilities, OperationStreamCapabilities } from '@/types/user';

type LoginResponse = {
  token: string;
  user: AuthUser | (Omit<AuthUser, 'role'> & { role: AuthUser['role'] | 'OPERACIONAL' });
};

function normalizeAuthUser(
  user: AuthUser | (Omit<AuthUser, 'role'> & { role: AuthUser['role'] | 'OPERACIONAL' })
): AuthUser {
  return {
    ...user,
    role: user.role === 'OPERACIONAL' ? 'OPERADOR' : user.role,
    permissions: normalizePermissions(user.permissions),
  };
}

function getErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, {
    fallback: 'Nao foi possivel concluir a operacao.',
    byStatus: {
      401: 'Credenciais invalidas.',
      403: 'Voce nao tem permissao para acessar.',
    },
  });
}

export async function login(email: string, password: string) {
  try {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    return {
      ...response.data,
      user: normalizeAuthUser(response.data.user),
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function me(selectedUnitId?: string | null) {
  try {
    const response = await api.get<AuthUser | (Omit<AuthUser, 'role'> & { role: AuthUser['role'] | 'OPERACIONAL' })>('/auth/me', {
      headers: selectedUnitId ? { 'X-Selected-Unit-Id': selectedUnitId } : undefined,
    });
    return normalizeAuthUser(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function logout() {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const response = await api.post('/auth/forgot-password', {
      email: email.trim(),
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function resetPassword(token: string, password: string) {
  try {
    const response = await api.post('/auth/reset-password', {
      token: token.trim(),
      password,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getSyncCapabilities() {
  try {
    const response = await api.get<AuthSyncCapabilities>('/auth/sync-capabilities');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getStreamCapabilities() {
  try {
    const response = await api.get<OperationStreamCapabilities>('/auth/stream-capabilities');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
