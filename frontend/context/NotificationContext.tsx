"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { getToken } from "@/lib/auth";
import type { MessageResponse } from "@/types/api";

type NotifType = "warning" | "success" | "info" | "error" | "critical";

export interface DashboardNotification {
    id: string;
    type: NotifType;
    title: string;
    message: string;
    time: string;
    isRead: boolean;
    raw_created_at: string;
}

interface NotificationContextValue {
    notifications: DashboardNotification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearAll: () => Promise<void>;
    reload: () => Promise<void>;
    error: string | null;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function formatTimeAgo(dateString: string): string {
    // Ensure the date is parsed as UTC if the backend sends it without a timezone suffix
    const ds = dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
    const date = new Date(ds);
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getDynamicTitle(content: string, type: string): string {
    const text = content.toLowerCase();
    
    if (text.includes("maintenance") || text.includes("schedule")) {
        return "Maintenance Info";
    }
    if (text.includes("download") || text.includes("report") || text.includes("history")) {
        if (type === "success") return "Export Success";
        if (type === "error") return "Export Failed";
        return "Export Info";
    }
    if (text.includes("joined") || text.includes("checked in") || text.includes("customer")) {
        return "Customer Activity";
    }
    if (text.includes("called") || text.includes("served") || text.includes("completed")) {
        return "Queue Activity";
    }
    
    // Default fallbacks based on type
    switch (type) {
        case "success":
            return "System Success";
        case "error":
        case "critical":
            return "System Error";
        case "info":
        default:
            return "System Update";
    }
}

function mapMessageToNotification(msg: MessageResponse): DashboardNotification {
    return {
        id: msg.id,
        type: (msg.message_type as NotifType) || "info",
        title: getDynamicTitle(msg.content, msg.message_type),
        message: msg.content,
        time: formatTimeAgo(msg.created_at),
        isRead: msg.is_read,
        raw_created_at: msg.created_at,
    };
}

import { useAuth } from "@/hooks/useAuth";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
    const [error, setError] = useState<string | null>(null);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Load initial messages
    const loadMessages = useCallback(async () => {
        if (!user || user.is_first_login) return;
        
        try {
            const data = await api.getMessages();
            setNotifications(data.map(mapMessageToNotification));
            setError(null);
        } catch (err) {
            console.error("Failed to load messages", err);
            setError(err instanceof Error ? err.message : "Notifications are temporarily unavailable.");
        }
    }, [user]);

    useEffect(() => {
        loadMessages().catch(err => console.error("Failed to load notification messages:", err));
    }, [loadMessages]);

    // WebSocket connection
    useEffect(() => {
        if (!user || user.is_first_login) return;
        
        const token = getToken();
        if (!token) return;
        const userId = user.sub;

        const wsUrl = `${config.wsBaseUrl}/notifications`;
        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;
        let reconnectAttempts = 0;

        function connect() {
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                reconnectAttempts = 0;
                ws?.send(JSON.stringify({ type: "auth", token }));
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    
                    if (payload.type === "new_message") {
                        // Refresh the list when a new message arrives
                        loadMessages();
                    } else if (payload.type === "announcements_changed") {
                        window.dispatchEvent(new Event("q4queue:announcements-changed"));
                    } else if (payload.type === "message_read" && payload.user_id === userId) {
                        setNotifications(prev => 
                            prev.map(n => n.id === payload.message_id ? { ...n, isRead: true } : n)
                        );
                    } else if (payload.type === "message_read_all" && payload.user_id === userId) {
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    } else if (payload.type === "CALL_ANSWERED_BY_CALLEE") {
                        // Dispatch global window event when Leg B (callee) answers
                        window.dispatchEvent(new CustomEvent("plivo_call_answered", { detail: payload }));
                    } else if (payload.type === "CALL_HUNG_UP") {
                        // Dispatch global window event so WebRTCCallModal can catch it
                        window.dispatchEvent(new CustomEvent("plivo_call_hung_up", { detail: payload }));
                    } else if (payload.type === "messages_cleared" && payload.user_id === userId) {
                        setNotifications([]);
                    }
                } catch (e) {
                    console.error("WS Parse error", e);
                }
            };

            ws.onclose = (event) => {
                if (event.code === 4401 || event.code === 4403) {
                    console.warn(`WebSocket closed with auth error ${event.code}. Not reconnecting.`);
                    return;
                }
                const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) + Math.floor(Math.random() * 500);
                reconnectAttempts++;
                reconnectTimeout = setTimeout(connect, backoff);
            };
        }

        connect();

        return () => {
            clearTimeout(reconnectTimeout);
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
        };
    }, [loadMessages, user]);

    // Actions
    const markAsRead = useCallback(async (id: string) => {
        setNotifications(prev => {
            const target = prev.find(n => n.id === id);
            if (!target || target.isRead) return prev;
            return prev.map(n => n.id === id ? { ...n, isRead: true } : n);
        });

        try {
            await api.markMessageRead(id);
        } catch (err) {
            console.error("Failed to mark read", err);
            await loadMessages();
        }
    }, [loadMessages]);

    const markAllAsRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await api.markAllMessagesRead();
        } catch (err) {
            console.error("Failed to mark all read", err);
            await loadMessages();
        }
    }, [loadMessages]);

    const clearAll = useCallback(async () => {
        setNotifications([]);
        try {
            await api.clearAllMessages();
        } catch (err) {
            console.error("Failed to clear all messages", err);
            await loadMessages();
        }
    }, [loadMessages]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll, reload: loadMessages, error }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        return {
            notifications: [],
            unreadCount: 0,
            markAsRead: async () => {},
            markAllAsRead: async () => {},
            clearAll: async () => {},
            reload: async () => {},
            error: null,
        };
    }
    return context;
}
