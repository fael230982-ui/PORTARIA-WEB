import { NextResponse } from 'next/server.js';
import type { VehiclePayload } from '../../../../../types/vehicle';
import { isValidVehiclePlate } from '../../../../../features/vehicles/plate';
import { getVehiclesStore, removeVehicleById, updateVehicleRecord } from '../store.ts';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = (await request.json()) as Partial<VehiclePayload>;
  const store = getVehiclesStore();
  const index = store.findIndex((item) => item.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, message: 'Veículo não encontrado.' },
      { status: 404 }
    );
  }

  if (payload.plate !== undefined && !isValidVehiclePlate(payload.plate)) {
    return NextResponse.json(
      { success: false, message: 'Informe uma placa valida: ABC-1234 ou ABC1D23.' },
      { status: 400 }
    );
  }

  store[index] = updateVehicleRecord(store[index], payload);

  return NextResponse.json({
    success: true,
    message: 'Veiculo atualizado com sucesso.',
    data: store[index],
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const removed = removeVehicleById(id);

  if (!removed) {
    return NextResponse.json(
      { success: false, message: 'Veículo não encontrado.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Veiculo removido com sucesso.',
    data: removed,
  });
}
