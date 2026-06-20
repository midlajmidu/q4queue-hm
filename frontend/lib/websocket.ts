/**
 * lib/websocket.ts
 * WebSocket abstraction with exponential backoff reconnection.
 *
 * Production hardened:
 *   - Auto-reconnect with exp backoff (1s → 2s → 4s → 8s → 16s cap)
 *   - Clean disconnect on unmount (no memory leaks)
 *   - Ping/pong keep-alive (25s interval)
 *   - Snapshot always overrides stale state
 *   - Logger integration for diagnostics
 *   - Reconnect counter tracked
 *   - Old WebSocket handlers nullified before new connection
 */

import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { QueueSnapshot } from "@/types/api";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface QueueWebSocketOptions {
    token?: string;
    onSnapshot?: (snapshot: QueueSnapshot) => void;
    onUpdate?: (update: QueueSnapshot) => void;
    onNewCustomer?: (data: any) => void;
    onStatusChange?: (status: ConnectionStatus) => void;
    onError?: (error: Event | Error) => void;
}

const MAX_RECONNECT_DELAY = 16_000;
const PING_INTERVAL = 25_000;

export class QueueWebSocket {
    private ws: WebSocket | null = null;
    private queueId: string;
    private options: QueueWebSocketOptions;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private intentionalClose = false;
    private _status: ConnectionStatus = "disconnected";

    constructor(queueId: string, options: QueueWebSocketOptions = {}) {
        this.queueId = queueId;
        this.options = options;
    }

    get status(): ConnectionStatus {
        return this._status;
    }

    private setStatus(newStatus: ConnectionStatus): void {
        if (this._status === newStatus) return; // prevent duplicate callbacks
        this._status = newStatus;
        this.options.onStatusChange?.(newStatus);
    }

    connect(): void {
        if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;

        // Clean up any stale socket before creating new one
        this.cleanup();

        this.intentionalClose = false;
        this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

        let url = `${config.wsBaseUrl}/queues/${this.queueId}`;
        if (this.options.token) {
            url += `?token=${encodeURIComponent(this.options.token)}`;
        }

        try {
            this.ws = new WebSocket(url);
        } catch (err) {
            logger.error("WebSocket creation failed", { queueId: this.queueId, error: String(err) });
            this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.setStatus("connected");
            this.startPing();
            logger.info("WebSocket connected", { queueId: this.queueId });
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data as string) as QueueSnapshot;
                if (data.type === "pong") return;

                if (data.type === "new_customer") {
                    console.log("RECEIVED NEW CUSTOMER EVENT via WS:", data);
                    this.options.onNewCustomer?.(data);
                } else if (data.type === "queue_update") {
                    this.options.onUpdate?.(data);
                } else {
                    // Snapshot always overrides entire state
                    this.options.onSnapshot?.(data);
                }
            } catch {
                // Invalid JSON — ignore
            }
        };

        this.ws.onerror = (event: Event) => {
            logger.warn("WebSocket error", { queueId: this.queueId });
            this.options.onError?.(event);
        };

        this.ws.onclose = () => {
            this.stopPing();
            this.setStatus("disconnected");
            if (!this.intentionalClose) {
                this.scheduleReconnect();
            }
        };
    }

    disconnect(): void {
        this.intentionalClose = true;
        this.cleanup();
        this.setStatus("disconnected");
        this.reconnectAttempts = 0;
    }

    /** Clean up all timers and socket handlers to prevent memory leaks */
    private cleanup(): void {
        this.stopPing();
        this.clearReconnectTimer();

        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            try { this.ws.close(); } catch { /* already closed */ }
            this.ws = null;
        }
    }

    private scheduleReconnect(): void {
        this.clearReconnectTimer();
        this.reconnectAttempts++;
        logger.trackReconnect();

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), MAX_RECONNECT_DELAY);
        this.setStatus("reconnecting");
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private startPing(): void {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send("ping");
            }
        }, PING_INTERVAL);
    }

    private stopPing(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
}
