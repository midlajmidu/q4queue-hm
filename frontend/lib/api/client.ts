/**
 * lib/api/client.ts
 * Centralized API client infrastructure — request wrapper, auth interceptors, error handling.
 */

import { config } from "@/lib/config";
import { getToken, removeToken, clearAllAuthTokens } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { ApiErrorResponse } from "@/types/api";

// ── Error class ──────────────────────────────────────────────────
export class ApiError extends Error {
    status: number;
    detail: string;
    path?: string;
    method?: string;
    retryAfter?: number;
    code?: string;
    key?: string;
    limit?: number;
    used?: number;
    isTrial?: boolean;
    isEntitlementLimit?: boolean;

    constructor(resp: ApiErrorResponse & { path?: string; method?: string }) {
        const cleanMsg = resp.detail || "An unexpected error occurred.";
        super(cleanMsg);
        this.name = "ApiError";
        this.status = resp.status;
        this.detail = cleanMsg;
        this.path = resp.path;
        this.method = resp.method;
        this.retryAfter = resp.retryAfter;
        this.code = resp.code;
        this.key = resp.key;
        this.limit = resp.limit;
        this.used = resp.used;
        this.isTrial = resp.is_trial;
        this.isEntitlementLimit =
            resp.code === "entitlement_limit_reached" ||
            /limit reached|trial limit|plan limit|limit of|upgrade your plan|increase your allowance/i.test(cleanMsg);
    }
}

// ── User-friendly error messages ─────────────────────────────────
export function friendlyMessage(status: number, rawDetail: string): string {
    switch (status) {
        case 400: return rawDetail || "Invalid request. Please try again.";
        case 401:
            if (rawDetail === "Invalid credentials" || rawDetail.includes("deactivated")) {
                return rawDetail;
            }
            return "Session expired. Please sign in again.";
        case 403: return rawDetail || "Access denied. You don't have permission for this action.";
        case 404: return rawDetail || "The requested resource was not found.";
        case 409: return rawDetail || "This action conflicts with the current state.";
        case 422: return rawDetail || "Invalid input. Please check your data.";
        case 429: return rawDetail; // Handled separately with retry-after
        case 500: return rawDetail || "A temporary server issue occurred. Please try again.";
        case 502: return "The server is temporarily unreachable. Please try again shortly.";
        case 503: return "The service is temporarily unavailable. Please try again shortly.";
        default: return rawDetail || "An unexpected error occurred.";
    }
}

// Flags to prevent duplicate modal alerts when multiple concurrent requests fail
let isDeactivationAlertShowing = false;
let isSuspensionAlertShowing = false;

