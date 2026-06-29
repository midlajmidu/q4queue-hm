"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { Eye, ArrowLeft } from "lucide-react";
import { getSuperAdminToken, setToken, removeSuperAdminToken, removeToken, getCurrentUser } from "@/lib/auth";

export function AdminViewBanner() {
    const { user, isImpersonating, isReadOnly } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // If they are impersonating and NOT read-only, ImpersonationBanner handles it.
    if (isImpersonating && !isReadOnly) return null;

    const isAdmin = user?.role === "super_admin" || user?.role === "organization_admin";

    const handleReturn = () => {
        // Restore the original token that was saved before read-only impersonation
        const savedToken = getSuperAdminToken();
        if (savedToken) {
            removeToken("staff");
            removeSuperAdminToken();
            
            // Decode restored token to find correct return path
            let restoredRole = "organization_admin";
            try {
                const parts = savedToken.split(".");
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload && payload.role) {
                        restoredRole = payload.role;
                    }
                }
            } catch (e) {}

            const targetType = restoredRole === "super_admin" ? "super_admin" : "org_admin";
            setToken(savedToken, targetType);

            if (restoredRole === "super_admin") {
                router.push("/super-admin/branches");
                return;
            }
        }
        router.push("/organization-admin/branches");
    };

    // Read-only view (org-admin or super-admin viewing a branch) — show dedicated banner
    if (isReadOnly) {
        // Decode saToken to determine actual role
        let originalRole = "organization_admin";
        const saToken = getSuperAdminToken();
        if (saToken) {
            try {
                const parts = saToken.split(".");
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload && payload.role) {
                        originalRole = payload.role;
                    }
                }
            } catch (e) {}
        }
        
        const isSuperAdmin = originalRole === "super_admin";
        const bannerLabel = isSuperAdmin ? "Super Admin View" : "Organization Admin View";
        const returnLabel = isSuperAdmin ? "Return to Super Admin" : "Return to Org Admin";

        return (
            <div className="bg-violet-600 text-white px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium z-[100] relative shadow-md">
                <Eye size={15} className="shrink-0" />
                <span>
                    <strong>{bannerLabel}:</strong> Read-only — action buttons are disabled.
                </span>
                <button
                    onClick={handleReturn}
                    className="flex items-center gap-1.5 bg-violet-800 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-violet-900 transition-colors shadow-sm"
                >
                    <ArrowLeft size={13} />
                    {returnLabel}
                </button>
            </div>
        );
    }

    if (!isAdmin) return null;

    const roleName = user?.role === "super_admin" ? "Super Admin" : "Global Admin";
    const returnPath = user?.role === "super_admin" ? "/super-admin" : "/organization-admin";

    return (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium z-[100] relative shadow-md">
            <span>
                <strong>{roleName} Mode:</strong> You are currently viewing a branch dashboard.
            </span>
            <button
                onClick={() => router.push(returnPath)}
                className="bg-amber-950 text-amber-50 px-3 py-1 rounded-md text-xs font-bold hover:bg-amber-900 transition-colors shadow-sm"
            >
                Return to {roleName}
            </button>
        </div>
    );
}
