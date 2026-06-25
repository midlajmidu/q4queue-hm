"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrgDetail, OrgUpdateRequest, OrgCreateRequest } from "@/types/api";

// ── Badge ──────────────────────────────────────────────────────────────────
export function Badge({ active }: { active: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
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
        setIsSaving(true); setError(null);
        try { 
            const payload = { ...form };
            if (payload.admin_email === org.admin_email || payload.admin_email === "") {
                delete payload.admin_email; // Don't send if unchanged or empty
            }
            onSaved(await api.updateOrganization(org.id, payload)); 
        }
        catch (err) { setError(err instanceof ApiError ? err.detail : "Failed to update organization."); }
        finally { setIsSaving(false); }
    }, [org, form, onSaved]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit Organization
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                {error && <div role="alert" className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
                        <input id="edit-name" type="text" value={form.org_name} onChange={(e) => setForm(f => ({ ...f, org_name: e.target.value }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="edit-slug" className="block text-sm font-medium text-slate-300 mb-1.5">Slug</label>
                        <input id="edit-slug" type="text" value={form.org_slug} onChange={(e) => setForm(f => ({ ...f, org_slug: e.target.value.toLowerCase() }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="edit-email" className="block text-sm font-medium text-slate-300 mb-1.5">Admin Email</label>
                        <input id="edit-email" type="email" value={form.admin_email || ""} onChange={(e) => setForm(f => ({ ...f, admin_email: e.target.value.toLowerCase() }))} disabled={isSaving} placeholder="admin@example.com" className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="edit-max-sessions" className="block text-sm font-medium text-slate-300 mb-1.5">Max Sessions</label>
                            <input id="edit-max-sessions" type="number" min="1" value={form.max_sessions || ""} onChange={(e) => setForm(f => ({ ...f, max_sessions: parseInt(e.target.value) || 0 }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="edit-max-queues" className="block text-sm font-medium text-slate-300 mb-1.5">Max Queues</label>
                            <input id="edit-max-queues" type="number" min="1" value={form.max_queues_per_session || ""} onChange={(e) => setForm(f => ({ ...f, max_queues_per_session: parseInt(e.target.value) || 0 }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="edit-max-staff" className="block text-sm font-medium text-slate-300 mb-1.5">Max Staff</label>
                            <input id="edit-max-staff" type="number" min="1" value={form.max_staff || ""} onChange={(e) => setForm(f => ({ ...f, max_staff: parseInt(e.target.value) || 0 }))} required disabled={isSaving} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                        <span className="text-sm font-medium text-slate-300">Status</span>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">{form.is_active ? "Active" : "Inactive"}</span>
                            <button type="button" role="switch" aria-checked={form.is_active} onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} disabled={isSaving} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${form.is_active ? "bg-emerald-500" : "bg-slate-600"}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={isSaving || !form.org_name || !form.org_slug} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : "Save Changes"}
                        </button>
                    </div>
                </form>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isDeleting ? onClose : undefined} />
            <div className="relative w-full max-w-sm bg-slate-800 border border-red-500/30 rounded-2xl shadow-2xl p-6 space-y-5">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white">Delete Organization</h2>
                        <p className="text-xs text-slate-400 mt-0.5">This action is permanent and cannot be undone.</p>
                    </div>
                </div>
                <p className="text-sm text-slate-300">
                    To permanently delete this organization and all its data, type its name:
                    <span className="block mt-1 font-mono font-semibold text-white bg-slate-900/60 rounded-lg px-3 py-1.5 mt-2 border border-slate-700 select-all">{org.name}</span>
                </p>
                <div>
                    <input
                        type="text"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="Type organization name to confirm"
                        disabled={isDeleting}
                        autoFocus
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} disabled={isDeleting} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={isDeleting || !matches} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        {isDeleting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</span> : "Delete Permanently"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isUpdating ? onClose : undefined} />
            <div className={`relative w-full max-w-sm bg-slate-800 border ${isSuspending ? 'border-amber-500/30' : 'border-emerald-500/30'} rounded-2xl shadow-2xl p-6 space-y-5`}>
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isSuspending ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
                        {isSuspending ? (
                            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        ) : (
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        )}
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white">{isSuspending ? "Suspend" : "Activate"} Organization</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{isSuspending ? "Temporarily revoke access." : "Restore full access."}</p>
                    </div>
                </div>
                <p className="text-sm text-slate-300">
                    Are you sure you want to {isSuspending ? "suspend" : "activate"} <span className="font-semibold text-white">{org.name}</span>? 
                    {isSuspending ? " All users will immediately lose access to their dashboards and queues." : " Users will regain access immediately."}
                </p>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} disabled={isUpdating} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={isUpdating} className={`flex-1 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${isSuspending ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'}`}>
                        {isUpdating ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</span> : (isSuspending ? "Suspend" : "Activate")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Create Modal ────────────────────────────────────────────────────────────────
export function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void; }) {
    const [form, setForm] = useState<OrgCreateRequest>({ org_name: "", org_slug: "", admin_email: "", admin_password: "", parent_organization_id: "", max_sessions: 10, max_queues_per_session: 20, max_staff: 5 });
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
        setIsSubmitting(true); setSubmitError(null);
        try {
            await api.createOrganization(form);
            onCreated();
        } catch (err) {
            setSubmitError(err instanceof ApiError ? err.detail : "Failed to create branch.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        Create Branch
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                {submitError && <div role="alert" className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">{submitError}</div>}
                <form onSubmit={handleCreate} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor="org-name" className="block text-sm font-medium text-slate-300 mb-1.5">Branch Name</label>
                        <input id="org-name" type="text" value={form.org_name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Sunrise Clinic" required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="parent-org" className="block text-sm font-medium text-slate-300 mb-1.5">Parent Organization</label>
                        <select 
                            id="parent-org" 
                            value={form.parent_organization_id} 
                            onChange={(e) => setForm(f => ({ ...f, parent_organization_id: e.target.value }))} 
                            required 
                            disabled={isSubmitting} 
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors"
                        >
                            <option value="" disabled>Select a Parent Organization</option>
                            {parentOrgs.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="org-slug" className="block text-sm font-medium text-slate-300 mb-1.5">Slug <span className="text-slate-500 text-xs">(auto-generated)</span></label>
                        <input id="org-slug" type="text" value={form.org_slug} onChange={(e) => setForm(f => ({ ...f, org_slug: e.target.value.toLowerCase() }))} placeholder="sunrise-clinic" required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="org-max-sessions" className="block text-sm font-medium text-slate-300 mb-1.5">Max Sessions</label>
                            <input id="org-max-sessions" type="number" min="1" value={form.max_sessions || ""} onChange={(e) => setForm(f => ({ ...f, max_sessions: parseInt(e.target.value) || 0 }))} required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="org-max-queues" className="block text-sm font-medium text-slate-300 mb-1.5">Max Queues</label>
                            <input id="org-max-queues" type="number" min="1" value={form.max_queues_per_session || ""} onChange={(e) => setForm(f => ({ ...f, max_queues_per_session: parseInt(e.target.value) || 0 }))} required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="org-max-staff" className="block text-sm font-medium text-slate-300 mb-1.5">Max Staff</label>
                            <input id="org-max-staff" type="number" min="1" value={form.max_staff || ""} onChange={(e) => setForm(f => ({ ...f, max_staff: parseInt(e.target.value) || 0 }))} required disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                        </div>
                    </div>
                    <hr className="border-slate-700" />
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Branch Manager Login</p>
                    <p className="text-xs text-slate-500 mb-2">These are the credentials the manager will use to log into this branch.</p>
                    <div>
                        <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-1.5">Manager Email Address</label>
                        <input id="admin-email" type="email" value={form.admin_email} onChange={(e) => setForm(f => ({ ...f, admin_email: e.target.value }))} placeholder="manager@sunrise-clinic.com" required autoComplete="off" disabled={isSubmitting} className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="admin-password" title="Password" className="block text-sm font-medium text-slate-300 mb-1.5">Manager Password</label>
                        <div className="relative">
                            <input
                                id="admin-password"
                                type={showAdminPassword ? "text" : "password"}
                                value={form.admin_password}
                                onChange={(e) => setForm(f => ({ ...f, admin_password: e.target.value }))}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                minLength={6}
                                disabled={isSubmitting}
                                className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 pl-3.5 pr-10 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors"
                            />
                            <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none">
                                {showAdminPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting || !form.org_name || !form.org_slug || !form.admin_email || !form.admin_password || !form.parent_organization_id} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span> : "Create Branch"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