// ── Internal fetch wrapper ───────────────────────────────────────
export async function request<T>(
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
        let errorCode: string | undefined;
        let entitlementKey: string | undefined;
        let entitlementLimit: number | undefined;
        let entitlementUsed: number | undefined;
        let isTrial: boolean | undefined;

        try {
            const body = await resp.json();
            // FastAPI 422 returns detail as an array of validation error objects:
            // [{type, loc, msg, input, ctx}, ...]
            // We must extract a string — never pass the raw array to the UI.
            if (Array.isArray(body.detail)) {
                rawDetail = body.detail
                    .map((err: { loc?: string[]; msg?: string }) =>
                        err.loc ? `${err.loc.slice(-1)[0]}: ${err.msg}` : (err.msg ?? "Validation error")
                    )
                    .join("; ");
            } else if (typeof body.detail === "string") {
                rawDetail = body.detail;
            }
            if (body.code) errorCode = body.code;
            if (body.key) entitlementKey = body.key;
            if (body.limit != null) entitlementLimit = body.limit;
            if (body.used != null) entitlementUsed = body.used;
            if (body.is_trial != null) isTrial = body.is_trial;
        } catch {
            // Response body not JSON
        }

        // ── Deactivated Account Interceptor (403 or 401 with deactivated detail) ──
        const isDeactivated =
            (resp.status === 403 || resp.status === 401) &&
            typeof rawDetail === "string" &&
            (rawDetail.toLowerCase().includes("deactivated") || rawDetail.toLowerCase().includes("user account is inactive"));

        if (isDeactivated) {
            clearAllAuthTokens();
            if (typeof window !== "undefined") {
                try {
                    const bc = new BroadcastChannel("auth_sync_channel");
                    bc.postMessage({ type: "LOGOUT" });
                    bc.close();
                } catch { }

                const path = window.location.pathname;
                const isSuperAdminPath = path.startsWith("/super-admin");
                const isOrgAdminPath = path.startsWith("/organization-admin") || path.startsWith("/org-admin");
                const isDashboardPath = path.includes("/dashboard");
                const isPublicPath = path.startsWith("/qr") || path.startsWith("/display") || path.startsWith("/join") || path.startsWith("/track") || path === "/" || path.startsWith("/features") || path.startsWith("/pricing") || path.startsWith("/solutions") || path.startsWith("/industries");
                const isAlreadyonLogin = path === "/login" || path.endsWith("/login") || path === "/organization-login";

                const redirectUrl = isSuperAdminPath
                    ? "/super-admin/login?error=account_deactivated"
                    : isOrgAdminPath
                    ? "/organization-login?error=account_deactivated"
                    : "/login?error=account_deactivated";

                if (!isAlreadyonLogin && !isPublicPath && (isSuperAdminPath || isOrgAdminPath || isDashboardPath)) {
                    if (!isDeactivationAlertShowing) {
                        isDeactivationAlertShowing = true;
                        import("sweetalert2").then(({ default: Swal }) => {
                            Swal.fire({
                                icon: "error",
                                title: "Account Deactivated",
                                text: "Your account has been deactivated by the administrator.",
                                confirmButtonText: "Go to Login",
                                confirmButtonColor: "#2563eb",
                                allowOutsideClick: false,
                                allowEscapeKey: false,
                            }).then(() => {
                                window.location.href = redirectUrl;
                            });
                        }).catch(() => {
                            window.location.href = redirectUrl;
                        });

                        // Fallback auto-redirect after 6 seconds if user doesn't interact
                        setTimeout(() => {
                            window.location.href = redirectUrl;
                        }, 6000);
                    }
                }
            }

            const detail = "Your account has been deactivated by an administrator.";
            const method = options.method || "GET";
            logger.warn("API error response (deactivated)", { method, path, status: resp.status, detail });
            throw new ApiError({ status: resp.status, detail, path, method });
        }

        // ── Suspended Account Interceptor (403 with suspended / subscription not active detail) ──
        const isSuspended =
            resp.status === 403 &&
            typeof rawDetail === "string" &&
            (rawDetail.toLowerCase().includes("suspended") || rawDetail.toLowerCase().includes("subscription is not active"));

        if (isSuspended) {
            clearAllAuthTokens();
            if (typeof window !== "undefined") {
                try {
                    const bc = new BroadcastChannel("auth_sync_channel");
                    bc.postMessage({ type: "LOGOUT" });
                    bc.close();
                } catch { }

                const path = window.location.pathname;
                const isSuperAdminPath = path.startsWith("/super-admin");
                const isOrgAdminPath = path.startsWith("/organization-admin") || path.startsWith("/org-admin");
                const isDashboardPath = path.includes("/dashboard");
                const isPublicPath = path.startsWith("/qr") || path.startsWith("/display") || path.startsWith("/join") || path.startsWith("/track") || path === "/" || path.startsWith("/features") || path.startsWith("/pricing") || path.startsWith("/solutions") || path.startsWith("/industries");
                const isAlreadyonLogin = path === "/login" || path.endsWith("/login") || path === "/organization-login";

                const redirectUrl = isSuperAdminPath
                    ? "/super-admin/login?error=account_suspended"
                    : isOrgAdminPath
                    ? "/organization-login?error=account_suspended"
                    : "/login?error=account_suspended";

                if (!isAlreadyonLogin && !isPublicPath && (isSuperAdminPath || isOrgAdminPath || isDashboardPath)) {
                    if (!isSuspensionAlertShowing) {
                        isSuspensionAlertShowing = true;
                        import("sweetalert2").then(({ default: Swal }) => {
                            Swal.fire({
                                icon: "warning",
                                title: "Account Suspended",
                                text: "This account has been suspended by an administrator. Please contact support at contact@q4queue.com to restore access.",
                                confirmButtonText: "Go to Login",
                                confirmButtonColor: "#2563eb",
                                allowOutsideClick: false,
                                allowEscapeKey: false,
                            }).then(() => {
                                window.location.href = redirectUrl;
                            });
                        }).catch(() => {
                            window.location.href = redirectUrl;
                        });

                        // Fallback auto-redirect after 6 seconds if user doesn't interact
                        setTimeout(() => {
                            window.location.href = redirectUrl;
                        }, 6000);
                    }
                }
            }

            const detail = "This account has been suspended by an administrator. Please contact support at contact@q4queue.com to restore access.";
            const method = options.method || "GET";
            logger.warn("API error response (suspended)", { method, path, status: resp.status, detail });
            throw new ApiError({ status: resp.status, detail, path, method });
        }

        // 401 → auto-logout (unauthorized / session expired)
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
                const isDashboardPath = path.includes("/dashboard");
                const isPublicPath = path.startsWith("/qr") || path.startsWith("/display") || path.startsWith("/join") || path.startsWith("/track") || path === "/" || path.startsWith("/features") || path.startsWith("/pricing") || path.startsWith("/solutions") || path.startsWith("/industries");
                const isAlreadyonLogin = path === "/login" || path.endsWith("/login") || path === "/organization-login";

                if (!isAlreadyonLogin && !isPublicPath && (isSuperAdminPath || isOrgAdminPath || isDashboardPath)) {
                    if (isOrgAdminPath) {
                        window.location.href = "/organization-login";
                    } else {
                        const redirectUrl = isSuperAdminPath ? "/super-admin/login" : "/login";
                        window.location.href = redirectUrl;
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
        // Use logger.info for 5xx to avoid triggering Next.js error overlay
        if (resp.status >= 500) {
            logger.info("API server error", { method, path, status: resp.status, detail });
        } else {
            logger.warn("API error response", { method, path, status: resp.status, detail });
        }

        throw new ApiError({
            status: resp.status,
            detail,
            path,
            method,
            retryAfter,
            code: errorCode,
            key: entitlementKey,
            limit: entitlementLimit,
            used: entitlementUsed,
            is_trial: isTrial,
        });
    }

    // 204 No Content
    if (resp.status === 204) {
        return {} as T;
    }

    return resp.json() as Promise<T>;
}
