"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ParentOrganization, OrgAdminCreate } from "@/types/api";
import { api } from "@/lib/api";

interface Props {
    parentOrg: ParentOrganization;
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateOrgAdminModal({ parentOrg, isOpen, onClose }: Props) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<OrgAdminCreate>({
        first_name: "",
        last_name: "",
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createOrganizationAdmin(parentOrg.id, formData);
            toast.success("Organization Admin created successfully");
            onClose();
        } catch (err: any) {
            toast.error(err.detail || "Failed to create admin");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6" style={{ maxHeight: "90vh", overflowY: "auto" }}>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Add Admin to {parentOrg.name}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-slate-600 mb-4">
                        Organization Admins can view analytics across all branches assigned to {parentOrg.name}, but they cannot manage individual branch settings.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? "Creating..." : "Create Admin"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
