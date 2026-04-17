'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import {
  getCondominiums,
  getResidentCondominium,
  getStreets,
  getUnits,
} from '@/services/residence.service';

function parseStreetStructure(name: string | null | undefined) {
  const raw = String(name ?? '').trim().toUpperCase();

  if (raw.startsWith('BLOCK:')) {
    return { type: 'BLOCK' as const, label: raw.slice('BLOCK:'.length) };
  }

  if (raw.startsWith('QUAD:')) {
    return { type: 'QUAD' as const, label: raw.slice('QUAD:'.length) };
  }

  if (raw.startsWith('LOT:')) {
    return { type: 'LOT' as const, label: raw.slice('LOT:'.length) };
  }

  return { type: 'STREET' as const, label: raw };
}

export function useResidenceCatalog(enabled = true, condominiumId?: string) {
  const { user } = useAuth();
  const isResident = user?.role === 'MORADOR';
  const [condominiumsQuery, streetsQuery, unitsQuery] = useQueries({
    queries: [
      {
        queryKey: ['condominiums', isResident ? 'resident' : 'default', user?.condominiumId ?? 'all'],
        queryFn: async () => {
          if (!isResident) {
            return getCondominiums();
          }

          try {
            const condominium = await getResidentCondominium();
            return [condominium];
          } catch {
            return getCondominiums();
          }
        },
        enabled,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['streets', condominiumId ?? 'all'],
        queryFn: () => getStreets(condominiumId),
        enabled,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['units', condominiumId ?? 'all'],
        queryFn: () => getUnits(condominiumId ? { condominiumId } : undefined),
        enabled,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const condominiums = useMemo(() => condominiumsQuery.data ?? [], [condominiumsQuery.data]);
  const streets = useMemo(() => streetsQuery.data ?? [], [streetsQuery.data]);
  const units = useMemo(() => {
    const rawUnits = unitsQuery.data ?? [];

    return rawUnits.map((unit) => {
      const street =
        unit.structure?.id
          ? streets.find((item) => item.id === unit.structure?.id)
          : streets.find((item) => item.id === unit.streetId);
      const parsedStructure = parseStreetStructure(street?.name);
      const condominium =
        condominiums.find((item) => item.id === (unit.condominiumId ?? street?.condominiumId)) ?? null;

      return {
        ...unit,
        condominiumId: unit.condominiumId ?? street?.condominiumId ?? null,
        condominium,
        structureType: unit.structureType ?? unit.structure?.type ?? (street ? parsedStructure.type : null),
        structure:
          unit.structure ??
          (street
            ? {
                id: street.id,
                type: parsedStructure.type,
                label: parsedStructure.label,
              }
            : null),
      };
    });
  }, [condominiums, streets, unitsQuery.data]);

  return {
    condominiums,
    streets,
    units,
    isLoading:
      condominiumsQuery.isLoading ||
      streetsQuery.isLoading ||
      unitsQuery.isLoading,
    error:
      condominiumsQuery.error ||
      streetsQuery.error ||
      unitsQuery.error ||
      null,
    refetchAll: async () => {
      await Promise.all([
        condominiumsQuery.refetch(),
        streetsQuery.refetch(),
        unitsQuery.refetch(),
      ]);
    },
  };
}
