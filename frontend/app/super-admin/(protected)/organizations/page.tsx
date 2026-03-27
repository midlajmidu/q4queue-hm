"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { OrgDetail, OrgUpdateRequest } from "@/types/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

type SortBy = "name" | "created_at" | "is_active";
type SortOrder = "asc" | "desc";

// ── Shared Helpers ────────────────────────────────────────────────────────────
function Badge({ active }: { active: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
            {active ? "Active" : "Inactive"}
        </span>
    );
}
function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function TableSkeleton() {
    return (
        <tbody className="divide-y divide-slate-700/40">
            {[...Array(10)].map((_, i) => (
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

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditOrgModal({ org, onClose, onSaved }: { org: OrgDetail; onClose: () => void; onSaved: (u: OrgDetail) => void }) {
    const [form, setForm] = useState<OrgUpdateRequest>({ 
        org_name: org.name, 
        org_slug: org.slug, 
        is_active: org.is_active,
        max_sessions: org.max_sessions ?? 10,
        max_queues_per_session: org.max_queues_per_session ?? 20 
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true); setError(null);
        try { onSaved(await api.updateOrganization(org.id, form)); }
        catch (err) { setError(err instanceof ApiError ? err.detail : "Failed to update organization."); }
        finally { setIsSaving(false); }
    }, [org.id, form, onSaved]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit Organization
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                {error && <div role="alert" className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
                        <input id="edit-name" type="text" value={form.org_name} onChange={(e) => setForm(f => ({ ...f, org_name: e.target.value }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="edit-slug" className="block text-sm font-medium text-slate-300 mb-1.5">Slug</label>
                        <input id="edit-slug" type="text" value={form.org_slug} onChange={(e) => setForm(f => ({ ...f, org_slug: e.target.value.toLowerCase() }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-max-sessions" className="block text-sm font-medium text-slate-300 mb-1.5">Max Sessions</label>
                            <input id="edit-max-sessions" type="number" min="1" value={form.max_sessions || ""} onChange={(e) => setForm(f => ({ ...f, max_sessions: parseInt(e.target.value) || 0 }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="edit-max-queues" className="block text-sm font-medium text-slate-300 mb-1.5">Max Queues/Session</label>
                            <input id="edit-max-queues" type="number" min="1" value={form.max_queues_per_session || ""} onChange={(e) => setForm(f => ({ ...f, max_queues_per_session: parseInt(e.target.value) || 0 }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                        <span className="text-sm font-medium text-slate-300">Status</span>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">{form.is_active ? "Active" : "Inactive"}</span>
                            <button type="button" role="switch" aria-checked={form.is_active} onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} disabled={isSaving} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${form.is_active ? "bg-emerald-500" : "bg-slate-600"}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={isSaving || !form.org_name || !form.org_slug} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Secure Delete Modal ───────────────────────────────────────────────────────
function SecureDeleteModal({ org, onClose, onConfirm, isDeleting }: { org: OrgDetail; onClose: () => void; onConfirm: () => void; isDeleting: boolean }) {
    const [typed, setTyped] = useState("");
    const matches = typed === org.name;

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !isDeleting) onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose, isDeleting]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isDeleting ? onClose : undefined} />
            <div className="relative w-full max-w-sm bg-slate-800 border border-red-500/30 rounded-2xl shadow-2xl p-6 space-y-5">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white">Delete Organization</h2>
                        <p className="text-xs text-slate-400 mt-0.5">This action is permanent and cannot be undone.</p>
                    </div>
                </div>
                <p className="text-sm text-slate-300">
                    To permanently delete this organization and all its data, type its name:
                    <span className="block mt-1 font-mono font-semibold text-white bg-slate-900/60 rounded-lg px-3 py-1.5 mt-2 border border-slate-700 select-all">{org.name}</span>
                </p>
                <div>
                    <input
                        type="text"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="Type organization name to confirm"
                        disabled={isDeleting}
                        autoFocus
                        className="w-full rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} disabled={isDeleting} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={isDeleting || !matches} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        {isDeleting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</span> : "Delete Permanently"}
                    </button>
                </div>
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

// ── Main Organizations Page ───────────────────────────────────────────────────
export default function SuperAdminOrganizations() {
    const router = useRouter();

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

    // Modals
    const [editOrg, setEditOrg] = useState<OrgDetail | null>(null);
    const [deleteOrg, setDeleteOrg] = useState<OrgDetail | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Data fetching ──────────────────────────────────────────────
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
    }, []);

    // ── Soft delete ────────────────────────────────────────────────
    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteOrg) return;
        setIsDeleting(true);
        try {
            await api.deleteOrganization(deleteOrg.id);
            setOrgs(prev => prev.filter(o => o.id !== deleteOrg.id));
            setDeleteOrg(null);
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to delete organization.");
        } finally { setIsDeleting(false); }
    }, [deleteOrg]);

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
            {editOrg && <EditOrgModal org={editOrg} onClose={() => setEditOrg(null)} onSaved={handleEditSaved} />}
            {deleteOrg && <SecureDeleteModal org={deleteOrg} onClose={() => setDeleteOrg(null)} onConfirm={handleDeleteConfirm} isDeleting={isDeleting} />}

            <div className="space-y-6">
                {/* Page header */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Organizations</h1>
                        <p className="text-sm text-slate-400">View and manage all organizations on the platform.</p>
                    </div>
                </div>

                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden w-full">
                    {/* Table header bar — search + refresh */}
                    <div className="px-6 py-4 border-b border-slate-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                Organization Directory
                                {!isLoadingOrgs && <span className="text-xs font-normal text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full">{total}</span>}
                            </h2>
                            <button onClick={() => loadOrgs()} disabled={isLoadingOrgs} aria-label="Refresh" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40">
                                <svg className={`w-4 h-4 ${isLoadingOrgs ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                        {/* Search */}
                        <div className="relative max-w-lg">
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

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm" aria-label="Organizations list">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                                    <SortableHeader col="name" label="Name" />
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
                                            <td className="px-6 py-4 font-mono text-slate-400 text-xs">{org.slug}</td>
                                            <td className="px-6 py-4">
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
                                            <td className="px-6 py-4 text-slate-500">{fmt(org.created_at)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => setEditOrg(org)} aria-label={`Edit ${org.name}`} className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => setDeleteOrg(org)} disabled={!org.is_active} aria-label={`Deactivate ${org.name}`} title={!org.is_active ? "Already inactive" : "Deactivate"} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
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
