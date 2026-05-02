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
import { operationService } from '@/services/operation.service';
import type { Condominium, Unit } from '@/types/condominium';

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

function buildSessionCondominiums(user: ReturnType<typeof useAuth>['user']) {
  const ids = [user?.condominiumId, ...(user?.condominiumIds ?? [])]
    .filter(Boolean)
    .map((value) => String(value));

  return ids.map((id, index) => ({
    id,
    name: user?.selectedUnitName?.trim() || `Condomínio ${index + 1}`,
  })) as Condominium[];
}

function buildSessionUnits(user: ReturnType<typeof useAuth>['user'], condominiums: Condominium[]) {
  const unitIds = user?.unitIds ?? [];
  const unitNames = user?.unitNames ?? [];
  const condominiumId = user?.condominiumId ?? condominiums[0]?.id ?? null;
  const condominium =
    condominiums.find((item) => item.id === condominiumId) ??
    (condominiumId ? { id: condominiumId, name: user?.selectedUnitName?.trim() || 'Condomínio' } : null);

  return unitIds
    .filter(Boolean)
    .map((id, index) => ({
      id,
      label: unitNames[index]?.trim() || `Unidade ${index + 1}`,
      condominiumId,
      condominiumName: condominium?.name ?? null,
      condominium,
      structureType: null,
      structureLabel: null,
      structure: null,
      streetId: null,
      legacyUnitId: null,
    })) as Unit[];
}

function mapOperationUnitsToDomain(units: Awaited<ReturnType<typeof operationService.listSearchableUnits>>): Unit[] {
  return units.map((unit) => ({
    id: unit.id,
    label: unit.label,
    condominiumId: unit.condominiumId ?? null,
    condominiumName: unit.condominiumName ?? null,
    condominium: unit.condominiumId
      ? {
          id: unit.condominiumId,
          name: unit.condominiumName ?? 'Condomínio',
        }
      : null,
    structureType: unit.structureLabel ? 'STREET' : null,
    structureLabel: unit.structureLabel ?? null,
    structure: unit.structureLabel
      ? {
          id: unit.streetId ?? null,
          type: 'STREET',
          label: unit.structureLabel,
        }
      : null,
    streetId: unit.streetId ?? null,
    legacyUnitId: unit.structureLabel ? `${unit.structureLabel}-${unit.label}` : unit.label,
  }));
}

export function useResidenceCatalog(enabled = true, condominiumId?: string) {
  const { user } = useAuth();
  const isResident = user?.role === 'MORADOR';
  const useOperationCatalog = user?.role === 'OPERADOR';
  const [condominiumsQuery, streetsQuery, unitsQuery] = useQueries({
    queries: [
      {
        queryKey: ['condominiums', useOperationCatalog ? 'operation' : isResident ? 'resident' : 'default', user?.condominiumId ?? 'all'],
        queryFn: async () => {
          if (useOperationCatalog) {
            return user?.condominiumId
              ? ([{ id: user.condominiumId, name: user.selectedUnitName ?? 'Base operacional' }] as Condominium[])
              : [];
          }

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
        retry: false,
      },
      {
        queryKey: ['streets', useOperationCatalog ? 'operation' : condominiumId ?? 'all'],
        queryFn: () => (useOperationCatalog ? Promise.resolve([]) : getStreets(condominiumId)),
        enabled,
        staleTime: 5 * 60 * 1000,
        retry: false,
      },
      {
        queryKey: ['units', useOperationCatalog ? 'operation' : condominiumId ?? 'all'],
        queryFn: async () => {
          if (useOperationCatalog) {
            return mapOperationUnitsToDomain(await operationService.listSearchableUnits());
          }

          try {
            return await getUnits(condominiumId ? { condominiumId } : undefined);
          } catch (error) {
            const status = (error as { response?: { status?: number } }).response?.status;
            if (status && [500, 502, 503, 504].includes(status)) {
              return mapOperationUnitsToDomain(await operationService.listSearchableUnits());
            }

            throw error;
          }
        },
        enabled,
        staleTime: 5 * 60 * 1000,
        retry: false,
      },
    ],
  });

  const sessionCondominiums = useMemo(() => buildSessionCondominiums(user), [user]);
  const sessionUnits = useMemo(
    () => buildSessionUnits(user, sessionCondominiums),
    [sessionCondominiums, user]
  );
  const condominiums = useMemo(() => {
    if ((condominiumsQuery.data?.length ?? 0) > 0) {
      return condominiumsQuery.data ?? [];
    }

    return sessionCondominiums;
  }, [condominiumsQuery.data, sessionCondominiums]);
  const streets = useMemo(() => streetsQuery.data ?? [], [streetsQuery.data]);
  const units = useMemo(() => {
    const rawUnits = (unitsQuery.data?.length ?? 0) > 0 ? unitsQuery.data ?? [] : sessionUnits;

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
  }, [condominiums, sessionUnits, streets, unitsQuery.data]);

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
