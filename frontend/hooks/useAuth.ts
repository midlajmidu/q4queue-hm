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
    login: (credentials: LoginRequest) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
    isImpersonating: boolean;
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
        setIsImpersonating(!!getSuperAdminToken());
        setIsHydrated(true);
    }, []);

    // Periodically check token validity — auto-logout if expired mid-session
    useEffect(() => {
        const interval = setInterval(() => {
            // Don't redirect if already on /login (prevents loops)
            if (typeof window !== "undefined" && window.location.pathname.startsWith("/login")) return;
            if (isAuthed && !checkAuth()) {
                removeToken();
                setIsAuthed(false);
                setUser(null);
                router.replace("/login");
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
                setToken(response.access_token);
                setIsAuthed(true);
                const currentUser = getCurrentUser();
                setUser(currentUser);
                
                if (response.force_password_change) {
                    if (!currentUser || !currentUser.org_slug) {
                        router.push('/super-admin/change-password');
                    } else {
                        router.push(`/${currentUser.org_slug}/change-password`);
                    }
                } else if (currentUser && currentUser.org_slug) {
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
        removeSuperAdminToken();
        setIsAuthed(false);
        setUser(null);
        setIsImpersonating(false);
        router.push("/login");
    }, [router]);

    const stopImpersonating = useCallback(() => {
        const saToken = getSuperAdminToken();
        if (saToken) {
            const isAppSubdomain = window.location.hostname.startsWith("app.");
            // Use .host to preserve the port (e.g. localhost:3000)
            const rootHost = isAppSubdomain ? window.location.host.replace("app.", "") : window.location.host;
            const protocol = window.location.protocol;
            
            // Remove from current subdomain
            removeToken();
            removeSuperAdminToken();
            
            // Navigate to root domain with token in fragment to restore
            window.location.href = `${protocol}//${rootHost}/super-admin#token=${saToken}`;
        }
    }, []);

    return {
        isAuthenticated: isAuthed,
        isHydrated,
        user,
        login,
        logout,
        isLoading,
        error,
        isImpersonating,
        stopImpersonating,
    };
}
