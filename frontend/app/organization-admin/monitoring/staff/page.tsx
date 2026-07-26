"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { UserCog, ExternalLink, Users, ShieldAlert, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import BranchSelector from "@/components/organization-admin/BranchSelector";

const avatarColors = ["bg-indigo-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-sky-500","bg-violet-500","bg-pink-500","bg-teal-500"];

export default function StaffMonitoringPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { selectedBranchId } = useBranchFilter();

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedBranchId]);

    const totalPages = Math.max(1, Math.ceil(staff.length / itemsPerPage));
    const paginatedStaff = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return staff.slice(start, start + itemsPerPage);
    }, [staff, currentPage]);

    useEffect(() => {
        const loadData = () => {
            api.getOrgAdminStaff(selectedBranchId || undefined)
                .then(res => {
                    setStaff(res);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        };
        
        loadData();
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
                <LoadingSpinner size="md" />
                <span className="text-sm font-medium">Loading data...</span>
            </div>
        );
    }

    const onlineCount = staff.filter(s => s.status === 'Online').length;
    const adminCount = staff.filter(s => s.role === 'admin' || s.role === 'branch_admin').length;
    const offlineCount = staff.filter(s => s.status === 'Offline').length;

    return (
        <div className="space-y-6">
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Staff Monitoring
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Monitor all staff members and branch admins across the organization.</span>
                    </div>
                </div>
                <div className="shrink-0">
                    <BranchSelector />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Staff</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{staff.length}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{onlineCount} online now</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50/80 border border-indigo-100/80 flex items-center justify-center shrink-0">
                        <Users size={18} className="text-indigo-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Branch Admins</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{adminCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">of {staff.length} total staff</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50/80 border border-emerald-100/80 flex items-center justify-center shrink-0">
                        <ShieldCheck size={18} className="text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Offline</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{offlineCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Currently inactive</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50/80 border border-rose-100/80 flex items-center justify-center shrink-0">
                        <ShieldAlert size={18} className="text-rose-600" />
                    </div>
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <UserCog size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Organization Staff</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{staff.length} total members</p>
                        </div>
                    </div>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white">
                    {paginatedStaff.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                <UserCog size={24} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">No staff members found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting the branch filter.</p>
                        </div>
                    ) : (
                        paginatedStaff.map((s: any, idx: number) => {
                            const avatarBg = avatarColors[s.name.charCodeAt(0) % avatarColors.length];
                            return (
                                <div key={idx} className="p-4 space-y-4 hover:bg-slate-50/60 transition-colors">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 text-sm leading-snug">{s.name}</h4>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${
                                                    s.role === 'admin' || s.role === 'branch_admin'
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {s.role}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                            s.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'
                                        }`}>
                                            {s.status === 'Online' && (
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {s.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                                        <div className="flex justify-between items-center py-0.5">
                                            <span className="text-slate-500 font-medium">Branch</span>
                                            <span className="font-semibold text-slate-900">{s.branch}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-1.5">
                                            <span className="text-slate-500 font-medium">Email</span>
                                            <span className="font-semibold text-slate-800 break-all select-all">{s.email}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-1.5">
                                            <span className="text-slate-500 font-medium">Added Date</span>
                                            <span className="font-semibold text-slate-900">
                                                {new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <a
                                        href={`/${s.branch_slug}/dashboard`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                    >
                                        Open Branch View
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                                <th className="px-6 py-3.5">Staff Member</th>
                                <th className="px-6 py-3.5">Email</th>
                                <th className="px-6 py-3.5">Branch</th>
                                <th className="px-6 py-3.5">Role</th>
                                <th className="px-6 py-3.5">Added Date</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                            <UserCog size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">No staff members found</p>
                                        <p className="text-xs text-slate-400 mt-1">Try adjusting the branch filter.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedStaff.map((s: any, idx: number) => {
                                    const avatarBg = avatarColors[s.name.charCodeAt(0) % avatarColors.length];
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                        {s.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-500">{s.email}</td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-700">{s.branch}</td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    s.role === 'admin' || s.role === 'branch_admin'
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {s.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-500">
                                                {new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    s.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {s.status === 'Online' && (
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                        </span>
                                                    )}
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <a
                                                    href={`/${s.branch_slug}/dashboard`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                                >
                                                    <ExternalLink size={13} />
                                                    Branch
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-white">
                        <div className="text-xs text-slate-500">
                            Showing <span className="font-semibold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, staff.length)}</span> of <span className="font-semibold text-slate-900">{staff.length}</span> staff members
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
                                {currentPage} / {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
