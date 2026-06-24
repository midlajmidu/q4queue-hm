"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User } from "@/types/api";

export default function EditAdminModal({ admin, onClose, onSaved }: { admin: User, onClose: () => void, onSaved: () => void }) {
    const [formData, setFormData] = useState({
        first_name: admin.first_name || "",
        last_name: admin.last_name || "",
        email: admin.email || "",
        new_password: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload: any = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
        };
        
        if (formData.new_password) {
            if (formData.new_password.length < 8) {
                toast.error("Password must be at least 8 characters");
                return;
            }
            payload.new_password = formData.new_password;
        }

        setIsSubmitting(true);
        try {
            await api.updateUser(admin.id, payload);
            toast.success("Admin details updated successfully");
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err.detail || "Failed to update admin");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white tracking-tight">Edit Admin</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">First Name</label>
                        <input
                            type="text"
                            required
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Last Name</label>
                        <input
                            type="text"
                            required
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">New Password (Optional)</label>
                        <input
                            type="password"
                            value={formData.new_password}
                            onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                            placeholder="Leave blank to keep current password"
                            className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-500"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                            ) : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
