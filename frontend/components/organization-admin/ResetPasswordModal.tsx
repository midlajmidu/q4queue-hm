import { useState } from "react";
import { api } from "@/lib/api";
import { X, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    branchId: string;
    adminId: string;
    adminName: string;
}

export default function ResetPasswordModal({ isOpen, onClose, branchId, adminId, adminName }: ResetPasswordModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.resetBranchAdminPassword(branchId, adminId, { new_password: newPassword });
            toast.success("Password reset successfully. The admin will be forced to change it on their next login.");
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                            <KeyRound size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Reset Password</h2>
                            <p className="text-sm text-slate-500">For {adminName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-5 text-amber-800">
                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Important</p>
                            <p>Resetting the password will log the user out of any active sessions. They will be required to change this new password immediately upon logging in.</p>
                        </div>
                    </div>

                    <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Temporary Password *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyRound size={16} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                    placeholder="Enter new password"
                                    minLength={8}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="reset-password-form"
                        disabled={isLoading || !newPassword}
                        className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "Reset Password"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
