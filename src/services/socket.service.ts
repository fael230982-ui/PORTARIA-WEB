import { io, Socket } from 'socket.io-client';
import { env } from '@/lib/env';

interface SocketConfig {
  autoConnect: boolean;
  reconnectionAttempts: number;
  timeout: number;
}

type AlertEvent = {
  id?: string;
  message?: string;
  title?: string;
};

type AccessLogEvent = {
  id?: string;
  user?: string;
  action?: string;
};

class SocketService {
  private socket: Socket | null = null;

  private config: SocketConfig = {
    autoConnect: true,
    reconnectionAttempts: 5,
    timeout: 10000,
  };

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    this.socket = io(env.socketUrl, {
      autoConnect: this.config.autoConnect,
      reconnectionAttempts: this.config.reconnectionAttempts,
      timeout: this.config.timeout,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('alert', (data: AlertEvent) => {
      console.log('Alert received:', data);
    });

    this.socket.on('access-log', (data: AccessLogEvent) => {
      console.log('Access log received:', data);
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket');
    });

    this.socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`Reconnection attempt ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.log('Reconnection failed');
    });
  }

  public connect(): void {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

const socketService = new SocketService();

export { socketService, SocketService };
export const connect = () => socketService.connect();
export const disconnect = () => socketService.disconnect();
