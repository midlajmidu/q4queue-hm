import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { X, Building2, Link as LinkIcon, MapPin, Phone, Palette } from "lucide-react";
import { toast } from "sonner";

interface EditBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    branch: any;
}

export default function EditBranchModal({ isOpen, onClose, onUpdated, branch }: EditBranchModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        address: "",
        phone_number: "",
        brand_color: "#4f46e5",
    });

    useEffect(() => {
        if (branch && isOpen) {
            setFormData({
                name: branch.name || "",
                slug: branch.slug || "",
                address: branch.address || "",
                phone_number: branch.phone_number || "",
                brand_color: branch.brand_color || "#4f46e5",
            });
        }
    }, [branch, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.updateBranch(branch.id, {
                name: formData.name,
                address: formData.address,
                phone_number: formData.phone_number,
                brand_color: formData.brand_color,
            });
            toast.success("Branch updated successfully");
            onUpdated();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to update branch");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Edit Branch</h2>
                            <p className="text-sm text-slate-500">Update branch details and settings</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                    <form id="edit-branch-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                placeholder="e.g. Downtown Clinic"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch URL Slug</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LinkIcon size={16} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    disabled
                                    value={formData.slug}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 outline-none cursor-not-allowed font-mono"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">URL slugs cannot be changed once created.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                                    <MapPin size={16} className="text-slate-400" />
                                </div>
                                <textarea
                                    rows={2}
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                    placeholder="Branch address"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone size={16} className="text-slate-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={formData.phone_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand Color</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Palette size={16} className="text-slate-400" />
                                    </div>
                                    <input
                                        type="color"
                                        value={formData.brand_color}
                                        onChange={(e) => setFormData(prev => ({ ...prev, brand_color: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                                    />
                                </div>
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
                        form="edit-branch-form"
                        disabled={isLoading || !formData.name}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
