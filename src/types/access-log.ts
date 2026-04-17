export type AccessLogDirection = 'ENTRY' | 'EXIT';
export type AccessLogResult = 'ALLOWED' | 'DENIED';

export type AccessLog = {
  id: string;
  personId?: string | null;
  cameraId?: string | null;
  userId?: string | null;
  personName?: string | null;
  cameraName?: string | null;
  userName?: string | null;
  classification: string;
  classificationLabel: string;
  direction: AccessLogDirection;
  result: AccessLogResult;
  location?: string | null;
  message?: string | null;
  timestamp: string;
};

export type AccessLogsListResponse = {
  data: AccessLog[];
  meta?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};
