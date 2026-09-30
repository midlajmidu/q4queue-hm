/**
 * lib/api/org-admin.ts
 * Domain API: org_admin
 */

import { config } from "@/lib/config";
import { getToken } from "@/lib/auth";
import { request } from "./client";

export interface OrganizationAnnouncement {
    id: string;
    parent_organization_id: string;
    title: string;
    message: string;
    type: string;
    target_branches: string[] | null;
    start_time: string | null;
    end_time: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
import type {
    QueueMonitorItem,
} from "@/types/api";

export const orgAdminApi = {
    getOrgAdminDashboard: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<any>(`/organization-admin/dashboard${query}`);
    },

    getOrgAdminBranchesOverview: () => {
        return request<any[]>("/organization-admin/branches");
    },

    getOrgAdminAnalytics: (branchId?: string, startDate?: string, endDate?: string) => {
        const ps = new URLSearchParams();
        if (branchId) ps.append("branch_id", branchId);
        if (startDate) ps.append("start_date", startDate);
        if (endDate) ps.append("end_date", endDate);
        return request<any>(`/organization-admin/analytics${ps.toString() ? `?${ps.toString()}` : ''}`);
    },

    exportOrgAdminAnalytics: async (params: { branch_id?: string; start_date?: string; end_date?: string }): Promise<Blob> => {
        const qs = new URLSearchParams();
        if (params.branch_id) qs.append("branch_id", params.branch_id);
        if (params.start_date) qs.append("start_date", params.start_date);
        if (params.end_date) qs.append("end_date", params.end_date);
        const q = qs.toString();

        const url = `${config.apiBaseUrl}/organization-admin/analytics/export${q ? `?${q}` : ""}`;
        const headers = new Headers();
        const token = getToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        // Try to attach X-Org-Slug from URL pathname for organization_admin branch access
        if (typeof window !== "undefined") {
            const pathParts = window.location.pathname.split('/');
            if (pathParts.length >= 2) {
                const potentialSlug = pathParts[1];
                const excludedPrefixes = ['super-admin', 'organization-admin', 'login', 'get-started', 'auth'];
                if (!excludedPrefixes.includes(potentialSlug)) {
                    headers.set("X-Org-Slug", potentialSlug);
                }
            }
        }

        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            throw new Error("Failed to export analytics data");
        }
        return await resp.blob();
    },

    getOrgAdminTrafficChart: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<{ peak_traffic: any[]; peak_hour: string | null }>(
            `/organization-admin/analytics/traffic${query}`
        );
    },

    getOrgAdminQueues: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<QueueMonitorItem[]>(`/organization-admin/monitoring/queues${query}`);
    },

    getOrgAdminStaff: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<any[]>(`/organization-admin/monitoring/staff${query}`);
    },

    deleteOrgAdminStaff: (userId: string) => {
        return request<any>(`/organization-admin/operations/staff/${userId}`, {
            method: "DELETE"
        });
    },

    getOrgAdminWhatsApp: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<any[]>(`/organization-admin/monitoring/whatsapp${query}`);
    },

    getOrgAdminAudit: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<any[]>(`/organization-admin/monitoring/audit${query}`);
    },

    // ── Phase 4: Enterprise Operations ──────────────────────────────────,

    getOrgAdminSettings: () => {
        return request<any>("/organization-admin/settings");
    },

    updateOrgAdminSettings: (data: any) => {
        return request<any>("/organization-admin/settings", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    uploadOrgAdminLogo: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return request<{ logo_url: string }>("/organization-admin/settings/logo", {
            method: "POST",
            body: formData,
        });
    },

    getOrgAdminAnnouncements: () => {
        return request<any[]>("/organization-admin/announcements");
    },

    createOrgAdminAnnouncement: (data: any) => {
        return request<any>("/organization-admin/announcements", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateOrgAdminAnnouncement: (id: string, data: Partial<Omit<OrganizationAnnouncement, "id" | "parent_organization_id" | "created_at" | "updated_at">>) => {
        return request<OrganizationAnnouncement>(`/organization-admin/announcements/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    deleteOrgAdminAnnouncement: (id: string) => {
        return request<void>(`/organization-admin/announcements/${id}`, {
            method: "DELETE",
        });
    },

    getActiveOrgAnnouncements: () => {
        return request<OrganizationAnnouncement[]>("/organization/announcements/active");
    },

    // ── Appointments & Early Bookings ─────────────────────────────,

    getOrgAdminBranchOperations: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}`);
    },

    updateOrgAdminBranchStatus: (branchId: string, isActive: boolean) => {
        return request<any>(`/organization-admin/operations/${branchId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: isActive }),
        });
    },

    globalOrgAdminSearch: (query: string) => {
        return request<any[]>(`/organization-admin/search?q=${encodeURIComponent(query)}`);
    },
};
