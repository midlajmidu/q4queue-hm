"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { TenantAnalyticsRow, TenantAnalyticsResponse } from "@/types/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSeconds(secs: number | null): string {
    if (secs === null || secs === undefined) return "—";
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    if (m === 0) return `${s}s`;
    if (s === 0) return `${m}m`;
    return `${m}m ${s}s`;
}

function fmtHour(hour: number | null): string {
    if (hour === null) return "—";
    const suffix = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}:00 ${suffix}`;
}

function toDateString(d: Date): string {
    return d.toISOString().split("T")[0];
}

const QUICK_RANGES = [
    { label: "Today", getDates: () => { const t = new Date(); return [toDateString(t), toDateString(t)]; } },
    { label: "Last 7 Days", getDates: () => { const t = new Date(); const s = new Date(t); s.setDate(t.getDate() - 6); return [toDateString(s), toDateString(t)]; } },
    { label: "Last 30 Days", getDates: () => { const t = new Date(); const s = new Date(t); s.setDate(t.getDate() - 29); return [toDateString(s), toDateString(t)]; } },
    { label: "This Month", getDates: () => { const t = new Date(); return [`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-01`, toDateString(t)]; } },
    { label: "Last Month", getDates: () => { const t = new Date(); const first = new Date(t.getFullYear(), t.getMonth() - 1, 1); const last = new Date(t.getFullYear(), t.getMonth(), 0); return [toDateString(first), toDateString(last)]; } },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SuperAdminAnalyticsPage() {
    const today = toDateString(new Date());
    const thirtyDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return toDateString(d); })();

    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);
    const [parentOrgFilter, setParentOrgFilter] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [data, setData] = useState<TenantAnalyticsRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [parentOrgs, setParentOrgs] = useState<{ id: string; name: string }[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<keyof TenantAnalyticsRow>("tokens_used");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [res, parentOrgsRes] = await Promise.all([
                api.getTenantAnalytics({
                    start_date: startDate,
                    end_date: endDate,
                    parent_org_id: parentOrgFilter || undefined,
                    branch_id: branchFilter || undefined,
                }),
                api.listParentOrganizations({ limit: 100 })
            ]);
            
            setData(res.items);
            setParentOrgs(parentOrgsRes.items.map(p => ({ id: p.id, name: p.name })));
        } catch (e) {
            console.error("Failed to load tenant analytics", e);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, parentOrgFilter, branchFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const applyQuickRange = (getDates: () => string[]) => {
        const [s, e] = getDates();
        setStartDate(s);
        setEndDate(e);
    };

    const handleSort = (col: keyof TenantAnalyticsRow) => {
        if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortDir("desc"); }
    };

    const sortedFiltered = [...data]
        .filter(r =>
            r.branch_name.toLowerCase().includes(search.toLowerCase()) ||
            (r.parent_org_name || "").toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const av = a[sortBy] ?? 0;
            const bv = b[sortBy] ?? 0;
            if (typeof av === "number" && typeof bv === "number")
                return sortDir === "asc" ? av - bv : bv - av;
            return 0;
        });

    const SortIcon = ({ col }: { col: keyof TenantAnalyticsRow }) => (
        <svg className={`w-3 h-3 inline ml-1 ${sortBy === col ? "text-indigo-400" : "text-slate-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sortBy === col && sortDir === "asc"
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />}
        </svg>
    );

    const totals = sortedFiltered.reduce((acc, r) => ({
        tokens_used: acc.tokens_used + r.tokens_used,
        tokens_skipped_removed: acc.tokens_skipped_removed + r.tokens_skipped_removed,
        messages_sent: acc.messages_sent + r.messages_sent,
    }), { tokens_used: 0, tokens_skipped_removed: 0, messages_sent: 0 });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Tenant Analytics
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Detailed historical usage metrics by branch, with date and organisation filtering.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
                {/* Quick ranges */}
                <div className="flex flex-wrap gap-2">
                    {QUICK_RANGES.map(r => (
                        <button
                            key={r.label}
                            onClick={() => applyQuickRange(r.getDates)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Date + org filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Parent Organisation</label>
                        <select
                            value={parentOrgFilter}
                            onChange={e => { setParentOrgFilter(e.target.value); setBranchFilter(""); }}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                        >
                            <option value="">All Organisations</option>
                            {parentOrgs.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Search Branch</label>
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Branch or org name…"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && data.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Branches Shown", value: sortedFiltered.length, color: "indigo" },
                        { label: "Total Tokens Used", value: totals.tokens_used.toLocaleString(), color: "emerald" },
                        { label: "Total Skipped/Removed", value: totals.tokens_skipped_removed.toLocaleString(), color: "amber" },
                        { label: "Total Messages Sent", value: totals.messages_sent.toLocaleString(), color: "cyan" },
                    ].map(c => (
                        <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                            <p className="text-xs text-slate-400 font-medium mb-1">{c.label}</p>
                            <p className={`text-2xl font-bold text-${c.color}-400`}>{c.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                        {loading ? "Fetching data…" : `Showing ${sortedFiltered.length} of ${data.length} branch(es) · ${startDate} to ${endDate}`}
                    </span>
                    {!loading && sortedFiltered.length > 0 && (
                        <button
                            onClick={() => {
                                const headers = ["Branch", "Parent Org", "Status", "Tokens Used", "Skipped/Removed", "Avg Wait", "Avg Serve", "Peak Hour", "Active Queues", "Active Staff", "Messages Sent"];
                                const rows = sortedFiltered.map(r => [
                                    r.branch_name, r.parent_org_name || "—", r.branch_is_active ? "Active" : "Inactive",
                                    r.tokens_used, r.tokens_skipped_removed, fmtSeconds(r.avg_wait_seconds),
                                    fmtSeconds(r.avg_serve_seconds), fmtHour(r.peak_hour),
                                    r.active_queues, r.active_staff, r.messages_sent
                                ]);
                                const csv = [headers, ...rows].map(row => row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\n");
                                const a = document.createElement("a");
                                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                                a.download = `tenant_analytics_${startDate}_to_${endDate}.csv`;
                                a.click();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Export CSV
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3">Branch</th>
                                <th className="px-5 py-3">Parent Org</th>
                                <th className="px-5 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("tokens_used")}>
                                    Tokens Used <SortIcon col="tokens_used" />
                                </th>
                                <th className="px-5 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("tokens_skipped_removed")}>
                                    Skipped/Removed <SortIcon col="tokens_skipped_removed" />
                                </th>
                                <th className="px-5 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("avg_wait_seconds")}>
                                    Avg Wait <SortIcon col="avg_wait_seconds" />
                                </th>
                                <th className="px-5 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("avg_serve_seconds")}>
                                    Avg Serve <SortIcon col="avg_serve_seconds" />
                                </th>
                                <th className="px-5 py-3">Peak Hour</th>
                                <th className="px-5 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("active_queues")}>
                                    Queues <SortIcon col="active_queues" />
                                </th>
                                <th className="px-5 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("active_staff")}>
                                    Staff <SortIcon col="active_staff" />
                                </th>
                                <th className="px-5 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("messages_sent")}>
                                    Msgs <SortIcon col="messages_sent" />
                                </th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(11)].map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-4 bg-slate-800 rounded w-full" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : sortedFiltered.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            <p className="text-sm">No data found. Try adjusting your date range or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedFiltered.map(row => (
                                <>
                                    <tr
                                        key={row.branch_id}
                                        className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                                        onClick={() => setExpandedRow(expandedRow === row.branch_id ? null : row.branch_id)}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${row.branch_is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                                                <span className="font-semibold text-white">{row.branch_name}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 pl-4">{row.branch_slug}</span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-400 text-xs">{row.parent_org_name || "—"}</td>
                                        <td className="px-5 py-4 font-bold text-emerald-400 tabular-nums">{row.tokens_used.toLocaleString()}</td>
                                        <td className="px-5 py-4 font-semibold text-amber-400/90 tabular-nums">{row.tokens_skipped_removed.toLocaleString()}</td>
                                        <td className="px-5 py-4">
                                            <span className="bg-blue-500/10 text-blue-300 text-xs font-medium px-2 py-0.5 rounded">
                                                {fmtSeconds(row.avg_wait_seconds)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="bg-violet-500/10 text-violet-300 text-xs font-medium px-2 py-0.5 rounded">
                                                {fmtSeconds(row.avg_serve_seconds)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-300 text-xs">{fmtHour(row.peak_hour)}</td>
                                        <td className="px-5 py-4 tabular-nums text-slate-300">{row.active_queues}</td>
                                        <td className="px-5 py-4 tabular-nums text-slate-300">{row.active_staff}</td>
                                        <td className="px-5 py-4 tabular-nums text-cyan-400">{row.messages_sent.toLocaleString()}</td>
                                        <td className="px-5 py-4 text-slate-500">
                                            <svg className={`w-4 h-4 transition-transform ${expandedRow === row.branch_id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </td>
                                    </tr>
                                    {expandedRow === row.branch_id && (
                                        <tr key={`${row.branch_id}-expanded`} className="bg-slate-950/50">
                                            <td colSpan={11} className="px-8 py-5">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {[
                                                        { label: "Branch Status", value: row.branch_is_active ? "Active" : "Inactive", color: row.branch_is_active ? "text-emerald-400" : "text-red-400" },
                                                        { label: "Branch Slug", value: row.branch_slug, color: "text-slate-300" },
                                                        { label: "Parent Organisation", value: row.parent_org_name || "No parent", color: "text-indigo-300" },
                                                        { label: "Total Traffic", value: `${(row.tokens_used + row.tokens_skipped_removed).toLocaleString()} tokens`, color: "text-white" },
                                                        { label: "Completion Rate", value: row.tokens_used + row.tokens_skipped_removed > 0 ? `${Math.round((row.tokens_used / (row.tokens_used + row.tokens_skipped_removed)) * 100)}%` : "—", color: "text-emerald-400" },
                                                        { label: "Avg Wait Time", value: fmtSeconds(row.avg_wait_seconds), color: "text-blue-300" },
                                                        { label: "Avg Serve Time", value: fmtSeconds(row.avg_serve_seconds), color: "text-violet-300" },
                                                        { label: "Peak Busy Hour", value: fmtHour(row.peak_hour), color: "text-amber-300" },
                                                    ].map(item => (
                                                        <div key={item.label} className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                                                            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                                                            <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && sortedFiltered.length > 0 && (
                    <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>{sortedFiltered.length} branch(es) shown</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Historical data · Click row to expand
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
