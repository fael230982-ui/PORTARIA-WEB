import { api } from '@/lib/axios';
import { getApiErrorMessage } from '@/features/http/api-error';
import type { UserCreateRequest, UserResponse, UserUpdateRequest } from '@/types/user';

function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error, {
    fallback: 'Nao foi possivel concluir a operacao com usuarios.',
    byStatus: {
      404: 'Endpoint de edicao de usuarios ainda nao esta publicado neste ambiente.',
      409: 'Ja existe outro usuario com este e-mail.',
    },
  });
}

export async function getUsers(): Promise<UserResponse[]> {
  try {
    const response = await api.get<UserResponse[]>('/users');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function createUser(payload: UserCreateRequest): Promise<UserResponse> {
  try {
    const response = await api.post<UserResponse>('/users', payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateUser(userId: string, payload: UserUpdateRequest): Promise<UserResponse> {
  try {
    const response = await api.patch<UserResponse>(`/users/${userId}`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function requestUserPasswordReset(userId: string): Promise<{ message?: string }> {
  try {
    const response = await api.post<{ message?: string }>(`/users/${userId}/password-reset`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateUserPassword(userId: string, password: string): Promise<{ message?: string }> {
  try {
    const response = await api.patch<{ message?: string }>(`/users/${userId}/password`, { password });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
