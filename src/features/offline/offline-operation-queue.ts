import { createDelivery, updateDeliveryStatus, validateDeliveryWithdrawal } from '@/services/deliveries.service';
import { operationService } from '@/services/operation.service';
import { createPerson, updatePerson, updatePersonStatus } from '@/services/people.service';
import { createReport } from '@/services/reports.service';
import { reconcileSyncRequest } from '@/services/sync.service';
import { createClientRequestId } from '@/features/offline/client-request-id';
import type { DeliveryPayload, DeliveryStatusUpdatePayload } from '@/types/delivery';
import type {
  DeliveryWithdrawalValidationPayload,
  OperationMessagePayload,
  OperationShiftChangePayload,
} from '@/types/operation';
import type { CreatePersonRequest, UpdatePersonRequest, UpdatePersonStatusRequest } from '@/types/person';
import type { ReportPayload } from '@/types/report';

const STORAGE_KEY = 'operation-offline-queue-v1';
const UPDATE_EVENT = 'operation-offline-queue-updated';

const isBrowser = typeof window !== 'undefined';

export type OfflineOperationKind =
  | 'PERSON_CREATE'
  | 'PERSON_UPDATE'
  | 'PERSON_STATUS_UPDATE'
  | 'REPORT_CREATE'
  | 'DELIVERY_CREATE'
  | 'DELIVERY_STATUS_UPDATE'
  | 'DELIVERY_WITHDRAWAL_VALIDATE'
  | 'SHIFT_CHANGE_CREATE'
  | 'MESSAGE_SEND';

type OfflineOperationPayloadMap = {
  PERSON_CREATE: CreatePersonRequest;
  PERSON_UPDATE: {
    personId: string;
    payload: UpdatePersonRequest;
  };
  PERSON_STATUS_UPDATE: {
    personId: string;
    payload: UpdatePersonStatusRequest;
  };
  REPORT_CREATE: ReportPayload;
  DELIVERY_CREATE: DeliveryPayload;
  DELIVERY_STATUS_UPDATE: {
    deliveryId: string;
    payload: DeliveryStatusUpdatePayload;
  };
  DELIVERY_WITHDRAWAL_VALIDATE: {
    deliveryId: string;
    payload: DeliveryWithdrawalValidationPayload;
  };
  SHIFT_CHANGE_CREATE: OperationShiftChangePayload;
  MESSAGE_SEND: OperationMessagePayload;
};

export type OfflineOperationDraft<K extends OfflineOperationKind = OfflineOperationKind> = {
  kind: K;
  payload: OfflineOperationPayloadMap[K];
  description: string;
};

export type OfflineOperationItem<K extends OfflineOperationKind = OfflineOperationKind> = OfflineOperationDraft<K> & {
  id: string;
  createdAt: string;
  attempts: number;
  status: 'pending' | 'failed';
  lastAttemptAt?: string | null;
  lastError?: string | null;
};

export type OfflineOperationFlushSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
};

function createQueueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emitQueueUpdate() {
  if (!isBrowser) return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function saveQueue(queue: OfflineOperationItem[]) {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  emitQueueUpdate();
}

function readStoredQueue(): OfflineOperationItem[] {
  if (!isBrowser) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as OfflineOperationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toQueueItem<K extends OfflineOperationKind>(draft: OfflineOperationDraft<K>): OfflineOperationItem<K> {
  if (draft.kind === 'DELIVERY_CREATE') {
    return {
      ...draft,
      payload: {
        ...(draft.payload as DeliveryPayload),
        clientRequestId:
          (draft.payload as DeliveryPayload).clientRequestId ??
          createClientRequestId('delivery'),
      },
      id: createQueueId(),
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      lastAttemptAt: null,
      lastError: null,
    } as OfflineOperationItem<K>;
  }

  return {
    ...draft,
    id: createQueueId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
    lastAttemptAt: null,
    lastError: null,
  };
}

function isTerminalError(error: unknown) {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 409 || status === 410 || status === 422;
}

export function isOfflineQueueCandidateError(error: unknown) {
  if (!isBrowser) return false;
  if (!window.navigator.onLine) return true;

  const responseStatus = (error as { response?: { status?: number } }).response?.status;
  const errorCode = (error as { code?: string }).code;
  const errorMessage = error instanceof Error ? error.message : '';

  if (!responseStatus) return true;

  if ([408, 425, 429, 500, 502, 503, 504].includes(responseStatus)) return true;
  if (errorCode === 'ECONNABORTED' || errorCode === 'ERR_NETWORK') return true;
  if (errorMessage.toLowerCase().includes('network error')) return true;

  return false;
}

async function executeQueuedOperation(item: OfflineOperationItem) {
  switch (item.kind) {
    case 'PERSON_CREATE':
      await createPerson(item.payload as CreatePersonRequest);
      return;
    case 'PERSON_UPDATE':
      await updatePerson(
        (item.payload as OfflineOperationPayloadMap['PERSON_UPDATE']).personId,
        (item.payload as OfflineOperationPayloadMap['PERSON_UPDATE']).payload
      );
      return;
    case 'PERSON_STATUS_UPDATE':
      await updatePersonStatus(
        (item.payload as OfflineOperationPayloadMap['PERSON_STATUS_UPDATE']).personId,
        (item.payload as OfflineOperationPayloadMap['PERSON_STATUS_UPDATE']).payload
      );
      return;
    case 'REPORT_CREATE':
      await createReport(item.payload as ReportPayload);
      return;
    case 'DELIVERY_CREATE':
      await createDelivery(item.payload as DeliveryPayload);
      return;
    case 'DELIVERY_STATUS_UPDATE':
      await updateDeliveryStatus(
        (item.payload as OfflineOperationPayloadMap['DELIVERY_STATUS_UPDATE']).deliveryId,
        (item.payload as OfflineOperationPayloadMap['DELIVERY_STATUS_UPDATE']).payload
      );
      return;
    case 'DELIVERY_WITHDRAWAL_VALIDATE':
      await validateDeliveryWithdrawal(
        (item.payload as OfflineOperationPayloadMap['DELIVERY_WITHDRAWAL_VALIDATE']).deliveryId,
        (item.payload as OfflineOperationPayloadMap['DELIVERY_WITHDRAWAL_VALIDATE']).payload
      );
      return;
    case 'SHIFT_CHANGE_CREATE':
      await operationService.createShiftChange(item.payload as OperationShiftChangePayload);
      return;
    case 'MESSAGE_SEND':
      await operationService.sendMessage(item.payload as OperationMessagePayload);
      return;
    default:
      return;
  }
}

async function tryReconcileQueuedOperation(item: OfflineOperationItem) {
  if (item.kind !== 'DELIVERY_CREATE') return null;

  const clientRequestId = (item.payload as DeliveryPayload).clientRequestId?.trim();
  if (!clientRequestId) return null;

  return reconcileSyncRequest(clientRequestId);
}

export function readOfflineOperationQueue() {
  return readStoredQueue();
}

export function removeOfflineOperationItem(itemId: string) {
  const queue = readStoredQueue().filter((item) => item.id !== itemId);
  saveQueue(queue);
}

export function resetFailedOfflineOperationItem(itemId: string) {
  const queue = readStoredQueue().map((item) =>
    item.id === itemId
      ? {
          ...item,
          status: 'pending' as const,
          lastError: null,
        }
      : item
  );
  saveQueue(queue);
}

export function clearFailedOfflineOperations() {
  const queue = readStoredQueue().filter((item) => item.status !== 'failed');
  saveQueue(queue);
}

export function enqueueOfflineOperation<K extends OfflineOperationKind>(draft: OfflineOperationDraft<K>) {
  const queue = readStoredQueue();
  const item = toQueueItem(draft);
  queue.push(item);
  saveQueue(queue);
  return item;
}

export async function flushOfflineOperationQueue(): Promise<OfflineOperationFlushSummary> {
  const queue = readStoredQueue();

  if (!isBrowser || !window.navigator.onLine || queue.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: queue.filter((item) => item.status === 'failed').length,
      remaining: queue.length,
    };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const nextQueue: OfflineOperationItem[] = [];

  for (const item of queue) {
    if (item.status === 'failed') {
      nextQueue.push(item);
      failed += 1;
      continue;
    }

    processed += 1;

    try {
      await executeQueuedOperation(item);
      succeeded += 1;
    } catch (error) {
      const reconciliation = await tryReconcileQueuedOperation(item).catch(() => null);

      if (reconciliation?.syncStatus === 'APPLIED') {
        succeeded += 1;
        continue;
      }

      if (reconciliation?.syncStatus === 'PENDING' || reconciliation?.syncStatus === 'PROCESSING' || reconciliation?.syncStatus === 'FAILED_TEMPORARY') {
        nextQueue.push({
          ...item,
          status: 'pending',
          attempts: item.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: reconciliation.errorMessage ?? (error instanceof Error ? error.message : 'Falha temporaria na sincronizacao.'),
        });
        continue;
      }

      if (reconciliation?.syncStatus === 'FAILED_PERMANENT') {
        failed += 1;
        nextQueue.push({
          ...item,
          status: 'failed',
          attempts: item.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: reconciliation.errorMessage ?? (error instanceof Error ? error.message : 'Falha definitiva na sincronizacao.'),
        });
        continue;
      }

      if (!isOfflineQueueCandidateError(error) && isTerminalError(error)) {
        failed += 1;
        nextQueue.push({
          ...item,
          status: 'failed',
          attempts: item.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: error instanceof Error ? error.message : 'Falha definitiva na sincronizacao.',
        });
        continue;
      }

      nextQueue.push({
        ...item,
        status: 'pending',
        attempts: item.attempts + 1,
        lastAttemptAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Falha temporaria na sincronizacao.',
      });
    }
  }

  saveQueue(nextQueue);

  return {
    processed,
    succeeded,
    failed,
    remaining: nextQueue.length,
  };
}

export function subscribeOfflineOperationQueue(listener: () => void) {
  if (!isBrowser) {
    return () => undefined;
  }

  window.addEventListener(UPDATE_EVENT, listener);
  return () => window.removeEventListener(UPDATE_EVENT, listener);
}
