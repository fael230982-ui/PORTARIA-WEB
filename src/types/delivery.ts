export type DeliveryStatus = 'RECEIVED' | 'NOTIFIED' | 'WITHDRAWN';
export type DeliveryStatusInput = DeliveryStatus | 'READY_FOR_WITHDRAWAL';

export type PaginationMeta = {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
};

export type DeliveryRenotificationSettings = {
  enabled?: boolean | null;
  allowDeliverer?: boolean | null;
  intervalMinutes?: number | null;
  maxAttempts?: number | null;
};

export type Delivery = {
  id: string;
  recipientUnitId: string;
  recipientUnitName?: string | null;
  unitLabel?: string | null;
  recipientPersonId?: string | null;
  recipientPersonName?: string | null;
  deliveryCompany: string;
  trackingCode?: string | null;
  status: DeliveryStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  receivedAt: string;
  receivedBy: string;
  receivedByUserId?: string | null;
  receivedByName?: string | null;
  photoUrl?: string | null;
  packagePhotoUrl?: string | null;
  labelPhotoUrl?: string | null;
  clientRequestId?: string | null;
  pickupCode?: string | null;
  withdrawalCode?: string | null;
  qrCodeUrl?: string | null;
  withdrawalQrCodeUrl?: string | null;
  notificationSentAt?: string | null;
  deliveryRenotification?: DeliveryRenotificationSettings | null;
  withdrawnAt?: string | null;
  withdrawnBy?: string | null;
  withdrawnByName?: string | null;
  withdrawalValidationMethod?: string | null;
  withdrawalValidatedAt?: string | null;
  withdrawalValidatedByUserId?: string | null;
  withdrawalValidatedByUserName?: string | null;
  withdrawalFailureReason?: string | null;
};

export type DeliveryPhotoUploadResponse = {
  photoUrl: string;
};

export type DeliveryOcrUnitSuggestion = {
  unitId: string;
  unitName: string;
  score: number;
};

export type DeliveryOcrResidentSuggestion = {
  id: string;
  name: string;
};

export type DeliveryOcrResponse = {
  deliveryCompany?: string | null;
  trackingCode?: string | null;
  recipientName?: string | null;
  unitHint?: string | null;
  suggestedUnitId?: string | null;
  suggestedUnitName?: string | null;
  suggestedResidentId?: string | null;
  suggestedResidentName?: string | null;
  confidence?: number | null;
  rawText: string;
  normalizedText?: string | null;
  trackingCodeCandidates?: string[] | null;
  carrierHint?: string | null;
  unitSuggestions?: DeliveryOcrUnitSuggestion[] | null;
  residentSuggestions?: DeliveryOcrResidentSuggestion[] | null;
};

export type DeliveryPayload = {
  recipientUnitId: string;
  recipientPersonId?: string | null;
  deliveryCompany: string;
  trackingCode?: string | null;
  status?: DeliveryStatus;
  receivedAt?: string | null;
  receivedBy: string;
  photoUrl?: string | null;
  clientRequestId?: string | null;
};

export type DeliveryStatusUpdatePayload = {
  status: DeliveryStatus;
  withdrawnBy?: string | null;
};

export type DeliveryRenotifyResponse = {
  ok: boolean;
  deliveryId: string;
  notifiedUsersCount: number;
  notificationSentAt?: string | null;
};

export type DeliveriesListResponse = {
  data: Delivery[];
  meta: PaginationMeta;
};
