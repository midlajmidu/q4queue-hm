/**
 * lib/api/system.ts
 * Domain API: system
 */

import { config } from "@/lib/config";
import { getToken } from "@/lib/auth";
import { request } from "./client";
import type {
    AnalyticsOverview,
    BranchDirectoryResponse,
    HealthResponse,
    MessageResponse,
    MessageUpdateResponse,
    OrganizationSettingsResponse,
    OrganizationSettingsUpdate,
    PaginatedHistoryResponse,
    SuccessResponse,
    SystemAnnouncementDetail,
    } from "@/types/api";

export const systemApi = {
    generatePairingCode(): Promise<{ code: string }> {
        return request<{ code: string }>("/pairing/generate", {
            method: "POST",
        });
    },

    connectPairingCode(data: { pair_code: string; queue_id: string }): Promise<{ status: string; message: string }> {
        return request<{ status: string; message: string }>("/pairing/connect", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // ── Analytics ────────────────────────────────────────────────,

    getOverview(params: { sessionId?: string; queueId?: string; search?: string; status?: string; startDate?: string; endDate?: string; recentLimit?: number; recentOffset?: number } = {}, init?: RequestInit): Promise<AnalyticsOverview> {
        const qs = new URLSearchParams();
        if (params.sessionId) qs.set("session_id", params.sessionId);
        if (params.queueId) qs.set("queue_id", params.queueId);
        if (params.search) qs.set("search", params.search);
        if (params.status) qs.set("status", params.status);
        if (params.startDate) qs.set("start_date", params.startDate);
        if (params.endDate) qs.set("end_date", params.endDate);
        if (params.recentLimit != null) qs.set("recent_limit", String(params.recentLimit));
        if (params.recentOffset != null) qs.set("recent_offset", String(params.recentOffset));

        const qsStr = qs.toString();
        const url = qsStr ? `/stats/overview?${qsStr}` : "/stats/overview";
        return request<AnalyticsOverview>(url, init);
    },

    getHistory(params: { sessionId?: string; queueId?: string; search?: string; status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number } = {}): Promise<PaginatedHistoryResponse> {
        const qs = new URLSearchParams();
        if (params.sessionId) qs.set("session_id", params.sessionId);
        if (params.queueId) qs.set("queue_id", params.queueId);
        if (params.search) qs.set("search", params.search);
        if (params.status) qs.set("status", params.status);
        if (params.startDate) qs.set("start_date", params.startDate);
        if (params.endDate) qs.set("end_date", params.endDate);
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));

        const q = qs.toString();
        return request<PaginatedHistoryResponse>(`/stats/history${q ? `?${q}` : ""}`, { cache: "no-store" });
    },

    async exportAnalyticsCSV(params: { queueId?: string; sessionId?: string; search?: string; status?: string; startDate?: string; endDate?: string }): Promise<Blob> {
        const qs = new URLSearchParams();
        if (params.queueId) qs.append("queue_id", params.queueId);
        if (params.sessionId) qs.append("session_id", params.sessionId);
        if (params.search) qs.append("search", params.search);
        if (params.status) qs.append("status", params.status);
        if (params.startDate) qs.append("start_date", params.startDate);
        if (params.endDate) qs.append("end_date", params.endDate);
        const q = qs.toString();

        const url = `${config.apiBaseUrl}/stats/export${q ? `?${q}` : ""}`;
        const headers = new Headers();
        const token = getToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            throw new Error("Failed to export analytics data");
        }
        return await resp.blob();
    },

    // ── Messages ─────────────────────────────────────────────────,

    getMessages(): Promise<MessageResponse[]> {
        return request<MessageResponse[]>("/messages");
    },

    createMessage(content: string, message_type: string): Promise<MessageResponse> {
        return request<MessageResponse>("/messages", {
            method: "POST",
            body: JSON.stringify({ content, message_type }),
        });
    },

    markMessageRead(messageId: string): Promise<MessageResponse> {
        return request<MessageResponse>(`/messages/${messageId}/read`, {
            method: "PATCH",
        });
    },

    markAllMessagesRead(): Promise<MessageUpdateResponse> {
        return request<MessageUpdateResponse>("/messages/read-all", {
            method: "PATCH",
        });
    },

    clearAllMessages(): Promise<SuccessResponse> {
        return request<SuccessResponse>("/messages", {
            method: "DELETE",
        });
    },

    // ── Sessions ─────────────────────────────────────────────────,

    health(): Promise<HealthResponse> {
        return request<HealthResponse>("/health");
    },

    // ── Staff Management ─────────────────────────────,

    getOrganizationSettings(): Promise<OrganizationSettingsResponse> {
        return request<OrganizationSettingsResponse>("/organization/settings").catch(() => ({
            name: "",
            slug: "",
            email: "",
            address: null,
            phone_number: null,
            queue_templates: [],
            auto_session_enabled: false,
            auto_session_time: null,
            timezone: "Asia/Kolkata",
            parent_org: undefined,
        } as unknown as OrganizationSettingsResponse));
    },

    updateOrganizationSettings(data: OrganizationSettingsUpdate): Promise<OrganizationSettingsResponse> {
        return request<OrganizationSettingsResponse>("/organization/settings", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    triggerAutoSession(): Promise<{ message: string }> {
        return request<{ message: string }>("/organization/trigger-auto-session", {
            method: "POST",
        });
    },

    getSupportContact(): Promise<{ support_email: string; support_phone: string }> {
        return request<{ support_email: string; support_phone: string }>("/organization/support-contact");
    },

    getActiveSystemAnnouncements(): Promise<SystemAnnouncementDetail[]> {
        return request<SystemAnnouncementDetail[]>("/system/system-announcements/active");
    },

    // Global User Management,

    getBranchDirectory: (orgSlug: string) => {
        return request<BranchDirectoryResponse>(`/public/branch/${orgSlug}/directory`);
    },

    submitPublicCustomPlanRequest(data: {
        contact_name: string;
        contact_email: string;
        contact_phone: string;
        company_name: string;
        business_category: string;
        branch_count: string;
        queue_count: string;
        staff_count: string;
        visitor_volume: string;
        selected_services: string[];
        special_notes?: string;
    }): Promise<{ message: string; id: string }> {
        return request("/subscriptions/public/custom-plan-request", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
};

export const getSystemTime = async (): Promise<{ server_time: number }> => {
    const response = await fetch(`${config.apiBaseUrl}/system/time`);
    if (!response.ok) throw new Error('Failed to fetch system time');
    return response.json();
};
