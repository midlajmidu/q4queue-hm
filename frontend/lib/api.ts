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
    SuperAdminLoginRequest,
    TokenDetail,
    TokenResponse,
    PublicTokenResponse,
    TokenRestoreResponse,
    OrganizationSettingsResponse,
    OrganizationSettingsUpdate,
    ChangePasswordRequest,
    ResetPasswordRequest,
    SuccessResponse,
    PaginatedHistoryResponse,
    PaginatedSessionResponse,
    PaginatedQueueResponse,
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
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
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
                const isSuperAdminPath = window.location.pathname.startsWith("/super-admin");
                const isAlreadyonLogin = window.location.pathname.includes("/login");

                if (!isAlreadyonLogin) {
                    window.location.href = isSuperAdminPath ? "/super-admin/login" : "/login";
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

    // ── Analytics ────────────────────────────────────────────────
    getOverview(sessionId?: string, queueId?: string, recentLimit?: number, recentOffset?: number, init?: RequestInit): Promise<AnalyticsOverview> {
        const params = new URLSearchParams();
        if (sessionId) params.append("session_id", sessionId);
        if (queueId) params.append("queue_id", queueId);
        if (recentLimit != null) params.append("recent_limit", String(recentLimit));
        if (recentOffset != null) params.append("recent_offset", String(recentOffset));

        const qs = params.toString();
        const url = qs ? `/analytics/overview?${qs}` : "/analytics/overview";
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
        return request<PaginatedHistoryResponse>(`/analytics/history${q ? `?${q}` : ""}`);
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

    toggleQueue(queueId: string, isActive: boolean): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/active?is_active=${isActive}`, {
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

    serveSpecificToken(queueId: string, tokenNumber: number): Promise<NextResponse> {
        return request<NextResponse>(`/queues/${queueId}/serve/${tokenNumber}`, {
            method: "POST",
        });
    },

    getPublicToken(queueId: string, tokenNumber: number): Promise<PublicTokenResponse> {
        return request<PublicTokenResponse>(`/queues/${queueId}/tokens/${tokenNumber}`);
    },

    callNext(queueId: string, action: "done" | "skipped" = "done"): Promise<NextResponse | NoTokenResponse> {
        return request<NextResponse | NoTokenResponse>(`/queues/${queueId}/next?action=${action}`, {
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

    listOrganizations(params: ListOrgsParams = {}): Promise<PaginatedOrgsResponse> {
        const qs = new URLSearchParams();
        if (params.search) qs.set("search", params.search);
        if (params.limit != null) qs.set("limit", String(params.limit));
        if (params.offset != null) qs.set("offset", String(params.offset));
        if (params.sort_by) qs.set("sort_by", params.sort_by);
        if (params.sort_order) qs.set("sort_order", params.sort_order);
        const q = qs.toString();
        return request<PaginatedOrgsResponse>(`/super-admin/organizations${q ? `?${q}` : ""}`);
    },

    getOrganizationDetail(orgId: string): Promise<OrgDetailExtended> {
        return request<OrgDetailExtended>(`/super-admin/organizations/${orgId}`);
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

    // ── Organization Settings ────────────────────────────────────────

    getOrganizationSettings(): Promise<OrganizationSettingsResponse> {
        return request<OrganizationSettingsResponse>("/organization/settings");
    },

    updateOrganizationSettings(data: OrganizationSettingsUpdate): Promise<OrganizationSettingsResponse> {
        return request<OrganizationSettingsResponse>("/organization/settings", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    changePassword(data: ChangePasswordRequest): Promise<SuccessResponse> {
        return request<SuccessResponse>("/organization/change-password", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    resetOrgPassword(orgId: string, data: ResetPasswordRequest): Promise<SuccessResponse> {
        return request<SuccessResponse>(`/super-admin/organizations/${orgId}/reset-password`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
} as const;
