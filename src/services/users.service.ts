import { api } from '@/lib/axios';
import { getApiErrorMessage } from '@/features/http/api-error';
import type { UserCreateRequest, UserResponse, UserUpdateRequest } from '@/types/user';

function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error, {
    fallback: 'Não foi possível concluir a operação com usuários.',
    byStatus: {
      404: 'Endpoint de edição de usuários ainda não está publicado neste ambiente.',
      409: 'Já existe outro usuário com este e-mail.',
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
