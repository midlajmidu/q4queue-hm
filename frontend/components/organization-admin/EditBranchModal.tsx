import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { X, Building2, Link as LinkIcon, MapPin, Phone, Palette, ChevronDown, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    branch: any;
}

const COUNTRY_CODES = [
    { code: '+91', country: 'India', flag: '🇮🇳', placeholder: '9876543210', maxLength: 10 },
    { code: '+1', country: 'US/CA', flag: '🇺🇸', placeholder: '5551234567', maxLength: 10 },
    { code: '+44', country: 'UK', flag: '🇬🇧', placeholder: '7712345678', maxLength: 10 },
    { code: '+971', country: 'UAE', flag: '🇦🇪', placeholder: '501234567', maxLength: 9 },
    { code: '+61', country: 'Australia', flag: '🇦🇺', placeholder: '412345678', maxLength: 9 },
    { code: '+65', country: 'Singapore', flag: '🇸🇬', placeholder: '81234567', maxLength: 8 },
];

export default function EditBranchModal({ isOpen, onClose, onUpdated, branch }: EditBranchModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        address: "",
        phone_number: "",
        brand_color: "#4f46e5",
        is_active: true,
    });
    const [countryCode, setCountryCode] = useState('+91');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmationName, setDeleteConfirmationName] = useState("");

    useEffect(() => {
        if (branch && isOpen) {
            let phone = branch.phone_number || "";
            let matchedCode = "+91";
            for (const c of COUNTRY_CODES) {
                if (phone.startsWith(c.code)) {
                    matchedCode = c.code;
                    phone = phone.slice(c.code.length);
                    break;
                }
            }
            setCountryCode(matchedCode);
            setFormData({
                name: branch.name || "",
                slug: branch.slug || "",
                address: branch.address || "",
                phone_number: phone,
                brand_color: branch.brand_color || "#4f46e5",
                is_active: branch.is_active !== undefined ? branch.is_active : branch.health !== 'Offline',
            });
            setShowDeleteConfirm(false);
            setDeleteConfirmationName("");
        }
    }, [branch, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const originalIsActive = branch.is_active !== undefined ? branch.is_active : branch.health !== 'Offline';

            // 1. Update general details
            await api.updateBranch(branch.id, {
                name: formData.name,
                address: formData.address,
                phone_number: formData.phone_number ? `${countryCode}${formData.phone_number}` : "",
            });

            // 2. Update status if changed
            if (originalIsActive !== formData.is_active) {
                await api.updateBranchStatus(branch.id, formData.is_active);
            }

            toast.success("Branch updated successfully");
            onUpdated();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to update branch");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }
        
        setIsDeleting(true);
        try {
            await api.deleteBranch(branch.id);
            toast.success("Branch deleted successfully");
            onUpdated();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete branch");
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
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
                    <form id="edit-branch-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* General Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-6 h-px bg-slate-200"></span>
                                General Information
                                <span className="flex-1 h-px bg-slate-200"></span>
                            </h3>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm"
                                    placeholder="e.g. Downtown Clinic"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">URL Slug</label>
                                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center font-mono">
                                    <span className="text-slate-400 mr-1">q4queue.com/</span>
                                    <span className="font-semibold text-slate-800">{formData.slug}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    URL slugs cannot be changed once created.
                                </p>
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
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all duration-200 resize-none shadow-sm"
                                        placeholder="Branch address"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number (For WhatsApp Updates)</label>
                                <div className="flex rounded-xl shadow-sm border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all duration-200">
                                    <div className="relative flex items-center bg-slate-100/50 border-r border-slate-200">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="h-full py-2.5 pl-3 pr-8 bg-transparent text-slate-600 text-sm font-medium focus:outline-none appearance-none cursor-pointer z-10"
                                        >
                                            {COUNTRY_CODES.map(c => (
                                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-2 pointer-events-none text-slate-400">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                    <input
                                        type="tel"
                                        value={formData.phone_number}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            const maxLen = COUNTRY_CODES.find(c => c.code === countryCode)?.maxLength || 10;
                                            if (val.length <= maxLen) {
                                                setFormData(prev => ({ ...prev, phone_number: val }));
                                            }
                                        }}
                                        className="flex-1 w-full px-3.5 py-2.5 bg-transparent text-sm outline-none"
                                        placeholder={COUNTRY_CODES.find(c => c.code === countryCode)?.placeholder || "Phone number"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-8">
                            {/* Configuration Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-6 h-px bg-slate-200"></span>
                                Configuration
                                <span className="flex-1 h-px bg-slate-200"></span>
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch Status</label>
                                    <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-3.5 rounded-xl shadow-sm">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-bold ${formData.is_active ? 'text-slate-900' : 'text-slate-500'}`}>
                                                {formData.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-0.5">
                                                {formData.is_active ? 'Visible to users' : 'Hidden from users'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ${
                                                formData.is_active ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    formData.is_active ? 'translate-x-6' : 'translate-x-1'
                                                } shadow-sm`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="pt-6 mt-6 border-t border-slate-200">
                            <h3 className="text-sm font-bold text-red-600 mb-4 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Danger Zone
                            </h3>
                            <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">Delete Branch</h4>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            Permanently remove this branch and all its data. This action cannot be undone.
                                        </p>
                                    </div>
                                    {!showDeleteConfirm && (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-red-50 text-red-700 hover:bg-red-100 border border-transparent"
                                        >
                                            Delete Branch
                                        </button>
                                    )}
                                </div>
                                
                                {showDeleteConfirm && (
                                    <div className="p-4 bg-red-50/80 border-t border-red-100">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
                                                <AlertCircle size={18} />
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-bold text-red-900">Are you absolutely sure?</h5>
                                                <p className="text-sm text-red-700 mt-1">
                                                    This action cannot be undone. This will permanently delete the <strong>{branch.name}</strong> branch and remove all associated data.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Please type <span className="font-mono font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-900">{branch.name}</span> to confirm.
                                            </label>
                                            <input
                                                type="text"
                                                value={deleteConfirmationName}
                                                onChange={(e) => setDeleteConfirmationName(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all mb-4"
                                                placeholder={branch.name}
                                            />
                                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowDeleteConfirm(false);
                                                        setDeleteConfirmationName("");
                                                    }}
                                                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDelete}
                                                    disabled={isDeleting || deleteConfirmationName !== branch.name}
                                                    className="w-full sm:w-auto px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                                >
                                                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                    Permanently Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-branch-form"
                        disabled={isLoading || !formData.name}
                        className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
