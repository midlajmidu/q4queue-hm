"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { StaffMember, StaffCreate, StaffUpdate, QueueResponse } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import Link from "next/link";
import { useParams } from "next/navigation";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 350;

type ToastType = "success" | "error";
interface ToastMessage { id: number; type: ToastType; msg: string; }

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(email: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
  const [local] = email.split("@");
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

const AVATAR_PALETTES = [
  { bg: "#eef2ff", color: "#4f46e5" },
  { bg: "#eff6ff", color: "#3b82f6" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fff7ed", color: "#ea580c" },
  { bg: "#fdf4ff", color: "#9333ea" },
  { bg: "#fdf2f8", color: "#db2777" },
  { bg: "#ecfdf5", color: "#059669" },
  { bg: "#fefce8", color: "#ca8a04" },
];

function getPalette(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
            borderRadius: 12, fontSize: 13.5, fontWeight: 500, pointerEvents: "auto",
            background: t.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: t.type === "success" ? "#065f46" : "#991b1b",
            border: `0.5px solid ${t.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            boxShadow: "0 4px 16px rgba(0,0,0,.08)",
          }}
        >
          {t.type === "success"
            ? <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            : <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>}
          {t.msg}
          <button
            onClick={() => onDismiss(t.id)}
            style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer", color: "currentColor", opacity: 0.5, padding: 0, lineHeight: 1 }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ email, firstName, lastName }: { email: string; firstName?: string; lastName?: string }) {
  const { bg, color } = getPalette(email);
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", background: bg, color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, letterSpacing: "-.01em",
    }}>
      {getInitials(email, firstName, lastName)}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────

type PresenceState = "online" | "idle" | "offline" | { serving: string };

function StatusBadge({ active }: { active: boolean; presence?: PresenceState }) {
  if (!active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
        Inactive
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      Active
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
      isAdmin 
        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40" 
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
    }`}>
      {isAdmin ? "Admin" : "Staff"}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[200, 80, 80, 100, 60].map((w, i) => (
        <td key={i} style={{ padding: "16px 20px", borderBottom: "0.5px solid #f1f5f9" }}>
          {i === 0
            ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f1f5f9" }} />
              <div style={{ height: 14, width: w, borderRadius: 6, background: "#f1f5f9" }} />
            </div>
            : <div style={{ height: 22, width: w, borderRadius: 99, background: "#f1f5f9" }} />}
        </td>
      ))}
    </tr>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      background: "var(--q-card-bg)", borderRadius: 8, border: "1px solid var(--q-border-light)",
      padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 700, color: color ?? "var(--q-text)", letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ─── Staff Modal ──────────────────────────────────────────────────────────────

function StaffModal({ mode, member, onClose, onSaved }: {
  mode: "create" | "edit"; member?: StaffMember; onClose: () => void; onSaved: (m: StaffMember) => void;
}) {
  const isEdit = mode === "edit";
  const [firstName, setFirstName] = useState(member?.first_name ?? "");
  const [lastName, setLastName] = useState(member?.last_name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [isActive, setIsActive] = useState(member?.is_active ?? true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const validate = (): string | null => {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!email.trim()) return "Email is required.";
    if (!isEdit) {
      if (password.length < 8) return "Password must be at least 8 characters.";
      if (password !== confirmPassword) return "Passwords do not match.";
    } else if (newPassword) {
      if (newPassword.length < 8) return "New password must be at least 8 characters.";
      if (newPassword !== confirmNew) return "New passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFieldError(err); return; }
    setFieldError(null);
    setIsSaving(true);
    try {
      let result: StaffMember;
      if (isEdit && member) {
        const update: StaffUpdate = {};
        if (firstName !== member.first_name) update.first_name = firstName;
        if (lastName !== member.last_name) update.last_name = lastName;
        if (email !== member.email) update.email = email;
        if (isActive !== member.is_active) update.is_active = isActive;
        if (newPassword) update.new_password = newPassword;
        result = await api.updateStaff(member.id, update);
      } else {
        result = await api.createStaff({ 
          email, first_name: firstName, last_name: lastName, password
        });
      }
      onSaved(result);
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.detail : "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = "w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";
  const labelCls = "block text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2";

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white dark:bg-slate-900 rounded-[24px] border border-transparent dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 dark:text-white tracking-tight">{isEdit ? "Edit staff member" : "Add staff member"}</h2>
            <p className="text-[13px] text-slate-400 dark:text-slate-400 mt-0.5">{isEdit ? `Editing ${member?.email}` : "Create a new team account"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white dark:bg-slate-900" noValidate>
          {fieldError && (
            <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 flex gap-2.5 items-start">
              <svg width={16} height={16} className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
              {fieldError}
            </div>
          )}

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>First name <span className="text-rose-500">*</span></label>
              <input
                type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                required disabled={isSaving} placeholder="Jane"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Last name <span className="text-rose-500">*</span></label>
              <input
                type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                required disabled={isSaving} placeholder="Smith"
                className={inputCls}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email address <span className="text-rose-500">*</span></label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required disabled={isSaving} placeholder="jane@clinic.com"
              className={inputCls}
            />
          </div>

          {/* Status Toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/10 rounded-xl p-3.5">
              <div>
                <p className="text-[13.5px] font-semibold text-slate-900 dark:text-white">Account status</p>
                <p className="text-[12.5px] text-slate-400 dark:text-slate-400 mt-0.5">{isActive ? "User can log in" : "Access revoked"}</p>
              </div>
              <button
                type="button" role="switch" aria-checked={isActive}
                onClick={() => setIsActive(!isActive)} disabled={isSaving}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer duration-300 ${isActive ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          {/* Password (create) */}
          {!isEdit && (
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-3.5">
              <p className={labelCls}>Set password</p>
              <div>
                <label className={`${labelCls} flex justify-between`}>
                  <span>Password <span className="text-rose-500">*</span></span>
                  <span className="font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">min 8 chars</span>
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isSaving} placeholder="••••••••" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Confirm password <span className="text-rose-500">*</span></label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isSaving} placeholder="••••••••" className={inputCls} />
              </div>
            </div>
          )}

          {/* Reset Password (edit) */}
          {isEdit && (
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-3.5">
              <p className={`${labelCls} flex items-center gap-2`}>
                Reset password
                <span className="font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500 text-[11px]">optional</span>
              </p>
              <div>
                <label className={labelCls}>New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isSaving} placeholder="Leave blank to keep current" className={inputCls} />
              </div>
              {newPassword && (
                <div>
                  <label className={labelCls}>Confirm new password</label>
                  <input type="password" value={confirmNew} onChange={e => setConfirmNew(e.target.value)} disabled={isSaving} placeholder="••••••••" className={inputCls} />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-[13.5px] font-semibold transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-[1.5] h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13.5px] font-semibold transition-colors shadow-sm disabled:opacity-50">
              {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Deactivate Modal ─────────────────────────────────────────────────

function ConfirmDeactivateModal({ member, onClose, onConfirm, isLoading }: {
  member: StaffMember; onClose: () => void; onConfirm: () => void; isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />
      <div className="relative w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[24px] border border-transparent dark:border-white/10 shadow-2xl p-7">
        <div className="flex gap-4 mb-5">
          <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-rose-600 dark:text-rose-400" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4m0 4h.01" /></svg>
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">Deactivate staff?</h2>
            <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">This user will immediately lose access to the dashboard.</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/10 rounded-xl p-3.5 mb-6">
          <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{member.email}</span>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onClose} disabled={isLoading} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-[13.5px] font-semibold transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-[1.5] h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13.5px] font-semibold transition-colors shadow-sm disabled:opacity-50">
            {isLoading ? "Deactivating…" : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────

function ConfirmDeleteModal({ member, onClose, onConfirm, isLoading }: {
  member: StaffMember; onClose: () => void; onConfirm: () => void; isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />
      <div className="relative w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[24px] border border-transparent dark:border-white/10 shadow-2xl p-7">
        <div className="flex gap-4 mb-5">
          <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-rose-600 dark:text-rose-400" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">Delete staff member?</h2>
            <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">This will permanently remove the user from the system. This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/10 rounded-xl p-3.5 mb-6">
          <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{member.email}</span>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onClose} disabled={isLoading} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-[13.5px] font-semibold transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-[1.5] h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13.5px] font-semibold transition-colors shadow-sm disabled:opacity-50">
            {isLoading ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (o: number) => void }) {
  const current = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
    fontSize: 13, fontWeight: 500,
    color: "#64748b", background: "#fff", border: "0.5px solid #e2e8f0",
    borderRadius: 9, cursor: "pointer", transition: "all .15s",
  };

  return (
    <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid #f1f5f9" }}>
      <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>
        Showing <span style={{ fontWeight: 600, color: "#0f172a" }}>{offset + 1}</span>–<span style={{ fontWeight: 600, color: "#0f172a" }}>{Math.min(offset + limit, total)}</span> of <span style={{ fontWeight: 600, color: "#0f172a" }}>{total}</span>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => onChange(offset - limit)} disabled={offset === 0} style={{ ...btnBase, opacity: offset === 0 ? 0.35 : 1, cursor: offset === 0 ? "not-allowed" : "pointer" }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg> Prev
        </button>
        {[...Array(Math.min(pages, 5))].map((_, i) => {
          const p = i + 1;
          const active = p === current;
          return (
            <button key={p} onClick={() => onChange((p - 1) * limit)} style={{ width: 32, height: 32, borderRadius: 8, border: active ? "none" : "0.5px solid #e2e8f0", background: active ? "#4f46e5" : "#fff", color: active ? "#fff" : "#64748b", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all .15s" }}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} style={{ ...btnBase, opacity: offset + limit >= total ? 0.35 : 1, cursor: offset + limit >= total ? "not-allowed" : "pointer" }}>
          Next <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');`;

export default function StaffPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { user, isReadOnly } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEdit = isAdmin && !isReadOnly;

  const [members, setMembers] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [offset, setOffset] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [deactivateMember, setDeactivateMember] = useState<StaffMember | null>(null);
  const [deleteMember, setDeleteMember] = useState<StaffMember | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((type: ToastType, msg: string) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const loadStaff = useCallback(async (opts?: { search?: string; status?: typeof statusFilter; offset?: number }) => {
    setLoading(true); setLoadError(null);
    try {
      const activeFilter = (opts?.status ?? statusFilter) === "all" ? undefined : (opts?.status ?? statusFilter) === "active";
      const res = await api.listStaff({ search: opts?.search ?? debouncedSearch, is_active: activeFilter, limit: PAGE_SIZE, offset: opts?.offset ?? offset });
      setMembers(res.items); setTotal(res.total);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.detail : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, offset]);

  useEffect(() => { loadStaff(); }, [debouncedSearch, statusFilter, offset]); // eslint-disable-line

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setOffset(0); }, DEBOUNCE_MS);
  };

  const handleFilterChange = (f: "all" | "active" | "inactive") => { setStatusFilter(f); setOffset(0); };

  const handleSaved = useCallback((saved: StaffMember) => {
    if (editMember) {
      setMembers(prev => prev.map(m => m.id === saved.id ? saved : m));
      toast("success", "Staff member updated.");
    } else {
      setMembers(prev => [saved, ...prev]);
      setTotal(t => t + 1);
      toast("success", `${saved.email} added to your team.`);
    }
    setShowCreate(false); setEditMember(null);
  }, [editMember, toast]);

  const handleDeactivate = useCallback(async () => {
    if (!deactivateMember) return;
    setIsDeactivating(true);
    try {
      const updated = await api.deactivateStaff(deactivateMember.id);
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
      setDeactivateMember(null);
      toast("success", `${updated.email} has been deactivated.`);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.detail : "Failed to deactivate.");
    } finally {
      setIsDeactivating(false);
    }
  }, [deactivateMember, toast]);

  const handleReactivate = useCallback(async (member: StaffMember) => {
    setActivatingId(member.id);
    try {
      const updated = await api.updateStaff(member.id, { is_active: true });
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
      toast("success", `${updated.email} has been reactivated.`);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.detail : "Failed to reactivate.");
    } finally {
      setActivatingId(null);
    }
  }, [toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteMember) return;
    setIsDeleting(true);
    try {
      await api.deleteStaff(deleteMember.id);
      setMembers(prev => prev.filter(m => m.id !== deleteMember.id));
      setTotal(t => Math.max(0, t - 1));
      setDeleteMember(null);
      toast("success", `${deleteMember.email} has been deleted permanently.`);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.detail : "Failed to delete.");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteMember, toast]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const activeCount = members.filter(m => m.is_active).length;
  const inactiveCount = members.filter(m => !m.is_active).length;

  // Derived totals for stat cards (use total from API for all, derive active/inactive from current page as proxy)
  const thStyle: React.CSSProperties = {
    padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "var(--q-text-muted)",
    textTransform: "uppercase", letterSpacing: ".07em", textAlign: "left",
    borderBottom: "1px solid var(--q-border-light)", background: "var(--q-slate-bg)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "14px 20px", fontSize: 13.5, fontWeight: 500, color: "var(--q-text)",
    borderBottom: "1px solid var(--q-border-light)",
  };

  const actionBtnBase: React.CSSProperties = {
    width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, border: "0.5px solid #e8edf2", background: "transparent",
    cursor: "pointer", transition: "all .15s", color: "#94a3b8",
  };

  const selectStyle: React.CSSProperties = {
    height: 38, border: "0.5px solid #e2e8f0", borderRadius: 9, padding: "0 30px 0 12px",
    fontSize: 13, fontWeight: 500, color: "#0f172a",
    background: "#fafbfe", outline: "none", appearance: "none", cursor: "pointer",
  };

  const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin";
  const canView = isAdmin || isGlobalOrOrgAdmin;

  if (user && !canView) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef2f2", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--q-text)", marginBottom: 12 }}>Access Restricted</h2>
        <p style={{ fontSize: 15, color: "var(--q-text-muted)", maxWidth: 400, margin: "0 auto 32px", lineHeight: 1.6 }}>
          You do not have permission to view or manage staff members. This section is restricted to administrators.
        </p>
        <Link href={`/${orgSlug}/dashboard`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--q-brand)", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{FONT_IMPORT}</style>

      <Toast toasts={toasts} onDismiss={dismissToast} />
      {showCreate && <StaffModal mode="create" onClose={() => setShowCreate(false)} onSaved={handleSaved} />}
      {editMember && <StaffModal mode="edit" member={editMember} onClose={() => setEditMember(null)} onSaved={handleSaved} />}
      {deactivateMember && <ConfirmDeactivateModal member={deactivateMember} onClose={() => setDeactivateMember(null)} onConfirm={handleDeactivate} isLoading={isDeactivating} />}
      {deleteMember && <ConfirmDeleteModal member={deleteMember} onClose={() => setDeleteMember(null)} onConfirm={handleDelete} isLoading={isDeleting} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 28, WebkitFontSmoothing: "antialiased" }}>

        {/* ── Header ── */}
        <StandardPageHeader
          breadcrumbs={[
            { label: "Organization", href: `/${orgSlug}/dashboard` },
            { label: "Staff" }
          ]}
          title="Staff Management"
          subtitle="Add and manage team members who can access the dashboard."
          action={
            canEdit && (
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                  fontSize: 13.5, fontWeight: 600,
                  color: "#fff", background: "#4f46e5", border: "none", borderRadius: 11,
                  cursor: "pointer", letterSpacing: "-.01em", height: 42,
                  boxShadow: "0 1px 2px rgba(79,70,229,.2), inset 0 1px 0 rgba(255,255,255,.1)",
                  transition: "background .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#4338ca")}
                onMouseLeave={e => (e.currentTarget.style.background = "#4f46e5")}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                Add member
              </button>
            )
          }
        />

        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          <StatCard label="Total staff" value={total} />
          <StatCard label="Active" value={activeCount} color="#059669" />
          <StatCard label="Inactive" value={inactiveCount} color="#94a3b8" />
        </div>

        {/* ── Table Card ── */}
        <div style={{ background: "var(--q-card-bg)", borderRadius: 8, border: "1px solid var(--q-border-light)", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>

          {/* Toolbar */}
          <div className="flex items-center flex-wrap gap-3 p-5 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/40">
            {/* Search */}
            <div className="flex-1 min-w-[220px] relative">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input
                type="search" value={search} onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search by email…" aria-label="Search staff"
                className="w-full h-10 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-10 pr-4 text-[13.5px] font-medium text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select 
                value={statusFilter} 
                onChange={e => handleFilterChange(e.target.value as "all" | "active" | "inactive")} 
                aria-label="Filter by status"
                className="h-10 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-4 pr-10 text-[13.5px] font-medium text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">All statuses</option>
                <option value="active" className="dark:bg-slate-900">Active only</option>
                <option value="inactive" className="dark:bg-slate-900">Inactive only</option>
              </select>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadStaff()} disabled={loading} aria-label="Refresh list"
              className="w-10 h-10 flex items-center justify-center border border-[#E9EDF5] dark:border-white/10 rounded-xl bg-[#F7F9FC] dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh staff list"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
              </svg>
            </button>
          </div>

          {/* Error */}
          {loadError && (
            <div style={{ margin: "16px 20px", padding: "14px 16px", background: "#fef2f2", border: "0.5px solid #fecaca", borderRadius: 10, color: "#b91c1c", fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{loadError}</span>
              <button onClick={() => loadStaff()} style={{ fontSize: 13, fontWeight: 600, color: "#b91c1c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Member</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Joined</th>
                  {canEdit && <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : members.length === 0
                    ? (
                      <tr>
                        <td colSpan={canEdit ? 5 : 4} style={{ padding: "64px 24px", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--q-slate-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--q-text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--q-text)", marginBottom: 4 }}>
                                {debouncedSearch ? `No results for "${debouncedSearch}"` : "No staff found"}
                              </p>
                              <p style={{ fontSize: 13.5, color: "var(--q-text-muted)" }}>
                                {debouncedSearch ? "Try a different search term." : "Add your first team member to get started."}
                              </p>
                            </div>
                            {debouncedSearch ? (
                              <button
                                onClick={() => handleSearchChange("")}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5", background: "#eef2ff", border: "none", borderRadius: 8, cursor: "pointer", transition: "background .15s" }}
                              >
                                Clear Search
                              </button>
                            ) : canEdit ? (
                              <button
                                onClick={() => setShowCreate(true)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#4f46e5", border: "none", borderRadius: 8, cursor: "pointer", boxShadow: "0 1px 3px rgba(79,70,229,.3)", transition: "background .15s" }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                                Add Staff Member
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                    : members.map(m => (
                      <tr
                        key={m.id}
                        style={{ transition: "background .1s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--q-card-bg-alt)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Member */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                            <Avatar email={m.email} firstName={m.first_name} lastName={m.last_name} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--q-text)" }}>
                                {m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : "Unknown User"}
                              </span>
                              <span style={{ fontSize: 12, color: "var(--q-text-muted)" }}>{m.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={tdStyle}><RoleBadge role={m.role} /></td>

                        {/* Status */}
                        <td style={tdStyle}>
                          <StatusBadge 
                            active={m.is_active} 
                            presence={
                              !m.is_active ? "offline" :
                              (m.email.charCodeAt(0) % 3 === 0) ? { serving: "#" + (100 + (m.email.charCodeAt(1) || 0)).toString() } :
                              (m.email.charCodeAt(0) % 2 === 0) ? "idle" : "online"
                            } 
                          />
                        </td>

                        <td className="tabular-nums" style={{ ...tdStyle, color: "#94a3b8", fontSize: 13 }}>
                          {fmt(m.created_at)}
                        </td>

                        {/* Actions */}
                        {canEdit && (
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <button
                                onClick={() => setEditMember(m)}
                                aria-label={`Edit ${m.email}`}
                                title="Edit"
                                style={actionBtnBase}
                                onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#3b82f6"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#e8edf2"; }}
                              >
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              </button>
                              <button
                                type="button" role="switch" aria-checked={m.is_active}
                                onClick={() => m.is_active ? setDeactivateMember(m) : handleReactivate(m)}
                                disabled={activatingId === m.id}
                                title={m.is_active ? "Active - Click to Deactivate" : "Inactive - Click to Reactivate"}
                                style={{ width: 40, height: 22, borderRadius: 99, border: "none", cursor: activatingId === m.id ? "wait" : "pointer", padding: 2, background: m.is_active ? "#10b981" : "#e2e8f0", transition: "background .3s ease", position: "relative", opacity: activatingId === m.id ? 0.6 : 1, display: "flex", alignItems: "center", flexShrink: 0 }}
                              >
                                <span style={{
                                  display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "#fff",
                                  boxShadow: "0 1px 3px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.1)", transition: "transform .3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                  transform: m.is_active ? "translateX(18px)" : "translateX(0)",
                                }}>
                                    {activatingId === m.id && (
                                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={m.is_active ? "#10b981" : "#94a3b8"} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                    )}
                                </span>
                              </button>
                              <button
                                onClick={() => setDeleteMember(m)}
                                aria-label={`Delete ${m.email}`}
                                title="Delete"
                                style={{ ...actionBtnBase, marginLeft: 2 }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#fecaca"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#e8edf2"; }}
                              >
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}