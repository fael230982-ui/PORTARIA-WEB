'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  ensureAlertWorkflowRecords,
  getAlertWorkflowStore,
  holdAlertWorkflow,
  markAlertOpened,
  resolveAlertWorkflow,
  saveAlertDraftWorkflow,
  subscribeAlertWorkflow,
  type AlertWorkflowRecord,
} from '@/features/alerts/alert-workflow';
import type { Alert } from '@/types/alert';

const EMPTY_ALERT_WORKFLOW_STORE: Record<string, AlertWorkflowRecord> = {};

export function useAlertWorkflow(alerts?: Alert[]) {
  const store = useSyncExternalStore(
    subscribeAlertWorkflow,
    getAlertWorkflowStore,
    () => EMPTY_ALERT_WORKFLOW_STORE
  );

  useEffect(() => {
    if (!alerts?.length) return;
    ensureAlertWorkflowRecords(alerts);
  }, [alerts]);

  const handleMarkOpened = useCallback((alert: Alert, actorName?: string | null) => {
    markAlertOpened(alert, actorName);
  }, []);

  const handleResolve = useCallback(
    (alert: Alert, options: { actorName?: string | null; note?: string | null; preset?: string | null }) => {
      resolveAlertWorkflow(alert, options);
    },
    []
  );

  const handleHold = useCallback(
    (alert: Alert, options: { actorName?: string | null; note?: string | null; preset?: string | null }) => {
      holdAlertWorkflow(alert, options);
    },
    []
  );

  const handleSaveDraft = useCallback(
    (alert: Alert, options: { actorName?: string | null; note?: string | null; preset?: string | null }) => {
      saveAlertDraftWorkflow(alert, options);
    },
    []
  );

  return useMemo(
    () => ({
      store,
      markOpened: handleMarkOpened,
      resolve: handleResolve,
      hold: handleHold,
      saveDraft: handleSaveDraft,
    }),
    [handleHold, handleMarkOpened, handleResolve, handleSaveDraft, store]
  );
}
