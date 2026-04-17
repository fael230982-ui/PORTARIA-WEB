import { api } from '@/lib/axios';
import { createClientRequestId } from '@/features/offline/client-request-id';
import type {
  DeliveriesListResponse,
  Delivery,
  DeliveryOcrResponse,
  DeliveryPayload,
  DeliveryPhotoUploadResponse,
  DeliveryRenotifyResponse,
  DeliveryStatusUpdatePayload,
} from '@/types/delivery';
import type {
  DeliveryWithdrawalValidationPayload,
  DeliveryWithdrawalValidationResponse,
} from '@/types/operation';

type GetDeliveriesParams = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  recipientUnitId?: string;
  from?: string;
  to?: string;
};

export async function getDeliveries(params?: GetDeliveriesParams): Promise<DeliveriesListResponse> {
  const response = await api.get<DeliveriesListResponse>('/deliveries', { params });
  return response.data;
}

export async function getAllDeliveries(params?: Omit<GetDeliveriesParams, 'page'>): Promise<DeliveriesListResponse> {
  const firstPage = await getDeliveries({ ...params, page: 1, limit: params?.limit ?? 100 });
  const totalPages = firstPage.meta?.totalPages ?? 1;

  if (totalPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getDeliveries({ ...params, page: index + 2, limit: params?.limit ?? firstPage.meta?.itemsPerPage ?? 100 })
    )
  );

  const deliveriesById = new Map<string, Delivery>();

  for (const delivery of firstPage.data) {
    deliveriesById.set(delivery.id, delivery);
  }

  for (const page of remainingPages) {
    for (const delivery of page.data) {
      deliveriesById.set(delivery.id, delivery);
    }
  }

  return {
    data: Array.from(deliveriesById.values()),
    meta: {
      totalItems: deliveriesById.size,
      currentPage: 1,
      totalPages,
      itemsPerPage: firstPage.meta?.itemsPerPage ?? params?.limit ?? 100,
    },
  };
}

export async function createDelivery(payload: DeliveryPayload): Promise<Delivery> {
  const response = await api.post<Delivery>('/deliveries', {
    ...payload,
    clientRequestId: payload.clientRequestId ?? createClientRequestId('delivery'),
  });
  return response.data;
}

export async function updateDeliveryStatus(id: string, payload: DeliveryStatusUpdatePayload): Promise<Delivery> {
  const response = await api.patch<Delivery>(`/deliveries/${id}/status`, payload);
  return response.data;
}

export async function renotifyDelivery(id: string): Promise<DeliveryRenotifyResponse> {
  const response = await api.post<DeliveryRenotifyResponse>(`/deliveries/${id}/renotify`);
  return response.data;
}

export async function validateDeliveryWithdrawal(
  id: string,
  payload: DeliveryWithdrawalValidationPayload
): Promise<DeliveryWithdrawalValidationResponse> {
  const response = await api.post<DeliveryWithdrawalValidationResponse>(`/deliveries/${id}/validate-withdrawal`, payload);
  return response.data;
}

export async function getDeliveryWithdrawalQr(code: string): Promise<Delivery> {
  const response = await api.get<Delivery>(`/deliveries/withdrawal-qr/${encodeURIComponent(code)}`);
  return response.data;
}

export async function uploadDeliveryPhoto(photoBase64: string, fileName?: string | null): Promise<DeliveryPhotoUploadResponse> {
  const response = await api.post<DeliveryPhotoUploadResponse>('/deliveries/photo/upload', {
    photoBase64,
    fileName: fileName ?? null,
  });
  return response.data;
}

export async function ocrDeliveryPhoto(photo: File): Promise<DeliveryOcrResponse> {
  const formData = new FormData();
  formData.append('photo', photo);

  const response = await api.post<DeliveryOcrResponse>('/deliveries/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function ocrDeliveryLabel(payload: {
  photoUrl?: string | null;
  photoBase64?: string | null;
  fileName?: string | null;
}): Promise<DeliveryOcrResponse> {
  const response = await api.post<DeliveryOcrResponse>('/deliveries/ocr-label', payload);
  return response.data;
}
