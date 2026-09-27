"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { QueueResponse, StaffMember } from "@/types/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDate, fmtTime } from "@/lib/tzformat";
import { toast } from "sonner";
import Swal from "sweetalert2";

// ─── Avatar Helpers ──────────────────────────────────────────────────────────

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

function getInitials(email: string, firstName?: string, lastName?: string): string {
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    const [local] = email.split("@");
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
}

function StaffAvatar({ email, firstName, lastName }: { email: string; firstName?: string; lastName?: string }) {
    const { bg, color } = getPalette(email);
    return (
        <div
            style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: bg,
                color,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-.01em",
            }}
        >
            {getInitials(email, firstName, lastName)}
        </div>
    );
}

export default function TrashPage() {
    const tz = useBranchTimezone();
    const { user, isReadOnly: authReadOnly, isImpersonating } = useAuth();
    const isReadOnly = !!authReadOnly || user?.role === "super_admin" || user?.role === "organization_admin";
    const canRestore = !isReadOnly && (user?.role === "admin" || user?.role === "super_admin" || user?.role === "organization_admin" || isImpersonating);

    // Tab state: "queues" | "staff"
    const [activeTab, setActiveTab] = useState<"queues" | "staff">("queues");

    // Queues state
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [isLoadingQueues, setIsLoadingQueues] = useState(true);
    const [restoringQueueId, setRestoringQueueId] = useState<string | null>(null);

    // Queue Filters
    const [queueFilterDate, setQueueFilterDate] = useState("");
    const [queueFilterName, setQueueFilterName] = useState("");

    // Staff state
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(true);
    const [restoringStaffId, setRestoringStaffId] = useState<string | null>(null);
    const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);

    // Staff Filters
    const [staffSearch, setStaffSearch] = useState("");
    const [staffFilterDate, setStaffFilterDate] = useState("");

    // ── Load Data ─────────────────────────────────────────────────────────────
    const loadTrashQueues = useCallback(async () => {
        setIsLoadingQueues(true);
        try {
            const data = await api.listTrashQueues();
            setQueues(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to load deleted queues");
        } finally {
            setIsLoadingQueues(false);
        }
    }, []);

    const loadTrashStaff = useCallback(async () => {
        setIsLoadingStaff(true);
        try {
            const data = await api.listTrashStaff();
            setStaffMembers(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to load deleted staff");
        } finally {
            setIsLoadingStaff(false);
        }
    }, []);

    useEffect(() => {
        loadTrashQueues();
        loadTrashStaff();
    }, [loadTrashQueues, loadTrashStaff]);

    // ── Queue Actions ─────────────────────────────────────────────────────────
    const handleRestoreQueue = async (queueId: string) => {
        if (isReadOnly || !canRestore) return;
        setRestoringQueueId(queueId);
        try {
            await api.restoreQueue(queueId);
            toast.success("Queue restored successfully");
            setQueues((prev) => prev.filter((q) => q.id !== queueId));
        } catch (error: any) {
            toast.error(error.message || "Failed to restore queue");
        } finally {
            setRestoringQueueId(null);
        }
    };

    // ── Staff Actions ─────────────────────────────────────────────────────────
    const handleRestoreStaff = async (member: StaffMember) => {
        if (isReadOnly || !canRestore) return;

        const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
        const displayName = member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email;

        const result = await Swal.fire({
            title: "Restore Staff Member?",
            text: `Are you sure you want to restore ${displayName}? They will regain access to the branch dashboard.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#4f46e5",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Yes, restore",
            cancelButtonText: "Cancel",
            reverseButtons: true,
            background: isDark ? "#0f172a" : "#ffffff",
            color: isDark ? "#f8fafc" : "#0f172a",
            customClass: {
                popup: "rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl",
                title: "text-lg font-bold text-slate-900 dark:text-white",
                htmlContainer: "text-sm text-slate-600 dark:text-slate-300",
            },
        });

        if (!result.isConfirmed) return;

        setRestoringStaffId(member.id);
        try {
            await api.restoreStaff(member.id);
            toast.success(`${displayName} restored successfully`);
            setStaffMembers((prev) => prev.filter((s) => s.id !== member.id));
        } catch (error: any) {
            toast.error(error.message || "Failed to restore staff member");
        } finally {
            setRestoringStaffId(null);
        }
    };

    const handlePermanentDeleteStaff = async (member: StaffMember) => {
        if (isReadOnly || !canRestore) return;

        const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
        const displayName = member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email;

        const result = await Swal.fire({
            title: "Permanently Delete Staff?",
            text: `This will permanently remove ${displayName} (${member.email}). This action cannot be undone.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Yes, delete permanently",
            cancelButtonText: "Cancel",
            reverseButtons: true,
            background: isDark ? "#0f172a" : "#ffffff",
            color: isDark ? "#f8fafc" : "#0f172a",
            customClass: {
                popup: "rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl",
                title: "text-lg font-bold text-slate-900 dark:text-white",
                htmlContainer: "text-sm text-slate-600 dark:text-slate-300",
            },
        });

        if (!result.isConfirmed) return;

        setDeletingStaffId(member.id);
        try {
            await api.hardDeleteStaff(member.id);
            toast.success(`${displayName} permanently deleted`);
            setStaffMembers((prev) => prev.filter((s) => s.id !== member.id));
        } catch (error: any) {
            toast.error(error.message || "Failed to permanently delete staff member");
        } finally {
            setDeletingStaffId(null);
        }
    };

    // ── Queue Memoized Filters ────────────────────────────────────────────────
    const uniqueQueueNames = useMemo(() => {
        return Array.from(new Set(queues.map((q) => q.name))).sort();
    }, [queues]);

    const filteredQueues = useMemo(() => {
        return queues.filter((q) => {
            const qDate = new Date(q.created_at).toISOString().slice(0, 10);
            if (queueFilterDate && qDate !== queueFilterDate) return false;
            if (queueFilterName && q.name !== queueFilterName) return false;
            return true;
        });
    }, [queues, queueFilterDate, queueFilterName]);

    const hasActiveQueueFilters = !!queueFilterDate || !!queueFilterName;

    // ── Staff Memoized Filters ────────────────────────────────────────────────
    const filteredStaff = useMemo(() => {
        return staffMembers.filter((m) => {
            if (staffSearch) {
                const q = staffSearch.toLowerCase();
                const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
                const emailMatch = m.email.toLowerCase().includes(q);
                const nameMatch = fullName.includes(q);
                if (!emailMatch && !nameMatch) return false;
            }
            if (staffFilterDate) {
                const sDate = m.deleted_at ? new Date(m.deleted_at).toISOString().slice(0, 10) : "";
                if (sDate !== staffFilterDate) return false;
            }
            return true;
        });
    }, [staffMembers, staffSearch, staffFilterDate]);

    const hasActiveStaffFilters = !!staffSearch || !!staffFilterDate;

    return (
        <div className="w-full pb-12 fade-in">
            {/* ── Page Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-2 tracking-widest uppercase">
                        <span className="text-slate-600 dark:text-slate-400">Trash</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
                        {activeTab === "queues" ? "Deleted Queues" : "Deleted Staff Members"}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {isReadOnly
                            ? "Viewing deleted items in read-only mode. Restoration and deletion are disabled in parent admin view."
                            : activeTab === "queues"
                            ? "Browse deleted queues. As an admin, you can restore them back to their session."
                            : "Browse deleted staff members. You can restore their accounts or permanently delete them."}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-2.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-[13px]">
                        {isReadOnly
                            ? "Read-Only View: Actions are disabled in parent admin view."
                            : activeTab === "queues"
                            ? "Restoration is subject to queue limits per session."
                            : "Restoring staff accounts is subject to active staff capacity."}
                    </span>
                </div>
            </div>

            {/* ── Tab Switcher ── */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-6 w-fit border border-slate-200/60 dark:border-slate-700/60">
                <button
                    onClick={() => setActiveTab("queues")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                        activeTab === "queues"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Queues</span>
                    <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                            activeTab === "queues"
                                ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                    >
                        {queues.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab("staff")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                        activeTab === "staff"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Staff Members</span>
                    <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                            activeTab === "staff"
                                ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                    >
                        {staffMembers.length}
                    </span>
                </button>
            </div>

            {/* ── TAB 1: QUEUES ── */}
            {activeTab === "queues" && (
                <div className="card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
                    {/* Filter Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:px-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-2">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z" />
                                </svg>
                                Filter By
                            </div>

                            {/* Date filter */}
                            <div className="flex items-center gap-2 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-w-[150px] shadow-sm relative">
                                <input
                                    type={queueFilterDate ? "date" : "text"}
                                    placeholder="All Dates"
                                    onFocus={(e) => (e.target.type = "date")}
                                    onBlur={(e) => !e.target.value && (e.target.type = "text")}
                                    value={queueFilterDate}
                                    onChange={(e) => setQueueFilterDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[13px] text-slate-700 dark:text-slate-300 font-semibold w-full placeholder:text-slate-400 placeholder:font-semibold"
                                />
                                {!queueFilterDate && (
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                )}
                            </div>

                            {/* Queue name filter */}
                            <div className="relative shadow-sm rounded-lg">
                                <select
                                    value={queueFilterName}
                                    onChange={(e) => setQueueFilterName(e.target.value)}
                                    className="h-9 pl-3 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-[13px] text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer min-w-[150px] appearance-none"
                                >
                                    <option value="">All Queues</option>
                                    {uniqueQueueNames.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>

                            {hasActiveQueueFilters && (
                                <button
                                    onClick={() => { setQueueFilterDate(""); setQueueFilterName(""); }}
                                    className="flex items-center gap-1.5 h-9 px-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>

                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {filteredQueues.length} of {queues.length}
                        </span>
                    </div>

                    {/* Content Area */}
                    {isLoadingQueues ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-3 border-slate-100 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto" />
                            <span className="text-[13px] font-semibold text-slate-500">Loading deleted queues...</span>
                        </div>
                    ) : queues.length === 0 || filteredQueues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-6 bg-slate-50/30 dark:bg-slate-900/50">
                            <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 shadow-sm">
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <span className="text-[15px] font-bold text-slate-900 dark:text-white mb-1.5">
                                {queues.length === 0 ? "Trash is Clean" : "No results found"}
                            </span>
                            <span className="text-[13px] text-slate-500 max-w-[300px] text-center leading-relaxed">
                                {queues.length === 0
                                    ? "No deleted queues found. When queues are deleted, they'll appear here."
                                    : "No deleted queues match your current filters."}
                            </span>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/60">
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Queue Name</th>
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prefix</th>
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Removed From</th>
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deleted On</th>
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQueues.map((queue, idx) => (
                                        <tr
                                            key={queue.id}
                                            className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors fade-in group"
                                            style={{ animationDelay: `${idx * 15}ms` }}
                                        >
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center border border-red-100 dark:border-red-500/20">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-[14px] font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                                        {queue.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                    {queue.prefix}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                                        {fmtDate(queue.created_at, tz)}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-500">
                                                        {fmtTime(queue.created_at, tz)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                {queue.deleted_at ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                                            {fmtDate(queue.deleted_at, tz)}
                                                        </span>
                                                        <span className="text-[11px] font-medium text-slate-500">
                                                            {fmtTime(queue.deleted_at, tz)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">—</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                {isReadOnly ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-wider">
                                                        Read-Only
                                                    </span>
                                                ) : canRestore ? (
                                                    <button
                                                        onClick={() => handleRestoreQueue(queue.id)}
                                                        disabled={restoringQueueId === queue.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:-translate-y-0.5 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                                    >
                                                        {restoringQueueId === queue.id ? (
                                                            <>
                                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                                Restoring...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                </svg>
                                                                Restore
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Admin Only
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB 2: STAFF MEMBERS ── */}
            {activeTab === "staff" && (
                <div className="card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
                    {/* Filter Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:px-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-2">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z" />
                                </svg>
                                Filter By
                            </div>

                            {/* Search filter */}
                            <div className="flex items-center gap-2 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-w-[200px] shadow-sm relative">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={staffSearch}
                                    onChange={(e) => setStaffSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[13px] text-slate-700 dark:text-slate-300 font-semibold w-full placeholder:text-slate-400 placeholder:font-semibold"
                                />
                                {staffSearch && (
                                    <button
                                        onClick={() => setStaffSearch("")}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Date filter */}
                            <div className="flex items-center gap-2 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-w-[150px] shadow-sm relative">
                                <input
                                    type={staffFilterDate ? "date" : "text"}
                                    placeholder="All Dates"
                                    onFocus={(e) => (e.target.type = "date")}
                                    onBlur={(e) => !e.target.value && (e.target.type = "text")}
                                    value={staffFilterDate}
                                    onChange={(e) => setStaffFilterDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[13px] text-slate-700 dark:text-slate-300 font-semibold w-full placeholder:text-slate-400 placeholder:font-semibold"
                                />
                                {!staffFilterDate && (
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                )}
                            </div>

                            {hasActiveStaffFilters && (
                                <button
                                    onClick={() => { setStaffSearch(""); setStaffFilterDate(""); }}
                                    className="flex items-center gap-1.5 h-9 px-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>

                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {filteredStaff.length} of {staffMembers.length}
                        </span>
                    </div>

                    {/* Content Area */}
                    {isLoadingStaff ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-3 border-slate-100 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto" />
                            <span className="text-[13px] font-semibold text-slate-500">Loading deleted staff members...</span>
                        </div>
                    ) : staffMembers.length === 0 || filteredStaff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-6 bg-slate-50/30 dark:bg-slate-900/50">
                            <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 shadow-sm">
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <span className="text-[15px] font-bold text-slate-900 dark:text-white mb-1.5">
                                {staffMembers.length === 0 ? "Trash is Clean" : "No results found"}
                            </span>
                            <span className="text-[13px] text-slate-500 max-w-[320px] text-center leading-relaxed">
                                {staffMembers.length === 0
                                    ? "No deleted staff members found. When staff members are removed, they will appear here."
                                    : "No deleted staff members match your current filters."}
                            </span>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/60">
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Staff Member</th>
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deleted On</th>
                                        <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.map((member, idx) => {
                                        const fullName = member.first_name && member.last_name
                                            ? `${member.first_name} ${member.last_name}`
                                            : member.first_name || "Unknown User";

                                        return (
                                            <tr
                                                key={member.id}
                                                className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors fade-in group"
                                                style={{ animationDelay: `${idx * 15}ms` }}
                                            >
                                                {/* Staff Member Info */}
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <StaffAvatar
                                                            email={member.email}
                                                            firstName={member.first_name}
                                                            lastName={member.last_name}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-[14px] font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                {fullName}
                                                            </span>
                                                            <span className="text-[12px] text-slate-500 font-medium">
                                                                {member.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="py-4 px-5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                                        member.role === "admin"
                                                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40"
                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                                    }`}>
                                                        {member.role === "admin" ? "Admin" : "Staff"}
                                                    </span>
                                                </td>

                                                {/* Deleted On */}
                                                <td className="py-4 px-5">
                                                    {member.deleted_at ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                                                {fmtDate(member.deleted_at, tz)}
                                                            </span>
                                                            <span className="text-[11px] font-medium text-slate-500">
                                                                {fmtTime(member.deleted_at, tz)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">—</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 px-5 text-right">
                                                    {isReadOnly ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-wider">
                                                            Read-Only
                                                        </span>
                                                    ) : canRestore ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* Restore Button */}
                                                            <button
                                                                onClick={() => handleRestoreStaff(member)}
                                                                disabled={restoringStaffId === member.id || deletingStaffId === member.id}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:-translate-y-0.5 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                                                title="Restore staff member"
                                                            >
                                                                {restoringStaffId === member.id ? (
                                                                    <>
                                                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                                        Restoring...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                        </svg>
                                                                        Restore
                                                                    </>
                                                                )}
                                                            </button>

                                                            {/* Permanent Delete Button */}
                                                            <button
                                                                onClick={() => handlePermanentDeleteStaff(member)}
                                                                disabled={restoringStaffId === member.id || deletingStaffId === member.id}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                                                title="Permanently delete from database"
                                                            >
                                                                {deletingStaffId === member.id ? (
                                                                    <>
                                                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400/30 border-t-red-600" />
                                                                        Deleting...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                        Delete
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                            Admin Only
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
