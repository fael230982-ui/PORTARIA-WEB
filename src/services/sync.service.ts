import { api } from '@/lib/axios';
import type { SyncReconciliationResponse } from '@/types/sync';

const INTERNAL_SYNC_TOKEN =
  process.env.NEXT_PUBLIC_INTERNAL_SYNC_TOKEN ??
  process.env.NEXT_PUBLIC_SYNC_TOKEN ??
  '';

export async function reconcileSyncRequest(clientRequestId: string): Promise<SyncReconciliationResponse | null> {
  if (!clientRequestId.trim() || !INTERNAL_SYNC_TOKEN.trim()) {
    return null;
  }

  const response = await api.get<SyncReconciliationResponse>(
    `/internal/sync/reconcile/${encodeURIComponent(clientRequestId)}`,
    {
      headers: {
        'X-Sync-Token': INTERNAL_SYNC_TOKEN,
      },
    }
  );

  return response.data;
}
