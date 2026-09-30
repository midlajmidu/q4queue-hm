/**
 * lib/api/exports.ts
 * Standalone direct-fetch export and report APIs.
 */

import { config } from "@/lib/config";

export const requestExport = async (payload: { report_type: string, format: string, date_range: string, custom_start_date?: string, custom_end_date?: string, branch_ids?: string[] }, token: string) => {
    const response = await fetch(`${config.apiBaseUrl}/organization-admin/exports`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to request export');
    }
    return response.json();
};

export const getExports = async (token: string) => {
    const response = await fetch(`${config.apiBaseUrl}/organization-admin/exports`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error('Failed to fetch exports');
    return response.json();
};

export const downloadExport = async (jobId: string, filename: string, token: string) => {
    const response = await fetch(`${config.apiBaseUrl}/organization-admin/exports/${jobId}/download`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to download export');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export_file';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
};

export const getDistinctQueues = async (branchId: string, token: string) => {
    const response = await fetch(`${config.apiBaseUrl}/organization-admin/branches/${branchId}/queues/distinct`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error('Failed to fetch distinct queues');
    return response.json();
};
