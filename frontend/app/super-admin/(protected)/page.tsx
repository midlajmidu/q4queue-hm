"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { OrgStats, PlatformAnalytics } from "@/types/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ActivityFeed from "@/components/ActivityFeed";
import SystemAnnouncementsPanel from "@/components/super-admin/SystemAnnouncementsPanel";

// ── Shared Helpers ────────────────────────────────────────────────────────────
function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Stats Cards ───────────────────────────────────────────────────────────────
function StatsCards({ stats, analytics, loading }: { stats: OrgStats | null; analytics: PlatformAnalytics | null; loading: boolean }) {
    const cards = [
        { label: "Total Branches", value: stats?.total, color: "violet", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
        { label: "Active Branches", value: stats?.active, color: "emerald", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
    // Stats
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

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

    useEffect(() => { loadStats(); }, [loadStats]);

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Super Admin Panel</h1>
                    <p className="text-sm text-slate-400">Platform overview and analytics.</p>
                </div>
                <Link href="/super-admin/branches" className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20">
                    + Create Branch
                </Link>
            </div>

            {/* Stats Cards */}
            <StatsCards stats={stats} analytics={analytics} loading={statsLoading} />

            {/* Branch Growth Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-base font-semibold text-white mb-6">Branch Growth Over Time</h2>
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

            {/* ── Activity Feed ────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <ActivityFeed />
            </div>
        </div>
    );
}
