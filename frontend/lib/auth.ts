/**
 * lib/auth.ts
 * Authentication token management.
 *
 * Strategy:
 *   - Token stored in memory for fast access.
 *   - Persisted to localStorage to survive tab closures and browser restarts.
 *   - JWT decoded client-side for display only (never trusted for auth).
 */

import type { JwtPayload } from "@/types/api";

export type TokenType = "staff" | "org_admin" | "super_admin";

const STORAGE_KEYS: Record<TokenType, string> = {
    staff: "fc_access_token",
    org_admin: "fc_org_access_token",
    super_admin: "fc_sa_access_token",
};

// ── In-memory tokens ────────────────────────────────────
const _tokens: Record<TokenType, string | null> = {
    staff: null,
    org_admin: null,
    super_admin: null,
};

/**
 * Infer the intended token type based on the current URL path.
 */
export function getTokenTypeFromPath(): TokenType {
    if (typeof window === "undefined") return "staff";
    const path = window.location.pathname;
    
    // Super Admin impersonating a branch acts as a staff session
    if (path.startsWith("/super-admin") && path.includes("/dashboard")) return "staff";
    
    if (path.startsWith("/super-admin")) return "super_admin";
    if (path.startsWith("/organization-admin") || path === "/organization-login") return "org_admin";
    return "staff";
}

/**
 * Store the access token.
 * Primary: in-memory. Backup: localStorage for cross-session persistence.
 */
export function setToken(token: string, explicitType?: TokenType): void {
    const type = explicitType || getTokenTypeFromPath();
    _tokens[type] = token;
    console.log(`[auth.ts] setToken called for type ${type}.`);
    try {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS[type], token);
        }
    } catch {
        // SSR or storage unavailable
    }
}

/**
 * Retrieve the access token.
 * Falls back to localStorage if in-memory is empty (after page refresh or browser restart).
 */
export function getToken(explicitType?: TokenType): string | null {
    const type = explicitType || getTokenTypeFromPath();
    
    // Primary check
    if (_tokens[type]) return _tokens[type];
    
    let stored: string | null = null;
    try {
        if (typeof window !== "undefined") {
            stored = localStorage.getItem(STORAGE_KEYS[type]);
            if (stored) {
                _tokens[type] = stored;
                return stored;
            }
        }
    } catch (e) {
        console.error(`[auth.ts] getToken error accessing localStorage for ${type}:`, e);
    }
    
    // Fallback: If looking for staff token and it's missing, try to use the org_admin token
    // This allows Organization Admins to view branch dashboards without a separate login
    if (type === "staff") {
        if (_tokens["org_admin"]) return _tokens["org_admin"];
        try {
            if (typeof window !== "undefined") {
                const orgStored = localStorage.getItem(STORAGE_KEYS["org_admin"]);
                if (orgStored) {
                    _tokens["org_admin"] = orgStored;
                    return orgStored;
                }
            }
        } catch (e) {}
    }

    return null;
}

/**
 * Clear the access token (logout).
 */
export function removeToken(explicitType?: TokenType): void {
    const type = explicitType || getTokenTypeFromPath();
    _tokens[type] = null;
    try {
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS[type]);
        }
    } catch {
        // SSR or storage unavailable
    }
}

// ── Super Admin Impersonation Token ──────────────────────────────
export function setSuperAdminToken(token: string): void {
    setToken(token, "super_admin");
}

export function getSuperAdminToken(): string | null {
    return getToken("super_admin");
}

export function removeSuperAdminToken(): void {
    removeToken("super_admin");
}

/**
 * Check if a valid (non-expired) token exists.
 * Uses a 30-second buffer to account for clock drift between
 * frontend and backend, preventing "Signature has expired" races.
 */
export function isAuthenticated(): boolean {
    const token = getToken();
    if (!token) {
        console.log("[auth.ts] isAuthenticated: No token found");
        return false;
    }

    const payload = decodeToken(token);
    if (!payload) {
        console.log("[auth.ts] isAuthenticated: decodeToken returned null");
        return false;
    }

    // Check expiration with 30-second buffer for clock drift
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now + 30) {
        console.log("[auth.ts] isAuthenticated: Token expired", payload.exp, "<=", now + 30);
        removeToken(); // proactively clear expired token
        return false;
    }
    console.log("[auth.ts] isAuthenticated: Token is valid");
    return true;
}

/**
 * Decode the JWT payload (base64 only — NOT cryptographic validation).
 * Used for display purposes only (user info, role).
 * Returns null on any decode failure.
 */
export function decodeToken(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const payload = JSON.parse(atob(parts[1])) as JwtPayload;

        // Validate required fields exist
        if (!payload.sub || !payload.role || !payload.exp || payload.org_id === undefined || !payload.email) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Get the current user info from the stored token.
 * Returns null if not authenticated.
 */
export function getCurrentUser(): JwtPayload | null {
    const token = getToken();
    if (!token) return null;
    return decodeToken(token);
}
