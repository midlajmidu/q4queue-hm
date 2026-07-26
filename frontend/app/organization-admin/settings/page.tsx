"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Save, Building2, Palette, UploadCloud, Loader2, Mail, Phone, MapPin, Building, Clock, RotateCcw } from "lucide-react";
import ImageCropper from "@/components/ImageCropper";
import ConfirmModal from "@/components/ConfirmModal";

const TIMEZONES = [
    { value: "UTC", label: "UTC — Coordinated Universal Time" },
    { value: "Asia/Kolkata", label: "Asia/Kolkata — IST (UTC+5:30)" },
    { value: "Asia/Dubai", label: "Asia/Dubai — GST (UTC+4:00)" },
    { value: "Asia/Singapore", label: "Asia/Singapore — SGT (UTC+8:00)" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo — JST (UTC+9:00)" },
    { value: "Asia/Riyadh", label: "Asia/Riyadh — AST (UTC+3:00)" },
    { value: "Asia/Dhaka", label: "Asia/Dhaka — BST (UTC+6:00)" },
    { value: "Asia/Colombo", label: "Asia/Colombo — IST (UTC+5:30)" },
    { value: "Asia/Karachi", label: "Asia/Karachi — PKT (UTC+5:00)" },
    { value: "Europe/London", label: "Europe/London — GMT/BST" },
    { value: "Europe/Paris", label: "Europe/Paris — CET (UTC+1:00)" },
    { value: "Europe/Berlin", label: "Europe/Berlin — CET (UTC+1:00)" },
    { value: "America/New_York", label: "America/New_York — EST (UTC-5:00)" },
    { value: "America/Chicago", label: "America/Chicago — CST (UTC-6:00)" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles — PST (UTC-8:00)" },
    { value: "Australia/Sydney", label: "Australia/Sydney — AEDT (UTC+11:00)" },
    { value: "Pacific/Auckland", label: "Pacific/Auckland — NZST (UTC+12:00)" },
];

type FormData = {
    name: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    timezone: string;
    logo_url: string;
};

const defaultForm: FormData = {
    name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    timezone: "UTC",
    logo_url: "",
};

export default function OrganizationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [selectedImageForCrop, setSelectedImageForCrop] = useState<File | null>(null);
    const [isRemoveLogoModalOpen, setIsRemoveLogoModalOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<FormData>(defaultForm);
    const [savedData, setSavedData] = useState<FormData>(defaultForm);

    const isDirty = JSON.stringify(formData) !== JSON.stringify(savedData);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.getOrgAdminSettings();
                const loaded: FormData = {
                    name: data.name || "",
                    contact_email: data.contact_email || "",
                    contact_phone: data.contact_phone || "",
                    address: data.address || "",
                    timezone: data.timezone || "UTC",
                    logo_url: data.logo_url || "",
                };
                setFormData(loaded);
                setSavedData(loaded);
            } catch (err: any) {
                toast.error("Failed to load organization settings");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const resetForm = useCallback(() => {
        setFormData(savedData);
        setErrors({});
    }, [savedData]);

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
            const payload = {
                ...formData,
                contact_email: formData.contact_email?.trim() === "" ? null : formData.contact_email,
                contact_phone: formData.contact_phone?.trim() === "" ? null : formData.contact_phone,
            };

            await api.updateOrgAdminSettings(payload as any);
            setSavedData({ ...formData });

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
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight mb-2">Settings Saved</h3>
                        <p class="text-[14px] font-medium text-slate-500 leading-relaxed px-4">Your organization settings have been updated successfully.</p>
                    </div>
                `,
                showClass: { popup: 'animate-in zoom-in-[0.95] fade-in-0 duration-300 ease-out' },
                hideClass: { popup: 'animate-out zoom-out-[0.95] fade-out-0 duration-200 ease-in' }
            });
        } catch (err: any) {
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
        e.target.value = '';
    };

    const processLogoUpload = async (file: File) => {
        setSelectedImageForCrop(null);
        setUploadingLogo(true);
        try {
            const data = await api.uploadOrgAdminLogo(file);
            const newFormData = { ...formData, logo_url: data.logo_url };
            setFormData(newFormData);
            await api.updateOrgAdminSettings(newFormData);
            setSavedData(newFormData);
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
            setSavedData(newFormData);
            toast.success("Logo removed successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to remove logo");
        }
    };

    const inputClass = (field: string) =>
        `w-full pl-10 pr-4 py-2.5 bg-white border ${
            errors[field]
                ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-900"
                : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
        } rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all placeholder:text-slate-400`;

    if (loading) {
        return (
            <div className="space-y-8 pb-20 animate-pulse">
                <div className="pb-6 border-b border-slate-200/60">
                    <div className="h-8 w-56 bg-slate-200 rounded-lg mb-3" />
                    <div className="h-4 w-80 bg-slate-100 rounded-lg" />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 h-72 w-full shadow-sm" />
                <div className="bg-white rounded-2xl border border-slate-200 h-52 w-full shadow-sm" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 pb-28">
                {/* Premium Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b border-slate-200/60">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                            Organization Settings
                        </h1>
                        <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                            <span className="leading-none font-medium text-slate-500">Manage global settings for your enterprise and all branches.</span>
                        </div>
                    </div>
                </div>

                <form id="settings-form" onSubmit={handleSave} className="space-y-8" noValidate>
                    {/* General Information Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                <Building2 size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 leading-tight">General Information</h2>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">Primary details and contact information</p>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {/* Organization Name */}
                            <div className="px-8 py-7 flex flex-col md:flex-row gap-6 md:gap-10">
                                <div className="md:w-1/3 shrink-0">
                                    <label className="block text-sm font-semibold text-slate-800">Organization Name</label>
                                    <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">Your organization's primary identifier visible across the platform.</p>
                                </div>
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Building size={15} className={errors.name ? "text-red-400" : "text-slate-400"} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="e.g. Acme Corporation"
                                            value={formData.name}
                                            onChange={(e) => {
                                                setFormData({ ...formData, name: e.target.value });
                                                if (errors.name) setErrors({ ...errors, name: "" });
                                            }}
                                            className={inputClass("name")}
                                        />
                                    </div>
                                    {errors.name && <p className="text-[13px] font-medium text-red-500 mt-1.5">{errors.name}</p>}
                                </div>
                            </div>

                            {/* Contact Email */}
                            <div className="px-8 py-7 flex flex-col md:flex-row gap-6 md:gap-10">
                                <div className="md:w-1/3 shrink-0">
                                    <label className="block text-sm font-semibold text-slate-800">Contact Email</label>
                                    <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">Used for administrative notifications, billing, and primary communications.</p>
                                </div>
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail size={15} className={errors.contact_email ? "text-red-400" : "text-slate-400"} />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="admin@example.com"
                                            value={formData.contact_email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, contact_email: e.target.value });
                                                if (errors.contact_email) setErrors({ ...errors, contact_email: "" });
                                            }}
                                            className={inputClass("contact_email")}
                                        />
                                    </div>
                                    {errors.contact_email && <p className="text-[13px] font-medium text-red-500 mt-1.5">{errors.contact_email}</p>}
                                </div>
                            </div>

                            {/* Support Phone */}
                            <div className="px-8 py-7 flex flex-col md:flex-row gap-6 md:gap-10">
                                <div className="md:w-1/3 shrink-0">
                                    <label className="block text-sm font-semibold text-slate-800">Support Phone <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">The direct contact number for organizational support.</p>
                                </div>
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Phone size={15} className={errors.contact_phone ? "text-red-400" : "text-slate-400"} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="+1 (555) 000-0000"
                                            value={formData.contact_phone}
                                            onChange={(e) => {
                                                setFormData({ ...formData, contact_phone: e.target.value });
                                                if (errors.contact_phone) setErrors({ ...errors, contact_phone: "" });
                                            }}
                                            className={inputClass("contact_phone")}
                                        />
                                    </div>
                                    {errors.contact_phone && <p className="text-[13px] font-medium text-red-500 mt-1.5">{errors.contact_phone}</p>}
                                </div>
                            </div>

                            {/* Timezone */}
                            <div className="px-8 py-7 flex flex-col md:flex-row gap-6 md:gap-10">
                                <div className="md:w-1/3 shrink-0">
                                    <label className="block text-sm font-semibold text-slate-800">Default Timezone</label>
                                    <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">Timezone used for all scheduling, reports, and timestamps across branches.</p>
                                </div>
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Clock size={15} className="text-slate-400" />
                                        </div>
                                        <select
                                            value={formData.timezone}
                                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-900 transition-all appearance-none cursor-pointer"
                                        >
                                            {TIMEZONES.map((tz) => (
                                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Head Office Address */}
                            <div className="px-8 py-7 flex flex-col md:flex-row gap-6 md:gap-10">
                                <div className="md:w-1/3 shrink-0">
                                    <label className="block text-sm font-semibold text-slate-800">Head Office Address <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">The primary physical location or headquarters of your organization.</p>
                                </div>
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none">
                                            <MapPin size={15} className="text-slate-400" />
                                        </div>
                                        <textarea
                                            value={formData.address}
                                            placeholder="123 Enterprise Way, City, Country"
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 font-medium transition-all resize-none placeholder:text-slate-400"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branding & Identity Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0">
                                <Palette size={18} className="text-pink-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 leading-tight">Branding & Identity</h2>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">Customize your organization's visual presence</p>
                            </div>
                        </div>

                        <div className="px-8 py-7 flex flex-col md:flex-row gap-6 md:gap-10">
                            <div className="md:w-1/3 shrink-0">
                                <label className="block text-sm font-semibold text-slate-800">Organization Logo</label>
                                <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">
                                    Displayed in the sidebar for you and all branch administrators. Recommended: square image at least 256×256px with transparent background. Max 5MB.
                                </p>
                                <p className="text-[11px] text-slate-400 mt-2 font-medium">Supported: SVG, PNG, JPG, WebP</p>
                            </div>
                            <div className="flex-1 max-w-lg">
                                {formData.logo_url ? (
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-slate-50/60 border border-slate-200/60 rounded-2xl p-5">
                                        <div className="w-24 h-24 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                                <label className="cursor-pointer text-white flex flex-col items-center gap-1 w-full h-full justify-center">
                                                    <UploadCloud size={16} />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
                                                    <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                                </label>
                                            </div>
                                            <img src={formData.logo_url} alt="Organization Logo" className="w-full h-full object-contain p-2" />
                                        </div>
                                        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
                                            <p className="text-[13px] font-semibold text-slate-700">Logo uploaded</p>
                                            <p className="text-[12px] text-slate-400">Hover the image to change it, or use the options below.</p>
                                            <div className="flex flex-col gap-2 mt-1">
                                                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all w-full sm:w-fit">
                                                    {uploadingLogo ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <UploadCloud size={14} className="text-slate-400" />}
                                                    {uploadingLogo ? "Uploading..." : "Upload New Image"}
                                                    <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsRemoveLogoModalOpen(true)}
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 hover:text-red-700 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-all w-full sm:w-fit"
                                                >
                                                    Remove Logo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-gradient-to-b from-slate-50 to-white hover:from-indigo-50/60 hover:to-white hover:border-indigo-400 transition-all group">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform group-hover:border-indigo-200">
                                                {uploadingLogo ? (
                                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                                ) : (
                                                    <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[13px] font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                                    {uploadingLogo ? "Uploading image..." : "Click to upload logo"}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">SVG, PNG, JPG or WebP · Max 5MB</p>
                                            </div>
                                        </div>
                                        <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100">
                            <p className="text-[12px] text-slate-400 font-medium">Logo updates are saved automatically and do not require the Save Changes button.</p>
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

            {/* Sticky Save Bar — visible only when there are unsaved changes */}
            {isDirty && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.1)]">
                    <div className="max-w-screen-2xl mx-auto px-8 py-4 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <p className="text-sm font-medium text-slate-600">You have unsaved changes.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <RotateCcw size={13} />
                                Discard
                            </button>
                            <button
                                type="submit"
                                form="settings-form"
                                disabled={saving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
