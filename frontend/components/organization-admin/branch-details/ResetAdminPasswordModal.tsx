"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { X, Key } from "lucide-react";
import { BranchAdminItem } from "@/types/api";

interface ResetAdminPasswordModalProps {
    branchId: string;
    admin: BranchAdminItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ResetAdminPasswordModal({ branchId, admin, isOpen, onClose }: ResetAdminPasswordModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");

    if (!isOpen || !admin) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.resetBranchAdminPassword(branchId, admin.user_id, { new_password: newPassword });
            toast.success(`Password reset successfully for ${admin.name}`);
            onClose();
            setNewPassword("");
        } catch (error: any) {
            toast.error(error.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-lg text-slate-900">Reset Password</h3>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                        Resetting password for <strong>{admin.name}</strong> ({admin.email}). They will be required to change this temporary password on their next login.
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Temporary Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Min. 6 characters"
                        />
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || newPassword.length < 6}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                            {isLoading ? "Resetting..." : "Reset Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
