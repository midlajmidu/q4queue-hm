"use client";

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

/**
 * A hook that silently pings the backend to maintain the user's "Online" presence.
 * Pauses heartbeat requests when the tab is hidden and resumes when visible.
 */
export function useHeartbeat() {
    const lastHeartbeatRef = useRef<number>(0);

    useEffect(() => {
        const sendPing = () => {
            lastHeartbeatRef.current = Date.now();
            api.sendHeartbeat().catch(() => {});
        };

        // Initial ping on mount only if tab is visible
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            sendPing();
        }

        // Periodic heartbeat every 60 seconds (only while tab is visible)
        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                sendPing();
            }
        }, HEARTBEAT_INTERVAL_MS);

        // Visibility change: catch up if tab becomes visible after being hidden
        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                const elapsed = Date.now() - lastHeartbeatRef.current;
                if (elapsed >= HEARTBEAT_INTERVAL_MS) {
                    sendPing();
                }
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            clearInterval(interval);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
        };
    }, []);
}
