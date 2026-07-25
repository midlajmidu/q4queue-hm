"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { BranchAdminItem } from "@/types/api";
import AssignAdminModal from "./AssignAdminModal";
import ResetAdminPasswordModal from "./ResetAdminPasswordModal";
import { Shield, Plus, Key, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDateTime } from "@/lib/tzformat";

export default function BranchAdminsOverview({ branchId, data, onUpdate }: { branchId: string, data: BranchAdminItem[], onUpdate: () => void }) {
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [resetAdmin, setResetAdmin] = useState<BranchAdminItem | null>(null);
    const tz = useBranchTimezone();

    const [adminToDelete, setAdminToDelete] = useState<BranchAdminItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const confirmDelete = async () => {
        if (!adminToDelete) return;
        setIsDeleting(true);
        try {
            await api.deleteOrgAdminStaff(adminToDelete.user_id);
            toast.success("Admin removed successfully");
            setAdminToDelete(null);
            onUpdate();
        } catch (error: any) {
            toast.error(error.message || "Failed to remove admin");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!data) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield size={16} strokeWidth={2} className="text-slate-400" />
                    <h3 className="font-semibold text-slate-900 text-sm">Branch Admins</h3>
                </div>
                <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
                >
                    <Plus size={14} strokeWidth={2} />
                    Assign Admin
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Name</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Email</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Status</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Role</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Last Login</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((admin, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 text-sm font-medium text-slate-900">{admin.name}</td>
                                <td className="px-5 py-3 text-sm text-slate-600">{admin.email}</td>
                                <td className="px-5 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${admin.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        <span className="text-xs font-medium text-slate-600">{admin.status}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center text-sm text-slate-600 capitalize">
                                    {admin.role.replace('_', ' ')}
                                </td>
                                <td className="px-5 py-3 text-slate-500 text-xs">
                                    {admin.last_login && admin.last_login !== 'Never' 
                                        ? fmtDateTime(admin.last_login, tz) 
                                        : 'Never'}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => setResetAdmin(admin)}
                                            title="Reset Password"
                                            className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                                        >
                                            <Key size={14} strokeWidth={2} />
                                        </button>
                                        <button
                                            onClick={() => setAdminToDelete(admin)}
                                            title="Remove Admin"
                                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                                        >
                                            <Trash2 size={14} strokeWidth={2} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-10 text-center">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                                            <Shield size={16} strokeWidth={2} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mb-0.5">No branch admins assigned</p>
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
                onSuccess={onUpdate}
            />

            <ResetAdminPasswordModal
                branchId={branchId}
                admin={resetAdmin}
                isOpen={!!resetAdmin}
                onClose={() => setResetAdmin(null)}
            />

            {adminToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-semibold text-lg text-slate-900">Remove Admin</h3>
                            <button onClick={() => setAdminToDelete(null)} disabled={isDeleting} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-slate-600 mb-5">
                                Are you sure you want to remove <strong>{adminToDelete.name}</strong> as a branch admin? They will lose access to this branch immediately.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setAdminToDelete(null)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                    Remove Admin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
