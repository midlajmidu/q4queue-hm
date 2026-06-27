"use client";

import { useEffect } from 'react';
import { api } from '@/lib/api';

/**
 * A hook that silently pings the backend every 60 seconds
 * to maintain the user's "Online" presence.
 */
export function useHeartbeat() {
    useEffect(() => {
        // Initial ping
        api.sendHeartbeat().catch(() => {});

        // Subsequent pings every 60 seconds
        const interval = setInterval(() => {
            api.sendHeartbeat().catch(() => {});
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);
}
