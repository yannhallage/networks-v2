import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { WsServerMessage } from './types';

const WS_URL = 'ws://localhost:4000';
const RECONNECT_MS = 3000;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private readonly messagesSubject = new Subject<WsServerMessage>();
  readonly messages$: Observable<WsServerMessage> = this.messagesSubject.asObservable();

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;

  connect(): void {
    this.manualClose = false;
    this.clearReconnect();
    this.closeSocketOnly();

    try {
      this.socket = new WebSocket(WS_URL);
    } catch (e) {
      console.error('[WebSocketService] construct error', e);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      try {
        this.socket?.send(JSON.stringify({ type: 'identify', client: 'dashboard' }));
      } catch (e) {
        console.error('[WebSocketService] identify send error', e);
      }
    };

    this.socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') {
        console.warn('[WebSocketService] ignored non-text frame');
        return;
      }
      try {
        const data = JSON.parse(event.data) as WsServerMessage;
        this.messagesSubject.next(data);
      } catch (e) {
        console.error('[WebSocketService] JSON parse error', e, event.data);
      }
    };

    this.socket.onerror = () => {
      // La fermeture déclenchera la reconnexion si besoin
    };

    this.socket.onclose = () => {
      this.socket = null;
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearReconnect();
    this.closeSocketOnly();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private closeSocketOnly(): void {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualClose) {
        this.connect();
      }
    }, RECONNECT_MS);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
