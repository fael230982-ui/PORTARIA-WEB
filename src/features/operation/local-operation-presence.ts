import type { Role } from '@/constants/roles';

export const LOCAL_OPERATION_PRESENCE_KEY = 'local-operation-presence-v1';
export const LOCAL_OPERATION_PRESENCE_EVENT = 'local-operation-presence-updated';
export const LOCAL_OPERATION_PRESENCE_TTL_MS = 2 * 60 * 1000;

export type LocalOperationPresenceRecord = {
  condominiumId: string;
  deviceId: string;
  deviceName: string;
  currentPath?: string | null;
  lastSeenAt: string;
  role?: Role | string | null;
  userId?: string | null;
};

type LocalOperationPresenceMap = Record<string, LocalOperationPresenceRecord>;

function isBrowser() {
  return typeof window !== 'undefined';
}

function parsePresenceMap(raw: string | null): LocalOperationPresenceMap {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as LocalOperationPresenceMap;
  } catch {
    return {};
  }
}

function readPresenceMap(): LocalOperationPresenceMap {
  if (!isBrowser()) return {};
  return parsePresenceMap(window.localStorage.getItem(LOCAL_OPERATION_PRESENCE_KEY));
}

function writePresenceMap(map: LocalOperationPresenceMap) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_OPERATION_PRESENCE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(LOCAL_OPERATION_PRESENCE_EVENT));
}

export function writeLocalOperationPresence(record: LocalOperationPresenceRecord) {
  if (!isBrowser() || !record.condominiumId) return;

  const map = readPresenceMap();
  map[record.condominiumId] = record;
  writePresenceMap(map);
}

export function readLocalOperationPresence(): LocalOperationPresenceRecord[] {
  return Object.values(readPresenceMap());
}

export function isLocalOperationPresenceFresh(
  record: Pick<LocalOperationPresenceRecord, 'lastSeenAt'>,
  now = Date.now()
) {
  const timestamp = new Date(record.lastSeenAt).getTime();
  return !Number.isNaN(timestamp) && now - timestamp <= LOCAL_OPERATION_PRESENCE_TTL_MS;
}
