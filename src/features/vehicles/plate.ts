export type PlateFormat = 'old' | 'mercosul' | 'invalid' | 'partial';

const OLD_PLATE_PATTERN = /^[A-Z]{3}[0-9]{4}$/;
const MERCOSUL_PLATE_PATTERN = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function normalizeVehiclePlate(value: unknown) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
}

export function detectVehiclePlateFormat(value: unknown): PlateFormat {
  const plate = normalizeVehiclePlate(value);

  if (!plate) return 'partial';
  if (OLD_PLATE_PATTERN.test(plate)) return 'old';
  if (MERCOSUL_PLATE_PATTERN.test(plate)) return 'mercosul';
  if (plate.length < 7) return 'partial';

  return 'invalid';
}

export function formatVehiclePlate(value: unknown) {
  const plate = normalizeVehiclePlate(value);

  if (plate.length <= 3) return plate;

  return `${plate.slice(0, 3)}-${plate.slice(3)}`;
}

export function getVehiclePlateFormatLabel(value: unknown) {
  const format = detectVehiclePlateFormat(value);

  if (format === 'old') return 'Formato antigo';
  if (format === 'mercosul') return 'Formato Mercosul';
  if (format === 'invalid') return 'Placa invalida';

  return 'Digite 3 letras e 4 caracteres finais';
}

export function isValidVehiclePlate(value: unknown) {
  const format = detectVehiclePlateFormat(value);
  return format === 'old' || format === 'mercosul';
}
