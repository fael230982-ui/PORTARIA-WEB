export type AccessReportMetadata = {
  kind: 'access';
  action: 'ENTRY' | 'EXIT';
  personId: string;
  unitId?: string | null;
  category?: string | null;
};

export type OperationReportMetadata = {
  kind: 'operation';
  context?: string | null;
  personId?: string | null;
  cameraId?: string | null;
  unitId?: string | null;
};

export type ShiftHandoverReportMetadata = {
  kind: 'shift_handover';
  operatorId?: string | null;
  operatorName?: string | null;
  condominiumId?: string | null;
  condominiumName?: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  summary: {
    alerts: number;
    alertLocations: string[];
    receivedDeliveries: number;
    pendingDeliveries: number;
    withdrawnDeliveries: number;
    visitors: number;
    serviceProviders: number;
    activeResidents: number;
    unreadMessages: number;
    occurrences: number;
    accessEntries: number;
    accessExits: number;
  };
  notes?: string | null;
};

export type ReportMetadata =
  | AccessReportMetadata
  | OperationReportMetadata
  | ShiftHandoverReportMetadata
  | Record<string, unknown>;

export type Report = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  metadata?: ReportMetadata | null;
};

export type ReportPayload = {
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  visibility: string;
  metadata?: ReportMetadata | null;
};

export type ReportsListResponse = {
  success: boolean;
  data: Report[];
  total: number;
};

export type ReportResponse = {
  success: boolean;
  message?: string;
  data: Report;
};
