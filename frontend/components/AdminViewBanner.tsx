"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export function AdminViewBanner() {
    const { user, isImpersonating } = useAuth();
    const router = useRouter();

    // If they are impersonating, ImpersonationBanner handles it.
    if (isImpersonating) return null;

    const isAdmin = user?.role === "super_admin" || user?.role === "organization_admin";
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
