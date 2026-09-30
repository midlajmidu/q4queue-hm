/**
 * lib/api/branch-operations.ts
 * Domain API: branch_operations
 */

import { request } from "./client";
import type {
    BranchAdminCreateRequest,
    BranchAdminResetPasswordRequest,
    BranchAdminResponse,
    BranchCreateRequest,
    BranchDetailResponse,
    BranchStatItem,
    BranchUpdateRequest,
} from "@/types/api";

export const branchOperationsApi = {
    listBranches: () => {
        return request<BranchStatItem[]>("/organization-admin/branches"); // (Needs to call the older endpoint or maybe it was overwritten. Actually I overwrote /organization-admin/branches)
    },

    checkBranchSlug: (slug: string) => {
        return request<{ available: boolean }>(`/organization-admin/check-slug?slug=${encodeURIComponent(slug)}`);
    },

    createBranch: (data: BranchCreateRequest) => {
        return request<BranchStatItem>("/organization-admin/branches", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getBranchDetails: (id: string) => {
        return request<BranchDetailResponse>(`/organization-admin/branches/${id}`);
    },

    // ── Enterprise Branch Details (Operations Center) ───────────,

    getBranchDashboard: (branchId: string, params?: { period?: string; start_date?: string; end_date?: string }) => {
        const q = new URLSearchParams();
        if (params?.period) q.set("period", params.period);
        if (params?.start_date) q.set("start_date", params.start_date);
        if (params?.end_date) q.set("end_date", params.end_date);
        const qs = q.toString();
        return request<any>(`/organization-admin/operations/${branchId}/dashboard${qs ? `?${qs}` : ""}`);
    },

    updateBranchContactDetails: (branchId: string, data: any) => {
        return request<any>(`/organization-admin/operations/${branchId}/contact`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    updateBranch: (id: string, data: BranchUpdateRequest) => {
        return request<BranchStatItem>(`/organization-admin/branches/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    updateBranchStatus: (id: string, is_active: boolean) => {
        return request<BranchStatItem>(`/organization-admin/branches/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ is_active }),
        });
    },

    createBranchAdmin: (id: string, data: BranchAdminCreateRequest) => {
        return request<BranchAdminResponse>(`/organization-admin/branches/${id}/admins`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    resetBranchAdminPassword: (id: string, adminId: string, data: BranchAdminResetPasswordRequest) => {
        return request<{ message: string }>(`/organization-admin/branches/${id}/reset-password?admin_id=${adminId}`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // ── Organization Settings ────────────────────────────────────────,
};
