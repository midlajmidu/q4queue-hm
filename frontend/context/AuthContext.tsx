"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
    setToken,
    removeToken,
    isAuthenticated as checkAuth,
    getCurrentUser,
    getSuperAdminToken,
    setSuperAdminToken,
    removeSuperAdminToken,
    getToken,
} from "@/lib/auth";
import type { JwtPayload, LoginRequest } from "@/types/api";

interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAuthed, setIsAuthed] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [user, setUser] = useState<JwtPayload | null>(null);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [impersonatorUser, setImpersonatorUser] = useState<JwtPayload | null>(null);

    // Sync Auth State to React State
    const syncAuthState = useCallback(() => {
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
    }, []);

    // Monitor pathname route changes to automatically sync auth state
    useEffect(() => {
        syncAuthState();
    }, [pathname, syncAuthState]);

    // Hydrate auth state on mount and initialize BroadcastChannel
    useEffect(() => {
        let bc: BroadcastChannel | null = null;
        if (typeof window !== "undefined") {
            bc = new BroadcastChannel("auth_sync_channel");
            
            // Check for token in URL fragment (used for cross-subdomain impersonation)
            if (window.location.hash) {
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

            syncAuthState();
            setIsHydrated(true);

            // If we don't have a token on mount, ask other tabs if they have one
            if (!checkAuth()) {
                bc.postMessage({ type: "REQUEST_AUTH_STATE" });
            } else {
                // We have a token on mount. Broadcast it just in case another tab just opened.
                const saToken = getSuperAdminToken();
                const currentToken = getToken();
                if (currentToken) {
                    bc.postMessage({ type: "PROVIDE_AUTH_STATE", token: currentToken, saToken });
                }
            }

            bc.onmessage = (event) => {
                const data = event.data;
                if (!data) return;

                if (data.type === "REQUEST_AUTH_STATE") {
                    const saToken = getSuperAdminToken();
                    const currentToken = getToken();
                    if (currentToken) {
                        bc?.postMessage({ type: "PROVIDE_AUTH_STATE", token: currentToken, saToken });
                    }
                } else if (data.type === "PROVIDE_AUTH_STATE") {
                    if (data.token) setToken(data.token);
                    if (data.saToken) setSuperAdminToken(data.saToken);
                    syncAuthState();
                } else if (data.type === "LOGIN") {
                    if (data.token) setToken(data.token);
                    if (data.saToken) setSuperAdminToken(data.saToken);
                    syncAuthState();
                } else if (data.type === "LOGOUT") {
                    removeToken();
                    removeSuperAdminToken();
                    syncAuthState();
                    
                    const currentPath = window.location.pathname;
                    const isAlreadyOnLogin = currentPath === "/login" || currentPath.endsWith("/login") || currentPath === "/organization-login";
                    
                    if (!isAlreadyOnLogin) {
                        if (currentPath.startsWith("/organization-admin")) {
                            router.push("/organization-login");
                        } else if (currentPath.startsWith("/super-admin")) {
                            router.push("/super-admin/login");
                        } else {
                            router.push("/login");
                        }
                    }
                }
            };
        }

        return () => {
            if (bc) bc.close();
        };
    }, [router, syncAuthState]);

    // Periodically check token validity
    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof window !== "undefined") {
                const path = window.location.pathname;
                if (path === "/login" || path.endsWith("/login") || path === "/organization-login") return;
            }
            if (isAuthed && !checkAuth()) {
                removeToken();
                syncAuthState();
                const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                if (currentPath.startsWith("/organization-admin")) {
                    router.replace("/organization-login");
                } else if (currentPath.startsWith("/super-admin")) {
                    router.replace("/super-admin/login");
                } else {
                    router.replace("/login");
                }
            }
        }, 30_000);
        return () => clearInterval(interval);
    }, [isAuthed, router, syncAuthState]);

    const broadcastEvent = useCallback((type: string, extra: any = {}) => {
        if (typeof window !== "undefined") {
            const bc = new BroadcastChannel("auth_sync_channel");
            bc.postMessage({ type, ...extra });
            bc.close();
        }
    }, []);

    const login = useCallback(
        async (credentials: LoginRequest) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await api.login(credentials);
                removeSuperAdminToken();
                setToken(response.access_token);
                syncAuthState();
                
                broadcastEvent("LOGIN", { token: response.access_token });
                
                const parts = response.access_token.split(".");
                let currentUser: JwtPayload | null = null;
                if (parts.length === 3) {
                    currentUser = JSON.parse(atob(parts[1])) as JwtPayload;
                }
                
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
                        if (err.detail && err.detail !== "Invalid credentials") {
                            setError(err.detail);
                        } else if (credentials.login_type === "org_admin") {
                            setError("Invalid email or password.");
                        } else {
                            setError("Invalid email, password, or organization.");
                        }
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
        [router, syncAuthState, broadcastEvent]
    );

    const logout = useCallback(() => {
        removeToken();
        syncAuthState();
        broadcastEvent("LOGOUT");
        
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        const isAlreadyOnLogin = currentPath === "/login" || currentPath.endsWith("/login") || currentPath === "/organization-login";
        
        if (!isAlreadyOnLogin) {
            if (currentPath.startsWith("/organization-admin")) {
                router.push("/organization-login");
            } else if (currentPath.startsWith("/super-admin")) {
                router.push("/super-admin/login");
            } else {
                router.push("/login");
            }
        }
    }, [router, syncAuthState, broadcastEvent]);

    const stopImpersonating = useCallback(() => {
        const saToken = getSuperAdminToken();
        if (saToken) {
            const isAppSubdomain = window.location.hostname.startsWith("app.");
            const rootHost = isAppSubdomain ? window.location.host.replace("app.", "") : window.location.host;
            const protocol = window.location.protocol;
            
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

            removeToken("staff");
            removeToken("org_admin");
            removeSuperAdminToken();
            syncAuthState();
            broadcastEvent("LOGOUT");
            
            const targetPath = decodedRole === "organization_admin" ? "organization-admin" : "super-admin";
            window.location.href = `${protocol}//${rootHost}/${targetPath}#token=${saToken}`;
        }
    }, [syncAuthState, broadcastEvent]);

    return (
        <AuthContext.Provider
            value={{
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
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
