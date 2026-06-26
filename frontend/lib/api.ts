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
} from "@/types/api";

// ── Error class ──────────────────────────────────────────────────
export class ApiError extends Error {
    status: number;
    detail: string;
    retryAfter?: number;

    constructor(resp: ApiErrorResponse) {
        super(resp.detail);
        this.name = "ApiError";
        this.status = resp.status;
        this.detail = resp.detail;
        this.retryAfter = resp.retryAfter;
    }
}

// ── User-friendly error messages ─────────────────────────────────
function friendlyMessage(status: number, rawDetail: string): string {
    switch (status) {
        case 401: return "Session expired. Please sign in again.";
        case 403: return "Access denied. You don't have permission for this action.";
        case 404: return "The requested resource was not found.";
        case 409: return rawDetail || "This action conflicts with the current state.";
        case 422: return rawDetail || "Invalid input. Please check your data.";
        case 429: return rawDetail; // Handled separately with retry-after
        case 500: return "A temporary server issue occurred. Please try again.";
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
        const pathParts = window.location.pathname.split('/');
        // Path structure: /[orgSlug]/dashboard
        if (pathParts.length >= 2) {
            const potentialSlug = pathParts[1];
            // Exclude known non-org prefixes
            const excludedPrefixes = ['super-admin', 'organization-admin', 'login', 'get-started', 'auth'];
            if (!excludedPrefixes.includes(potentialSlug)) {
                headers.set("X-Org-Slug", potentialSlug);
            }
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
                const path = window.location.pathname;
                const isSuperAdminPath = path.startsWith("/super-admin");
                const isOrgAdminPath = path.startsWith("/organization-admin");
                const isAlreadyonLogin = path === "/login" || path.endsWith("/login") || path === "/organization-login";

                if (!isAlreadyonLogin) {
                    if (isOrgAdminPath) {
                        window.location.href = "/organization-login";
                    } else {
                        window.location.href = isSuperAdminPath ? "/super-admin/login" : "/login";
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
        logger.warn("API error response", { path, status: resp.status, detail });

        throw new ApiError({ status: resp.status, detail, retryAfter });
    }

    // 204 No Content
    if (resp.status === 204) {
        return {} as T;
    }

    return resp.json() as Promise<T>;
}

// ── Public API methods ───────────────────────────────────────────
export const api = {
    // ── Auth ─────────────────────────────────────────────────────
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

    // ── Analytics ────────────────────────────────────────────────
    getOverview(params: { sessionId?: string; queueId?: string; startDate?: string; endDate?: string; recentLimit?: number; recentOffset?: number } = {}, init?: RequestInit): Promise<AnalyticsOverview> {
        const qs = new URLSearchParams();
        if (params.sessionId) qs.set("session_id", params.sessionId);
        if (params.queueId) qs.set("queue_id", params.queueId);
        if (params.startDate) qs.set("start_date", params.startDate);
        if (params.endDate) qs.set("end_date", params.endDate);
        if (params.recentLimit != null) qs.set("recent_limit", String(params.recentLimit));
        if (params.recentOffset != null) qs.set("recent_offset", String(params.recentOffset));

        const qsStr = qs.toString();
        const url = qsStr ? `/stats/overview?${qsStr}` : "/stats/overview";
        return request<AnalyticsOverview>(url, init);
    },

    getHistory(params: { sessionId?: string; queueId?: string; search?: string; status?: string; limit?: number; offset?: number } = {}): Promise<PaginatedHistoryResponse> {
        const qs = new URLSearchParams();
        if (params.sessionId) qs.set("session_id", params.sessionId);
        if (params.queueId) qs.set("queue_id", params.queueId);
        if (params.search) qs.set("search", params.search);
        if (params.status) qs.set("status", params.status);
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));

        const q = qs.toString();
        return request<PaginatedHistoryResponse>(`/stats/history${q ? `?${q}` : ""}`);
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
        return request<MessageResponse[]>("/messages");
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
    listSessions(limit?: number, offset?: number, sessionDate?: string): Promise<PaginatedSessionResponse> {
        const ps = new URLSearchParams();
        if (limit != null) ps.append("limit", String(limit));
        if (offset != null) ps.append("offset", String(offset));
        if (sessionDate) ps.append("session_date", sessionDate);
        return request<PaginatedSessionResponse>(`/sessions${ps.toString() ? `?${ps}` : ""}`);
    },

    getSession(sessionId: string): Promise<SessionResponse> {
        return request<SessionResponse>(`/sessions/${sessionId}`);
    },

    createSession(data: SessionCreate): Promise<SessionResponse> {
        return request<SessionResponse>("/sessions", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    deleteSession(sessionId: string): Promise<void> {
        return request<void>(`/sessions/${sessionId}`, {
            method: "DELETE",
        });
    },

    // ── Queues (session-scoped) ──────────────────────────────────
    listSessionQueues(sessionId: string, limit?: number, offset?: number, name?: string): Promise<PaginatedQueueResponse> {
        const ps = new URLSearchParams();
        if (limit != null) ps.append("limit", String(limit));
        if (offset != null) ps.append("offset", String(offset));
        if (name) ps.append("name", name);
        return request<PaginatedQueueResponse>(`/sessions/${sessionId}/queues${ps.toString() ? `?${ps}` : ""}`);
    },

    createSessionQueue(sessionId: string, data: QueueCreate): Promise<QueueResponse> {
        return request<QueueResponse>(`/sessions/${sessionId}/queues`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // ── Queues ───────────────────────────────────────────────────
    listQueues(): Promise<QueueResponse[]> {
        return request<QueueResponse[]>("/queues");
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

    resetQueue(queueId: string): Promise<void> {
        return request<void>(`/queues/${queueId}/reset`, {
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
        return request<PlatformAnalytics>("/super-admin/stats");
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

    impersonateOrganization(orgId: string): Promise<TokenResponse> {
        return request<TokenResponse>(`/super-admin/organizations/${orgId}/impersonate`, {
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
    createBranchAdmin: (id: string, data: BranchAdminCreateRequest) => {
        return request<BranchAdminResponse>(`/organization-admin/branches/${id}/admins`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
    resetBranchAdminPassword: (id: string, adminId: string, data: BranchAdminResetPasswordRequest) => {
        return request<{message: string}>(`/organization-admin/branches/${id}/reset-password?admin_id=${adminId}`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // ── Organization Settings ────────────────────────────────────────

    getMyProfile(): Promise<User> {
        return request<User>("/users/me");
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
            reader.onload = () => {
                const base64_data = reader.result as string;
                request<OrganizationSettingsResponse>("/organization/settings/logo", {
                    method: "POST",
                    body: JSON.stringify({
                        filename: file.name,
                        base64_data: base64_data
                    }),
                }).then(resolve).catch(reject);
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
        return request<SystemAnnouncementDetail[]>("/system/system-announcements/active");
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
    getWhatsAppGlobalStats(): Promise<WhatsAppGlobalStats> {
        return request<WhatsAppGlobalStats>("/whatsapp/stats");
    },
    getWhatsAppDailyChart(days = 30): Promise<WhatsAppDailyChartItem[]> {
        return request<WhatsAppDailyChartItem[]>(`/whatsapp/stats/daily?days=${days}`);
    },
    getWhatsAppStatsByOrg(limit = 20): Promise<WhatsAppOrgStats[]> {
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
    getOrgWhatsAppStats(): Promise<WhatsAppOrgStats> {
        return request<WhatsAppOrgStats>("/whatsapp/analytics/overview");
    },
    getOrgWhatsAppEventStats(): Promise<WhatsAppEventStat[]> {
        return request<WhatsAppEventStat[]>("/whatsapp/analytics/events");
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
        return request<OrganizationAnnouncement[]>("/organization/announcements/active");
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
