"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge, EditOrgModal, SecureDeleteModal, ConfirmStatusModal } from "@/components/super-admin/OrgModals";
import type { OrgAnalyticsDetail, OrgDetail } from "@/types/api";

export default function SuperAdminAnalyticsPage() {
    const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
    const [activeTab, setActiveTab] = useState<"active" | "test">("active");
    const [data, setData] = useState<OrgAnalyticsDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal states
    const [editOrg, setEditOrg] = useState<OrgDetail | null>(null);
    const [deleteOrg, setDeleteOrg] = useState<OrgDetail | null>(null);
    const [statusOrg, setStatusOrg] = useState<OrgDetail | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const loadData = async (tf: "daily" | "weekly" | "monthly", isTest: boolean) => {
        setLoading(true);
        try {
            const res = await api.getOrgAnalytics(tf, isTest);
            setData(res.items || []);
        } catch (error) {
            console.error("Failed to load analytics", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(timeframe, activeTab === "test");
    }, [timeframe, activeTab]);

    const handleImpersonate = async (id: string, slug: string) => {
        try {
            const res = await api.impersonateOrganization(id);
            if (res.access_token) {
                // Clear any existing org tokens
                document.cookie.split(";").forEach((c) => {
                    const eqPos = c.indexOf("=");
                    const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
                    if (name.startsWith("qrq_token_")) {
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    }
                });
                // Set the new org token
                document.cookie = `qrq_token_${slug}=${res.access_token}; path=/; max-age=86400; SameSite=Lax`;
                window.location.href = `/${slug}/dashboard`;
            }
        } catch (error) {
            console.error("Impersonation failed:", error);
            alert("Failed to impersonate organization");
        }
    };

    const handleOrgSaved = (updated: OrgDetail) => {
        setData(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
        setEditOrg(null);
    };

    const handleOrgDeleted = async () => {
        if (!deleteOrg) return;
        setIsUpdating(true);
        try {
            await api.deleteOrganization(deleteOrg.id);
            setData(prev => prev.filter(o => o.id !== deleteOrg.id));
            setDeleteOrg(null);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete organization");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStatusConfirm = async () => {
        if (!statusOrg) return;
        setIsUpdating(true);
        try {
            const updated = await api.updateOrganization(statusOrg.id, {
                org_name: statusOrg.name,
                org_slug: statusOrg.slug,
                is_active: !statusOrg.is_active,
                max_sessions: statusOrg.max_sessions,
                max_queues_per_session: statusOrg.max_queues_per_session,
                max_staff: statusOrg.max_staff
            });
            setData(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
            setStatusOrg(null);
        } catch (error) {
            console.error("Status update failed:", error);
            alert("Failed to update organization status");
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredData = data.filter(d => 
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Organization Analytics
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Detailed usage metrics and performance across all organizations.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex bg-slate-950 p-1 rounded-xl shrink-0 border border-slate-800">
                        <button
                            onClick={() => setActiveTab("active")}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === "active" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
                        >
                            Active Orgs
                        </button>
                        <button
                            onClick={() => setActiveTab("test")}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === "test" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
                        >
                            Test Orgs
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search organization..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Timeframe Toggles */}
                    <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0">
                        {(["daily", "weekly", "monthly"] as const).map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                                    timeframe === tf
                                        ? "bg-slate-800 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Queue Entries</th>
                                <th className="px-6 py-4">Customers Served</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Avg Wait Time</th>
                                <th className="px-6 py-4">Peak Usage Time</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-400">
                                            <svg className="animate-spin w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading analytics...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-200">
                                            {org.name}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums font-semibold text-slate-300">
                                            {org.queue_entries.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums font-semibold text-emerald-400">
                                            {org.customers_served.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4"><Badge active={org.is_active} /></td>
                                        <td className="px-6 py-4 text-amber-400/90 font-medium text-xs">
                                            <span className="bg-amber-400/10 px-2 py-1 rounded">
                                                {org.average_wait_time}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-indigo-300 font-medium text-xs">
                                            <span className="bg-indigo-400/10 border border-indigo-400/20 px-2 py-1 rounded-md">
                                                {org.peak_usage_time}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => window.location.href = `/super-admin/usage?org=${org.id}`} aria-label={`View Usage ${org.name}`} title="Usage Monitoring" className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No organizations found for the selected timeframe.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Status */}
                <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing metrics for {filteredData.length} organization(s)</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Data is live
                    </span>
                </div>
            </div>
            {editOrg && <EditOrgModal org={editOrg} onClose={() => setEditOrg(null)} onSaved={handleOrgSaved} />}
            {deleteOrg && <SecureDeleteModal org={deleteOrg} onClose={() => setDeleteOrg(null)} onConfirm={handleOrgDeleted} isDeleting={isUpdating} />}
            {statusOrg && <ConfirmStatusModal org={statusOrg} onClose={() => setStatusOrg(null)} onConfirm={handleStatusConfirm} isUpdating={isUpdating} />}
        </div>
    );
}
