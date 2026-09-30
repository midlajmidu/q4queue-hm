/**
 * lib/api/whatsapp.ts
 * Domain API: whatsapp
 */

import { request } from "./client";
import type {
    PaginatedWhatsAppMessages,
    WhatsAppAdminOrgConfig,
    WhatsAppConfig,
    WhatsAppDailyChartItem,
    WhatsAppEventStat,
    WhatsAppGlobalStats,
    WhatsAppMessage,
    WhatsAppOrgConfig,
    WhatsAppOrgStats,
    WhatsAppQueueStat,
    WhatsAppRateUpdate,
    WhatsAppSessionStat,
    WhatsAppTemplate,
    WhatsAppTemplateCreate,
    WhatsAppTemplateUpdate,
    WhatsAppUsageResponse,
} from "@/types/api";

export const whatsappApi = {
    getWhatsAppUsage(startDate?: string, endDate?: string, parentOrgId?: string): Promise<WhatsAppUsageResponse> {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append("start_date", startDate);
        if (endDate) queryParams.append("end_date", endDate);
        if (parentOrgId) queryParams.append("parent_org_id", parentOrgId);
        const q = queryParams.toString();
        return request<WhatsAppUsageResponse>(`/super-admin/whatsapp-usage${q ? `?${q}` : ""}`);
    },

    updateWhatsAppRate(data: WhatsAppRateUpdate): Promise<WhatsAppUsageResponse> {
        return request<WhatsAppUsageResponse>("/super-admin/whatsapp-rate", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    getWhatsAppConfig(): Promise<WhatsAppConfig> {
        return request<WhatsAppConfig>("/whatsapp/config");
    },

    saveWhatsAppConfig(data: Partial<WhatsAppConfig>): Promise<{ status: string; is_enabled: boolean; message: string }> {
        return request("/whatsapp/config", { method: "POST", body: JSON.stringify(data) });
    },

    getAdminWhatsAppOrgs(): Promise<WhatsAppAdminOrgConfig[]> {
        return request<WhatsAppAdminOrgConfig[]>("/whatsapp/admin/organizations");
    },

    updateAdminWhatsAppOrg(orgId: string, data: {
        is_enabled?: boolean;
        mode?: "default" | "custom_phone" | "custom_full";
        phone_number_id?: string | null;
        waba_id?: string | null;
        access_token?: string | null;
        webhook_verify_token?: string | null;
        app_id?: string | null;
        app_secret?: string | null;
    }): Promise<any> {
        return request(`/whatsapp/admin/organizations/${orgId}`, { method: "PUT", body: JSON.stringify(data) });
    },

    testOrgWhatsAppConnection(orgId: string, data?: { access_token?: string; phone_number_id?: string; waba_id?: string }): Promise<{ success: boolean; message?: string; error?: string; details?: any }> {
        return request(`/whatsapp/admin/organizations/${orgId}/test-connection`, { method: "POST", body: JSON.stringify(data || {}) });
    },

    testWhatsAppConnection(data?: { access_token?: string; phone_number_id?: string; waba_id?: string }): Promise<{ success: boolean; message?: string; error?: string; details?: any }> {
        return request("/whatsapp/test-connection", { method: "POST", body: JSON.stringify(data || {}) });
    },

    testWhatsAppSend(phone: string, message?: string): Promise<{ status: string; message: string }> {
        return request("/whatsapp/super-test-send", { method: "POST", body: JSON.stringify({ phone, message }) });
    },

    getWhatsAppGlobalStats(): Promise<WhatsAppGlobalStats> {
        return request<WhatsAppGlobalStats>("/whatsapp/stats");
    },

    getWhatsAppDailyChart(days = 30): Promise<WhatsAppDailyChartItem[]> {
        return request<WhatsAppDailyChartItem[]>(`/whatsapp/stats/daily?days=${days}`);
    },

    getWhatsAppStatsByOrg(limit = 100): Promise<WhatsAppOrgStats[]> {
        return request<WhatsAppOrgStats[]>(`/whatsapp/stats/by-org?limit=${limit}`);
    },

    listWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
        return request<WhatsAppTemplate[]>("/whatsapp/templates");
    },

    createWhatsAppTemplate(data: WhatsAppTemplateCreate): Promise<{ id: string; template_name: string; status: string }> {
        return request("/whatsapp/templates", { method: "POST", body: JSON.stringify(data) });
    },

    updateWhatsAppTemplate(id: string, data: WhatsAppTemplateUpdate): Promise<{ id: string; template_name: string; status: string }> {
        return request(`/whatsapp/templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
    },

    deleteWhatsAppTemplate(id: string): Promise<void> {
        return request(`/whatsapp/templates/${id}`, { method: "DELETE" });
    },

    syncMetaTemplates(): Promise<{ success: boolean; message: string; meta_connected: boolean; purged_from_meta: string[]; active_approved: string[] }> {
        return request("/whatsapp/templates/sync-meta", { method: "POST" });
    },

    deleteMetaTemplateByName(templateName: string): Promise<{ success: boolean; message: string }> {
        return request(`/whatsapp/templates/meta/${encodeURIComponent(templateName)}`, { method: "DELETE" });
    },

    getWhatsAppMessages(params: { limit?: number; offset?: number; organizationId?: string; status?: string; customerPhone?: string } = {}): Promise<PaginatedWhatsAppMessages> {
        const qs = new URLSearchParams();
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));
        if (params.organizationId) qs.set("organization_id", params.organizationId);
        if (params.status) qs.set("status", params.status);
        if (params.customerPhone) qs.set("customer_phone", params.customerPhone);
        const qStr = qs.toString() ? `?${qs.toString()}` : "";
        return request<PaginatedWhatsAppMessages>(`/whatsapp/messages${qStr}`);
    },

    getWhatsAppTokenStatus(tokenId: string): Promise<WhatsAppMessage[]> {
        return request<WhatsAppMessage[]>(`/whatsapp/token/${tokenId}/status`);
    },

    // ── WhatsApp: Org Admin ───────────────────────────────────────,

    getOrgWhatsAppConfig(): Promise<WhatsAppOrgConfig> {
        return request<WhatsAppOrgConfig>("/whatsapp/analytics/settings");
    },

    setOrgWhatsAppEnabled(data: Partial<WhatsAppOrgConfig>): Promise<WhatsAppOrgConfig> {
        return request<WhatsAppOrgConfig>("/whatsapp/analytics/settings", { method: "PATCH", body: JSON.stringify(data) });
    },

    getOrgWhatsAppStats(params: { startDate?: string; endDate?: string; queueId?: string; sessionId?: string } = {}): Promise<WhatsAppOrgStats> {
        const qs = new URLSearchParams();
        if (params.startDate) qs.set("start_date", params.startDate);
        if (params.endDate) qs.set("end_date", params.endDate);
        if (params.queueId) qs.set("queue_id", params.queueId);
        if (params.sessionId) qs.set("session_id", params.sessionId);
        const qStr = qs.toString() ? `?${qs.toString()}` : "";
        return request<WhatsAppOrgStats>(`/whatsapp/analytics/overview${qStr}`);
    },

    getOrgWhatsAppEventStats(params: { startDate?: string; endDate?: string; queueId?: string; sessionId?: string } = {}): Promise<WhatsAppEventStat[]> {
        const qs = new URLSearchParams();
        if (params.startDate) qs.set("start_date", params.startDate);
        if (params.endDate) qs.set("end_date", params.endDate);
        if (params.queueId) qs.set("queue_id", params.queueId);
        if (params.sessionId) qs.set("session_id", params.sessionId);
        const qStr = qs.toString() ? `?${qs.toString()}` : "";
        return request<WhatsAppEventStat[]>(`/whatsapp/analytics/events${qStr}`);
    },

    getOrgWhatsAppQueueStats(): Promise<WhatsAppQueueStat[]> {
        return request<WhatsAppQueueStat[]>("/whatsapp/analytics/queues");
    },

    getOrgWhatsAppSessionStats(): Promise<WhatsAppSessionStat[]> {
        return request<WhatsAppSessionStat[]>("/whatsapp/analytics/sessions");
    },

    getOrgWhatsAppMessages(params: { limit?: number; offset?: number; startDate?: string; endDate?: string; customerPhone?: string; customerName?: string; status?: string; eventType?: string; queueId?: string; sessionId?: string } = {}): Promise<PaginatedWhatsAppMessages> {
        const qs = new URLSearchParams();
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));
        if (params.startDate) qs.set("start_date", params.startDate);
        if (params.endDate) qs.set("end_date", params.endDate);
        if (params.customerPhone) qs.set("customer_phone", params.customerPhone);
        if (params.customerName) qs.set("customer_name", params.customerName);
        if (params.status) qs.set("status", params.status);
        if (params.eventType) qs.set("event_type", params.eventType);
        if (params.queueId) qs.set("queue_id", params.queueId);
        if (params.sessionId) qs.set("session_id", params.sessionId);

        const q = qs.toString();
        return request<PaginatedWhatsAppMessages>(`/whatsapp/analytics/history${q ? `?${q}` : ""}`);
    },

    sendWhatsAppTestNotification(phone: string, message?: string): Promise<{ status: string; message: string }> {
        return request("/whatsapp/org/test", { method: "POST", body: JSON.stringify({ phone, message }) });
    },

    // ── Bare-Metal Backups ──────────────────────────────────────────,
};
