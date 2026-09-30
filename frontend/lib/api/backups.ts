/**
 * lib/api/backups.ts
 * Domain API: backups
 */

import { config } from "@/lib/config";
import { getToken } from "@/lib/auth";
import { request } from "./client";
import type {
    SuccessResponse,
} from "@/types/api";

export const backupApi = {
    createBranchBackup(orgId: string): Promise<any> {
        return request<any>(`/super-admin/branches/${orgId}/backups`, {
            method: "POST"
        });
    },

    listBranchBackups(orgId: string): Promise<{ items: any[] }> {
        return request<{ items: any[] }>(`/super-admin/branches/${orgId}/backups`);
    },

    restoreBranchBackup(orgId: string, file: File): Promise<SuccessResponse> {
        const formData = new FormData();
        formData.append("file", file);
        return request<SuccessResponse>(`/super-admin/branches/${orgId}/backups/restore`, {
            method: "POST",
            body: formData,
        });
    },

    // ── Org Admin Branch Backups ────────────────────────────────────────────────,

    orgAdminCreateBranchBackup(branchId: string): Promise<any> {
        return request<any>(`/organization-admin/branches/${branchId}/backups`, {
            method: "POST"
        });
    },

    orgAdminListBranchBackups(branchId: string): Promise<{ items: any[] }> {
        return request<{ items: any[] }>(`/organization-admin/branches/${branchId}/backups`);
    },

    orgAdminRestoreBranchBackup(branchId: string, file: File): Promise<SuccessResponse> {
        const formData = new FormData();
        formData.append("file", file);
        return request<SuccessResponse>(`/organization-admin/branches/${branchId}/backups/restore`, {
            method: "POST",
            body: formData,
        });
    },

    getOrgAdminBackups: () => {
        return request<any[]>("/organization-admin/backups");
    },

    restoreOrgAdminBackup: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return request<any>("/organization-admin/backups/restore", {
            method: "POST",
            body: formData,
        });
    },

    downloadOrgAdminBackup: async (backupId: string) => {
        const token = getToken();
        if (!token) throw new Error("No token");

        // Cannot use standard generic `request` here easily because we need to parse blob.
        // I will just use fetch manually.
        const res = await fetch(`${config.apiBaseUrl}/organization-admin/backups/${backupId}/download`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error("Failed to download backup");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;

        // Extract filename from headers if possible
        let filename = `backup-${backupId}.q4backup`;
        const disposition = res.headers.get("content-disposition");
        if (disposition && disposition.includes("filename=")) {
            filename = disposition.split("filename=")[1].replace(/"/g, "");
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    getBackups(): Promise<{ items: { filename: string; size_mb: number; created_at: string }[] }> {
        return request("/super-admin/backups");
    },

    restoreBackup(filename: string): Promise<SuccessResponse> {
        return request("/super-admin/backups/restore", {
            method: "POST",
            body: JSON.stringify({ filename })
        });
    },

    // ── Public Custom Plan & Sales Requests ──────────────────────,
};
