"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Save, Building2, Palette, UploadCloud, X, Loader2, Mail, Phone, MapPin, Building } from "lucide-react";
import ImageCropper from "@/components/ImageCropper";
import ConfirmModal from "@/components/ConfirmModal";

export default function OrganizationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [selectedImageForCrop, setSelectedImageForCrop] = useState<File | null>(null);
    const [isRemoveLogoModalOpen, setIsRemoveLogoModalOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const [formData, setFormData] = useState({
        name: "",
        contact_email: "",
        contact_phone: "",
        address: "",
        timezone: "UTC",
        logo_url: "",
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.getOrgAdminSettings();
                setFormData({
                    name: data.name || "",
                    contact_email: data.contact_email || "",
                    contact_phone: data.contact_phone || "",
                    address: data.address || "",
                    timezone: data.timezone || "UTC",
                    logo_url: data.logo_url || "",
                });
            } catch (err: any) {
                toast.error("Failed to load organization settings");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);


    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.name || formData.name.trim() === "") {
            newErrors.name = "Organization name is required.";
        } else if (formData.name.length < 2) {
            newErrors.name = "Organization name must be at least 2 characters long.";
        } else if (formData.name.length > 50) {
            newErrors.name = "Organization name cannot exceed 50 characters.";
        }

        if (!formData.contact_email || formData.contact_email.trim() === "") {
            newErrors.contact_email = "Contact email is required.";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.contact_email)) {
                newErrors.contact_email = "Please enter a valid email address (e.g., admin@example.com).";
            }
        }

        if (formData.contact_phone && formData.contact_phone.trim() !== "") {
            const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
            if (!phoneRegex.test(formData.contact_phone) || formData.contact_phone.length < 5) {
                newErrors.contact_phone = "Please enter a valid phone number.";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error("Please fix the validation errors before saving.");
            return;
        }

        setSaving(true);
        try {
            // Clean up payload to avoid backend validation errors on empty strings
            const payload = {
                ...formData,
                contact_email: formData.contact_email?.trim() === "" ? null : formData.contact_email,
                contact_phone: formData.contact_phone?.trim() === "" ? null : formData.contact_phone,
            };

            await api.updateOrgAdminSettings(payload as any);
            Swal.fire({
                showConfirmButton: false,
                timer: 2500,
                backdrop: 'rgba(15, 23, 42, 0.4)',
                customClass: {
                    popup: 'rounded-[32px] shadow-[0_10px_50px_-10px_rgba(0,0,0,0.15)] border border-slate-100/50 p-1 bg-white overflow-hidden w-full max-w-sm',
                    htmlContainer: 'm-0 p-0',
                },
                html: `
                    <div class="px-6 py-10 flex flex-col items-center text-center">
                        <div class="w-16 h-16 bg-emerald-50 rounded-[20px] flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-emerald-500 animate-in zoom-in duration-500 delay-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight mb-2">Settings Saved</h3>
                        <p class="text-[14px] font-medium text-slate-500 leading-relaxed px-4">Your organization settings have been updated successfully.</p>
                    </div>
                `,
                showClass: {
                    popup: 'animate-in zoom-in-[0.95] fade-in-0 duration-300 ease-out'
                },
                hideClass: {
                    popup: 'animate-out zoom-out-[0.95] fade-out-0 duration-200 ease-in'
                }
            });
        } catch (err: any) {
            // Provide a cleaner error message if it's a backend validation error
            let errMsg = err.message || "Failed to update settings";
            if (errMsg.includes("valid email address")) errMsg = "Please enter a valid email address.";
            if (errMsg.includes("contact_email")) errMsg = "Invalid email format.";
            toast.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Please upload a valid image (JPG, PNG, WebP, SVG)");
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5 MB");
            return;
        }

        setSelectedImageForCrop(file);
        
        // Reset the input so the same file can be selected again
        e.target.value = '';
    };

    const processLogoUpload = async (file: File) => {
        setSelectedImageForCrop(null);
        setUploadingLogo(true);
        try {
            const data = await api.uploadOrgAdminLogo(file);
            const newFormData = { ...formData, logo_url: data.logo_url };
            setFormData(newFormData);
            
            // Auto-save settings after logo upload
            await api.updateOrgAdminSettings(newFormData);
            toast.success("Logo uploaded and saved successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to upload logo");
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleRemoveLogo = async () => {
        setIsRemoveLogoModalOpen(false);
        const newFormData = { ...formData, logo_url: "" };
        setFormData(newFormData);
        try {
            await api.updateOrgAdminSettings(newFormData);
            toast.success("Logo removed successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to remove logo");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Organization Settings
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Manage global settings for your enterprise and all branches.</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8" noValidate>
                {/* General Information Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-shadow hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
                    <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <Building2 size={18} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 leading-tight">General Information</h2>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">Primary details and contact information</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <div className="px-6 py-6 flex flex-col md:flex-row gap-4 md:gap-8 border-b border-slate-100/80">
                            <div className="md:w-1/3 shrink-0">
                                <label className="block text-sm font-semibold text-slate-900">Organization Name</label>
                                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">This is your organization's primary identifier and visible name across the platform.</p>
                            </div>
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Building size={16} className={errors.name ? "text-red-400" : "text-slate-400"} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({...formData, name: e.target.value});
                                            if (errors.name) setErrors({...errors, name: ""});
                                        }}
                                        className={`w-full pl-10 pr-4 py-2 bg-slate-50 border ${errors.name ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-900 bg-red-50/50" : "border-slate-200 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"} rounded-lg focus:outline-none focus:ring-2 text-sm font-medium transition-all`}
                                    />
                                </div>
                                {errors.name && <p className="text-[13px] font-medium text-red-500 mt-1.5 flex items-center gap-1.5">{errors.name}</p>}
                            </div>
                        </div>

                        <div className="px-6 py-6 flex flex-col md:flex-row gap-4 md:gap-8 border-b border-slate-100/80">
                            <div className="md:w-1/3 shrink-0">
                                <label className="block text-sm font-semibold text-slate-900">Contact Email</label>
                                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">Used for administrative notifications, billing, and primary communications.</p>
                            </div>
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail size={16} className={errors.contact_email ? "text-red-400" : "text-slate-400"} />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => {
                                            setFormData({...formData, contact_email: e.target.value});
                                            if (errors.contact_email) setErrors({...errors, contact_email: ""});
                                        }}
                                        className={`w-full pl-10 pr-4 py-2 bg-slate-50 border ${errors.contact_email ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-900 bg-red-50/50" : "border-slate-200 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"} rounded-lg focus:outline-none focus:ring-2 text-sm font-medium transition-all`}
                                    />
                                </div>
                                {errors.contact_email && <p className="text-[13px] font-medium text-red-500 mt-1.5 flex items-center gap-1.5">{errors.contact_email}</p>}
                            </div>
                        </div>

                        <div className="px-6 py-6 flex flex-col md:flex-row gap-4 md:gap-8 border-b border-slate-100/80">
                            <div className="md:w-1/3 shrink-0">
                                <label className="block text-sm font-semibold text-slate-900">Support Phone</label>
                                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">The direct contact number for organizational support or administrative queries.</p>
                            </div>
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Phone size={16} className={errors.contact_phone ? "text-red-400" : "text-slate-400"} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.contact_phone}
                                        onChange={(e) => {
                                            setFormData({...formData, contact_phone: e.target.value});
                                            if (errors.contact_phone) setErrors({...errors, contact_phone: ""});
                                        }}
                                        className={`w-full pl-10 pr-4 py-2 bg-slate-50 border ${errors.contact_phone ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-900 bg-red-50/50" : "border-slate-200 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"} rounded-lg focus:outline-none focus:ring-2 text-sm font-medium transition-all`}
                                    />
                                </div>
                                {errors.contact_phone && <p className="text-[13px] font-medium text-red-500 mt-1.5 flex items-center gap-1.5">{errors.contact_phone}</p>}
                            </div>
                        </div>

                        <div className="px-6 py-6 flex flex-col md:flex-row gap-4 md:gap-8">
                            <div className="md:w-1/3 shrink-0">
                                <label className="block text-sm font-semibold text-slate-900">Head Office Address</label>
                                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">The primary physical location or headquarters of your organization.</p>
                            </div>
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <div className="absolute top-2.5 left-0 pl-3.5 flex items-start pointer-events-none">
                                        <MapPin size={16} className="text-slate-400" />
                                    </div>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 font-medium transition-all resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-[13px] text-slate-500">Update your primary organization details.</p>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            <Save size={16} />
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>

                {/* Branding & Identity Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-shadow hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
                    <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0">
                            <Palette size={18} className="text-pink-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 leading-tight">Branding & Identity</h2>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">Customize your organization's visual presence</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <div className="px-6 py-6 flex flex-col md:flex-row gap-4 md:gap-8">
                            <div className="md:w-1/3 shrink-0">
                                <label className="block text-sm font-semibold text-slate-900">Organization Logo</label>
                                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                                    Displayed in the sidebar for you and all branch administrators. We recommend a square image (at least 256x256px) with a transparent background. Max size: 5MB.
                                </p>
                            </div>
                            <div className="flex-1 max-w-md">
                                {formData.logo_url ? (
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4">
                                        <div className="w-20 h-20 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className="cursor-pointer text-white flex flex-col items-center gap-1 w-full h-full justify-center">
                                                    <UploadCloud size={16} />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
                                                    <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                                </label>
                                            </div>
                                            <img src={formData.logo_url} alt="Organization Logo" className="w-full h-full object-contain p-1.5" />
                                        </div>
                                        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
                                            <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm text-[13px] font-semibold text-slate-700 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors w-full sm:w-fit">
                                                {uploadingLogo ? <Loader2 size={15} className="animate-spin text-indigo-500" /> : <UploadCloud size={15} className="text-slate-400" />}
                                                {uploadingLogo ? "Uploading..." : "Upload New Image"}
                                                <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setIsRemoveLogoModalOpen(true)}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-transparent text-[13px] font-medium text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors w-full sm:w-fit"
                                            >
                                                Remove Logo
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50/30 hover:bg-indigo-50/50 hover:border-indigo-400 transition-all group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform group-hover:border-indigo-200 group-hover:text-indigo-600">
                                                {uploadingLogo ? (
                                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                                ) : (
                                                    <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                )}
                                            </div>
                                            <p className="mb-1 text-[13px] font-semibold text-slate-700">
                                                {uploadingLogo ? "Uploading image..." : "Click to upload image"}
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-medium">SVG, PNG, JPG or WebP</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                        <p className="text-[13px] text-slate-500">Logo updates are saved automatically.</p>
                    </div>
                </div>
            </form>
            
            {/* Cropper Modal */}
            {selectedImageForCrop && (
                <ImageCropper
                    imageFile={selectedImageForCrop}
                    onCropComplete={processLogoUpload}
                    onCancel={() => setSelectedImageForCrop(null)}
                />
            )}

            {/* Remove Confirmation Modal */}
            <ConfirmModal
                isOpen={isRemoveLogoModalOpen}
                title="Remove Organization Logo"
                message="Are you sure you want to remove the organization logo? This action cannot be undone."
                confirmLabel="Remove Logo"
                confirmVariant="danger"
                onConfirm={handleRemoveLogo}
                onCancel={() => setIsRemoveLogoModalOpen(false)}
            />
        </div>
    );
}
