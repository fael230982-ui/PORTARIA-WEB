import { normalizeRealtimeAlert } from '@/features/alerts/alert-normalizers';
import type { Alert } from '@/types/alert';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/lib/env';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type AlertPayload = Partial<Alert> & {
  message?: string;
};

export function useRealTimeAlerts(enabled = true) {
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!enabled) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(env.socketUrl, {
      autoConnect: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
    });

    socket.on('alert', (payload: AlertPayload) => {
      const nextAlert = normalizeRealtimeAlert(payload);
      setAlerts((current) => [nextAlert, ...current].slice(0, 20));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return {
    connectionStatus: enabled ? connectionStatus : 'disconnected',
    alerts: enabled ? alerts : [],
  };
}
