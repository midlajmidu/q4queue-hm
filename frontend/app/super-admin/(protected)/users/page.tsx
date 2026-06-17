"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { GlobalUserDetail } from "@/types/api";

export default function GlobalStaffSearchPage() {
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [role, setRole] = useState("");
    const [logs, setLogs] = useState<GlobalUserDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const limit = 20;

    const [isUpdating, setIsUpdating] = useState(false);
    const [resetPasswordMessage, setResetPasswordMessage] = useState<{ user_id: string, temp_password: string } | null>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQ(q), 500);
        return () => clearTimeout(timer);
    }, [q]);

    const loadData = useCallback(async (currentOffset: number, searchQ: string, filterRole: string) => {
        setLoading(true);
        try {
            const res = await api.searchGlobalUsers(searchQ, limit, currentOffset);
            // If API didn't support role filtering we could filter client side, but since it does:
            // Actually our API supports role but we need to pass it.
            // Wait, we didn't add role to the api.ts client method signature!
            // Let's filter client side for now, or just let them search. 
            // We'll filter client-side just in case if role is set.
            let items = res.items || [];
            if (filterRole) {
                items = items.filter(u => u.role === filterRole);
            }
            setLogs(items);
            setTotal(res.total || 0);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        setOffset(0); // reset offset on search change
        loadData(0, debouncedQ, role);
    }, [debouncedQ, role, loadData]);

    useEffect(() => {
        // Just for pagination
        if (offset > 0) {
            loadData(offset, debouncedQ, role);
        }
    }, [offset, debouncedQ, role, loadData]);

    const handleResetPassword = async (user: GlobalUserDetail) => {
        if (!confirm(`Are you sure you want to reset the password for ${user.first_name || user.email}?`)) return;
        setIsUpdating(true);
        try {
            const res = await api.resetUserPassword(user.id);
            setResetPasswordMessage({ user_id: user.id, temp_password: res.temporary_password });
        } catch (error) {
            console.error(error);
            alert("Failed to reset password.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleStatus = async (user: GlobalUserDetail) => {
        const action = user.is_active ? "suspend" : "activate";
        if (!confirm(`Are you sure you want to ${action} ${user.first_name || user.email}?`)) return;
        setIsUpdating(true);
        try {
            await api.toggleUserStatus(user.id);
            setLogs(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
        } catch (error) {
            console.error(error);
            alert(`Failed to ${action} user.`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleImpersonate = async (orgId: string | null, orgSlug: string | null) => {
        if (!orgId || !orgSlug) return;
        try {
            const res = await api.impersonateOrganization(orgId);
            if (res.access_token) {
                document.cookie.split(";").forEach((c) => {
                    const eqPos = c.indexOf("=");
                    const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
                    if (name.startsWith("qrq_token_")) {
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    }
                });
                document.cookie = `qrq_token_${orgSlug}=${res.access_token}; path=/; max-age=86400; SameSite=Lax`;
                window.location.href = `/${orgSlug}/dashboard`;
            }
        } catch (error) {
            console.error("Impersonation failed:", error);
            alert("Failed to impersonate organization");
        }
    };

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        };
    };

    const getRoleColor = (roleStr: string) => {
        const r = roleStr.toLowerCase();
        if (r === 'admin') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        if (r === 'staff') return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Global Staff Directory
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Search, suspend, or reset passwords for any user across the platform.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    
                    {/* Search */}
                    <div className="relative flex-1 w-full max-w-2xl">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name or email address..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex bg-slate-950 p-1 rounded-xl shrink-0 border border-slate-800">
                        {['', 'admin', 'staff'].map(r => (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${role === r ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
                            >
                                {r || "All Roles"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-400">
                                            <svg className="animate-spin w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Searching system...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length > 0 ? (
                                logs.map(user => {
                                    const { date, time } = formatDate(user.created_at);
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 shrink-0 shadow-sm">
                                                        {(user.first_name || user.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors flex items-center gap-2">
                                                            {user.first_name} {user.last_name}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border capitalize ${getRoleColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.org_name ? (
                                                    <button onClick={() => handleImpersonate(user.org_id, user.org_slug)} className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors group/org">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                        <span className="font-medium text-sm border-b border-transparent group-hover/org:border-emerald-400/30 pb-0.5">{user.org_name}</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-500 italic text-xs">Super Admin</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    {user.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1.5 relative">
                                                    
                                                    {resetPasswordMessage?.user_id === user.id && (
                                                        <div className="absolute right-full mr-4 bg-emerald-950 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 whitespace-nowrap shadow-xl z-10 animate-in slide-in-from-right-4">
                                                            <span className="text-emerald-500 font-sans text-[10px] uppercase tracking-wider">Temp Password:</span>
                                                            <span className="select-all font-bold tracking-wider">{resetPasswordMessage.temp_password}</span>
                                                            <button onClick={() => setResetPasswordMessage(null)} className="ml-1 text-emerald-600 hover:text-emerald-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                        </div>
                                                    )}

                                                    <button 
                                                        onClick={() => handleResetPassword(user)} 
                                                        disabled={isUpdating}
                                                        aria-label="Reset Password" 
                                                        title="Generate Temporary Password" 
                                                        className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                                    </button>
                                                    
                                                    {user.org_id && (
                                                        <button 
                                                            onClick={() => handleToggleStatus(user)} 
                                                            disabled={isUpdating}
                                                            aria-label={user.is_active ? "Suspend User" : "Activate User"} 
                                                            title={user.is_active ? "Suspend Account" : "Activate Account"} 
                                                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${user.is_active ? 'text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10' : 'text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                                                        >
                                                            {user.is_active ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                            <p className="text-base font-medium text-slate-400">No staff found matching '{q}'</p>
                                            <p className="text-sm mt-1">Try adjusting your search or role filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                            Showing <span className="font-semibold text-slate-300">{Math.min(offset + 1, total)}</span> to <span className="font-semibold text-slate-300">{Math.min(offset + limit, total)}</span> of <span className="font-semibold text-slate-300">{total}</span> users
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                disabled={offset === 0}
                                className="px-3 py-1.5 text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setOffset(offset + limit)}
                                disabled={offset + limit >= total}
                                className="px-3 py-1.5 text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
