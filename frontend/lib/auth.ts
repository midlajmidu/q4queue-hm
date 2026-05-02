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

// ── In-memory token (primary) ────────────────────────────────────
let _accessToken: string | null = null;

const STORAGE_KEY = "fc_access_token";

/**
 * Store the access token.
 * Primary: in-memory. Backup: localStorage for cross-session persistence.
 */
export function setToken(token: string): void {
    _accessToken = token;
    console.log("[auth.ts] setToken called. Saving to localStorage.");
    try {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, token);
            console.log("[auth.ts] Token saved to localStorage successfully.");
        }
    } catch {
        // SSR or storage unavailable — in-memory only
    }
}

/**
 * Retrieve the access token.
 * Falls back to localStorage if in-memory is empty (after page refresh or browser restart).
 */
export function getToken(): string | null {
    if (_accessToken) {
        console.log("[auth.ts] getToken: returning in-memory _accessToken.");
        return _accessToken;
    }
    try {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(STORAGE_KEY);
            console.log("[auth.ts] getToken: localStorage.getItem returned", stored ? "token" : "null");
            if (stored) {
                _accessToken = stored;
                return stored;
            }
        }
    } catch (e) {
        console.error("[auth.ts] getToken error accessing localStorage:", e);
    }
    return null;
}

/**
 * Clear the access token (logout).
 */
export function removeToken(): void {
    _accessToken = null;
    try {
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // SSR or storage unavailable
    }
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
