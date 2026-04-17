import type { Condominium } from '@/types/condominium';

const MODULE_ALIASES: Record<string, string[]> = {
  units: ['units'],
  people: ['people', 'residents'],
  users: ['users'],
  deliveries: ['deliveries', 'delivery'],
  alerts: ['alerts', 'alertas', 'occurrences'],
  vehicles: ['vehicles'],
  reports: ['reports', 'reporting'],
  cameras: ['cameras', 'camera'],
  accesslogs: ['accesslogs', 'access_logs'],
  visitforecasts: ['visitforecasts', 'visit_forecasts'],
  facialrecognition: ['facialrecognition', 'facial'],
  operation: ['operation', 'monitoring'],
};

function normalizeModuleKey(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  for (const [canonical, aliases] of Object.entries(MODULE_ALIASES)) {
    if (canonical === normalized || aliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

export function normalizeEnabledModules(values?: string[] | Record<string, boolean> | null) {
  if (values && !Array.isArray(values) && typeof values === 'object') {
    return new Set<string>(
      Object.entries(values)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([key]) => normalizeModuleKey(String(key)))
        .filter((value): value is string => Boolean(value))
    );
  }

  const list = Array.isArray(values) ? values : [];
  return new Set<string>(
    list
      .map((value) => normalizeModuleKey(String(value)))
      .filter((value): value is string => Boolean(value))
  );
}

export function isModuleEnabled(enabledModules: Set<string>, moduleKey?: string) {
  if (!moduleKey || enabledModules.size === 0) return true;

  const canonicalKey = normalizeModuleKey(moduleKey) ?? moduleKey;
  return enabledModules.has(canonicalKey);
}

export function getCondominiumEnabledModules(condominium: Condominium | null | undefined) {
  if (!condominium) return new Set<string>();

  const moduleSettings = normalizeEnabledModules(condominium.moduleSettings);
  if (moduleSettings.size > 0) {
    return moduleSettings;
  }

  return normalizeEnabledModules(condominium.enabledModules);
}

export function getResidentManagementFlag(condominium: Condominium | null | undefined, key: string, fallback = true) {
  const settings = condominium?.residentManagementSettings;
  if (!settings || typeof settings !== 'object') return fallback;
  const normalizedKey = key.trim().toLowerCase();

  for (const [currentKey, value] of Object.entries(settings)) {
    if (currentKey.trim().toLowerCase() === normalizedKey) {
      return Boolean(value);
    }
  }

  return fallback;
}

export function getCurrentCondominium(
  condominiums: Condominium[],
  condominiumId?: string | null
) {
  if (!condominiumId) return null;
  return condominiums.find((item) => item.id === condominiumId) ?? null;
}
