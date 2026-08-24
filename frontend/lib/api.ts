/**
 * lib/api.ts
 * Centralized API client — the ONLY way to talk to the backend.
 *
 * Rules:
 *   - No component may call fetch() directly.
 *   - Authorization header auto-attached when token exists.
 *   - 401 → auto-logout + redirect to /login.
 *   - 429 → friendly rate-limit message surfaced.
 *   - All responses are typed.
 *   - All errors mapped to user-friendly messages.
 */

import { config } from "@/lib/config";
import { getToken, removeToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type {
    ApiErrorResponse,
    HealthResponse,
    AnalyticsOverview,
    JoinRequest,
    JoinResponse,
    ListOrgsParams,
    LoginRequest,
    NextResponse,
    NoTokenResponse,
    OrgCreateRequest,
    OrgCreateResponse,
    OrgDetail,
    OrgDetailExtended,
    OrgStats,
    OrgUpdateRequest,
    PaginatedOrgsResponse,
    OrgUserCreate,
    OrgUserUpdate,
    PaginatedOrgUsersResponse,
    PaginatedCallLogsResponse,
    CallLogsOverviewResponse,
    PaginatedStaffResponse,
    QueueCreate,
    QueueResponse,
    SessionCreate,
    SessionResponse,
    StaffCreate,
    StaffListParams,
    StaffMember,
    StaffUpdate,
    User,
    SuperAdminLoginRequest,
    TokenDetail,
    TokenResponse,
    PublicTokenResponse,
    TokenRestoreResponse,
    OrganizationSettingsResponse,
    OrganizationSettingsUpdate,
    PaginatedAuditLogs,
    PaginatedSystemAnnouncements,
    SystemAnnouncementCreate,
    SystemAnnouncementUpdate,
    SystemAnnouncementDetail,
    ChangePasswordRequest,
    ChangeFirstPasswordRequest,
    RequestOtpRequest,
    ResetPasswordRequest,
    SuccessResponse,
    PaginatedHistoryResponse,
    PaginatedSessionResponse,
    PaginatedQueueResponse,
    MessageResponse,
    MessageUpdateResponse,
    OrgUsageResponse,
    PlatformAnalytics,
    GlobalQueueResponse,
    OrgAnalyticsResponse,
    SystemMonitoringResponse,
    GlobalSettings,
    PaginatedGlobalUsers,
    ResetPasswordResponse,
    WhatsAppConfig,
    WhatsAppTemplate,
    WhatsAppTemplateCreate,
    WhatsAppTemplateUpdate,
    WhatsAppGlobalStats,
    WhatsAppDailyChartItem,
    WhatsAppOrgStats,
    WhatsAppMessage,
    PaginatedWhatsAppMessages,
    WhatsAppOrgConfig,
    WhatsAppAdminOrgConfig,
    TrackingResponse,
    WhatsAppEventStat,
    WhatsAppQueueStat,
    WhatsAppSessionStat,
    ParentOrganization,
    ParentOrganizationCreate,
    ParentOrganizationUpdate,
    ParentOrganizationPage,
    AssignBranchesRequest,
    OrgAdminCreate,
    BranchStatItem,
    OrgAdminDashboardResponse,
    BranchCreateRequest,
    BranchUpdateRequest,
    BranchStatusUpdate,
    BranchAdminCreateRequest,
    BranchAdminResetPasswordRequest,
    BranchDetailResponse,
    BranchAdminResponse,
    TenantAnalyticsRow,
    TenantAnalyticsResponse,
} from "@/types/api";


// ── Error class ──────────────────────────────────────────────────
export class ApiError extends Error {
    status: number;
    detail: string;
    path?: string;
    method?: string;
    retryAfter?: number;

    constructor(resp: ApiErrorResponse & { path?: string; method?: string }) {
        const msg = resp.path ? `[${resp.status} ${resp.method || "GET"} ${resp.path}] ${resp.detail}` : resp.detail;
        super(msg);
        this.name = "ApiError";
        this.status = resp.status;
        this.detail = resp.detail;
        this.path = resp.path;
        this.method = resp.method;
        this.retryAfter = resp.retryAfter;
    }
}

// ── User-friendly error messages ─────────────────────────────────
function friendlyMessage(status: number, rawDetail: string): string {
    switch (status) {
        case 400: return rawDetail || "Invalid request. Please try again.";
        case 401:
            if (rawDetail === "Invalid credentials" || rawDetail.includes("deactivated")) {
                return rawDetail;
            }
            return "Session expired. Please sign in again.";
        case 403: return "Access denied. You don't have permission for this action.";
        case 404: return "The requested resource was not found.";
        case 409: return rawDetail || "This action conflicts with the current state.";
        case 422: return rawDetail || "Invalid input. Please check your data.";
        case 429: return rawDetail; // Handled separately with retry-after
        case 500: return rawDetail || "A temporary server issue occurred. Please try again.";
        case 502: return "The server is temporarily unreachable. Please try again shortly.";
        case 503: return "The service is temporarily unavailable. Please try again shortly.";
        default: return rawDetail || "An unexpected error occurred.";
    }
}

// ── Internal fetch wrapper ───────────────────────────────────────
async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${config.apiBaseUrl}${path}`;
    const headers = new Headers(options.headers);

    // Auto-attach token
    const token = getToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Default content type for JSON bodies
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    // Try to attach X-Org-Slug from URL pathname for organization_admin branch access
    if (typeof window !== "undefined") {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        let slugToSet: string | null = null;

        if (pathParts[0] === "org-admin" && pathParts.length >= 2) {
            slugToSet = pathParts[1];
        } else if (pathParts[0] === "super-admin" && pathParts.length >= 3) {
            slugToSet = pathParts[2];
        } else if (pathParts.length >= 1) {
            const potentialSlug = pathParts[0];
            const excludedPrefixes = ['super-admin', 'organization-admin', 'org-admin', 'login', 'get-started', 'auth'];
            if (!excludedPrefixes.includes(potentialSlug)) {
                slugToSet = potentialSlug;
            }
        }

        if (slugToSet) {
            headers.set("X-Org-Slug", slugToSet);
        }
    }

    let resp: Response;
    try {
        resp = await fetch(url, { ...options, headers });
    } catch (err) {
        if ((err as Error)?.name === "AbortError") throw err;

        // Network failure — server unreachable
        logger.error("Network request failed", { path, error: String(err) });
        throw new ApiError({
            status: 0,
            detail: "Unable to connect to server. Please check your network.",
        });
    }

    // ── Handle error responses ─────────────────────────────────
    if (!resp.ok) {
        let rawDetail = "An unexpected error occurred";
        let retryAfter: number | undefined;

        try {
            const body = await resp.json();
            // FastAPI 422 returns detail as an array of validation error objects:
            // [{type, loc, msg, input, ctx}, ...]
            // We must extract a string — never pass the raw array to the UI.
            if (Array.isArray(body.detail)) {
                rawDetail = body.detail
                    .map((e: { loc?: string[]; msg?: string }) =>
                        e.loc ? `${e.loc.slice(-1)[0]}: ${e.msg}` : (e.msg ?? "Validation error")
                    )
                    .join("; ");
            } else if (typeof body.detail === "string") {
                rawDetail = body.detail;
            }
        } catch {
            // Response body not JSON
        }

        // 401 → auto-logout
        if (resp.status === 401) {
            removeToken();
            if (typeof window !== "undefined") {
                // Broadcast logout to all other tabs to prevent token resurrection loops
                try {
                    const bc = new BroadcastChannel("auth_sync_channel");
                    bc.postMessage({ type: "LOGOUT" });
                    bc.close();
                } catch (e) { }

                const path = window.location.pathname;
                const isSuperAdminPath = path.startsWith("/super-admin");
                const isOrgAdminPath = path.startsWith("/organization-admin");
                const isAlreadyonLogin = path === "/login" || path.endsWith("/login") || path === "/organization-login";

                if (!isAlreadyonLogin) {
                    if (isOrgAdminPath) {
                        window.location.href = "/organization-login";
                    } else {
                        const redirectUrl = isSuperAdminPath ? "/super-admin/login" : "/login";
                        if (rawDetail && rawDetail.includes("deactivated")) {
                            window.location.href = `${redirectUrl}?error=deactivated`;
                        } else {
                            window.location.href = redirectUrl;
                        }
                    }
                }
            }
        }

        // 403 → intercept force_password_change
        if (resp.status === 403 && rawDetail === "force_password_change") {
            if (typeof window !== "undefined") {
                const isAlreadyOnChangePassword = window.location.pathname.endsWith("/change-password");
                if (!isAlreadyOnChangePassword) {
                    // Try to extract orgSlug from URL if possible, otherwise fallback to super-admin
                    const pathParts = window.location.pathname.split('/');
                    if (pathParts[1] === 'super-admin') {
                        window.location.href = '/super-admin/change-password';
                    } else {
                        const orgSlug = pathParts.length > 1 && pathParts[1] ? pathParts[1] : 'super-admin';
                        if (orgSlug === 'super-admin') {
                            window.location.href = `/super-admin/change-password`;
                        } else {
                            window.location.href = `/${orgSlug}/change-password`;
                        }
                    }
                }
            }
        }

        // 429 → extract Retry-After
        if (resp.status === 429) {
            const ra = resp.headers.get("Retry-After");
            retryAfter = ra ? parseInt(ra, 10) : undefined;
            rawDetail = `Too many requests. Please wait ${retryAfter || "a few"} seconds.`;
        }

        const detail = friendlyMessage(resp.status, rawDetail);
        const method = options.method || "GET";
        logger.warn("API error response", { method, path, status: resp.status, detail });

        throw new ApiError({ status: resp.status, detail, path, method, retryAfter });
    }

    // 204 No Content
    if (resp.status === 204) {
        return {} as T;
    }

    return resp.json() as Promise<T>;
}

export const api = {
    // ── Auth ─────────────────────────────────────────────────────
    getPlivoWebRTCToken(): Promise<{ username: string; password: string }> {
        return request<{ username: string; password: string }>("/plivo/webrtc/token", {
            method: "GET",
        });
    },

    // ── Call Logs & Analytics ────────────────────────────────────────────────────────

    logCall(data: any): Promise<any> {
        return request("/calls/save", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getCallLogs(params?: { queue_id?: string; staff_id?: string; search?: string; page?: number; limit?: number }): Promise<PaginatedCallLogsResponse> {
        const queryParams = new URLSearchParams();
        if (params?.queue_id) queryParams.append("queue_id", params.queue_id);
        if (params?.staff_id) queryParams.append("staff_id", params.staff_id);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        const q = queryParams.toString();
        return request<PaginatedCallLogsResponse>(`/calls/logs${q ? `?${q}` : ""}`);
    },

    getCallLogsOverview(queue_id?: string): Promise<CallLogsOverviewResponse> {
        const q = queue_id ? `?queue_id=${queue_id}` : "";
        return request<CallLogsOverviewResponse>(`/calls/overview${q}`);
    },

    login(data: LoginRequest): Promise<TokenResponse> {
        return request<TokenResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    changeFirstPassword(data: ChangeFirstPasswordRequest): Promise<TokenResponse> {
        return request<TokenResponse>("/auth/change-first-password", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    requestForgotPasswordOtp(data: { email: string; organization_slug?: string }): Promise<{ message: string }> {
        return request<{ message: string }>("/auth/forgot-password-otp", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    resetPasswordWithOtp(data: { email: string; otp: string; new_password: string; organization_slug?: string }): Promise<{ message: string }> {
        return request<{ message: string }>("/auth/reset-password-with-otp", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },


    // ── TV Pairing ────────────────────────────────────────────────
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

    // ── Analytics ────────────────────────────────────────────────
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

    // ── Messages ─────────────────────────────────────────────────
    getMessages(): Promise<MessageResponse[]> {
        return request<MessageResponse[]>("/messages")
            .catch(() => [] as MessageResponse[]);
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

    // ── Sessions ─────────────────────────────────────────────────
    listQueueSessions(queueId: string, limit?: number, offset?: number, date?: string): Promise<PaginatedSessionResponse> {
        const ps = new URLSearchParams();
        if (limit != null) ps.append("limit", String(limit));
        if (offset != null) ps.append("offset", String(offset));
        if (date && date.trim()) ps.append("date", date.trim());
        return request<PaginatedSessionResponse>(`/queues/${queueId}/sessions${ps.toString() ? `?${ps}` : ""}`);
    },

    createQueueSession(queueId: string, data: { session_date: string; title?: string }): Promise<SessionResponse> {
        return request<SessionResponse>(`/queues/${queueId}/sessions`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getActiveSession(queueId: string): Promise<SessionResponse> {
        return request<SessionResponse>(`/queues/${queueId}/active-session`);
    },

    getSession(sessionId: string): Promise<SessionResponse> {
        return request<SessionResponse>(`/sessions/${sessionId}`);
    },

    updateSession(sessionId: string, data: { title: string }): Promise<void> {
        return request<void>(`/sessions/${sessionId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    deleteSession(sessionId: string): Promise<void> {
        return request<void>(`/sessions/${sessionId}`, {
            method: "DELETE",
        });
    },



    // ── Queues ───────────────────────────────────────────────────
    listQueues(): Promise<QueueResponse[]> {
        return request<QueueResponse[]>("/queues")
            .catch(() => [] as QueueResponse[]);
    },

    getQueue(queueId: string): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}`);
    },

    createQueue(data: QueueCreate): Promise<QueueResponse> {
        return request<QueueResponse>("/queues", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateQueue(queueId: string, data: Partial<QueueCreate>): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    toggleQueue(queueId: string, isActive: boolean): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/active?is_active=${isActive}`, {
            method: "PATCH",
        });
    },

    toggleQueuePaused(queueId: string, isPaused: boolean): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/paused?is_paused=${isPaused}`, {
            method: "PATCH",
        });
    },

    updateQueueAnnouncement(queueId: string, announcement: string): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/announcement`, {
            method: "PATCH",
            body: JSON.stringify({ announcement }),
        });
    },

    deleteQueue(queueId: string): Promise<void> {
        return request<void>(`/queues/${queueId}`, {
            method: "DELETE",
        });
    },



    listTrashQueues(): Promise<QueueResponse[]> {
        return request<QueueResponse[]>("/queues/trash");
    },

    restoreQueue(queueId: string): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/restore`, {
            method: "POST",
        });
    },

    listQueueTokens(queueId: string): Promise<TokenDetail[]> {
        return request<TokenDetail[]>(`/queues/${queueId}/tokens`);
    },

    // ── Token operations ─────────────────────────────────────────
    joinQueue(queueId: string, data: JoinRequest): Promise<JoinResponse> {
        return request<JoinResponse>(`/queues/${queueId}/tokens`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    adminJoin(queueId: string, data: JoinRequest): Promise<JoinResponse> {
        return request<JoinResponse>(`/queues/${queueId}/admin-join`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    serveSpecificToken(queueId: string, tokenNumber: number, lineNumber?: number): Promise<NextResponse> {
        let url = `/queues/${queueId}/serve/${tokenNumber}`;
        if (lineNumber !== undefined) {
            url += `?line_number=${lineNumber}`;
        }
        return request<NextResponse>(url, {
            method: "POST",
        });
    },

    getPublicToken(tokenId: string): Promise<TokenRestoreResponse> {
        return request<TokenRestoreResponse>(`/tokens/${tokenId}`);
    },

    callNext(queueId: string, action: "done" | "skipped" = "done", line_number?: number): Promise<NextResponse | NoTokenResponse> {
        let url = `/queues/${queueId}/next?action=${action}`;
        if (line_number !== undefined) {
            url += `&line_number=${line_number}`;
        }
        return request<NextResponse | NoTokenResponse>(url, {
            method: "POST",
        });
    },

    clearLine(queueId: string, line_number: number): Promise<any> {
        return request(`/queues/${queueId}/clear-line?line_number=${line_number}`, {
            method: "POST",
        });
    },

    shareToken(queueId: string, tokenNumber: number, lineNumber: number): Promise<TokenResponse> {
        return request<TokenResponse>(`/queues/${queueId}/share-token?token_number=${tokenNumber}&line_number=${lineNumber}`, {
            method: "POST",
        });
    },

    removeSharedToken(queueId: string, lineNumber: number): Promise<any> {
        return request(`/queues/${queueId}/lines/${lineNumber}/remove-shared`, {
            method: "POST",
        });
    },


    getToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}`);
    },

    restoreToken(tokenId: string): Promise<TokenRestoreResponse> {
        return request<TokenRestoreResponse>(`/tokens/${tokenId}`);
    },

    skipToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/skip`, {
            method: "PATCH",
        });
    },

    completeToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/done`, {
            method: "PATCH",
        });
    },

    removeToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/remove`, {
            method: "PATCH",
        });
    },

    undoRemoveToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/undo_remove`, {
            method: "PATCH",
        });
    },

    cancelToken(tokenId: string): Promise<{ status: string; token_number: number }> {
        return request<{ status: string; token_number: number }>(`/tokens/${tokenId}/cancel`, {
            method: "POST",
        });
    },

    // ── Health ───────────────────────────────────────────────────
    health(): Promise<HealthResponse> {
        return request<HealthResponse>("/health");
    },

    // ── Staff Management ─────────────────────────────
    listStaff(params: StaffListParams = {}): Promise<PaginatedStaffResponse> {
        const qs = new URLSearchParams();
        if (params.search) qs.set("search", params.search);
        if (params.is_active != null) qs.set("is_active", String(params.is_active));
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));
        if (params.sort_order) qs.set("sort_order", params.sort_order);
        const q = qs.toString();
        return request<PaginatedStaffResponse>(`/staff${q ? `?${q}` : ""}`);
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
            method: "DELETE",
        });
    },

    deleteStaff(staffId: string): Promise<void> {
        return request<void>(`/staff/${staffId}/hard`, {
            method: "DELETE",
        });
    },

    // ── Super Admin ───────────────────────────────────
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
    getOrgAnalytics(timeframe: "daily" | "weekly" | "monthly" = "daily", is_test: boolean = false): Promise<OrgAnalyticsResponse> {
        return request<OrgAnalyticsResponse>(`/super-admin/stats/organizations?timeframe=${timeframe}&is_test=${is_test}`);
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

    // ── Parent Organizations ─────────────────────────────────────────
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

    getParentOrganization(id: string): Promise<ParentOrganization> {
        return request<ParentOrganization>(`/parent-organizations/${id}`);
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

    // ── Branch Backups ────────────────────────────────────────────────
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

    // ── Org Admin Branch Backups ────────────────────────────────────────────────
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

    // ── Organization Admin Dashboard ──────────────────────────────────
    getOrgAdminDashboard: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<any>(`/organization-admin/dashboard${query}`);
    },
    getOrgAdminBranchesOverview: () => {
        return request<any[]>("/organization-admin/branches");
    },
    getOrgAdminBranchSummary: (orgId: string) => {
        return request<any>(`/organization-admin/branch/${orgId}/summary`);
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
    getOrgAdminSessions: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<any[]>(`/organization-admin/monitoring/sessions${query}`);
    },
    getOrgAdminQueues: (branchId?: string) => {
        const query = branchId ? `?branch_id=${branchId}` : '';
        return request<any[]>(`/organization-admin/monitoring/queues${query}`);
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

    // ── Phase 4: Enterprise Operations ──────────────────────────────────
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
    triggerOrgAdminExport: (data: any) => {
        return request<any>("/organization-admin/exports", {
            method: "POST",
            body: JSON.stringify(data),
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
    globalOrgAdminSearch: (query: string) => {
        return request<any[]>(`/organization-admin/search?q=${encodeURIComponent(query)}`);
    },
    getOrgAdminHealth: () => {
        return request<any>("/organization-admin/health");
    },
    getOrgAdminBranchOperations: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}`);
    },
    updateOrgAdminBranchStatus: (branchId: string, isActive: boolean) => {
        return request<any>(`/organization-admin/operations/${branchId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: isActive }),
        });
    },
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

    // ── Enterprise Branch Details (Operations Center) ───────────
    getBranchDashboard: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}/dashboard`);
    },
    getBranchSummary: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}/summary`);
    },
    getBranchPerformance: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}/performance`);
    },
    getBranchQueuesOverview: (branchId: string) => {
        return request<any[]>(`/organization-admin/operations/${branchId}/queues`);
    },
    getBranchSessionsOverview: (branchId: string) => {
        return request<any[]>(`/organization-admin/operations/${branchId}/sessions`);
    },
    getBranchStaffOverview: (branchId: string) => {
        return request<any[]>(`/organization-admin/operations/${branchId}/staff`);
    },
    getBranchAdminsOverview: (branchId: string) => {
        return request<any[]>(`/organization-admin/operations/${branchId}/admins`);
    },
    getBranchWhatsAppStats: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}/whatsapp`);
    },
    getBranchHealth: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}/health`);
    },
    getBranchTimeline: (branchId: string) => {
        return request<any[]>(`/organization-admin/operations/${branchId}/timeline`);
    },
    getBranchAlerts: (branchId: string) => {
        return request<any[]>(`/organization-admin/operations/${branchId}/alerts`);
    },
    getBranchContactDetails: (branchId: string) => {
        return request<any>(`/organization-admin/operations/${branchId}/contact`);
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
    deleteBranch: (id: string) => {
        return request<any>(`/organization-admin/branches/${id}`, {
            method: "DELETE",
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

    // ── Organization Settings ────────────────────────────────────────

    getMyProfile(): Promise<User> {
        return request<User>("/users/me");
    },

    sendHeartbeat(): Promise<{ status: string }> {
        return request<{ status: string }>("/users/me/heartbeat", {
            method: "POST"
        });
    },

    updateMyProfile(data: { first_name?: string, last_name?: string }): Promise<User> {
        return request<User>("/users/me", {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    getOrganizationSettings(): Promise<OrganizationSettingsResponse> {
        return request<OrganizationSettingsResponse>("/organization/settings");
    },

    updateOrganizationSettings(data: OrganizationSettingsUpdate): Promise<OrganizationSettingsResponse> {
        return request<OrganizationSettingsResponse>("/organization/settings", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    uploadOrganizationLogo(file: File): Promise<OrganizationSettingsResponse> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_DIMENSION = 512;
                    let width = img.width;
                    let height = img.height;

                    if (width > height && width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    } else if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Compress using webp which supports transparency
                        const base64_data = canvas.toDataURL("image/webp", 0.8);

                        // Replace extension with webp if possible
                        const filename = file.name.replace(/\.[^/.]+$/, "") + ".webp";

                        request<OrganizationSettingsResponse>("/organization/settings/logo", {
                            method: "POST",
                            body: JSON.stringify({
                                filename: filename,
                                base64_data: base64_data
                            }),
                        }).then(resolve).catch(reject);
                    } else {
                        reject(new Error("Could not get canvas context"));
                    }
                };
                img.onerror = () => reject(new Error("Failed to load image for compression"));
                if (event.target?.result) {
                    img.src = event.target.result as string;
                }
            };
            reader.onerror = error => reject(error);
        });
    },

    requestPasswordChangeOtp(data: RequestOtpRequest): Promise<SuccessResponse> {
        return request<SuccessResponse>("/organization/request-password-change-otp", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
    changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
        return request("/organization/change-password", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getSupportContact(): Promise<{ support_email: string; support_phone: string }> {
        return request<{ support_email: string; support_phone: string }>("/organization/support-contact");
    },

    resetOrgPassword(orgId: string, data: ResetPasswordRequest): Promise<SuccessResponse> {
        return request<SuccessResponse>(`/super-admin/organizations/${orgId}/reset-password`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // System
    getActiveSystemAnnouncements(): Promise<SystemAnnouncementDetail[]> {
        return request<SystemAnnouncementDetail[]>("/system/system-announcements/active")
            .catch(() => [] as SystemAnnouncementDetail[]);
    },

    // Global User Management
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
    // ── WhatsApp: Super Admin ─────────────────────────────────────
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
    getWhatsAppMessages(limit = 50): Promise<PaginatedWhatsAppMessages> {
        return request<PaginatedWhatsAppMessages>(`/whatsapp/messages?limit=${limit}`);
    },
    getWhatsAppTokenStatus(tokenId: string): Promise<WhatsAppMessage[]> {
        return request<WhatsAppMessage[]>(`/whatsapp/token/${tokenId}/status`);
    },

    // ── WhatsApp: Org Admin ───────────────────────────────────────
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

    // ── Bare-Metal Backups ──────────────────────────────────────────
    getBackups(): Promise<{ items: { filename: string; size_mb: number; created_at: string }[] }> {
        return request("/super-admin/backups");
    },
    restoreBackup(filename: string): Promise<SuccessResponse> {
        return request("/super-admin/backups/restore", {
            method: "POST",
            body: JSON.stringify({ filename })
        });
    },

    // ── Public Tracking ───────────────────────────────────────────
    getTrackingInfo(trackingId: string): Promise<TrackingResponse> {
        return request<TrackingResponse>(`/track/${trackingId}`);
    },
    leaveQueue(trackingId: string): Promise<{ status: string; token_number: number }> {
        return request(`/track/${trackingId}`, { method: "DELETE" });
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
        return request<OrganizationAnnouncement[]>("/organization/announcements/active")
            .catch(() => [] as OrganizationAnnouncement[]);
    },
} as const;


// ==========================================
// Organization Exports APIs
// ==========================================


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

export const getSystemTime = async (): Promise<{ server_time: number }> => {
    const response = await fetch(`${config.apiBaseUrl}/system/time`);
    if (!response.ok) throw new Error('Failed to fetch system time');
    return response.json();
};

export const getQueueQrConfig = async (queueId: string): Promise<{ qr_secret_seed: string; interval: number }> => {
    const response = await fetch(`${config.apiBaseUrl}/queues/${queueId}/qr-config`);
    if (!response.ok) throw new Error('Failed to fetch QR config');
    return response.json();
};

