"use client";

import React from "react";
import type { ConnectionStatus } from "@/lib/websocket";

interface Props {
    status: ConnectionStatus;
}

const statusConfig: Record<ConnectionStatus, { color: string; bg: string; dot: string; label: string; ariaLabel: string }> = {
    connected: { color: "text-emerald-700 dark:text-emerald-300 font-bold", bg: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 shadow-sm", dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse", label: "Live", ariaLabel: "Connected to live updates" },
    connecting: { color: "text-blue-700 dark:text-blue-300 font-bold", bg: "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 shadow-sm", dot: "bg-blue-500 animate-pulse", label: "Connecting", ariaLabel: "Connecting to server" },
    reconnecting: { color: "text-amber-700 dark:text-amber-300 font-bold", bg: "bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 shadow-sm", dot: "bg-amber-500 animate-pulse", label: "Reconnecting", ariaLabel: "Reconnecting to server" },
    disconnected: { color: "text-rose-700 dark:text-rose-300 font-bold", bg: "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 shadow-sm", dot: "bg-rose-500", label: "Disconnected", ariaLabel: "Disconnected from server" },
};

const ConnectionBadge = React.memo(function ConnectionBadge({ status }: Props) {
    const cfg = statusConfig[status];
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}
            role="status"
            aria-label={cfg.ariaLabel}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
            {cfg.label}
        </span>
    );
});

export default ConnectionBadge;
