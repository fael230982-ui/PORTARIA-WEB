import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '@/lib/env';
import { useAuthStore } from '@/store/auth.store';

const baseURL =
  typeof window === 'undefined'
    ? env.apiBaseUrl
    : '/api/proxy';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const { token, user } = useAuthStore.getState();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (user?.selectedUnitId) {
      config.headers['X-Selected-Unit-Id'] = user.selectedUnitId;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const authState = useAuthStore.getState();
      const sentAuthorizationHeader = Boolean(
        error.config?.headers &&
          'Authorization' in error.config.headers &&
          (error.config.headers as Record<string, unknown>).Authorization
      );
      const shouldInvalidateSession =
        authState.hydrated &&
        authState.isAuthenticated &&
        Boolean(authState.token) &&
        sentAuthorizationHeader;

      if (shouldInvalidateSession) {
        authState.clearSession();

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
