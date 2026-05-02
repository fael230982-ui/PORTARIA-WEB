import { NextResponse } from 'next/server.js';
import { isValidVehiclePlate, normalizeVehiclePlate } from '../../../../../features/vehicles/plate';
import type { VehiclePlateLookupResponse, VehicleType } from '../../../../../types/vehicle';

const PROVIDER_URL = process.env.VEHICLE_LOOKUP_API_URL;
const PROVIDER_TOKEN = process.env.VEHICLE_LOOKUP_API_TOKEN;
const PROVIDER_HEADER = process.env.VEHICLE_LOOKUP_AUTH_HEADER || 'Authorization';

function normalizeText(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function pickText(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(source[key]);
    if (value) return value;
  }

  return null;
}

function pickYear(source: Record<string, unknown>) {
  const value = source.year ?? source.ano ?? source.anoModelo ?? source.anoFabricacao;

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return null;
}

function inferVehicleType(source: Record<string, unknown>): VehicleType | null {
  const text = [
    source.type,
    source.tipo,
    source.vehicleType,
    source.especie,
    source.category,
    source.categoria,
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (!text) return null;
  if (text.includes('moto') || text.includes('motocic')) return 'moto';
  if (text.includes('caminhao') || text.includes('caminhão')) return 'caminhao';
  if (text.includes('van') || text.includes('caminhonete') || text.includes('picape') || text.includes('pickup') || text.includes('utilitario')) return 'outro';
  if (text.includes('carro') || text.includes('automovel') || text.includes('passageiro')) return 'carro';

  return 'outro';
}

function normalizeLookupPayload(plate: string, payload: unknown): VehiclePlateLookupResponse {
  const source = (payload ?? {}) as Record<string, unknown>;
  const nestedVehicle =
    (source.veiculo as Record<string, unknown> | undefined) ??
    (source.vehicle as Record<string, unknown> | undefined) ??
    source;

  return {
    plate,
    brand: pickText(nestedVehicle, ['brand', 'marca', 'manufacturer', 'fabricante']),
    model: pickText(nestedVehicle, ['model', 'modelo', 'modeloDescricao', 'marcaModelo']),
    color: pickText(nestedVehicle, ['color', 'cor', 'corDescricao']),
    type: inferVehicleType(nestedVehicle),
    year: pickYear(nestedVehicle),
    city: pickText(nestedVehicle, ['city', 'cidade', 'municipio']),
    state: pickText(nestedVehicle, ['state', 'uf', 'estado']),
    situation: pickText(nestedVehicle, ['situation', 'situacao', 'status', 'mensagemRetorno']),
    stolen:
      typeof nestedVehicle.stolen === 'boolean'
        ? nestedVehicle.stolen
        : typeof nestedVehicle.rouboFurto === 'boolean'
          ? nestedVehicle.rouboFurto
          : null,
    source: process.env.VEHICLE_LOOKUP_PROVIDER_NAME || 'provedor-configurado',
    raw: payload,
  };
}

function buildProviderUrl(plate: string) {
  if (!PROVIDER_URL) return null;

  if (PROVIDER_URL.includes('{plate}')) {
    return PROVIDER_URL.replaceAll('{plate}', encodeURIComponent(plate));
  }

  const url = new URL(PROVIDER_URL);
  url.searchParams.set('plate', plate);
  return url.toString();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const plate = normalizeVehiclePlate(requestUrl.searchParams.get('plate'));

  if (!isValidVehiclePlate(plate)) {
    return NextResponse.json(
      { success: false, message: 'Informe uma placa valida: ABC-1234 ou ABC1D23.' },
      { status: 400 }
    );
  }

  const providerUrl = buildProviderUrl(plate);

  if (!providerUrl) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Consulta automática de placa ainda não configurada. Defina VEHICLE_LOOKUP_API_URL e, se necessário, VEHICLE_LOOKUP_API_TOKEN.',
      },
      { status: 501 }
    );
  }

  const headers = new Headers({
    Accept: 'application/json',
  });

  if (PROVIDER_TOKEN) {
    headers.set(PROVIDER_HEADER, PROVIDER_HEADER.toLowerCase() === 'authorization' ? `Bearer ${PROVIDER_TOKEN}` : PROVIDER_TOKEN);
  }

  try {
    const response = await fetch(providerUrl, {
      headers,
      cache: 'no-store',
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Provedor de placa retornou HTTP ${response.status}.`,
          details: payload,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: normalizeLookupPayload(plate, payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida na consulta de placa.';

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 502 }
    );
  }
}
