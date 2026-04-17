'use client';

import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '@/services/vehicles.service';
import type { VehiclesListResponse } from '@/types/vehicle';

export function useVehicles(enabled = true) {
  return useQuery<VehiclesListResponse>({
    queryKey: ['admin-vehicles'],
    queryFn: getVehicles,
    enabled,
    staleTime: 60 * 1000,
  });
}
