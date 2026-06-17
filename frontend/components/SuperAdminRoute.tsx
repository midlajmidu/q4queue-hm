"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, isAuthenticated, getSuperAdminToken, removeSuperAdminToken, setToken } from "@/lib/auth";

/**
 * SuperAdminRoute
 * Renders children only for authenticated super admins.
 * - Not logged in → /super-admin/login
 * - Logged in but not super_admin → /dashboard (regular admin)
 */
export default function SuperAdminRoute({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isHydrated, setIsHydrated] = useState(false);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        // Hydration flag guarantees we wait for the client-side check to finish
        const handleAuth = () => {
            // Check for token from fragment if returning from impersonation cross-domain
            if (typeof window !== "undefined" && window.location.hash) {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const tokenFromHash = params.get("token");
                if (tokenFromHash) {
                    setToken(tokenFromHash);
                    removeSuperAdminToken();
                    window.history.replaceState(null, "", window.location.pathname + window.location.search);
                }
            }

            const authed = isAuthenticated();
            if (!authed) {
                console.warn("[SuperAdminRoute] Not authenticated, redirecting to login");
                router.replace("/super-admin/login");
                return;
            }

            const user = getCurrentUser();
            if (!user) {
                console.warn("[SuperAdminRoute] Authenticated but no user payload found");
                router.replace("/super-admin/login");
                return;
            }

            if (user.role === "super_admin") {
                setAllowed(true);
            } else {
                // If they have a super admin token, they are impersonating.
                // Navigating back to /super-admin means they want to stop impersonating.
                const saToken = getSuperAdminToken();
                if (saToken) {
                    console.warn("[SuperAdminRoute] Restoring super admin session from impersonation");
                    setToken(saToken);
                    removeSuperAdminToken();
                    // Force a full reload to re-hydrate the new token everywhere
                    window.location.href = "/super-admin";
                    return;
                }

                console.warn(`[SuperAdminRoute] Unauthorized role: ${user.role}, redirecting to /dashboard`);
                if (user.org_slug) {
                    router.replace(`/${user.org_slug}/dashboard`);
                } else {
                    router.replace("/dashboard");
                }
            }
        };

        handleAuth();
        setIsHydrated(true);
    }, [router]);

    if (!isHydrated || !allowed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-10 h-10 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
