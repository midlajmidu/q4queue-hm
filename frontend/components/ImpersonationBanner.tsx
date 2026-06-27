"use client";

import { useAuth } from "@/hooks/useAuth";

export function ImpersonationBanner() {
    const { isImpersonating, user, stopImpersonating, isReadOnly } = useAuth();

    if (!isImpersonating || isReadOnly) return null;

    return (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium z-[100] relative shadow-md">
            <span>
                <strong>Super Admin Mode:</strong> You are currently impersonating <strong>{user?.org_name || user?.email}</strong>.
            </span>
            <button
                onClick={stopImpersonating}
                className="bg-amber-950 text-amber-50 px-3 py-1 rounded-md text-xs font-bold hover:bg-amber-900 transition-colors shadow-sm"
            >
                Return to Super Admin
            </button>
        </div>
    );
}
