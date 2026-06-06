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
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function mapMessageToNotification(msg: MessageResponse): DashboardNotification {
    return {
        id: msg.id,
        type: (msg.message_type as NotifType) || "info",
        title: "System Update", // We might want to add title to Message model later
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

    const clearAll = useCallback(() => {
        // Technically we need a delete API for this, but for now we just clear the UI
        setNotifications([]);
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
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
