"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrgDetail, OrgUsageResponse } from "@/types/api";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

function OrgUsageRow({ org }: { org: OrgDetail }) {
    const [usage, setUsage] = useState<OrgUsageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        api.getOrganizationUsage(org.id).then(res => {
            if (mounted) { setUsage(res); setLoading(false); }
        }).catch(err => {
            if (mounted) { setError(err instanceof ApiError ? err.detail : "Failed to load"); setLoading(false); }
        });
        return () => { mounted = false; };
    }, [org.id]);

    const pct = usage ? Math.min(100, Math.max(0, (usage.queue_entries_used / usage.queue_entries_max) * 100)) : 0;
    const isWarning = pct >= 80;
    const isCritical = pct >= 95;

    return (
        <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-800">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    {org.logo_url ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 p-1">
                            <img src={org.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-xs font-bold text-slate-500">
                            N/A
                        </div>
                    )}
                    <div>
                        <div className="text-sm font-semibold text-white">{org.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{org.slug}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {loading ? (
                    <div className="w-32 h-2 bg-slate-800 rounded animate-pulse" />
                ) : error ? (
                    <span className="text-xs text-red-400">{error}</span>
                ) : usage ? (
                    <div className="w-full max-w-[200px]">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Queue Entries</span>
                            <span className={`font-semibold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'}`}>
                                {usage.queue_entries_used} <span className="text-slate-500 font-normal">/ {usage.queue_entries_max}</span>
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${pct}%` }}></div>
                        </div>
                    </div>
                ) : null}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center">
                {loading ? <div className="w-8 h-4 bg-slate-800 rounded mx-auto animate-pulse" /> : usage ? <span className="text-sm font-medium text-slate-200">{usage.customers_served}</span> : "-"}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center">
                {loading ? <div className="w-8 h-4 bg-slate-800 rounded mx-auto animate-pulse" /> : usage ? <span className="text-sm font-medium text-slate-200">{usage.active_queues}</span> : "-"}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center">
                {loading ? <div className="w-8 h-4 bg-slate-800 rounded mx-auto animate-pulse" /> : usage ? <span className="text-sm font-medium text-slate-200">{usage.active_staff}</span> : "-"}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center">
                {loading ? <div className="w-8 h-4 bg-slate-800 rounded mx-auto animate-pulse" /> : <span className="text-sm font-medium text-slate-500">N/A</span>}
            </td>
        </tr>
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
                        <button key={p} onClick={() => onChange((p - 1) * limit)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === currentPage ? "bg-cyan-600 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>{p}</button>
                    )
                )}
                <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} className="px-2.5 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next →</button>
            </div>
        </div>
    );
}

export default function UsageMonitoringPage() {
    const [orgs, setOrgs] = useState<OrgDetail[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [offset, setOffset] = useState(0);
    const [activeTab, setActiveTab] = useState<"active" | "test">("active");

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadOrgs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.listOrganizations({
                search: debouncedSearch,
                is_test: activeTab === "test",
                limit: PAGE_SIZE,
                offset: offset,
                sort_by: "created_at",
                sort_order: "desc",
            });
            setOrgs(res.items);
            setTotal(res.total);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : "Failed to load organizations.");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, offset, activeTab]);

    useEffect(() => { loadOrgs(); }, [loadOrgs]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(val);
            setOffset(0);
        }, DEBOUNCE_MS);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Global Usage Monitoring
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Track queue entries and plan limits across all organizations.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 space-y-4">
                    <div className="flex bg-slate-950 p-1 rounded-xl w-fit border border-slate-800">
                        <button
                            onClick={() => { setActiveTab("active"); setOffset(0); }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === "active" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
                        >
                            Active Organizations
                        </button>
                        <button
                            onClick={() => { setActiveTab("test"); setOffset(0); }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === "test" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
                        >
                            Test Organizations
                        </button>
                    </div>
                    <div className="relative max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search organizations…"
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {error && (
                    <div className="m-4 bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                            <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <th className="px-6 py-3">Organization</th>
                                <th className="px-6 py-3">Plan Usage</th>
                                <th className="px-6 py-3 text-center">Served</th>
                                <th className="px-6 py-3 text-center">Active Queues</th>
                                <th className="px-6 py-3 text-center">Staff</th>
                                <th className="px-6 py-3 text-center">Messages</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-48" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-8 mx-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-8 mx-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-8 mx-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-8 mx-auto" /></td>
                                    </tr>
                                ))
                            ) : orgs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">No organizations found.</td>
                                </tr>
                            ) : (
                                orgs.map(org => <OrgUsageRow key={org.id} org={org} />)
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
            </div>
        </div>
    );
}
