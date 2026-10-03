/**
 * lib/api/tokens.ts
 * Domain API: tokens
 */

import { request } from "./client";
import type {
    JoinRequest,
    JoinResponse,
    NextResponse,
    NoTokenResponse,
    QueuePublicStatus,
    TokenDetail,
    TokenResponse,
    TokenRestoreResponse,
    TrackingResponse,
    AIOverviewData,
} from "@/types/api";

export const tokenApi = {
    joinQueue(queueId: string, data: JoinRequest): Promise<JoinResponse> {
        return request<JoinResponse>(`/queues/${queueId}/tokens`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    adminJoin(queueId: string, data: JoinRequest): Promise<JoinResponse> {
        return request<JoinResponse>(`/queues/${queueId}/admin-join`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    serveSpecificToken(queueId: string, tokenNumber: number, lineNumber?: number): Promise<NextResponse> {
        let url = `/queues/${queueId}/serve/${tokenNumber}`;
        if (lineNumber !== undefined) {
            url += `?line_number=${lineNumber}`;
        }
        return request<NextResponse>(url, {
            method: "POST",
        });
    },

    callNext(queueId: string, action: "done" | "skipped" = "done", line_number?: number): Promise<NextResponse | NoTokenResponse> {
        let url = `/queues/${queueId}/next?action=${action}`;
        if (line_number !== undefined) {
            url += `&line_number=${line_number}`;
        }
        return request<NextResponse | NoTokenResponse>(url, {
            method: "POST",
        });
    },

    clearLine(queueId: string, line_number: number): Promise<any> {
        return request(`/queues/${queueId}/clear-line?line_number=${line_number}`, {
            method: "POST",
        });
    },

    shareToken(queueId: string, tokenNumber: number, lineNumber: number): Promise<TokenResponse> {
        return request<TokenResponse>(`/queues/${queueId}/share-token?token_number=${tokenNumber}&line_number=${lineNumber}`, {
            method: "POST",
        });
    },

    removeSharedToken(queueId: string, lineNumber: number): Promise<any> {
        return request(`/queues/${queueId}/lines/${lineNumber}/remove-shared`, {
            method: "POST",
        });
    },

    restoreToken(tokenId: string): Promise<TokenRestoreResponse> {
        return request<TokenRestoreResponse>(`/tokens/${tokenId}`);
    },

    getQueuePublicStatus(queueId: string, sessionId?: string): Promise<QueuePublicStatus> {
        const query = sessionId ? `?session_id=${sessionId}` : "";
        return request<QueuePublicStatus>(`/queues/${queueId}/public-status${query}`);
    },

    removeToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/remove`, {
            method: "PATCH",
        });
    },

    undoRemoveToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/undo_remove`, {
            method: "PATCH",
        });
    },


    // ── Health ───────────────────────────────────────────────────,

    getTrackingInfo(trackingId: string): Promise<TrackingResponse> {
        return request<TrackingResponse>(`/track/${trackingId}`);
    },

    getAIOverview(trackingId: string): Promise<AIOverviewData> {
        return request<AIOverviewData>(`/track/${trackingId}/ai-overview`);
    },

    leaveQueue(trackingId: string): Promise<{ status: string; token_number: number }> {
        return request(`/track/${trackingId}`, { method: "DELETE" });
    },
};
