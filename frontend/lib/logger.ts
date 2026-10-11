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

    // Suppress known development-only warning from @react-three/drei's Html in React 19 StrictMode
    const origConsoleError = console.error;
    console.error = function (...args: any[]) {
        const msg = typeof args[0] === "string" ? args[0] : "";
        if (
            msg.includes("Attempted to synchronously unmount a root while React was already rendering") ||
            msg.includes("container that has already been passed to createRoot") ||
            msg.includes("Failed to execute 'removeChild' on 'Node'") ||
            msg.includes("The node to be removed is not a child of this node")
        ) {
            return;
        }
        origConsoleError.apply(console, args);
    };

    window.addEventListener("error", (event) => {
        if (
            event.message?.includes("Failed to execute 'removeChild' on 'Node'") ||
            event.message?.includes("Failed to execute 'insertBefore' on 'Node'") ||
            event.message?.includes("The node to be removed is not a child of this node")
        ) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        logger.error("Unhandled error", {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });

    window.addEventListener("unhandledrejection", (event) => {
        const reasonStr = String(event.reason?.message || event.reason);
        if (
            reasonStr.includes("Failed to execute 'removeChild' on 'Node'") ||
            reasonStr.includes("The node to be removed is not a child of this node")
        ) {
            event.preventDefault();
            return;
        }
        // Use info level to avoid triggering Next.js error overlay for caught API errors
        logger.info("Unhandled promise rejection", {
            reason: String(event.reason),
        });
    });
}
