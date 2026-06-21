"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QueueWebSocket, type ConnectionStatus } from "@/lib/websocket";
import type { QueueSnapshot } from "@/types/api";

interface UseQueueSocketOptions {
    token?: string;
    enabled?: boolean;
    onNewCustomer?: (data: any) => void;
}

interface UseQueueSocketReturn {
    state: QueueSnapshot | null;
    status: ConnectionStatus;
    error: string | null;
    refresh: () => void;
}

export function useQueueSocket(
    queueId: string | null,
    options: UseQueueSocketOptions = {}
): UseQueueSocketReturn {
    const { token, enabled = true, onNewCustomer } = options;

    const [state, setState] = useState<QueueSnapshot | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<QueueWebSocket | null>(null);

    const handleSnapshot = useCallback((snapshot: QueueSnapshot) => {
        setState(snapshot);
        setError(null);
    }, []);

    const handleUpdate = useCallback((update: QueueSnapshot) => {
        setState(update);
        setError(null);
    }, []);

    const handleStatus = useCallback((newStatus: ConnectionStatus) => {
        setStatus(newStatus);
    }, []);

    const handleError = useCallback(() => {
        setError("Connection error. Reconnecting...");
    }, []);

    const refresh = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.connect();
        }
    }, []);

    useEffect(() => {
        if (!queueId || !enabled) return;

        const ws = new QueueWebSocket(queueId, {
            token,
            onSnapshot: handleSnapshot,
            onUpdate: handleUpdate,
            onNewCustomer,
            onStatusChange: handleStatus,
            onError: handleError,
        });

        wsRef.current = ws;
        ws.connect();

        return () => {
            ws.disconnect();
            wsRef.current = null;
        };
    }, [queueId, token, enabled, onNewCustomer, handleSnapshot, handleUpdate, handleStatus, handleError]);

    return { state, status, error, refresh };
}
