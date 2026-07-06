"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken, getSuperAdminToken, getToken, setSuperAdminToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, ArrowLeft } from "lucide-react";

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
    const { isHydrated, isAuthenticated } = useAuth();
    const [error, setError] = useState<{title: string, message: string} | null>(null);

    useEffect(() => {
        if (!isHydrated || !branchId) return;

        if (!isAuthenticated) {
            setError({
                title: "Authentication Error",
                message: "Session expired or not authenticated. Please login again."
            });
            return;
        }

        async function loadBranchView() {
            try {
                const res = await api.impersonateOrgBranch(branchId);
                const currentToken = getToken("org_admin");

                // Store current org-admin token so the banner "Return" button works
                if (currentToken) {
                    setSuperAdminToken(currentToken);
                }

                // Set the read-only branch token as the active token
                setToken(res.access_token, "staff");

                // We need the branch slug to redirect — decode from the token
                const payloadPart = res.access_token.split(".")[1];
                const payload = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")));
                const branchSlug: string = payload.org_slug;

                // Redirect to the branch dashboard under the org-admin URL namespace
                router.replace(`/org-admin/${branchSlug}/dashboard`);

            } catch (err: any) {
                let errorTitle = "Access Denied";
                let errorMsg = err?.detail || err?.message || "Failed to access branch dashboard. Please try again.";
                
                // If it's a 404 Not Found from impersonate API, it means the branch has no admin
                if (errorMsg.toLowerCase().includes("not found")) {
                    errorTitle = "Branch Admin Required";
                    errorMsg = "No Branch Admin is currently assigned to this branch. You must create or assign a branch admin before you can view its live dashboard.";
                }

                setError({ title: errorTitle, message: errorMsg });
            }
        }

        loadBranchView();
    }, [branchId, router, isHydrated, isAuthenticated]);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-100/50 rounded-full blur-3xl -z-10 opacity-70"></div>
                
                <div className="bg-white rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100/80 p-10 max-w-md w-full text-center relative z-10">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 bg-rose-200 rounded-full animate-ping opacity-20"></div>
                        <div className="relative w-full h-full bg-gradient-to-tr from-rose-100 to-rose-50 border border-rose-200 shadow-sm rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-rose-600" strokeWidth={2} />
                        </div>
                    </div>
                    
                    <h2 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{error.title}</h2>
                    <p className="text-slate-500 text-[15px] leading-relaxed mb-8 px-2">{error.message}</p>
                    
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => router.push("/organization-admin/branches")}
                            className="w-full px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 group"
                        >
                            <ArrowLeft size={16} className="text-indigo-200 group-hover:text-white transition-colors" />
                            Return to Branches
                        </button>
                    </div>
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
