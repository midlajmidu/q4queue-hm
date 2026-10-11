"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrgDetail, OrgUpdateRequest, OrgCreateRequest } from "@/types/api";

// ── Status Badge ─────────────────────────────────────────────────────────────
export function Badge({ active }: { active: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
export function EditOrgModal({ org, onClose, onSaved }: { org: OrgDetail; onClose: () => void; onSaved: (u: OrgDetail) => void }) {
    const [form, setForm] = useState<OrgUpdateRequest>({
        org_name: org.name,
        org_slug: org.slug,
        branch_type: org.branch_type || "standard",
        appointment_feature_enabled: org.appointment_feature_enabled || false,
        ai_overview_enabled: org.ai_overview_enabled ?? false,
        is_active: org.is_active,
        max_sessions: org.max_sessions ?? 10,
        max_queues_per_session: org.max_queues_per_session ?? 20,
        max_staff: org.max_staff ?? 5,
        admin_email: org.admin_email || ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            const payload = { ...form };
            delete payload.branch_type; // Branch type is permanently set at creation
            if (payload.admin_email === org.admin_email || payload.admin_email === "") {
                delete payload.admin_email; // Don't send if unchanged or empty
            }
            onSaved(await api.updateOrganization(org.id, payload));
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : "Failed to update organization.");
        } finally {
            setIsSaving(false);
        }
    }, [org, form, onSaved]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-white tracking-tight">Edit Branch</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Update branch details, capacity limits, and capabilities</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Close dialog"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="px-6 pt-4">
                        <div role="alert" className="bg-red-500/10 text-red-400 text-xs font-medium p-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    </div>
                )}

                {/* Form Body (Scrollable) */}
                <form id="edit-org-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto" noValidate>
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="edit-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                                Branch Name <span className="text-violet-400">*</span>
                            </label>
                            <input 
                                id="edit-name" 
                                type="text" 
                                value={form.org_name} 
                                onChange={(e) => setForm(f => ({ ...f, org_name: e.target.value }))} 
                                required 
                                disabled={isSaving} 
                                className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 px-3.5 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-slug" className="block text-xs font-medium text-slate-300 mb-1.5">
                                Slug <span className="text-violet-400">*</span>
                            </label>
                            <input 
                                id="edit-slug" 
                                type="text" 
                                value={form.org_slug} 
                                onChange={(e) => setForm(f => ({ ...f, org_slug: e.target.value.toLowerCase() }))} 
                                required 
                                disabled={isSaving} 
                                className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 px-3.5 py-2 text-sm font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                            />
                        </div>
                    </div>

                    {/* Branch Type (Read-only / Minimal Locked Presentation) */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Branch Type</label>
                        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                            <div className="flex items-center gap-2.5">
                                <span className="text-base select-none">{org.branch_type === "dine" ? "🍽️" : "🎮"}</span>
                                <div>
                                    <span className="text-xs font-semibold text-slate-200 block">
                                        {org.branch_type === "dine" ? "Hotel & Dine" : "Gaming & Arcades"}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        {org.branch_type === "dine" ? "Tables & Pax seating system" : "Station & token queue system"}
                                    </span>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Locked
                            </span>
                        </div>
                    </div>

                    {/* Admin Email */}
                    <div>
                        <label htmlFor="edit-email" className="block text-xs font-medium text-slate-300 mb-1.5">Admin Email</label>
                        <input 
                            id="edit-email" 
                            type="email" 
                            value={form.admin_email || ""} 
                            onChange={(e) => setForm(f => ({ ...f, admin_email: e.target.value.toLowerCase() }))} 
                            disabled={isSaving} 
                            placeholder="admin@example.com" 
                            className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 px-3.5 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                        />
                    </div>

                    {/* Capacity Limits Grid */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Capacity Limits</label>
                        <div className="grid grid-cols-3 gap-2.5">
                            <div>
                                <span className="block text-[11px] text-slate-400 mb-1">Max Sessions</span>
                                <input 
                                    id="edit-max-sessions" 
                                    type="number" 
                                    min="1" 
                                    value={form.max_sessions || ""} 
                                    onChange={(e) => setForm(f => ({ ...f, max_sessions: parseInt(e.target.value) || 0 }))} 
                                    required 
                                    disabled={isSaving} 
                                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <span className="block text-[11px] text-slate-400 mb-1">Max Queues</span>
                                <input 
                                    id="edit-max-queues" 
                                    type="number" 
                                    min="1" 
                                    value={form.max_queues_per_session || ""} 
                                    onChange={(e) => setForm(f => ({ ...f, max_queues_per_session: parseInt(e.target.value) || 0 }))} 
                                    required 
                                    disabled={isSaving} 
                                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <span className="block text-[11px] text-slate-400 mb-1">Max Staff</span>
                                <input 
                                    id="edit-max-staff" 
                                    type="number" 
                                    min="1" 
                                    value={form.max_staff || ""} 
                                    onChange={(e) => setForm(f => ({ ...f, max_staff: parseInt(e.target.value) || 0 }))} 
                                    required 
                                    disabled={isSaving} 
                                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Settings & Capabilities */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Settings & Capabilities</label>
                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 divide-y divide-slate-800/60 overflow-hidden">
                            {/* Branch Status */}
                            <div className="flex items-center justify-between p-3 sm:px-3.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-white">Branch Status</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${form.is_active ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-slate-400 bg-slate-800 border border-slate-700/50"}`}>
                                            {form.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Control staff and customer access to this branch</p>
                                </div>
                                <button 
                                    type="button" 
                                    role="switch" 
                                    aria-checked={form.is_active} 
                                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} 
                                    disabled={isSaving} 
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${form.is_active ? "bg-emerald-500" : "bg-slate-700"}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${form.is_active ? "translate-x-4.5" : "translate-x-1"}`} />
                                </button>
                            </div>

                            {/* Appointment System */}
                            <div className="flex items-center justify-between p-3 sm:px-3.5">
                                <div>
                                    <span className="text-xs font-medium text-white block">Appointment System</span>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Enable advance reservations and public booking portal</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.appointment_feature_enabled}
                                    onClick={() => setForm(f => ({ ...f, appointment_feature_enabled: !f.appointment_feature_enabled }))}
                                    disabled={isSaving}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${form.appointment_feature_enabled ? "bg-violet-600" : "bg-slate-700"}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${form.appointment_feature_enabled ? "translate-x-4.5" : "translate-x-1"}`} />
                                </button>
                            </div>

                            {/* AI Queue Overview */}
                            <div className="flex items-center justify-between p-3 sm:px-3.5">
                                <div>
                                    <span className="text-xs font-medium text-white block">AI Queue Intelligence</span>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Predictive wait times and AI queue pacing insights</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.ai_overview_enabled}
                                    onClick={() => setForm(f => ({ ...f, ai_overview_enabled: !f.ai_overview_enabled }))}
                                    disabled={isSaving}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${form.ai_overview_enabled ? "bg-violet-600" : "bg-slate-700"}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${form.ai_overview_enabled ? "translate-x-4.5" : "translate-x-1"}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isSaving} 
                        className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="edit-org-form" 
                        disabled={isSaving || !form.org_name || !form.org_slug} 
                        className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] rounded-lg transition-all shadow-sm shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Secure Delete Modal ───────────────────────────────────────────────────────
