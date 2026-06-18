"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getToken, setSuperAdminToken, setToken } from "@/lib/auth";
import type { OrgDetail, OrgCreateRequest, OrgUpdateRequest, OrgStats, PlatformAnalytics, OrgUsageResponse } from "@/types/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ActivityFeed from "@/components/ActivityFeed";
import SystemAnnouncementsPanel from "@/components/super-admin/SystemAnnouncementsPanel";
import { Badge, EditOrgModal, SecureDeleteModal, ConfirmStatusModal } from "@/components/super-admin/OrgModals";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

type SortBy = "name" | "created_at" | "is_active";
type SortOrder = "asc" | "desc";

// ── Shared Helpers ────────────────────────────────────────────────────────────
function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Stats Cards ───────────────────────────────────────────────────────────────
function StatsCards({ stats, analytics, loading }: { stats: OrgStats | null; analytics: PlatformAnalytics | null; loading: boolean }) {
    const cards = [
        { label: "Total Orgs", value: stats?.total, color: "violet", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" },
        { label: "Active Orgs", value: stats?.active, color: "emerald", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
        { label: "Entries Today", value: analytics?.total_queue_entries_today, color: "cyan", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
        { label: "Entries Month", value: analytics?.total_queue_entries_month, color: "blue", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        { label: "Total Served", value: analytics?.total_customers_served, color: "amber", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
        { label: "Total Staff", value: analytics?.total_staff_users, color: "red", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    ] as const;

    return (
        <div className="grid grid-cols-6 gap-4">
            {cards.map(({ label, value, color, icon }) => (
                <div key={label} className="bg-slate-900 rounded-2xl border border-white/10 p-5 flex items-center gap-4 shadow-xl">
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-${color}-500/15`}>
                        <svg className={`w-5 h-5 text-${color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
                        {loading ? (
                            <div className="h-8 w-16 bg-slate-700 animate-pulse rounded mt-1" />
                        ) : (
                            <p className="text-2xl font-bold text-white">{value ?? "-"}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function TableSkeleton() {
    return (
        <tbody className="divide-y divide-slate-700/40">
            {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-700 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-700 rounded w-24 font-mono" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-700 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-slate-700 rounded-full w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-700 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-700 rounded w-16 mx-auto" /></td>
                </tr>
            ))}
        </tbody>
    );
}

// ── Sort Indicator ────────────────────────────────────────────────────────────
function SortIcon({ col, sortBy, sortOrder }: { col: SortBy; sortBy: SortBy; sortOrder: SortOrder }) {
    const active = sortBy === col;
    return (
        <span className="inline-flex flex-col ml-1 -mb-0.5 leading-none" aria-hidden="true">
            <span className={`text-[8px] ${active && sortOrder === "asc" ? "text-violet-400" : "text-slate-600"}`}>▲</span>
            <span className={`text-[8px] ${active && sortOrder === "desc" ? "text-violet-400" : "text-slate-600"}`}>▼</span>
        </span>
    );
}


// ── Create Modal ────────────────────────────────────────────────────────────────
function CreateOrgModal({ onClose, onCreated, loadStats }: { onClose: () => void; onCreated: () => void; loadStats: () => void }) {
    const [form, setForm] = useState<OrgCreateRequest>({ org_name: "", org_slug: "", admin_email: "", admin_password: "", max_sessions: 10, max_queues_per_session: 20, max_staff: 5 });
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    useEffect(() => {
        api.getGlobalSettings().then(settings => {
            setForm(f => ({
                ...f,
                max_sessions: settings.default_session_limit || 10,
                max_queues_per_session: settings.default_queue_limit || 20,
            }));
        }).catch(err => console.error("Failed to load global limits:", err));
    }, []);

    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
        setForm(f => ({ ...f, org_name: name, org_slug: slug }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true); setSubmitError(null);
        try {
            await api.createOrganization(form);
            onCreated();
            loadStats();
        } catch (err) {
            setSubmitError(err instanceof ApiError ? err.detail : "Failed to create organization.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        Create Organization
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                {submitError && <div role="alert" className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">{submitError}</div>}
                <form onSubmit={handleCreate} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor="org-name" className="block text-sm font-medium text-slate-300 mb-1.5">Organization Name</label>
                        <input id="org-name" type="text" value={form.org_name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Sunrise Clinic" required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="org-slug" className="block text-sm font-medium text-slate-300 mb-1.5">Slug <span className="text-slate-500 text-xs">(auto-generated)</span></label>
                        <input id="org-slug" type="text" value={form.org_slug} onChange={(e) => setForm(f => ({ ...f, org_slug: e.target.value.toLowerCase() }))} placeholder="sunrise-clinic" required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="org-max-sessions" className="block text-sm font-medium text-slate-300 mb-1.5">Max Sessions</label>
                            <input id="org-max-sessions" type="number" min="1" value={form.max_sessions || ""} onChange={(e) => setForm(f => ({ ...f, max_sessions: parseInt(e.target.value) || 0 }))} required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="org-max-queues" className="block text-sm font-medium text-slate-300 mb-1.5">Max Queues</label>
                            <input id="org-max-queues" type="number" min="1" value={form.max_queues_per_session || ""} onChange={(e) => setForm(f => ({ ...f, max_queues_per_session: parseInt(e.target.value) || 0 }))} required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="org-max-staff" className="block text-sm font-medium text-slate-300 mb-1.5">Max Staff</label>
                            <input id="org-max-staff" type="number" min="1" value={form.max_staff || ""} onChange={(e) => setForm(f => ({ ...f, max_staff: parseInt(e.target.value) || 0 }))} required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                    </div>
                    <hr className="border-slate-700" />
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Admin Account</p>
                    <div>
                        <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-1.5">Admin Email</label>
                        <input id="admin-email" type="email" value={form.admin_email} onChange={(e) => setForm(f => ({ ...f, admin_email: e.target.value }))} placeholder="admin@sunrise-clinic.com" required autoComplete="off" disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="admin-password" title="Password" className="block text-sm font-medium text-slate-300 mb-1.5">Admin Password</label>
                        <div className="relative">
                            <input
                                id="admin-password"
                                type={showAdminPassword ? "text" : "password"}
                                value={form.admin_password}
                                onChange={(e) => setForm(f => ({ ...f, admin_password: e.target.value }))}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                minLength={6}
                                disabled={isSubmitting}
                                className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 pl-3.5 pr-10 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors"
                            />
                            <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none">
                                {showAdminPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting || !form.org_name || !form.org_slug || !form.admin_email || !form.admin_password} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span> : "Create Organization"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (offset: number) => void }) {
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push("…");
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push("…");
        pages.push(totalPages);
    }

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500">
                Showing <span className="text-slate-300 font-medium">{offset + 1}–{Math.min(offset + limit, total)}</span> of <span className="text-slate-300 font-medium">{total}</span>
            </p>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(offset - limit)} disabled={offset === 0} className="px-2.5 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">← Prev</button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-slate-600">…</span>
                    ) : (
                        <button key={p} onClick={() => onChange((p - 1) * limit)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === currentPage ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>{p}</button>
                    )
                )}
                <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} className="px-2.5 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next →</button>
            </div>
        </div>
    );
}

// ── Usage Modal ───────────────────────────────────────────────────────────────
function UsageModal({ org, onClose }: { org: OrgDetail; onClose: () => void }) {
    const [usage, setUsage] = useState<OrgUsageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.getOrganizationUsage(org.id).then(res => {
            if (mounted) { setUsage(res); setLoading(false); }
        }).catch(err => {
            if (mounted) { setError(err instanceof ApiError ? err.detail : "Failed to load usage data"); setLoading(false); }
        });
        return () => { mounted = false; };
    }, [org.id]);

    const pct = usage ? Math.min(100, Math.max(0, (usage.queue_entries_used / usage.queue_entries_max) * 100)) : 0;
    const isWarning = pct >= 80;
    const isCritical = pct >= 95;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Usage Monitoring - {org.name}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" /></div>
                ) : error ? (
                    <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">{error}</div>
                ) : usage ? (
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Current Plan Usage</h3>
                                    <p className="text-xs text-slate-400">Queue Entries Used</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-lg font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'}`}>{usage.queue_entries_used}</span>
                                    <span className="text-sm text-slate-500"> / {usage.queue_entries_max}</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                <div className={`h-2.5 rounded-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                                <p className="text-xs text-slate-400 mb-1">Customers Served</p>
                                <p className="text-xl font-bold text-white">{usage.customers_served}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                                <p className="text-xs text-slate-400 mb-1">Active Queues</p>
                                <p className="text-xl font-bold text-white">{usage.active_queues}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                                <p className="text-xs text-slate-400 mb-1">Active Staff</p>
                                <p className="text-xl font-bold text-white">{usage.active_staff}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                                <p className="text-xs text-slate-400 mb-1">Messages Sent</p>
                                <p className="text-xl font-bold text-white">{usage.messages_sent}</p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
    const router = useRouter();

    // Stats
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Table state
    const [orgs, setOrgs] = useState<OrgDetail[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Search / sort / page
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortBy>("created_at");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [offset, setOffset] = useState(0);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Modals
    const [editOrg, setEditOrg] = useState<OrgDetail | null>(null);
    const [deleteOrg, setDeleteOrg] = useState<OrgDetail | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusOrg, setStatusOrg] = useState<OrgDetail | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [usageOrg, setUsageOrg] = useState<OrgDetail | null>(null);

    // ── Data fetching ──────────────────────────────────────────────
    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try { 
            const [statsData, analyticsData] = await Promise.all([
                api.getOrganizationStats(),
                api.getPlatformAnalytics()
            ]);
            setStats(statsData); 
            setAnalytics(analyticsData);
        }
        catch { /* stats are non-critical */ }
        finally { setStatsLoading(false); }
    }, []);

    const loadOrgs = useCallback(async (opts?: { search?: string; sortBy?: SortBy; sortOrder?: SortOrder; offset?: number }) => {
        setIsLoadingOrgs(true);
        setLoadError(null);
        try {
            const res = await api.listOrganizations({
                search: opts?.search ?? debouncedSearch,
                limit: PAGE_SIZE,
                offset: opts?.offset ?? offset,
                sort_by: opts?.sortBy ?? sortBy,
                sort_order: opts?.sortOrder ?? sortOrder,
            });
            setOrgs(res.items);
            setTotal(res.total);
        } catch (err) {
            setLoadError(err instanceof ApiError ? err.detail : "Failed to load organizations.");
        } finally {
            setIsLoadingOrgs(false);
        }
    }, [debouncedSearch, sortBy, sortOrder, offset]);

    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => { loadOrgs(); }, [debouncedSearch, sortBy, sortOrder, offset]); // eslint-disable-line

    // Debounce search input
    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(val);
            setOffset(0);
        }, DEBOUNCE_MS);
    };

    // Sort toggle
    const handleSort = (col: SortBy) => {
        if (col === sortBy) {
            setSortOrder(o => o === "asc" ? "desc" : "asc");
        } else {
            setSortBy(col);
            setSortOrder("desc");
        }
        setOffset(0);
    };

// ── Edit saved ─────────────────────────────────────────────────
    const handleEditSaved = useCallback((updated: OrgDetail) => {
        setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o));
        setEditOrg(null);
        loadStats();
    }, [loadStats]);

    // ── Soft delete ────────────────────────────────────────────────
    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteOrg) return;
        setIsDeleting(true);
        try {
            await api.deleteOrganization(deleteOrg.id);
            setOrgs(prev => prev.filter(o => o.id !== deleteOrg.id));
            setDeleteOrg(null);
            loadStats();
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to delete organization.");
        } finally { setIsDeleting(false); }
    }, [deleteOrg, loadStats]);

    const handleImpersonate = async (orgId: string, orgSlug: string) => {
        try {
            const res = await api.impersonateOrganization(orgId);
            const currentToken = getToken();
            if (currentToken) {
                setSuperAdminToken(currentToken);
            }
            // Navigate to org dashboard. If middleware redirects to subdomain, fragment is preserved.
            window.location.href = `/${orgSlug}/dashboard#token=${res.access_token}&saToken=${currentToken || ""}`;
        } catch (err) {
            console.error("Impersonation failed:", err);
            alert("Failed to impersonate organization.");
        }
    };

    // ── Toggle Status ──────────────────────────────────────────────
    const handleStatusConfirm = useCallback(async () => {
        if (!statusOrg) return;
        setIsUpdatingStatus(true);
        try {
            const updated = await api.updateOrganization(statusOrg.id, {
                org_name: statusOrg.name,
                org_slug: statusOrg.slug,
                is_active: !statusOrg.is_active,
                max_sessions: statusOrg.max_sessions,
                max_queues_per_session: statusOrg.max_queues_per_session
            });
            setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o));
            setStatusOrg(null);
            loadStats();
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to update organization status.");
        } finally { setIsUpdatingStatus(false); }
    }, [statusOrg, loadStats]);

    // ── SortableHeader ─────────────────────────────────────────────
    const SortableHeader = ({ col, label }: { col: SortBy; label: string }) => (
        <th
            className="px-6 py-3 cursor-pointer select-none hover:text-slate-300 transition-colors group"
            onClick={() => handleSort(col)}
        >
            <span className="flex items-center gap-1">
                {label}
                <SortIcon col={col} sortBy={sortBy} sortOrder={sortOrder} />
            </span>
        </th>
    );

    return (
        <>
            {showCreateModal && <CreateOrgModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); loadOrgs(); }} loadStats={loadStats} />}
            {editOrg && <EditOrgModal org={editOrg} onClose={() => setEditOrg(null)} onSaved={handleEditSaved} />}
            {deleteOrg && <SecureDeleteModal org={deleteOrg} onClose={() => setDeleteOrg(null)} onConfirm={handleDeleteConfirm} isDeleting={isDeleting} />}
            {statusOrg && <ConfirmStatusModal org={statusOrg} onClose={() => setStatusOrg(null)} onConfirm={handleStatusConfirm} isUpdating={isUpdatingStatus} />}
            {usageOrg && <UsageModal org={usageOrg} onClose={() => setUsageOrg(null)} />}

            <div className="space-y-6">
                {/* Page header */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Super Admin Panel</h1>
                        <p className="text-sm text-slate-400">Manage organizations and provision admin accounts.</p>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-all">+ Create Organization</button>
                </div>

                {/* Stats Cards */}
                <StatsCards stats={stats} analytics={analytics} loading={statsLoading} />

                {/* Organization Growth Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
                    <h2 className="text-base font-semibold text-white mb-6">Organization Growth Over Time</h2>
                    <div className="h-64 w-full">
                        {statsLoading ? (
                            <div className="w-full h-full bg-slate-800/50 animate-pulse rounded-xl" />
                        ) : analytics?.organization_growth && analytics.organization_growth.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.organization_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis 
                                        dataKey="month" 
                                        stroke="#64748b" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(val) => {
                                            const [y, m] = val.split('-');
                                            return `${new Date(parseInt(y), parseInt(m)-1).toLocaleString('default', { month: 'short' })} ${y}`;
                                        }}
                                    />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#a78bfa' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm italic border border-dashed border-slate-700 rounded-xl">
                                No growth data available yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Global Broadcasts ────────────────────────────── */}
                <SystemAnnouncementsPanel />

                {/* ── Orgs Table & Activity Feed ────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden h-full flex flex-col">
                            {/* Table header bar — search + refresh */}
                            <div className="px-6 py-4 border-b border-slate-700/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                        Organizations
                                        {!isLoadingOrgs && <span className="text-xs font-normal text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full">{total}</span>}
                                    </h2>
                                    <button onClick={() => loadOrgs()} disabled={isLoadingOrgs} aria-label="Refresh" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40">
                                        <svg className={`w-4 h-4 ${isLoadingOrgs ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                </div>
                                {/* Search */}
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        placeholder="Search by name or slug…"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {loadError && (
                                <div role="alert" className="m-4 bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">
                                    {loadError} <button onClick={() => loadOrgs()} className="ml-2 underline font-medium">Retry</button>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" aria-label="Organizations list">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                                            <SortableHeader col="name" label="Name" />
                                            <th className="px-6 py-3">Logo</th>
                                            <th className="px-6 py-3">Slug</th>
                                            <th className="px-6 py-3">Admin Info</th>
                                            <SortableHeader col="is_active" label="Status" />
                                            <SortableHeader col="created_at" label="Created" />
                                            <th className="px-6 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    {isLoadingOrgs ? (
                                        <TableSkeleton />
                                    ) : orgs.length === 0 ? (
                                        <tbody><tr><td colSpan={6} className="text-center py-16 text-slate-400">{debouncedSearch ? `No results for "${debouncedSearch}"` : "No organizations yet"}</td></tr></tbody>
                                    ) : (
                                        <tbody className="divide-y divide-slate-700/40">
                                            {orgs.map((org) => (
                                                <tr key={org.id} className="hover:bg-slate-700/30 transition-colors group">
                                                    <td className="px-6 py-4 font-medium text-white">
                                                        <button
                                                            onClick={() => router.push(`/super-admin/organizations/${org.id}`)}
                                                            className="hover:text-violet-400 transition-colors text-left"
                                                        >
                                                            {org.name}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {org.logo_url ? (
                                                            <div className="w-[38px] h-[38px] rounded-lg overflow-hidden bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center shrink-0">
                                                                <img src={org.logo_url} alt={`${org.name} logo`} className="w-full h-full object-contain p-1" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] font-bold text-slate-400 bg-slate-800/30 px-2 py-1 rounded border border-slate-700/50">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-slate-400 text-xs whitespace-nowrap truncate max-w-[150px]">{org.slug}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap truncate max-w-[200px] text-slate-400">
                                                        {org.admin_email ? (
                                                            <div className="flex flex-col gap-1.5 align-top">
                                                                <span className="text-sm text-slate-200 font-medium">{org.admin_email}</span>
                                                                <div className="flex items-center gap-1 min-h-[22px]">
                                                                    {org.admin_password_changed_at ? (
                                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 shadow-sm" title={`Password changed on ${fmt(org.admin_password_changed_at)}`}>
                                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                            Password Changed
                                                                        </span>
                                                                    ) : org.admin_initial_password && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-700/80 font-mono shadow-inner select-all">
                                                                                {org.admin_initial_password}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-500 italic">No admin assigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4"><Badge active={org.is_active} /></td>
                                                    <td className="px-6 py-4 text-slate-400">{fmt(org.created_at)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => setUsageOrg(org)} aria-label={`View Usage ${org.name}`} title="Usage Monitoring" className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                            </button>
                                                            <button onClick={() => handleImpersonate(org.id, org.slug)} aria-label={`Impersonate ${org.name}`} title="Login As" className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            </button>
                                                            <button onClick={() => setEditOrg(org)} aria-label={`Edit ${org.name}`} title="Edit" className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                            <button onClick={() => setStatusOrg(org)} aria-label={org.is_active ? `Suspend ${org.name}` : `Activate ${org.name}`} title={org.is_active ? "Suspend" : "Activate"} className={`p-1.5 rounded-lg transition-colors ${org.is_active ? 'text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10' : 'text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>
                                                                {org.is_active ? (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                )}
                                                            </button>
                                                            <button onClick={() => setDeleteOrg(org)} aria-label={`Delete ${org.name}`} title="Hard Delete" className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    )}
                                </table>
                            </div>

                            <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <ActivityFeed />
                    </div>
                </div>
            </div>
        </>
    );
}
