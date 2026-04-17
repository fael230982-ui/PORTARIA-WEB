export type SyncReconciliationStatus =
  | 'NOT_FOUND'
  | 'PENDING'
  | 'PROCESSING'
  | 'APPLIED'
  | 'FAILED_TEMPORARY'
  | 'FAILED_PERMANENT';

export type SyncReconciliationErrorType =
  | 'TEMPORARY'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'PERMISSION'
  | 'INTERNAL';

export type SyncReconciliationResponse = {
  found: boolean;
  clientRequestId: string;
  syncStatus: SyncReconciliationStatus;
  retryable?: boolean;
  isFinal?: boolean;
  errorType?: SyncReconciliationErrorType | null;
  errorMessage?: string | null;
  syncedAt?: string | null;
  createdAt?: string | null;
};
