"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { BranchAdminItem } from "@/types/api";
import AssignAdminModal from "./AssignAdminModal";
import ResetAdminPasswordModal from "./ResetAdminPasswordModal";
import { Shield, Plus, Key } from "lucide-react";

export default function BranchAdminsOverview({ branchId }: { branchId: string }) {
    const [data, setData] = useState<BranchAdminItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [resetAdmin, setResetAdmin] = useState<BranchAdminItem | null>(null);

    const loadAdmins = useCallback(() => {
        setLoading(true);
        api.getBranchAdminsOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    useEffect(() => {
        loadAdmins();
    }, [loadAdmins]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-lg tracking-tight text-slate-900">Branch Admins</span>
                </div>
                <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    Assign Admin
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 border-b border-slate-100/70 text-slate-500 font-medium">
                        <tr>
                            <th className="px-5 py-3.5 font-medium">Name</th>
                            <th className="px-5 py-3.5 font-medium">Email</th>
                            <th className="px-5 py-3.5 text-center font-medium">Status</th>
                            <th className="px-5 py-3.5 text-center font-medium">Role</th>
                            <th className="px-5 py-3.5 font-medium">Last Login</th>
                            <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70">
                        {data.map((admin, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3.5 font-medium text-slate-900">{admin.name}</td>
                                <td className="px-5 py-3.5 text-slate-600">{admin.email}</td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase ${admin.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                        {admin.status}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center text-slate-600 capitalize">
                                    {admin.role.replace('_', ' ')}
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 text-xs">
                                    {admin.last_login && admin.last_login !== 'Never' 
                                        ? new Date(admin.last_login).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) 
                                        : 'Never'}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <button
                                        onClick={() => setResetAdmin(admin)}
                                        title="Reset Password"
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        <Key size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-10 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Shield className="w-12 h-12 mb-3 text-slate-300" />
                                        <p className="text-sm font-medium text-slate-500">No branch admins assigned</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AssignAdminModal 
                branchId={branchId}
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSuccess={loadAdmins}
            />

            <ResetAdminPasswordModal
                branchId={branchId}
                admin={resetAdmin}
                isOpen={!!resetAdmin}
                onClose={() => setResetAdmin(null)}
            />
        </div>
    );
}
