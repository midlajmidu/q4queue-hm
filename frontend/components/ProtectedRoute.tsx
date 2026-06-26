"use client";

import { useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading, isHydrated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Only redirect if hydration is complete and we know for sure they aren't authenticated
        if (isHydrated && !isLoading) {
            if (!isAuthenticated) {
                if (pathname.startsWith("/organization-admin")) {
                    router.replace(`/organization-login?redirect=${encodeURIComponent(pathname)}`);
                } else if (pathname.startsWith("/super-admin")) {
                    router.replace(`/super-admin/login?redirect=${encodeURIComponent(pathname)}`);
                } else {
                    router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
                }
                return;
            }

            // Global Guard: Intercept active sessions that still require a password change
            const currentUser = user;
            if (currentUser && currentUser.is_first_login) {
                const isAlreadyOnChangePassword = pathname.endsWith("/change-password");
                if (!isAlreadyOnChangePassword) {
                    if (currentUser.role === "organization_admin") {
                        router.replace(`/organization-admin/change-password`);
                    } else if (currentUser.role === "super_admin") {
                        router.replace(`/super-admin/change-password`);
                    } else if (currentUser.org_slug) {
                        router.replace(`/${currentUser.org_slug}/change-password`);
                    } else {
                        router.replace('/super-admin/change-password');
                    }
                    return;
                }
            }
        }
    }, [isHydrated, isAuthenticated, isLoading, router, pathname, user]);

    if (!isHydrated || isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return <>{children}</>;
}
