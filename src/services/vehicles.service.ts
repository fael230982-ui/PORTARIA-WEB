import { getApiErrorMessage } from '@/features/http/api-error';
import { api } from '@/lib/axios';
import type { Vehicle, VehiclePayload, VehiclePlateLookupResponse, VehiclesListResponse } from '@/types/vehicle';

function getVehicleServiceErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, {
    fallback,
    byStatus: {
      403: 'Seu usuário não tem permissão para cadastrar veículo nesta unidade. Selecione uma unidade do seu condomínio ou peça ajuste de acesso.',
    },
    keywordMap: [
      {
        includes: ['unidade solicitada'],
        message: 'Seu usuário não tem permissão para cadastrar veículo nesta unidade. Selecione uma unidade do seu condomínio ou peça ajuste de acesso.',
      },
    ],
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message || 'Falha ao processar veículos.');
  }

  return payload;
}

function toApiVehiclePayload(payload: Partial<VehiclePayload>) {
  return {
    plate: payload.plate,
    brand: payload.brand?.trim() || null,
    model: payload.model?.trim() || null,
    color: payload.color?.trim() || null,
    type: payload.type,
    status: payload.status,
    ownerId: payload.ownerId || null,
    unitId: payload.unitId || null,
    tag: payload.tag?.trim() || null,
    notes: payload.notes?.trim() || null,
  };
}

function getUnitScopeHeaders(unitId?: string | null) {
  return unitId ? { 'X-Selected-Unit-Id': unitId } : undefined;
}

export async function getVehicles() {
  const { data } = await api.get<{ data: Vehicle[]; meta?: VehiclesListResponse['meta'] } | Vehicle[]>('/vehicles', {
    params: { page: 1, limit: 100 },
  });

  const vehicles = Array.isArray(data) ? data : data.data ?? [];
  const meta = Array.isArray(data) ? undefined : data.meta;

  return {
    success: true,
    data: vehicles,
    total: meta?.totalItems ?? vehicles.length,
    meta,
  } satisfies VehiclesListResponse;
}

export async function createVehicle(payload: VehiclePayload) {
  try {
    const { data } = await api.post<Vehicle>('/vehicles', toApiVehiclePayload(payload), {
      headers: getUnitScopeHeaders(payload.unitId),
    });
    return { success: true, data, message: 'Veículo cadastrado com sucesso.' };
  } catch (error) {
    throw new Error(getVehicleServiceErrorMessage(error, 'Não foi possível cadastrar o veículo.'));
  }
}

export async function lookupVehiclePlate(plate: string) {
  const response = await fetch(`/api/admin/veiculos/lookup?plate=${encodeURIComponent(plate)}`, {
    cache: 'no-store',
  });

  return parseJson<{ success: boolean; data: VehiclePlateLookupResponse; message?: string }>(response);
}

export async function updateVehicle(id: string, payload: Partial<VehiclePayload>) {
  try {
    const { data } = await api.put<Vehicle>(`/vehicles/${id}`, toApiVehiclePayload(payload), {
      headers: getUnitScopeHeaders(payload.unitId),
    });
    return { success: true, data, message: 'Veículo atualizado com sucesso.' };
  } catch (error) {
    throw new Error(getVehicleServiceErrorMessage(error, 'Não foi possível atualizar o veículo.'));
  }
}

export async function deleteVehicle(id: string) {
  try {
    await api.delete(`/vehicles/${id}`);
    return { success: true, data: null, message: 'Veículo removido com sucesso.' };
  } catch (error) {
    throw new Error(getVehicleServiceErrorMessage(error, 'Não foi possível remover o veículo.'));
  }
}
