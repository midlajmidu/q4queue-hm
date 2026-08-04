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
    if (path.startsWith("/organization-admin") || path.startsWith("/org-admin") || path === "/organization-login") return "org_admin";
    return "staff";
}

/**
 * Store the access token.
 * Primary: in-memory. Backup: sessionStorage for single-tab persistence (survives page refresh).
 */
export function setToken(token: string, explicitType?: TokenType): void {
    let type = explicitType;
    if (!type) {
        const payload = decodeToken(token);
        if (payload) {
            if (payload.role === "super_admin") type = "super_admin";
            else if (payload.role === "organization_admin") type = "org_admin";
            else type = "staff";
        } else {
            type = getTokenTypeFromPath();
        }
    }
    
    const finalType = type as TokenType;
    _tokens[finalType] = token;
    if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEYS[finalType], token);
    }
    console.log(`[auth.ts] setToken called for type ${finalType}.`);
}

/**
 * Retrieve the access token.
 */
export function getToken(explicitType?: TokenType): string | null {
    const type = explicitType || getTokenTypeFromPath();
    if (_tokens[type]) return _tokens[type];
    
    if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem(STORAGE_KEYS[type]);
        if (stored) {
            _tokens[type] = stored; // Restore to memory
            return stored;
        }
    }
    return null;
}

export function getAllTokens(): Record<TokenType, string | null> {
    const tokens = { ..._tokens };
    if (typeof window !== "undefined") {
        if (!tokens.staff) tokens.staff = sessionStorage.getItem(STORAGE_KEYS.staff);
        if (!tokens.org_admin) tokens.org_admin = sessionStorage.getItem(STORAGE_KEYS.org_admin);
        if (!tokens.super_admin) tokens.super_admin = sessionStorage.getItem(STORAGE_KEYS.super_admin);
    }
    return tokens;
}

export function setAllTokens(tokens: Record<TokenType, string | null>): void {
    _tokens.staff = tokens.staff;
    _tokens.org_admin = tokens.org_admin;
    _tokens.super_admin = tokens.super_admin;
    
    if (typeof window !== "undefined") {
        if (tokens.staff) sessionStorage.setItem(STORAGE_KEYS.staff, tokens.staff);
        else sessionStorage.removeItem(STORAGE_KEYS.staff);
        
        if (tokens.org_admin) sessionStorage.setItem(STORAGE_KEYS.org_admin, tokens.org_admin);
        else sessionStorage.removeItem(STORAGE_KEYS.org_admin);
        
        if (tokens.super_admin) sessionStorage.setItem(STORAGE_KEYS.super_admin, tokens.super_admin);
        else sessionStorage.removeItem(STORAGE_KEYS.super_admin);
    }
}

/**
 * Clear the access token (logout).
 */
export function removeToken(explicitType?: TokenType): void {
    const type = explicitType || getTokenTypeFromPath();
    _tokens[type] = null;
    if (typeof window !== "undefined") {
        sessionStorage.removeItem(STORAGE_KEYS[type]);
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
