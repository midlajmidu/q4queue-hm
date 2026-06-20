"use client";

import React from "react";
import type { ConnectionStatus } from "@/lib/websocket";

interface Props {
    status: ConnectionStatus;
}

const statusConfig: Record<ConnectionStatus, { color: string; bg: string; dot: string; label: string; ariaLabel: string }> = {
    connected: { color: "text-emerald-600", bg: "bg-emerald-50 border border-emerald-100", dot: "bg-emerald-500", label: "Live", ariaLabel: "Connected to live updates" },
    connecting: { color: "text-blue-600", bg: "bg-blue-50 border border-blue-100", dot: "bg-blue-500 animate-pulse", label: "Connecting", ariaLabel: "Connecting to server" },
    reconnecting: { color: "text-amber-600", bg: "bg-amber-50 border border-amber-100", dot: "bg-amber-500 animate-pulse", label: "Reconnecting", ariaLabel: "Reconnecting to server" },
    disconnected: { color: "text-red-600", bg: "bg-red-50 border border-red-100", dot: "bg-red-500", label: "Disconnected", ariaLabel: "Disconnected from server" },
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
