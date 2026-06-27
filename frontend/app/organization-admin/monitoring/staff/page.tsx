"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { UserCog, ExternalLink, Users, ShieldAlert, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";

export default function StaffMonitoringPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { selectedBranchId } = useBranchFilter();

    // Reset to page 1 when filter changes
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
        const interval = setInterval(loadData, 15000); // 15s polling
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Staff Monitoring</h1>
                <p className="text-sm text-slate-500 mt-1">Monitor all staff members and branch admins across the organization.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Staff</p>
                        <p className="text-2xl font-bold text-slate-900">{staff.length}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Branch Admins</p>
                        <p className="text-2xl font-bold text-slate-900">{staff.filter(s => s.role === 'admin' || s.role === 'branch_admin').length}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Offline Staff</p>
                        <p className="text-2xl font-bold text-slate-900">{staff.filter(s => s.status === 'Offline').length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <UserCog size={18} className="text-indigo-600" />
                        Organization Staff
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Branch</th>
                                <th className="p-4">Staff Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4 text-center">Role</th>
                                <th className="p-4 text-center">Added Date</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        No staff members found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStaff.map((s: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-900">{s.branch}</div>
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">{s.name}</td>
                                        <td className="p-4 text-slate-600">{s.email}</td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 uppercase">
                                                {s.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-slate-600">
                                            {new Date(s.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                s.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-700 border border-slate-200'
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
                                        <td className="p-4 text-right">
                                            <a
                                                href={`/${s.branch_slug}/dashboard`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                                Branch
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                        <div className="text-xs text-slate-500">
                            Showing <span className="font-medium text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, staff.length)}</span> of <span className="font-medium text-slate-900">{staff.length}</span> staff members
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="px-2 text-xs font-medium text-slate-600">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
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
