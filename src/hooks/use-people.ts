//src/hooks/use-people.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllPeople, getPeople, getUnitResidents } from '@/services/people.service';
import type { PeopleListResponse } from '@/types/person';
import type { UnitResidentOption } from '@/types/resident';

type UsePeopleParams = {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  enabled?: boolean;
};

export const usePeople = (params?: UsePeopleParams) =>
  useQuery<PeopleListResponse>({
    queryKey: ['people', params],
    queryFn: () => getPeople(params),
    enabled: params?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

export const useAllPeople = (params?: Omit<UsePeopleParams, 'page'>) =>
  useQuery<PeopleListResponse>({
    queryKey: ['people', 'all-pages', params],
    queryFn: () => getAllPeople(params),
    enabled: params?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

export const useUnitResidents = (unitId?: string | null, enabled = true) =>
  useQuery<UnitResidentOption[]>({
    queryKey: ['people', 'unit-residents', unitId],
    queryFn: () => getUnitResidents(unitId as string),
    enabled: enabled && Boolean(unitId),
    staleTime: 60 * 1000,
    retry: 1,
  });
