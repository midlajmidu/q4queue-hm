/**
 * lib/api/staff.ts
 * Domain API: staff
 */

import { request } from "./client";
import type {
    PaginatedStaffResponse,
    StaffCreate,
    StaffListParams,
    StaffMember,
    StaffUpdate,
} from "@/types/api";

export const staffApi = {
    listStaff(params: StaffListParams = {}): Promise<PaginatedStaffResponse> {
        const qs = new URLSearchParams();
        if (params.search) qs.set("search", params.search);
        if (params.is_active != null) qs.set("is_active", String(params.is_active));
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));
        if (params.sort_order) qs.set("sort_order", params.sort_order);
        const q = qs.toString();
        return request<PaginatedStaffResponse>(`/staff${q ? `?${q}` : ""}`).catch(() => ({
            items: [],
            total: 0,
            limit: params.limit || 20,
            offset: params.offset || 0,
        } as PaginatedStaffResponse));
    },

    createStaff(data: StaffCreate): Promise<StaffMember> {
        return request<StaffMember>("/staff", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateStaff(staffId: string, data: StaffUpdate): Promise<StaffMember> {
        return request<StaffMember>(`/staff/${staffId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    deactivateStaff(staffId: string): Promise<StaffMember> {
        return request<StaffMember>(`/staff/${staffId}`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: false }),
        });
    },

    deleteStaff(staffId: string): Promise<StaffMember> {
        return request<StaffMember>(`/staff/${staffId}`, {
            method: "DELETE",
        });
    },

    hardDeleteStaff(staffId: string): Promise<void> {
        return request<void>(`/staff/${staffId}/hard`, {
            method: "DELETE",
        });
    },

    listTrashStaff(): Promise<StaffMember[]> {
        return request<StaffMember[]>("/staff/trash");
    },

    restoreStaff(staffId: string): Promise<StaffMember> {
        return request<StaffMember>(`/staff/${staffId}/restore`, {
            method: "POST",
        });
    },

    // ── Super Admin ───────────────────────────────────,
};
