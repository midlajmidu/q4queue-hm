"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { UserCog, ExternalLink, Users, ShieldAlert, ShieldCheck } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";

export default function StaffMonitoringPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { selectedBranchId } = useBranchFilter();

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
                        <p className="text-sm font-medium text-slate-500">Inactive Staff</p>
                        <p className="text-2xl font-bold text-slate-900">{staff.filter(s => s.status === 'Inactive').length}</p>
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
                            {staff.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No staff members found.
                                    </td>
                                </tr>
                            ) : (
                                staff.map((s: any, idx: number) => (
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
                                            {new Date(s.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                s.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                            }`}>
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
            </div>
        </div>
    );
}
