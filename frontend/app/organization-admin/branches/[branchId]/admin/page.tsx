"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken, getSuperAdminToken, getToken, setSuperAdminToken } from "@/lib/auth";

/**
 * Org-Admin → Branch Read-Only View
 *
 * This page acts as an intermediary:
 * 1. Calls the org-admin impersonate API to get a read-only branch token
 * 2. Stores the current org-admin token as "saToken" (so the banner can restore it)
 * 3. Redirects to the branch dashboard with the token in the URL hash
 */
export default function OrgAdminBranchViewPage() {
    const params = useParams();
    const router = useRouter();
    const branchId = params?.branchId as string;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!branchId) return;

        async function loadBranchView() {
            try {
                const res = await api.impersonateOrgBranch(branchId);
                const currentToken = getToken();

                // Store current org-admin token so the banner "Return" button works
                if (currentToken) {
                    setSuperAdminToken(currentToken);
                }

                // Set the read-only branch token as the active token
                setToken(res.access_token);

                // We need the branch slug to redirect — decode from the token
                const payloadPart = res.access_token.split(".")[1];
                const payload = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")));
                const branchSlug: string = payload.org_slug;

                // Redirect to the branch dashboard under the org-admin URL namespace
                router.replace(`/org-admin/${branchSlug}/dashboard`);

            } catch (err: any) {
                setError(err?.detail || "Failed to access branch dashboard. Please try again.");
            }
        }

        loadBranchView();
    }, [branchId, router]);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-500 text-sm mb-6">{error}</p>
                    <button
                        onClick={() => router.push("/organization-admin/branches")}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                    >
                        Return to Branches
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 text-sm font-medium">Loading branch dashboard…</p>
            </div>
        </div>
    );
}
