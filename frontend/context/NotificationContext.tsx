"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { getToken } from "@/lib/auth";
import type { MessageResponse } from "@/types/api";

type NotifType = "warning" | "success" | "info" | "error";

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
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function formatTimeAgo(dateString: string): string {
    // Ensure the date is parsed as UTC if the backend sends it without a timezone suffix
    const ds = dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
    const date = new Date(ds);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDynamicTitle(content: string, type: string): string {
    const text = content.toLowerCase();
    
    // Check keywords first
    if (text.includes("wait time") || text.includes("staff")) {
        return "Queue Warning";
    }
    if (text.includes("maintenance") || text.includes("schedule")) {
        return "Maintenance Info";
    }
    if (text.includes("download") || text.includes("report") || text.includes("history")) {
        if (type === "success") return "Export Success";
        if (type === "error") return "Export Failed";
        return "Export Info";
    }
    if (text.includes("joined") || text.includes("checked in") || text.includes("patient")) {
        return "Customer Activity";
    }
    if (text.includes("called") || text.includes("served") || text.includes("completed")) {
        return "Queue Activity";
    }
    
    // Default fallbacks based on type
    switch (type) {
        case "warning":
            return "System Warning";
        case "success":
            return "System Success";
        case "error":
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Load initial messages
    const loadMessages = useCallback(async () => {
        try {
            const data = await api.getMessages();
            setNotifications(data.map(mapMessageToNotification));
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    }, []);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    // WebSocket connection
    useEffect(() => {
        const token = getToken();
        if (!token) return;

        const wsUrl = `${config.wsBaseUrl}/notifications?token=${token}`;
        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        function connect() {
            ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    
                    if (payload.type === "new_message") {
                        // Refresh the list when a new message arrives
                        loadMessages();
                    } else if (payload.type === "message_read") {
                        setNotifications(prev => 
                            prev.map(n => n.id === payload.message_id ? { ...n, isRead: true } : n)
                        );
                    } else if (payload.type === "message_read_all") {
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    } else if (payload.type === "messages_cleared") {
                        setNotifications([]);
                    }
                } catch (e) {
                    console.error("WS Parse error", e);
                }
            };

            ws.onclose = () => {
                reconnectTimeout = setTimeout(connect, 3000);
            };
        }

        connect();

        return () => {
            clearTimeout(reconnectTimeout);
            if (ws) ws.close();
        };
    }, [loadMessages]);

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
            // Optional: revert on failure
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await api.markAllMessagesRead();
        } catch (err) {
            console.error("Failed to mark all read", err);
        }
    }, []);

    const clearAll = useCallback(async () => {
        setNotifications([]);
        try {
            await api.clearAllMessages();
        } catch (err) {
            console.error("Failed to clear all messages", err);
        }
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
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
            clearAll: async () => {}
        };
    }
    return context;
}
