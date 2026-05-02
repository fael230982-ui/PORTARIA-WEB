export type AlertType =
  | 'INFO'
  | 'WARNING'
  | 'DANGER'
  | 'PANIC'
  | 'UNKNOWN_PERSON'
  | 'CAMERA_OFFLINE'
  | 'ACCESS_DENIED';

export type AlertStatus = 'READ' | 'UNREAD';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertWorkflowStatus = 'NEW' | 'ON_HOLD' | 'RESOLVED';

export type AlertWorkflow = {
  workflowStatus: AlertWorkflowStatus;
  openedAt?: string | null;
  openedByUserId?: string | null;
  openedByName?: string | null;
  resolvedAt?: string | null;
  resolvedByUserId?: string | null;
  resolvedByName?: string | null;
  lastReturnedToQueueAt?: string | null;
  resolutionNote?: string | null;
  resolutionPreset?: string | null;
};

export type AlertCameraEvidence = {
  id?: string | null;
  cameraId?: string | null;
  cameraName?: string | null;
  name?: string | null;
  label?: string | null;
  snapshotUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  liveUrl?: string | null;
  hlsUrl?: string | null;
  preferredLiveUrl?: string | null;
  replayUrl?: string | null;
  replayCreateUrl?: string | null;
  replayAvailable?: boolean | null;
  eventTime?: string | null;
  secondsBefore?: number | null;
  secondsAfter?: number | null;
  replaySecondsBefore?: number | null;
  replaySecondsAfter?: number | null;
  replayMaxSecondsBefore?: number | null;
  replayMaxSecondsAfter?: number | null;
};

export type Alert = {
  id: string;
  alertId?: string | null;
  title: string;
  description?: string | null;
  type: AlertType;
  status: AlertStatus;
  severity?: AlertSeverity | null;
  timestamp: string;
  cameraId?: string | null;
  personId?: string | null;
  photoUrl?: string | null;
  snapshotUrl?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  replayUrl?: string | null;
  replayCreateUrl?: string | null;
  replayAvailable?: boolean | null;
  replayEventTime?: string | null;
  replaySecondsBefore?: number | null;
  replaySecondsAfter?: number | null;
  replayMaxSecondsBefore?: number | null;
  replayMaxSecondsAfter?: number | null;
  eventTime?: string | null;
  secondsBefore?: number | null;
  secondsAfter?: number | null;
  cameraIds?: string[];
  cameras?: AlertCameraEvidence[];
  cameraName?: string | null;
  liveUrl?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  deviceVendor?: string | null;
  deviceModel?: string | null;
  unitId?: string | null;
  location?: string | null;
  readAt?: string | null;
  workflow?: AlertWorkflow | null;
  payload?: Record<string, unknown> | null;
};

export type AlertsListResponse = {
  data: Alert[];
  meta?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};
