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
} from "@/lib/auth";
import type { JwtPayload, LoginRequest } from "@/types/api";

interface UseAuthReturn {
    isAuthenticated: boolean;
    user: JwtPayload | null;
    login: (credentials: LoginRequest) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
}

export function useAuth(): UseAuthReturn {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAuthed, setIsAuthed] = useState(false);
    const [user, setUser] = useState<JwtPayload | null>(null);

    // Hydrate auth state on mount
    useEffect(() => {
        const authed = checkAuth();
        setIsAuthed(authed);
        setUser(authed ? getCurrentUser() : null);
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
                if (currentUser && currentUser.org_slug) {
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
        setIsAuthed(false);
        setUser(null);
        router.push("/login");
    }, [router]);

    return {
        isAuthenticated: isAuthed,
        user,
        login,
        logout,
        isLoading,
        error,
    };
}
