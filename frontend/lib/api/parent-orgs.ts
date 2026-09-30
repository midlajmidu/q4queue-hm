/**
 * lib/api/parent-orgs.ts
 * Domain API: parent_orgs
 */

import { request } from "./client";
import type {
    AssignBranchesRequest,
    OrgAdminCreate,
    OrgDetail,
    ParentOrganization,
    ParentOrganizationCreate,
    ParentOrganizationPage,
    ParentOrganizationUpdate,
    User,
} from "@/types/api";

export const parentOrgApi = {
    listParentOrganizations(params?: { search?: string; status?: string; skip?: number; limit?: number }): Promise<ParentOrganizationPage> {
        let queryStr = "";
        if (params) {
            const searchParams = new URLSearchParams();
            if (params.search) searchParams.append("search", params.search);
            if (params.status) searchParams.append("status", params.status);
            if (params.skip !== undefined) searchParams.append("skip", params.skip.toString());
            if (params.limit !== undefined) searchParams.append("limit", params.limit.toString());
            const qs = searchParams.toString();
            if (qs) queryStr = `?${qs}`;
        }
        return request<ParentOrganizationPage>(`/parent-organizations${queryStr}`);
    },

    createParentOrganization(data: ParentOrganizationCreate): Promise<ParentOrganization> {
        return request<ParentOrganization>("/parent-organizations", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateParentOrganization(id: string, data: ParentOrganizationUpdate): Promise<ParentOrganization> {
        return request<ParentOrganization>(`/parent-organizations/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    deleteParentOrganization(id: string): Promise<{ message: string }> {
        return request<{ message: string }>(`/parent-organizations/${id}`, {
            method: "DELETE",
        });
    },

    // ── Branch Backups ────────────────────────────────────────────────,

    assignBranchesToParent(id: string, data: AssignBranchesRequest): Promise<{ message: string }> {
        return request<{ message: string }>(`/parent-organizations/${id}/assign-branches`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getParentBranches(id: string): Promise<OrgDetail[]> {
        return request<OrgDetail[]>(`/parent-organizations/${id}/branches`);
    },

    createOrganizationAdmin(id: string, data: OrgAdminCreate): Promise<User> {
        return request<User>(`/parent-organizations/${id}/admins`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getParentAdmins(id: string): Promise<User[]> {
        return request<User[]>(`/parent-organizations/${id}/admins`);
    },

    // ── Organization Admin Dashboard ──────────────────────────────────,
};
