import { NextResponse } from 'next/server.js';
import type { VehiclePayload } from '../../../../types/vehicle';
import { isValidVehiclePlate } from '../../../../features/vehicles/plate';
import { createVehicleRecord, getVehiclesStore, insertVehicle } from './store.ts';

export async function GET() {
  const vehicles = getVehiclesStore()
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({
    success: true,
    data: vehicles,
    total: vehicles.length,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<VehiclePayload>;

  if (!payload.plate || !String(payload.plate).trim()) {
    return NextResponse.json(
      { success: false, message: 'O campo plate e obrigatorio.' },
      { status: 400 }
    );
  }

  if (!isValidVehiclePlate(payload.plate)) {
    return NextResponse.json(
      { success: false, message: 'Informe uma placa valida: ABC-1234 ou ABC1D23.' },
      { status: 400 }
    );
  }

  const vehicle = createVehicleRecord({
    plate: String(payload.plate),
    brand: String(payload.brand ?? ''),
    model: String(payload.model ?? ''),
    color: String(payload.color ?? ''),
    type: (payload.type ?? 'outro') as VehiclePayload['type'],
    status: (payload.status ?? 'ativo') as VehiclePayload['status'],
    ownerId: String(payload.ownerId ?? ''),
    ownerName: String(payload.ownerName ?? ''),
    unitId: String(payload.unitId ?? ''),
    unitLabel: String(payload.unitLabel ?? ''),
    structureLabel: String(payload.structureLabel ?? ''),
    condominiumName: String(payload.condominiumName ?? ''),
    tag: String(payload.tag ?? ''),
    notes: String(payload.notes ?? ''),
  });

  insertVehicle(vehicle);

  return NextResponse.json({
    success: true,
    message: 'Veiculo criado com sucesso.',
    data: vehicle,
  });
}
