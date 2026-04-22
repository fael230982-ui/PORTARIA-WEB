import { api } from '@/lib/axios';
import type {
  ControlIdConfigureMonitorPayload,
  ControlIdConfigurePushPayload,
  ControlIdEnableOnlinePayload,
  ControlIdRemoteOpenPayload,
  Device,
  DeviceControlResponse,
  DevicePayload,
} from '@/types/device';

type DevicesFilters = {
  unitId?: string | null;
  condominiumId?: string | null;
};

export const devicesService = {
  async list(filters: DevicesFilters = {}): Promise<Device[]> {
    const { data } = await api.get<Device[]>('/devices', {
      params: {
        unitId: filters.unitId || undefined,
        condominiumId: filters.condominiumId || undefined,
      },
    });
    return Array.isArray(data) ? data : [];
  },

  async get(id: string): Promise<Device> {
    const { data } = await api.get<Device>(`/devices/${id}`);
    return data;
  },

  async create(payload: DevicePayload): Promise<Device> {
    const { data } = await api.post<Device>('/devices', payload);
    return data;
  },

  async update(id: string, payload: Partial<DevicePayload>): Promise<Device> {
    const { data } = await api.put<Device>(`/devices/${id}`, payload);
    return data;
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

  async syncPersonToControlId(id: string, personId: string): Promise<DeviceControlResponse> {
    const { data } = await api.post<DeviceControlResponse>(`/devices/${id}/control-id/people/${personId}/sync`);
    return data;
  },
};
