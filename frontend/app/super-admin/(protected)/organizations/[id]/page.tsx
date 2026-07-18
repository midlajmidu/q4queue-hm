"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { OrgDetailExtended } from "@/types/api";
import { BranchUsers } from "@/components/super-admin/BranchUsers";

function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
    return (
        <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
            <div className="w-9 h-9 bg-violet-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4.5 h-4.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                </svg>
            </div>
            <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="py-3 flex items-start gap-4 border-b border-slate-700/40 last:border-0">
            <span className="text-sm text-slate-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-white font-medium break-all">{children}</span>
        </div>
    );
}

function SkeletonDetail() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-56" />
            <div className="h-4 bg-slate-700 rounded w-40" />
            <div className="grid grid-cols-2 gap-4 mt-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-700 rounded-xl" />)}
            </div>
        </div>
    );
}

export default function OrgDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [org, setOrg] = useState<OrgDetailExtended | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resettingError, setResettingError] = useState<string | null>(null);
    const [newPasswordValue, setNewPasswordValue] = useState("");
    const [showResetModal, setShowResetModal] = useState(false);

    useEffect(() => {
        if (!orgId) return;
        setLoading(true);
        api.getOrganizationDetail(orgId)
            .then(setOrg)
            .catch(err => setError(err instanceof ApiError ? err.detail : "Failed to load organization."))
            .finally(() => setLoading(false));
    }, [orgId]);

    const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

    const handleResetPassword = async () => {
        if (!orgId || !newPasswordValue) return;
        setIsResetting(true);
        setResettingError(null);
        try {
            await api.resetOrgPassword(orgId, { new_password: newPasswordValue });
            // Refresh data
            const updated = await api.getOrganizationDetail(orgId);
            setOrg(updated);
            setShowResetModal(false);
            setNewPasswordValue("");
            alert("Password reset successfully!");
        } catch (err) {
            setResettingError(err instanceof ApiError ? err.detail : "Failed to reset password.");
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            {/* Back */}
            <button
                onClick={() => router.push("/super-admin")}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
            >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Organizations
            </button>

            {loading && <SkeletonDetail />}

            {error && (
                <div role="alert" className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
                    {error}
                </div>
            )}

            {org && !loading && (
                <>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                            <p className="text-sm font-mono text-slate-400 mt-0.5">{org.slug}</p>
                        </div>
                        <span className={`mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0 ${org.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                            <span className={`w-2 h-2 rounded-full ${org.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                            {org.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Stat label="Total Users" value={org.total_users}
                            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <Stat label="Admin Users" value={org.total_admins}
                            icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                    </div>

                    {/* Detail card */}
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Organization Details</h2>
                        <div className="divide-y divide-slate-700/40">
                            <Field label="ID"><span className="font-mono text-xs text-slate-300">{org.id}</span></Field>
                            <Field label="Name">{org.name}</Field>
                            <Field label="Slug"><span className="font-mono text-violet-400">{org.slug}</span></Field>
                            <Field label="Status">
                                <span className={org.is_active ? "text-emerald-400" : "text-red-400"}>
                                    {org.is_active ? "Active" : "Inactive"}
                                </span>
                            </Field>
                            <Field label="Created">{fmt(org.created_at)}</Field>
                            <Field label="Total Users">{org.total_users}</Field>
                            <Field label="Admin Users">{org.total_admins}</Field>
                            <Field label="Regular Users">{org.total_users - org.total_admins}</Field>
                        </div>
                    </div>

                    {/* Admin Account Card */}
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl mt-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Admin Account Details
                        </h2>
                        <div className="divide-y divide-slate-700/40">
                            <Field label="Admin Email">
                                {org.admin_email ? (
                                    <span className="text-slate-200">{org.admin_email}</span>
                                ) : (
                                    <span className="text-slate-500 italic">No admin assigned</span>
                                )}
                            </Field>
                            <Field label="Initial Password">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        {org.admin_password_changed_at ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-md border border-amber-500/20 shadow-sm" title={`Password changed on ${fmt(org.admin_password_changed_at)}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Password Changed
                                            </span>
                                        ) : org.admin_initial_password ? (
                                            <>
                                                <span className="inline-flex items-center gap-1 text-sm text-slate-200 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-700/80 font-mono shadow-inner select-all">
                                                    {showPassword ? org.admin_initial_password : "••••••••"}
                                                </span>
                                                <button
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-md transition-all"
                                                    title={showPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-slate-500 italic">Not available</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowResetModal(true)}
                                        className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1.5 px-3 py-2 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-all w-fit"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                        Reset Password
                                    </button>
                                </div>
                            </Field>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push("/super-admin")}
                            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            ← Back to List
                        </button>
                        <button
                            onClick={() => router.push(`/super-admin/branches/${orgId}/backups`)}
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            Manage Backups
                        </button>
                    </div>
                </>
            )}

            {/* Branch Users Management */}
            {orgId && <BranchUsers orgId={orgId} />}

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isResetting && setShowResetModal(false)} />
                    <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <div className="p-2 bg-red-400/10 rounded-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            </div>
                            <h3 className="text-lg font-bold">Reset Admin Password</h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            Enter a new password for <strong>{org?.admin_email}</strong>. This will override their current password.
                        </p>
                        {resettingError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                                {resettingError}
                            </div>
                        )}
                        <input
                            type="text"
                            value={newPasswordValue}
                            onChange={(e) => setNewPasswordValue(e.target.value)}
                            placeholder="Min 8 characters"
                            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                            autoFocus
                        />
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowResetModal(false)}
                                disabled={isResetting}
                                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetPassword}
                                disabled={isResetting || newPasswordValue.length < 8}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-600/20"
                            >
                                {isResetting ? "Resetting..." : "Confirm Reset"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
