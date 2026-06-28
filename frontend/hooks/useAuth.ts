/**
 * hooks/useAuth.ts
 * Global authentication hook.
 *
 * Provides:
 *   - isAuthenticated: boolean
 *   - user: decoded JWT payload (display only)
 *   - login(credentials): Promise<void>
 *   - logout(): void
 *   - isLoading: boolean during login
 *   - error: string | null
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
    setToken,
    removeToken,
    isAuthenticated as checkAuth,
    getCurrentUser,
    getSuperAdminToken,
    setSuperAdminToken,
    removeSuperAdminToken,
} from "@/lib/auth";
import type { JwtPayload, LoginRequest } from "@/types/api";

interface UseAuthReturn {
    isAuthenticated: boolean;
    isHydrated: boolean;
    user: JwtPayload | null;
    impersonatorUser: JwtPayload | null;
    login: (credentials: LoginRequest) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
    isImpersonating: boolean;
    isReadOnly: boolean;
    stopImpersonating: () => void;
}

export function useAuth(): UseAuthReturn {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAuthed, setIsAuthed] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [user, setUser] = useState<JwtPayload | null>(null);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [impersonatorUser, setImpersonatorUser] = useState<JwtPayload | null>(null);

    // Hydrate auth state on mount
    useEffect(() => {
        // Check for token in URL fragment (used for cross-subdomain impersonation)
        if (typeof window !== "undefined" && window.location.hash) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const newToken = params.get("token");
            const newSaToken = params.get("saToken");
            
            if (newToken) {
                setToken(newToken);
                if (newSaToken) setSuperAdminToken(newSaToken);
                // Clear the hash without reloading the page
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
        }

        const authed = checkAuth();
        setIsAuthed(authed);
        setUser(authed ? getCurrentUser() : null);
        const saToken = getSuperAdminToken();
        setIsImpersonating(!!saToken);
        if (saToken) {
            try {
                const parts = saToken.split(".");
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1])) as JwtPayload;
                    setImpersonatorUser(payload);
                }
            } catch (e) {}
        }
        setIsHydrated(true);
    }, []);

    // Periodically check token validity — auto-logout if expired mid-session
    useEffect(() => {
        const interval = setInterval(() => {
            // Don't redirect if already on a login page (prevents loops)
            if (typeof window !== "undefined") {
                const path = window.location.pathname;
                if (path === "/login" || path.endsWith("/login") || path === "/organization-login") return;
            }
            if (isAuthed && !checkAuth()) {
                removeToken();
                setIsAuthed(false);
                setUser(null);
                const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                if (currentPath.startsWith("/organization-admin")) {
                    router.replace("/organization-login");
                } else if (currentPath.startsWith("/super-admin")) {
                    router.replace("/super-admin/login");
                } else {
                    router.replace("/login");
                }
            }
        }, 30_000); // check every 30 seconds
        return () => clearInterval(interval);
    }, [isAuthed, router]);

    const login = useCallback(
        async (credentials: LoginRequest) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await api.login(credentials);
                removeSuperAdminToken();
                setToken(response.access_token);
                setIsAuthed(true);
                const currentUser = getCurrentUser();
                setUser(currentUser);
                
                if (response.force_password_change) {
                    if (currentUser && currentUser.role === "organization_admin") {
                        router.push(`/organization-admin/change-password`);
                    } else if (currentUser && (currentUser.role === "admin" || currentUser.role === "branch_admin" || currentUser.role === "staff")) {
                        router.push(`/${currentUser.org_slug}/change-password`);
                    } else if (currentUser && currentUser.role === "super_admin") {
                        router.push('/super-admin/change-password');
                    } else {
                        router.push(`/${currentUser?.org_slug}/change-password`);
                    }
                } else if (currentUser && currentUser.role === "organization_admin") {
                    router.push(`/organization-admin`);
                } else if (currentUser && (currentUser.role === "admin" || currentUser.role === "branch_admin" || currentUser.role === "staff")) {
                    router.push(`/${currentUser.org_slug}/dashboard`);
                } else {
                    router.push("/dashboard");
                }
            } catch (err) {
                if (err instanceof ApiError) {
                    if (err.status === 429) {
                        setError(err.detail);
                    } else if (err.status === 401) {
                        setError("Invalid email, password, or organization.");
                    } else {
                        setError(err.detail);
                    }
                } else {
                    setError("Network error. Please check your connection.");
                }
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [router]
    );

    const logout = useCallback(() => {
        removeToken();
        // removeSuperAdminToken(); // Removed this so logging out of one doesn't clear SA token unnecessarily
        setIsAuthed(false);
        setUser(null);
        setIsImpersonating(false);
        
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        if (currentPath.startsWith("/organization-admin")) {
            router.push("/organization-login");
        } else if (currentPath.startsWith("/super-admin")) {
            router.push("/super-admin/login");
        } else {
            router.push("/login");
        }
    }, [router]);

    const stopImpersonating = useCallback(() => {
        const saToken = getSuperAdminToken();
        if (saToken) {
            const isAppSubdomain = window.location.hostname.startsWith("app.");
            // Use .host to preserve the port (e.g. localhost:3000)
            const rootHost = isAppSubdomain ? window.location.host.replace("app.", "") : window.location.host;
            const protocol = window.location.protocol;
            
            // Decode saToken to check role
            let decodedRole = "super_admin";
            try {
                const parts = saToken.split(".");
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload && payload.role) {
                        decodedRole = payload.role;
                    }
                }
            } catch (e) {
                console.error("Failed to decode saToken:", e);
            }

            // Remove from current subdomain
            removeToken("staff");
            removeToken("org_admin");
            removeSuperAdminToken();
            
            const targetPath = decodedRole === "organization_admin" ? "organization-admin" : "super-admin";
            window.location.href = `${protocol}//${rootHost}/${targetPath}#token=${saToken}`;
        }
    }, []);

    return {
        isAuthenticated: isAuthed,
        isHydrated,
        user,
        impersonatorUser,
        login,
        logout,
        isLoading,
        error,
        isImpersonating,
        isReadOnly: !!(user as any)?.is_read_only || isImpersonating,
        stopImpersonating,
    };
}
