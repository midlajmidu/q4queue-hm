/**
 * lib/api/calling.ts
 * Domain API: calling
 */

import { config } from "@/lib/config";
import { getToken } from "@/lib/auth";
import { request } from "./client";
import type {
    CallLogsOverviewResponse,
    CallingConfigRead,
    CallingConfigUpdate,
    PaginatedCallLogsResponse,
} from "@/types/api";

export const callingApi = {
    getPlivoWebRTCToken(): Promise<{ username: string; password: string }> {
        return request<{ username: string; password: string }>("/plivo/webrtc/token", {
            method: "GET",
        });
    },

    // ── Call Logs & Analytics ────────────────────────────────────────────────────────,

    logCall(data: any): Promise<any> {
        return request("/calls/save", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getCallLogs(params?: { queue_id?: string; staff_id?: string; search?: string; page?: number; limit?: number; startDate?: string; endDate?: string; start_date?: string; end_date?: string }): Promise<PaginatedCallLogsResponse> {
        const queryParams = new URLSearchParams();
        if (params?.queue_id) queryParams.append("queue_id", params.queue_id);
        if (params?.staff_id) queryParams.append("staff_id", params.staff_id);
        if (params?.search) queryParams.append("search", params.search);
        const sDate = params?.startDate || params?.start_date;
        const eDate = params?.endDate || params?.end_date;
        if (sDate) queryParams.append("start_date", sDate);
        if (eDate) queryParams.append("end_date", eDate);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        const q = queryParams.toString();
        return request<PaginatedCallLogsResponse>(`/calls/logs${q ? `?${q}` : ""}`);
    },

    getCallLogsOverview(queue_id?: string, startDate?: string, endDate?: string): Promise<CallLogsOverviewResponse> {
        const queryParams = new URLSearchParams();
        if (queue_id) queryParams.append("queue_id", queue_id);
        if (startDate) queryParams.append("start_date", startDate);
        if (endDate) queryParams.append("end_date", endDate);
        const q = queryParams.toString();
        return request<CallLogsOverviewResponse>(`/calls/overview${q ? `?${q}` : ""}`);
    },

    async exportCallLogsCSV(params?: { queue_id?: string; search?: string; start_date?: string; end_date?: string }): Promise<Blob> {
        const qs = new URLSearchParams();
        if (params?.queue_id) qs.append("queue_id", params.queue_id);
        if (params?.search) qs.append("search", params.search);
        if (params?.start_date) qs.append("start_date", params.start_date);
        if (params?.end_date) qs.append("end_date", params.end_date);
        const q = qs.toString();

        const url = `${config.apiBaseUrl}/calls/logs/export${q ? `?${q}` : ""}`;
        const headers = new Headers();
        const token = getToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            throw new Error("Failed to export call logs");
        }
        return await resp.blob();
    },

    getCallingConfig(startDate?: string, endDate?: string): Promise<CallingConfigRead> {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append("start_date", startDate);
        if (endDate) queryParams.append("end_date", endDate);
        const q = queryParams.toString();
        return request<CallingConfigRead>(`/super-admin/calling-config${q ? `?${q}` : ""}`);
    },

    updateCallingConfig(data: CallingConfigUpdate): Promise<CallingConfigRead> {
        return request<CallingConfigRead>("/super-admin/calling-config", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },
};
