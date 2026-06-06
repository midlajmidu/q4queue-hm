/**
 * lib/logger.ts
 * Lightweight client-side diagnostics logger.
 *
 * Tracks:
 *   - Client-side errors (window.onerror)
 *   - WebSocket reconnect count
 *   - Page crashes (unhandled rejections)
 *
 * In production, replace console calls with an external service.
 */

import { config } from "@/lib/config";

interface LogEntry {
    level: "error" | "warn" | "info";
    message: string;
    context?: Record<string, unknown>;
    timestamp: string;
}

// Circular buffer — keeps last 50 entries in memory for debugging
const LOG_BUFFER_SIZE = 50;
const logBuffer: LogEntry[] = [];

function pushLog(entry: LogEntry) {
    logBuffer.push(entry);
    if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();

    // Only log to console in development
    if (!config.isProduction) {
        const contextStr = entry.context && Object.keys(entry.context).length > 0
            ? ` | context: ${JSON.stringify(entry.context)}`
            : "";
        if (entry.level === "error") {
            // eslint-disable-next-line no-console
            console.error(`[FC:${entry.level}] ${entry.message}${contextStr}`, entry.context);
        } else if (entry.level === "warn") {
            // eslint-disable-next-line no-console
            console.warn(`[FC:${entry.level}] ${entry.message}${contextStr}`, entry.context);
        } else {
            // eslint-disable-next-line no-console
            console.info(`[FC:${entry.level}] ${entry.message}${contextStr}`, entry.context);
        }
    }
}

export const logger = {
    error(message: string, context?: Record<string, unknown>) {
        pushLog({ level: "error", message, context, timestamp: new Date().toISOString() });
    },
    warn(message: string, context?: Record<string, unknown>) {
        pushLog({ level: "warn", message, context, timestamp: new Date().toISOString() });
    },
    info(message: string, context?: Record<string, unknown>) {
        pushLog({ level: "info", message, context, timestamp: new Date().toISOString() });
    },

    /** Get the in-memory log buffer for debugging */
    getBuffer(): readonly LogEntry[] {
        return logBuffer;
    },

    /** WebSocket reconnect counter */
    wsReconnects: 0,
    trackReconnect() {
        this.wsReconnects++;
        this.warn("WebSocket reconnected", { totalReconnects: this.wsReconnects });
    },
};

// ── Global error handlers (call once on app init) ────────────────
export function initGlobalErrorHandlers() {
    if (typeof window === "undefined") return;

    window.addEventListener("error", (event) => {
        logger.error("Unhandled error", {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });

    window.addEventListener("unhandledrejection", (event) => {
        logger.error("Unhandled promise rejection", {
            reason: String(event.reason),
        });
    });
}
