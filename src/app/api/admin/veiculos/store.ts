import type { Vehicle, VehiclePayload } from '../../../../types/vehicle';
import { normalizeVehiclePlate } from '../../../../features/vehicles/plate';

const memoryStore = globalThis as unknown as {
  __vehicles?: Vehicle[];
};

function normalizeText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

export function getVehiclesStore() {
  if (!memoryStore.__vehicles) {
    memoryStore.__vehicles = [];
  }

  return memoryStore.__vehicles;
}

export function resetVehiclesStore(nextVehicles: Vehicle[] = []) {
  memoryStore.__vehicles = [...nextVehicles];
  return memoryStore.__vehicles;
}

export function createVehicleRecord(payload: VehiclePayload): Vehicle {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    plate: normalizeVehiclePlate(payload.plate),
    brand: normalizeText(payload.brand, 'Sem marca'),
    model: normalizeText(payload.model, 'Sem modelo'),
    color: normalizeText(payload.color, 'Sem cor'),
    type: normalizeText(payload.type, 'outro') as Vehicle['type'],
    status: normalizeText(payload.status, 'ativo') as Vehicle['status'],
    ownerId: normalizeText(payload.ownerId),
    ownerName: normalizeText(payload.ownerName),
    unitId: normalizeText(payload.unitId),
    unitLabel: normalizeText(payload.unitLabel),
    structureLabel: normalizeText(payload.structureLabel),
    condominiumName: normalizeText(payload.condominiumName),
    tag: normalizeText(payload.tag),
    notes: normalizeText(payload.notes),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateVehicleRecord(current: Vehicle, payload: Partial<VehiclePayload>): Vehicle {
  return {
    ...current,
    plate: payload.plate === undefined ? current.plate : normalizeVehiclePlate(payload.plate),
    brand: payload.brand === undefined ? current.brand : normalizeText(payload.brand, current.brand),
    model: payload.model === undefined ? current.model : normalizeText(payload.model, current.model),
    color: payload.color === undefined ? current.color : normalizeText(payload.color, current.color),
    type: payload.type === undefined ? current.type : normalizeText(payload.type, current.type) as Vehicle['type'],
    status: payload.status === undefined ? current.status : normalizeText(payload.status, current.status) as Vehicle['status'],
    ownerId: payload.ownerId === undefined ? current.ownerId : normalizeText(payload.ownerId),
    ownerName: payload.ownerName === undefined ? current.ownerName : normalizeText(payload.ownerName),
    unitId: payload.unitId === undefined ? current.unitId : normalizeText(payload.unitId),
    unitLabel: payload.unitLabel === undefined ? current.unitLabel : normalizeText(payload.unitLabel),
    structureLabel: payload.structureLabel === undefined ? current.structureLabel : normalizeText(payload.structureLabel),
    condominiumName: payload.condominiumName === undefined ? current.condominiumName : normalizeText(payload.condominiumName),
    tag: payload.tag === undefined ? current.tag : normalizeText(payload.tag),
    notes: payload.notes === undefined ? current.notes : normalizeText(payload.notes),
    updatedAt: new Date().toISOString(),
  };
}

export function insertVehicle(vehicle: Vehicle) {
  const store = getVehiclesStore();
  store.unshift(vehicle);
  return vehicle;
}

export function removeVehicleById(id: string) {
  const store = getVehiclesStore();
  const index = store.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  return store.splice(index, 1)[0];
}
