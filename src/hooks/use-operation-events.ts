'use client';

import { useEffect, useState } from 'react';
import { getStreamCapabilities } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import type { OperationEvent } from '@/types/operation';

type OperationEventsStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export function useOperationEvents(enabled = false) {
  const [connectionStatus, setConnectionStatus] = useState<Exclude<OperationEventsStatus, 'idle'>>('disconnected');
  const [events, setEvents] = useState<OperationEvent[]>([]);
  const status: OperationEventsStatus = enabled ? connectionStatus : 'idle';

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    let source: EventSource | null = null;

    const connect = async () => {
      try {
        setConnectionStatus('connecting');

        const capabilities = await getStreamCapabilities();
        if (cancelled) return;

        const canonicalTypeField = capabilities.canonicalTypeField || 'eventType';
        const canonicalTimeField = capabilities.canonicalTimeField || 'occurredAt';

        const { token, user } = useAuthStore.getState();
        const cookieSecure = window.location.protocol === 'https:' ? '; Secure' : '';
        const url = new URL('/api/proxy/events/stream', window.location.origin);

        if (token) {
          document.cookie = `camera_proxy_token=${encodeURIComponent(token)}; Path=/api/proxy; SameSite=Lax${cookieSecure}`;
        }

        if (user?.selectedUnitId) {
          url.searchParams.set('selectedUnitId', user.selectedUnitId);
        }

        source = new EventSource(url.toString());

        source.onopen = () => {
          if (!cancelled) setConnectionStatus('connected');
        };
        source.onerror = () => {
          if (!cancelled) setConnectionStatus('error');
        };
        source.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data) as Record<string, unknown> & Partial<OperationEvent>;
            const resolvedType = raw[canonicalTypeField] ?? raw.eventType ?? raw.type ?? 'UNKNOWN';
            const resolvedTime = raw[canonicalTimeField] ?? raw.occurredAt ?? raw.createdAt ?? raw.timestamp;
            const normalizedType = String(resolvedType ?? 'UNKNOWN');
            const normalized: OperationEvent = {
              id: String(raw.id ?? raw.eventId ?? `${normalizedType}-${resolvedTime ?? Date.now()}`),
              eventId: raw.eventId ?? raw.id,
              type: normalizedType,
              eventType: normalizedType,
              createdAt: String(resolvedTime ?? new Date().toISOString()),
              occurredAt: String(resolvedTime ?? raw.occurredAt ?? raw.createdAt ?? raw.timestamp ?? new Date().toISOString()),
              timestamp: String(raw.timestamp ?? resolvedTime ?? new Date().toISOString()),
              unitId: typeof raw.unitId === 'string' ? raw.unitId : null,
              condominiumId: typeof raw.condominiumId === 'string' ? raw.condominiumId : null,
              entityId: typeof raw.entityId === 'string' ? raw.entityId : null,
              entityType: typeof raw.entityType === 'string' ? raw.entityType : null,
              cameraId: typeof raw.cameraId === 'string' ? raw.cameraId : null,
              title: typeof raw.title === 'string' ? raw.title : null,
              body: typeof raw.body === 'string' ? raw.body : null,
              payload: raw.payload && typeof raw.payload === 'object' ? (raw.payload as Record<string, unknown>) : {},
            };
            if (!cancelled) {
              setEvents((current) => [normalized, ...current].slice(0, 50));
            }
          } catch {
            if (!cancelled) setConnectionStatus('error');
          }
        };
      } catch {
        if (!cancelled) setConnectionStatus('error');
      }
    };

    void connect();

    return () => {
      cancelled = true;
      source?.close();
      setConnectionStatus('disconnected');
    };
  }, [enabled]);

  return { status, events };
}
