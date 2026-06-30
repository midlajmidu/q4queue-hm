"use client";

import Link from "next/link";

import { useEffect, useRef, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrgDetail, OrgUsageResponse } from "@/types/api";
import { Badge, EditOrgModal, SecureDeleteModal, ConfirmStatusModal, CreateOrgModal } from "@/components/super-admin/OrgModals";
import { getToken, setSuperAdminToken } from "@/lib/auth";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

type SortBy = "name" | "created_at" | "is_active";
type SortOrder = "asc" | "desc";

function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function SortIcon({ col, sortBy, sortOrder }: { col: SortBy; sortBy: SortBy; sortOrder: SortOrder }) {
    const active = sortBy === col;
    return (
        <span className="inline-flex flex-col ml-1 -mb-0.5 leading-none" aria-hidden="true">
            <span className={`text-[8px] ${active && sortOrder === "asc" ? "text-violet-400" : "text-slate-600"}`}>▲</span>
            <span className={`text-[8px] ${active && sortOrder === "desc" ? "text-violet-400" : "text-slate-600"}`}>▼</span>
        </span>
    );
}

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

export default function BranchesPage() {
    const [orgs, setOrgs] = useState<OrgDetail[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortBy>("created_at");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [offset, setOffset] = useState(0);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editOrg, setEditOrg] = useState<OrgDetail | null>(null);
    const [deleteOrg, setDeleteOrg] = useState<OrgDetail | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusOrg, setStatusOrg] = useState<OrgDetail | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [usageOrg, setUsageOrg] = useState<OrgDetail | null>(null);

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
            setLoadError(err instanceof ApiError ? err.detail : "Failed to load branches.");
        } finally {
            setIsLoadingOrgs(false);
        }
    }, [debouncedSearch, sortBy, sortOrder, offset]);

    useEffect(() => { loadOrgs(); }, [debouncedSearch, sortBy, sortOrder, offset]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(val);
            setOffset(0);
        }, DEBOUNCE_MS);
    };

    const handleSort = (col: SortBy) => {
        if (col === sortBy) {
            setSortOrder(o => o === "asc" ? "desc" : "asc");
        } else {
            setSortBy(col);
            setSortOrder("desc");
        }
        setOffset(0);
    };

    const handleEditSaved = useCallback((updated: OrgDetail) => {
        setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o));
        setEditOrg(null);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteOrg) return;
        setIsDeleting(true);
        try {
            await api.deleteOrganization(deleteOrg.id);
            setOrgs(prev => prev.filter(o => o.id !== deleteOrg.id));
            setDeleteOrg(null);
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to delete branch.");
        } finally { setIsDeleting(false); }
    }, [deleteOrg]);

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
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to update branch status.");
        } finally { setIsUpdatingStatus(false); }
    }, [statusOrg]);

    const handleImpersonate = async (orgId: string, orgSlug: string, parentSlug: string | null) => {
        try {
            const res = await api.impersonateOrganization(orgId);
            const currentToken = getToken();
            if (currentToken) setSuperAdminToken(currentToken);
            const pSlug = parentSlug || "system";
            window.location.href = `/super-admin/${pSlug}/${orgSlug}/dashboard#token=${res.access_token}&saToken=${currentToken || ""}`;
        } catch (err) {
            console.error("Impersonation failed:", err);
            alert("Failed to impersonate branch.");
        }
    };

    const SortableHeader = ({ col, label }: { col: SortBy; label: string }) => (
        <th className="px-6 py-3 cursor-pointer select-none hover:text-slate-300 transition-colors group" onClick={() => handleSort(col)}>
            <span className="flex items-center gap-1">
                {label}
                <SortIcon col={col} sortBy={sortBy} sortOrder={sortOrder} />
            </span>
        </th>
    );

    return (
        <>
            {showCreateModal && <CreateOrgModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); loadOrgs(); }} />}
            {editOrg && <EditOrgModal org={editOrg} onClose={() => setEditOrg(null)} onSaved={handleEditSaved} />}
            {deleteOrg && <SecureDeleteModal org={deleteOrg} onClose={() => setDeleteOrg(null)} onConfirm={handleDeleteConfirm} isDeleting={isDeleting} />}
            {statusOrg && <ConfirmStatusModal org={statusOrg} onClose={() => setStatusOrg(null)} onConfirm={handleStatusConfirm} isUpdating={isUpdatingStatus} />}
            {usageOrg && <UsageModal org={usageOrg} onClose={() => setUsageOrg(null)} />}

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">All Branches</h1>
                        <p className="text-sm text-slate-400">Manage individual branches and provision their admin accounts.</p>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20">+ Create Branch</button>
                </div>

                <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden h-full flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                Branches
                                {!isLoadingOrgs && <span className="text-xs font-normal text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full">{total}</span>}
                            </h2>
                            <button onClick={() => loadOrgs()} disabled={isLoadingOrgs} aria-label="Refresh" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40">
                                <svg className={`w-4 h-4 ${isLoadingOrgs ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input type="search" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search branches by name or slug…" className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                    </div>

                    {loadError && (
                        <div role="alert" className="m-4 bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">
                            {loadError} <button onClick={() => loadOrgs()} className="ml-2 underline font-medium">Retry</button>
                        </div>
                    )}

                    <div className="flex-1 overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left text-sm whitespace-nowrap text-slate-300">
                            <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 font-semibold tracking-wider border-b border-slate-700/50 sticky top-0 z-10">
                                <tr>
                                    <SortableHeader col="name" label="Name" />
                                    <th className="px-6 py-3">Slug</th>
                                    <th className="px-6 py-3">Admin Email</th>
                                    <SortableHeader col="is_active" label="Status" />
                                    <SortableHeader col="created_at" label="Created At" />
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            {isLoadingOrgs ? (
                                <TableSkeleton />
                            ) : orgs.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            <p className="text-slate-400">No branches found.</p>
                                        </td>
                                    </tr>
                                </tbody>
                            ) : (
                                <tbody className="divide-y divide-slate-800/50 bg-slate-900/20">
                                    {orgs.map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-800/40 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white">
                                                <Link href={`/super-admin/organizations/${o.id}`} className="hover:text-violet-400 hover:underline transition-colors">
                                                    {o.name}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 font-mono text-xs">{o.slug}</td>
                                            <td className="px-6 py-4 text-slate-400">{o.admin_email || <span className="text-slate-600 italic">None</span>}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => setStatusOrg(o)} className="focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-full" title={`Click to ${o.is_active ? 'deactivate' : 'activate'}`}>
                                                    <Badge active={o.is_active} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{fmt(o.created_at)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => setEditOrg(o)} className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-400/10 rounded-md transition-colors" title="Edit">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                    <button onClick={() => setUsageOrg(o)} aria-label={`View Usage ${o.name}`} title="Usage Monitoring" className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleImpersonate(o.id, o.slug, o.parent_slug || null)} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors" title="Impersonate (Login as)">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </button>
                                                    <button onClick={() => setDeleteOrg(o)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors" title="Delete">
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
        </>
    );
}
