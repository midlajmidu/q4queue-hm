/**
 * lib/api/super-admin.ts
 * Domain API: super_admin
 */

import { request } from "./client";
import type {
    GlobalQueueResponse,
    GlobalSettings,
    ListOrgsParams,
    OrgCreateRequest,
    OrgCreateResponse,
    OrgDetail,
    OrgDetailExtended,
    OrgStats,
    OrgUpdateRequest,
    OrgUsageResponse,
    OrgUserCreate,
    OrgUserUpdate,
    PaginatedAuditLogs,
    PaginatedGlobalUsers,
    PaginatedOrgUsersResponse,
    PaginatedOrgsResponse,
    PaginatedSystemAnnouncements,
    PlatformAnalytics,
    ResetPasswordRequest,
    ResetPasswordResponse,
    SuccessResponse,
    SuperAdminLoginRequest,
    SystemAnnouncementCreate,
    SystemAnnouncementDetail,
    SystemAnnouncementUpdate,
    SystemMonitoringResponse,
    TenantAnalyticsResponse,
    TokenResponse,
    User,
} from "@/types/api";

export const superAdminApi = {
    superAdminLogin(data: SuperAdminLoginRequest): Promise<TokenResponse> {
        return request<TokenResponse>("/super-admin/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getOrganizationStats(): Promise<OrgStats> {
        return request<OrgStats>("/super-admin/stats");
    },

    getOrganizationUsage(orgId: string): Promise<OrgUsageResponse> {
        return request<OrgUsageResponse>(`/super-admin/organizations/${orgId}/usage`);
    },

    getPlatformAnalytics(): Promise<PlatformAnalytics> {
        return request<PlatformAnalytics>("/super-admin/analytics");
    },

    getSystemMonitoring(): Promise<SystemMonitoringResponse> {
        return request<SystemMonitoringResponse>("/super-admin/system-monitoring");
    },

    getGlobalSettings(): Promise<GlobalSettings> {
        return request<GlobalSettings>("/super-admin/settings");
    },

    updateGlobalSettings(data: GlobalSettings): Promise<GlobalSettings> {
        return request<GlobalSettings>("/super-admin/settings", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    listOrganizations(params: ListOrgsParams = {}): Promise<PaginatedOrgsResponse> {
        const qs = new URLSearchParams();
        if (params.search) qs.set("search", params.search);
        if (params.is_test !== undefined) qs.set("is_test", String(params.is_test));
        if (params.parent_org_id) qs.set("parent_org_id", params.parent_org_id);
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));
        if (params.sort_by) qs.set("sort_by", params.sort_by);
        if (params.sort_order) qs.set("sort_order", params.sort_order);
        const q = qs.toString();
        return request<PaginatedOrgsResponse>(`/super-admin/organizations${q ? `?${q}` : ""}`);
    },

    getAuditLogs(limit: number = 20, offset: number = 0): Promise<PaginatedAuditLogs> {
        return request<PaginatedAuditLogs>(`/super-admin/audit-logs?limit=${limit}&offset=${offset}`);
    },

    getTenantAnalytics(params: {
        start_date: string;
        end_date: string;
        parent_org_id?: string;
        branch_id?: string;
    }): Promise<TenantAnalyticsResponse> {
        const qs = new URLSearchParams({ start_date: params.start_date, end_date: params.end_date });
        if (params.parent_org_id) qs.set("parent_org_id", params.parent_org_id);
        if (params.branch_id) qs.set("branch_id", params.branch_id);
        return request<TenantAnalyticsResponse>(`/super-admin/tenant-analytics?${qs.toString()}`);
    },

    getSystemAnnouncements(limit: number = 20, offset: number = 0): Promise<PaginatedSystemAnnouncements> {
        return request<PaginatedSystemAnnouncements>(`/super-admin/announcements?limit=${limit}&offset=${offset}`);
    },

    createSystemAnnouncement(data: SystemAnnouncementCreate): Promise<SystemAnnouncementDetail> {
        return request<SystemAnnouncementDetail>("/super-admin/announcements", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateSystemAnnouncement(id: string, data: SystemAnnouncementUpdate): Promise<SystemAnnouncementDetail> {
        return request<SystemAnnouncementDetail>(`/super-admin/announcements/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    deleteSystemAnnouncement(id: string): Promise<void> {
        return request<void>(`/super-admin/announcements/${id}`, {
            method: "DELETE",
        });
    },

    getOrganizationDetail(orgId: string): Promise<OrgDetailExtended> {
        return request<OrgDetailExtended>(`/super-admin/organizations/${orgId}`);
    },

    getOrgUsers(orgId: string, limit: number = 20, offset: number = 0): Promise<PaginatedOrgUsersResponse> {
        return request<PaginatedOrgUsersResponse>(`/super-admin/organizations/${orgId}/users?limit=${limit}&offset=${offset}`);
    },

    createOrgUser(orgId: string, data: OrgUserCreate): Promise<User> {
        return request<User>(`/super-admin/organizations/${orgId}/users`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateOrgUser(orgId: string, userId: string, data: OrgUserUpdate): Promise<User> {
        return request<User>(`/super-admin/organizations/${orgId}/users/${userId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    deleteOrgUser(orgId: string, userId: string): Promise<void> {
        return request<void>(`/super-admin/organizations/${orgId}/users/${userId}`, {
            method: "DELETE",
        });
    },

    impersonateOrganization(orgId: string): Promise<TokenResponse> {
        return request<TokenResponse>(`/super-admin/organizations/${orgId}/impersonate`, {
            method: "POST",
        });
    },

    impersonateOrgBranch(orgId: string): Promise<TokenResponse> {
        return request<TokenResponse>(`/organization-admin/branches/${orgId}/impersonate`, {
            method: "POST",
        });
    },

    getGlobalQueues(limit: number = 20, offset: number = 0, search: string = ""): Promise<GlobalQueueResponse> {
        const query = search ? `&search=${encodeURIComponent(search)}` : "";
        return request<GlobalQueueResponse>(`/super-admin/queues?limit=${limit}&offset=${offset}${query}`);
    },

    pauseGlobalQueue(queueId: string): Promise<SuccessResponse> {
        return request<SuccessResponse>(`/super-admin/queues/${queueId}/pause`, { method: "POST" });
    },

    resumeGlobalQueue(queueId: string): Promise<SuccessResponse> {
        return request<SuccessResponse>(`/super-admin/queues/${queueId}/resume`, { method: "POST" });
    },

    clearGlobalQueue(queueId: string): Promise<SuccessResponse> {
        return request<SuccessResponse>(`/super-admin/queues/${queueId}/clear`, { method: "POST" });
    },

    createOrganization(data: OrgCreateRequest): Promise<OrgCreateResponse> {
        return request<OrgCreateResponse>("/super-admin/organizations", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateOrganization(orgId: string, data: OrgUpdateRequest): Promise<OrgDetail> {
        return request<OrgDetail>(`/super-admin/organizations/${orgId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    deleteOrganization(orgId: string): Promise<OrgDetail> {
        return request<OrgDetail>(`/super-admin/organizations/${orgId}`, {
            method: "DELETE",
        });
    },

    // ── Parent Organizations ─────────────────────────────────────────,

    resetOrgPassword(orgId: string, data: ResetPasswordRequest): Promise<SuccessResponse> {
        return request<SuccessResponse>(`/super-admin/organizations/${orgId}/reset-password`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // System,

    searchGlobalUsers(q: string = "", limit: number = 20, offset: number = 0, role: string = ""): Promise<PaginatedGlobalUsers> {
        let url = `/super-admin/users/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
        if (role) {
            url += `&role=${encodeURIComponent(role)}`;
        }
        return request<PaginatedGlobalUsers>(url);
    },

    updateUser(userId: string, data: { first_name?: string; last_name?: string; email?: string; new_password?: string }): Promise<User> {
        return request<User>(`/super-admin/users/${userId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    resetUserPassword(userId: string): Promise<ResetPasswordResponse> {
        return request<ResetPasswordResponse>(`/super-admin/users/${userId}/reset-password`, { method: "POST" });
    },
    // ── WhatsApp: Super Admin ─────────────────────────────────────,
};