export function SecureDeleteModal({ org, onClose, onConfirm, isDeleting }: { org: OrgDetail; onClose: () => void; onConfirm: () => void; isDeleting: boolean }) {
    const [typed, setTyped] = useState("");
    const matches = typed === org.name;

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !isDeleting) onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose, isDeleting]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={!isDeleting ? onClose : undefined} />
            <div className="relative w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl shadow-black/60 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white tracking-tight">Delete Branch</h2>
                        <p className="text-xs text-slate-400 mt-0.5">This action is permanent and cannot be undone.</p>
                    </div>
                </div>

                <p className="text-xs text-slate-300">
                    To confirm deletion of this branch and all its queues, enter its name:
                    <span className="block mt-1.5 font-mono text-xs font-semibold text-white bg-slate-950/80 rounded-lg px-2.5 py-1.5 border border-slate-800 select-all">
                        {org.name}
                    </span>
                </p>

                <input
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="Type branch name to confirm"
                    disabled={isDeleting}
                    autoFocus
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-colors"
                />

                <div className="flex gap-2.5 pt-1">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isDeleting} 
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        disabled={isDeleting || !matches} 
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Deleting...
                            </span>
                        ) : (
                            "Delete Permanently"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Confirm Status Modal ──────────────────────────────────────────────────────
export function ConfirmStatusModal({ org, onClose, onConfirm, isUpdating }: { org: OrgDetail; onClose: () => void; onConfirm: () => void; isUpdating: boolean }) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !isUpdating) onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose, isUpdating]);

    const isSuspending = org.is_active;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={!isUpdating ? onClose : undefined} />
            <div className={`relative w-full max-w-sm bg-slate-900 border ${isSuspending ? 'border-amber-500/30' : 'border-emerald-500/30'} rounded-2xl shadow-2xl shadow-black/60 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200`}>
                <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isSuspending ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
                        {isSuspending ? (
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white tracking-tight">{isSuspending ? "Suspend" : "Activate"} Branch</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{isSuspending ? "Temporarily disable access." : "Restore branch access."}</p>
                    </div>
                </div>

                <p className="text-xs text-slate-300">
                    Are you sure you want to {isSuspending ? "suspend" : "activate"} <span className="font-semibold text-white">{org.name}</span>?
                    {isSuspending ? " Staff and customers will immediately lose access until reactivated." : " Staff and customers will regain access immediately."}
                </p>

                <div className="flex gap-2.5 pt-1">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isUpdating} 
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        disabled={isUpdating} 
                        className={`flex-1 py-2 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSuspending ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                        }`}
                    >
                        {isUpdating ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Updating...
                            </span>
                        ) : (
                            isSuspending ? "Suspend Branch" : "Activate Branch"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Create Modal ────────────────────────────────────────────────────────────────
export function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState<OrgCreateRequest>({
        org_name: "",
        org_slug: "",
        branch_type: "standard",
        appointment_feature_enabled: false,
        ai_overview_enabled: false,
        admin_email: "",
        admin_password: "",
        parent_organization_id: "",
        max_sessions: 10,
        max_queues_per_session: 20,
        max_staff: 5
    });
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [parentOrgs, setParentOrgs] = useState<any[]>([]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    useEffect(() => {
        api.getGlobalSettings().then(settings => {
            setForm(f => ({
                ...f,
                max_sessions: settings.default_session_limit || 10,
                max_queues_per_session: settings.default_queue_limit || 20,
            }));
        }).catch(err => console.error("Failed to load global limits:", err));

        api.listParentOrganizations({ limit: 100 }).then(res => {
            setParentOrgs(res.items || []);
        }).catch(err => console.error("Failed to load parent orgs:", err));
    }, []);

    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
        setForm(f => ({ ...f, org_name: name, org_slug: slug }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await api.createOrganization(form);
            onCreated();
        } catch (err) {
            setSubmitError(err instanceof ApiError ? err.detail : "Failed to create branch.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-white tracking-tight">Create Branch</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Provision a new branch and configure manager access</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Close dialog"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {submitError && (
                    <div className="px-6 pt-4">
                        <div role="alert" className="bg-red-500/10 text-red-400 text-xs font-medium p-3 rounded-xl border border-red-500/20">
                            {submitError}
                        </div>
                    </div>
                )}

                {/* Form Body (Scrollable) */}
                <form id="create-org-form" onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto" noValidate>
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="create-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                                Branch Name <span className="text-violet-400">*</span>
                            </label>
                            <input 
                                id="create-name" 
                                type="text" 
                                value={form.org_name} 
                                onChange={(e) => handleNameChange(e.target.value)} 
                                placeholder="Sunrise Arena" 
                                required 
                                disabled={isSubmitting} 
                                className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 px-3.5 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                            />
                        </div>
                        <div>
                            <label htmlFor="create-slug" className="block text-xs font-medium text-slate-300 mb-1.5">
                                Slug <span className="text-violet-400">*</span>
                            </label>
                            <input 
                                id="create-slug" 
                                type="text" 
                                value={form.org_slug} 
                                onChange={(e) => setForm(f => ({ ...f, org_slug: e.target.value.toLowerCase() }))} 
                                placeholder="sunrise-arena" 
                                required 
                                disabled={isSubmitting} 
                                className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 px-3.5 py-2 text-sm font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                            />
                        </div>
                    </div>

                    {/* Branch Type Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-medium text-slate-300">
                                Branch Type / Operating Mode <span className="text-violet-400">*</span>
                            </label>
                            <span className="text-[11px] text-slate-500">Fixed after creation</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, branch_type: "standard" }))}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    form.branch_type !== "dine"
                                        ? "bg-violet-600/15 border-violet-500 text-white shadow-sm ring-1 ring-violet-500/20"
                                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                                }`}
                            >
                                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <span>🎮</span> Gaming & Arcades
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">Tokens & gaming stations</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, branch_type: "dine" }))}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    form.branch_type === "dine"
                                        ? "bg-amber-500/15 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/20"
                                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                                }`}
                            >
                                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <span>🍽️</span> Hotel & Dine
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">Tables & pax seating</p>
                            </button>
                        </div>
                    </div>

                    {/* Parent Organization */}
                    <div>
                        <label htmlFor="create-parent-org" className="block text-xs font-medium text-slate-300 mb-1.5">
                            Parent Organization <span className="text-violet-400">*</span>
                        </label>
                        <select
                            id="create-parent-org"
                            value={form.parent_organization_id}
                            onChange={(e) => setForm(f => ({ ...f, parent_organization_id: e.target.value }))}
                            required
                            disabled={isSubmitting}
                            className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white px-3.5 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all"
                        >
                            <option value="" disabled className="bg-slate-900 text-slate-400">Select a Parent Organization</option>
                            {parentOrgs.map(parent => (
                                <option key={parent.id} value={parent.id} className="bg-slate-900 text-white">{parent.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Capacity Limits Grid */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Capacity Limits</label>
                        <div className="grid grid-cols-3 gap-2.5">
                            <div>
                                <span className="block text-[11px] text-slate-400 mb-1">Max Sessions</span>
                                <input 
                                    id="create-max-sessions" 
                                    type="number" 
                                    min="1" 
                                    value={form.max_sessions || ""} 
                                    onChange={(e) => setForm(f => ({ ...f, max_sessions: parseInt(e.target.value) || 0 }))} 
                                    required 
                                    disabled={isSubmitting} 
                                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <span className="block text-[11px] text-slate-400 mb-1">Max Queues</span>
                                <input 
                                    id="create-max-queues" 
                                    type="number" 
                                    min="1" 
                                    value={form.max_queues_per_session || ""} 
                                    onChange={(e) => setForm(f => ({ ...f, max_queues_per_session: parseInt(e.target.value) || 0 }))} 
                                    required 
                                    disabled={isSubmitting} 
                                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <span className="block text-[11px] text-slate-400 mb-1">Max Staff</span>
                                <input 
                                    id="create-max-staff" 
                                    type="number" 
                                    min="1" 
                                    value={form.max_staff || ""} 
                                    onChange={(e) => setForm(f => ({ ...f, max_staff: parseInt(e.target.value) || 0 }))} 
                                    required 
                                    disabled={isSubmitting} 
                                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Capabilities & Features */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Capabilities & Features</label>
                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 divide-y divide-slate-800/60 overflow-hidden">
                            {/* Appointment System */}
                            <div className="flex items-center justify-between p-3 sm:px-3.5">
                                <div>
                                    <span className="text-xs font-medium text-white block">Appointment System</span>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Enable advance reservations and public booking portal</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.appointment_feature_enabled}
                                    onClick={() => setForm(f => ({ ...f, appointment_feature_enabled: !f.appointment_feature_enabled }))}
                                    disabled={isSubmitting}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${form.appointment_feature_enabled ? "bg-violet-600" : "bg-slate-700"}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${form.appointment_feature_enabled ? "translate-x-4.5" : "translate-x-1"}`} />
                                </button>
                            </div>

                            {/* AI Queue Overview */}
                            <div className="flex items-center justify-between p-3 sm:px-3.5">
                                <div>
                                    <span className="text-xs font-medium text-white block">AI Queue Intelligence</span>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Predictive wait times and AI queue pacing insights</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.ai_overview_enabled}
                                    onClick={() => setForm(f => ({ ...f, ai_overview_enabled: !f.ai_overview_enabled }))}
                                    disabled={isSubmitting}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${form.ai_overview_enabled ? "bg-violet-600" : "bg-slate-700"}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${form.ai_overview_enabled ? "translate-x-4.5" : "translate-x-1"}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Manager Account */}
                    <div className="pt-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-300">Manager Account Credentials</span>
                            <span className="h-px bg-slate-800 flex-1" />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="create-admin-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Manager Email <span className="text-violet-400">*</span>
                                </label>
                                <input 
                                    id="create-admin-email" 
                                    type="email" 
                                    value={form.admin_email} 
                                    onChange={(e) => setForm(f => ({ ...f, admin_email: e.target.value.toLowerCase() }))} 
                                    placeholder="manager@example.com" 
                                    required 
                                    autoComplete="off" 
                                    disabled={isSubmitting} 
                                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 px-3.5 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <label htmlFor="create-admin-password" title="Password" className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Manager Password <span className="text-violet-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="create-admin-password"
                                        type={showAdminPassword ? "text" : "password"}
                                        value={form.admin_password}
                                        onChange={(e) => setForm(f => ({ ...f, admin_password: e.target.value }))}
                                        placeholder="••••••••"
                                        required
                                        autoComplete="new-password"
                                        minLength={6}
                                        disabled={isSubmitting}
                                        className="w-full rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-500 pl-3.5 pr-10 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowAdminPassword(!showAdminPassword)} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none"
                                        aria-label={showAdminPassword ? "Hide password" : "Show password"}
                                    >
                                        {showAdminPassword ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isSubmitting} 
                        className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="create-org-form" 
                        disabled={isSubmitting || !form.org_name || !form.org_slug || !form.admin_email || !form.admin_password || !form.parent_organization_id} 
                        className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] rounded-lg transition-all shadow-sm shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating...
                            </span>
                        ) : (
                            "Create Branch"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
