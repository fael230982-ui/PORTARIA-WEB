import { api } from '@/lib/axios';
import type { Vehicle, VehiclePayload, VehiclePlateLookupResponse, VehiclesListResponse } from '@/types/vehicle';

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message || 'Falha ao processar veiculos.');
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
  const { data } = await api.post<Vehicle>('/vehicles', toApiVehiclePayload(payload));
  return { success: true, data, message: 'Veiculo cadastrado com sucesso.' };
}

export async function lookupVehiclePlate(plate: string) {
  const response = await fetch(`/api/admin/veiculos/lookup?plate=${encodeURIComponent(plate)}`, {
    cache: 'no-store',
  });

  return parseJson<{ success: boolean; data: VehiclePlateLookupResponse; message?: string }>(response);
}

export async function updateVehicle(id: string, payload: Partial<VehiclePayload>) {
  const { data } = await api.put<Vehicle>(`/vehicles/${id}`, toApiVehiclePayload(payload));
  return { success: true, data, message: 'Veiculo atualizado com sucesso.' };
}

export async function deleteVehicle(id: string) {
  await api.delete(`/vehicles/${id}`);
  return { success: true, data: null, message: 'Veiculo removido com sucesso.' };
}
