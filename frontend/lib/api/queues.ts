/**
 * lib/api/queues.ts
 * Domain API: queues
 */

import { request } from "./client";
import type {
    PaginatedSessionResponse,
    QueueCreate,
    QueueQrConfigResponse,
    QueueResponse,
    SessionResponse,
} from "@/types/api";

export const queueApi = {
    listQueueSessions(queueId: string, limit?: number, offset?: number, date?: string): Promise<PaginatedSessionResponse> {
        const ps = new URLSearchParams();
        if (limit != null) ps.append("limit", String(limit));
        if (offset != null) ps.append("offset", String(offset));
        if (date && date.trim()) ps.append("date", date.trim());
        return request<PaginatedSessionResponse>(`/queues/${queueId}/sessions${ps.toString() ? `?${ps}` : ""}`);
    },

    createQueueSession(queueId: string, data: { session_date: string; title?: string }): Promise<SessionResponse> {
        return request<SessionResponse>(`/queues/${queueId}/sessions`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getSession(sessionId: string): Promise<SessionResponse> {
        return request<SessionResponse>(`/sessions/${sessionId}`);
    },

    updateSession(sessionId: string, data: { title?: string }): Promise<SessionResponse> {
        return request<SessionResponse>(`/sessions/${sessionId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    toggleSessionActive(sessionId: string, isActive: boolean): Promise<SessionResponse> {
        return request<SessionResponse>(`/sessions/${sessionId}/active?is_active=${isActive}`, {
            method: "PATCH",
        });
    },

    toggleSessionPaused(sessionId: string, isPaused: boolean): Promise<SessionResponse> {
        return request<SessionResponse>(`/sessions/${sessionId}/paused?is_paused=${isPaused}`, {
            method: "PATCH",
        });
    },




    // ── Queues ───────────────────────────────────────────────────,

    listQueues(): Promise<QueueResponse[]> {
        return request<QueueResponse[]>("/queues")
            .catch(() => [] as QueueResponse[]);
    },

    getQueue(queueId: string): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}`);
    },

    createQueue(data: QueueCreate): Promise<QueueResponse> {
        return request<QueueResponse>("/queues", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateQueue(queueId: string, data: Partial<QueueCreate>): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    updateQueueAnnouncement(queueId: string, announcement: string): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/announcement`, {
            method: "PATCH",
            body: JSON.stringify({ announcement }),
        });
    },

    deleteQueue(queueId: string): Promise<void> {
        return request<void>(`/queues/${queueId}`, {
            method: "DELETE",
        });
    },

    listTrashQueues(): Promise<QueueResponse[]> {
        return request<QueueResponse[]>("/queues/trash");
    },

    restoreQueue(queueId: string): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/restore`, {
            method: "POST",
        });
    },


    // ── Token operations ─────────────────────────────────────────,
};

export const getQueueQrConfig = async (queueId: string): Promise<QueueQrConfigResponse> => {
    return request<QueueQrConfigResponse>(`/queues/${queueId}/qr-config`);
};
