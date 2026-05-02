export function normalizeCameraProfile(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

export function normalizeCameraProfileKey(value: unknown) {
  return normalizeCameraProfile(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function compareCameraProfiles(left: string, right: string) {
  return left.localeCompare(right, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export function uniqueSortedCameraProfiles(values: unknown[]) {
  return Array.from(new Set(values.map(normalizeCameraProfile).filter(Boolean))).sort(compareCameraProfiles);
}
