const STORAGE_KEY = 'resident-device-id-v1';
export const RESIDENT_DEVICE_ID_PLACEHOLDER = 'resident-web';

export function getResidentDeviceId() {
  if (typeof window === 'undefined') return RESIDENT_DEVICE_ID_PLACEHOLDER;

  let deviceId = window.localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `resident-web-${crypto.randomUUID()}`
        : `resident-web-${Date.now()}`;
    window.localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}
