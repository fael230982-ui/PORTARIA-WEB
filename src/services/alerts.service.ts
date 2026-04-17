//src/services/alerts.service.ts
import { api } from '@/lib/axios';
import { normalizeAlert, normalizeAlertsListResponse } from '@/features/alerts/alert-normalizers';
import type { Alert, AlertsListResponse, AlertStatus, AlertWorkflow, AlertWorkflowStatus } from '@/types/alert';

type GetAlertsParams = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
};

export async function getAlerts(params?: GetAlertsParams): Promise<AlertsListResponse> {
  try {
    const response = await api.get<AlertsListResponse>('/alerts', { params });
    return normalizeAlertsListResponse(response.data);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return {
        data: [],
        meta: {
          totalItems: 0,
          currentPage: 1,
          totalPages: 0,
          itemsPerPage: params?.limit ?? 0,
        },
      };
    }

    throw error;
  }
}

export async function updateAlertStatus(id: string, status: AlertStatus): Promise<Alert> {
  const response = await api.patch<Alert>(`/alerts/${id}/status`, { status });
  return normalizeAlert(response.data);
}

type AlertWorkflowUpdatePayload = {
  workflowStatus: AlertWorkflowStatus;
  resolutionNote?: string | null;
  resolutionPreset?: string | null;
};

export async function getAlertWorkflow(id: string): Promise<AlertWorkflow | null> {
  const response = await api.get<Alert>(`/alerts/${id}/workflow`);
  return response.data.workflow ?? null;
}

export async function updateAlertWorkflow(id: string, payload: AlertWorkflowUpdatePayload): Promise<Alert> {
  const response = await api.patch<Alert>(`/alerts/${id}/workflow`, payload);
  return normalizeAlert(response.data);
}
