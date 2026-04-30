import { api } from '@/lib/axios';
import type {
  ControlIdConfigureMonitorPayload,
  ControlIdConfigurePushPayload,
  ControlIdEnableOnlinePayload,
  ControlIdRemoteOpenPayload,
  Device,
  DeviceControlResponse,
  DeviceCreateResult,
  DevicePayload,
  DeviceProvisioningStatus,
} from '@/types/device';

type DevicesFilters = {
  unitId?: string | null;
  condominiumId?: string | null;
};

type DeviceListResponse =
  | Device[]
  | {
      data?: Device[];
      items?: Device[];
      value?: Device[];
    };

type DeviceSingleResponse =
  | Device
  | {
      controlIdProvisioning?: DeviceProvisioningStatus | null;
      data?: Device | null;
      item?: Device | null;
      device?: Device | null;
    };

function parseDeviceList(payload: DeviceListResponse): Device[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function parseDevice(payload: DeviceSingleResponse): Device {
  if (payload && typeof payload === 'object' && 'id' in payload) {
    return payload as Device;
  }

  const nextDevice =
    (payload as { data?: Device | null })?.data ??
    (payload as { item?: Device | null })?.item ??
    (payload as { device?: Device | null })?.device;

  if (nextDevice && nextDevice.id) {
    return nextDevice;
  }

  throw new Error('O servidor confirmou o cadastro, mas não devolveu os dados do dispositivo.');
}

function parseDeviceCreateResult(payload: DeviceSingleResponse): DeviceCreateResult {
  const device = parseDevice(payload);
  const controlIdProvisioning =
    payload && typeof payload === 'object' && 'controlIdProvisioning' in payload
      ? (payload as { controlIdProvisioning?: DeviceProvisioningStatus | null }).controlIdProvisioning ?? null
      : null;

  return {
    device,
    controlIdProvisioning,
  };
}

export const devicesService = {
  async list(filters: DevicesFilters = {}): Promise<Device[]> {
    try {
      const { data } = await api.get<DeviceListResponse>('/devices', {
        params: {
          unitId: filters.unitId || undefined,
          condominiumId: filters.condominiumId || undefined,
        },
      });
      return parseDeviceList(data);
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      const canRetryWithoutCondominium = status === 500 && Boolean(filters.condominiumId) && !filters.unitId;

      if (!canRetryWithoutCondominium) {
        throw error;
      }

      const { data } = await api.get<DeviceListResponse>('/devices');
      return parseDeviceList(data);
    }
  },

  async get(id: string): Promise<Device> {
    const { data } = await api.get<DeviceSingleResponse>(`/devices/${id}`);
    return parseDevice(data);
  },

  async create(payload: DevicePayload): Promise<DeviceCreateResult> {
    const { data } = await api.post<DeviceSingleResponse>('/devices', payload);
    return parseDeviceCreateResult(data);
  },

  async update(id: string, payload: Partial<DevicePayload>): Promise<Device> {
    try {
      const { data } = await api.patch<DeviceSingleResponse>(`/devices/${id}`, payload);
      return parseDevice(data);
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }

      const { data } = await api.put<DeviceSingleResponse>(`/devices/${id}`, payload);
      return parseDevice(data);
    }
  },

  async remove(id: string) {
    await api.delete(`/devices/${id}`);
  },

  async testControlIdConnection(id: string): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/test-connection`);
    return data;
  },

  async configureControlIdPush(id: string, payload: ControlIdConfigurePushPayload): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/configure-push`, payload);
    return data;
  },

  async configureControlIdMonitor(id: string, payload: ControlIdConfigureMonitorPayload): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/configure-monitor`, payload);
    return data;
  },

  async enableControlIdOnline(id: string, payload: ControlIdEnableOnlinePayload): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/enable-online`, payload);
    return data;
  },

  async disableControlIdOnline(id: string): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/disable-online`);
    return data;
  },

  async remoteOpenControlId(id: string, payload: ControlIdRemoteOpenPayload): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/remote-open`, payload);
    return data;
  },

  async getControlIdJob(id: string, jobId: string): Promise<DeviceControlResponse> {
    const { data } = await api.get<DeviceControlResponse>(`/devices/${id}/control-id/jobs/${jobId}`);
    return data;
  },

  async getControlIdDoorStatus(id: string): Promise<DeviceControlResponse> {
    const { data } = await api.get<DeviceControlResponse>(`/devices/${id}/control-id/door-status`);
    return data;
  },

  async syncPersonToControlId(id: string, personId: string): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/people/${personId}/sync`);
    return data;
  },
};
