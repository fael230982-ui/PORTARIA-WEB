'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  flushOfflineOperationQueue,
  readOfflineOperationQueue,
  subscribeOfflineOperationQueue,
  type OfflineOperationFlushSummary,
} from '@/features/offline/offline-operation-queue';

const isBrowser = typeof window !== 'undefined';

export function useOfflineOperationQueue(enabled = true) {
  const [queue, setQueue] = useState(() => readOfflineOperationQueue());
  const [isOnline, setIsOnline] = useState(() => (isBrowser ? window.navigator.onLine : true));
  const [isFlushing, setIsFlushing] = useState(false);
  const [lastFlushSummary, setLastFlushSummary] = useState<OfflineOperationFlushSummary | null>(null);

  const refreshQueue = useCallback(() => {
    setQueue(readOfflineOperationQueue());
  }, []);

  const flushNow = useCallback(async () => {
    if (!enabled || !isBrowser || !window.navigator.onLine || isFlushing) return null;

    setIsFlushing(true);
    try {
      const summary = await flushOfflineOperationQueue();
      setLastFlushSummary(summary);
      setQueue(readOfflineOperationQueue());
      return summary;
    } finally {
      setIsFlushing(false);
    }
  }, [enabled, isFlushing]);

  useEffect(() => {
    refreshQueue();
    const unsubscribe = subscribeOfflineOperationQueue(refreshQueue);

    function handleOnline() {
      setIsOnline(true);
      void flushNow();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    if (isBrowser) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      unsubscribe();
      if (!isBrowser) return;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushNow, refreshQueue]);

  useEffect(() => {
    if (!enabled || !isOnline || queue.every((item) => item.status !== 'pending')) return;
    void flushNow();
  }, [enabled, flushNow, isOnline, queue]);

  const pendingCount = useMemo(
    () => queue.filter((item) => item.status === 'pending').length,
    [queue]
  );
  const failedCount = useMemo(
    () => queue.filter((item) => item.status === 'failed').length,
    [queue]
  );

  return {
    queue,
    pendingCount,
    failedCount,
    isOnline,
    isFlushing,
    lastFlushSummary,
    flushNow,
    refreshQueue,
  };
}
