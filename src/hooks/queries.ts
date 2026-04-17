import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface PeopleFilters extends PaginationParams {
  search?: string;
  category?: string;
  status?: string;
}

interface AlertsFilters extends PaginationParams {
  status?: string;
  type?: string;
}

interface CamerasFilters extends PaginationParams {
  status?: string;
}

interface UpdateStatusParams {
  id: string;
  status: string;
}

function buildQueryString<T extends object>(filters: T) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      params.append(key, value.toString());
    }
  });

  return params.toString();
}

export const usePeople = (filters: PeopleFilters = {}) => {
  return useQuery({
    queryKey: ['people', filters],
    queryFn: async () => {
      const response = await api.get(`/people?${buildQueryString(filters)}`);
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
};

export const useAlerts = (filters: AlertsFilters = {}) => {
  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: async () => {
      const response = await api.get(`/alerts?${buildQueryString(filters)}`);
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
};

export const useCameras = (filters: CamerasFilters = {}) => {
  return useQuery({
    queryKey: ['cameras', filters],
    queryFn: async () => {
      const response = await api.get(`/cameras?${buildQueryString(filters)}`);
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
};

export const useUpdateAlertStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: UpdateStatusParams) => {
      const response = await api.patch(`/alerts/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useUpdatePersonStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: UpdateStatusParams) => {
      const response = await api.patch(`/people/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
};

export const useUpdateCameraStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: UpdateStatusParams) => {
      const response = await api.patch(`/cameras/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
};
