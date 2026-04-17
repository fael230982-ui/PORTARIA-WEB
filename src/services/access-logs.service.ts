import { api } from '@/lib/axios';
import type { AccessLog, AccessLogsListResponse } from '@/types/access-log';

type GetAccessLogsParams = {
  page?: number;
  limit?: number;
  personId?: string | null;
  cameraId?: string | null;
  userId?: string | null;
  direction?: string | null;
  result?: string | null;
  classification?: string | null;
  unitId?: string | null;
};

export async function getAccessLogs(params?: GetAccessLogsParams): Promise<AccessLogsListResponse> {
  const response = await api.get<AccessLogsListResponse>('/access-logs', { params });
  return response.data;
}

export async function getAccessLogById(id: string): Promise<AccessLog> {
  const response = await api.get<AccessLog>(`/access-logs/${id}`);
  return response.data;
}
