"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    Info,
    Key,
    SkipForward,
    XCircle,
    UserCog,
    Settings,
    ChevronDown,
    ChevronUp,
    Shield,
    Copy,
    Laptop
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import BranchSelector from "@/components/organization-admin/BranchSelector";

const parseUserAgent = (ua: string): string => {
    if (!ua || ua === "unknown") return "Unknown Client";
    if (ua.includes("Postman")) return "Postman API Client";
    if (ua.includes("curl")) return "cURL CLI";
    if (ua.includes("python")) return "Python Script";

    let browser = "Web Browser";
    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Safari/")) browser = "Safari";

    let os = "";
    if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    return os ? `${browser} on ${os}` : browser;
};

const renderMetadataValue = (val: any, key?: string) => {
    if (val === null || val === undefined) return <span className="text-slate-400 font-normal">—</span>;
    
    if (key === "user_agent" && typeof val === "string") {
        const parsed = parseUserAgent(val);
        return (
            <div className="flex items-center gap-1.5 mt-0.5">
                <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 cursor-help"
                    title={val}
                >
                    <Laptop size={11} className="text-slate-400 shrink-0" />
                    {parsed}
                </span>
            </div>
        );
    }

    if (typeof val === "boolean") {
        return (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${val ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-slate-100 text-slate-500 border border-slate-200/50'}`}>
                {val ? "True" : "False"}
            </span>
        );
    }
    if (typeof val === "object") {
        if (Array.isArray(val)) {
            return (
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {val.map((item, i) => (
                        <span key={i} className="inline-block bg-slate-100 border border-slate-200/60 text-slate-700 text-[11px] px-1.5 py-0.5 rounded font-mono">
                            {typeof item === "object" ? JSON.stringify(item) : String(item)}
                        </span>
                    ))}
                </div>
            );
        }
        return (
            <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200/80 p-2 rounded-lg text-slate-700 overflow-x-auto max-h-32 mt-0.5 leading-relaxed">
                {JSON.stringify(val, null, 2)}
            </pre>
        );
    }
    return <span className="text-[13px] font-semibold text-slate-800 truncate block" title={String(val)}>{String(val)}</span>;
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [actionFilter, setActionFilter] = useState<string>("ALL");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const itemsPerPage = 12;

    const { selectedBranchId } = useBranchFilter();

    useEffect(() => {
        setCurrentPage(1);
        setExpandedRows(new Set());
    }, [selectedBranchId, actionFilter, dateFilter]);

    useEffect(() => {
        const loadData = () => {
            api.getOrgAdminAudit(selectedBranchId || undefined)
                .then(res => {
                    const filtered = (res || []).filter((l: any) => {
                        const act = (l.action || "").toUpperCase();
                        return l.action !== 'token.join' && !act.includes('COMPLETE') && !act.includes('CALL_NEXT') && !act.includes('NEXT');
                    });
                    setLogs(filtered);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load audit logs", err);
                    setLoading(false);
                });
        };
        loadData();
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    const dateFilteredLogs = useMemo(() => {
        if (!dateFilter) return logs;
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            const localDateString = logDate.toLocaleDateString('en-CA');
            return localDateString === dateFilter;
        });
    }, [logs, dateFilter]);

    const categoryFilteredLogs = useMemo(() => {
        if (actionFilter === "ALL") return dateFilteredLogs;
        return dateFilteredLogs.filter(log => {
            const act = (log.action || "").toUpperCase();
            if (actionFilter === "LOGINS") return act.includes("LOGIN") || act.includes("AUTH");
            if (actionFilter === "CALLED") return act.includes("CALL_NEXT") || act.includes("NEXT");
            if (actionFilter === "SKIPPED") return act.includes("SKIP");
            if (actionFilter === "REMOVED") return act.includes("REMOVE") || act.includes("DONE") || act.includes("CANCEL") || act.includes("DELETE");
            if (actionFilter === "STAFF") return act.includes("STAFF");
            if (actionFilter === "QUEUE") return act.includes("QUEUE") || act.includes("SESSION") || act.includes("BRANCH");
            return true;
        });
    }, [dateFilteredLogs, actionFilter]);

    const sortedLogs = useMemo(() => {
        return [...categoryFilteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [categoryFilteredLogs]);

    const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(start, start + itemsPerPage);
    }, [sortedLogs, currentPage]);

    const toggleRow = (idx: number) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const formatActionBadge = (actionStr: string) => {
        const act = (actionStr || "").toUpperCase();
        if (act.includes("LOGIN") || act.includes("AUTH")) return { label: "Login", dot: "bg-blue-500", style: "bg-blue-50 text-blue-700 border-blue-100" };
        if (act.includes("CALL_NEXT") || act.includes("NEXT")) return { label: "Called Next", dot: "bg-emerald-500", style: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        if (act.includes("SKIP")) return { label: "Skipped", dot: "bg-amber-400", style: "bg-amber-50 text-amber-700 border-amber-100" };
        if (act.includes("REMOVE") || act.includes("DONE") || act.includes("CANCEL") || act.includes("DEACTIVATE")) return { label: act.includes("STAFF") ? "Staff Deactivated" : "Removed", dot: "bg-rose-500", style: "bg-rose-50 text-rose-700 border-rose-100" };
        if (act.includes("RECALL")) return { label: "Recalled", dot: "bg-violet-500", style: "bg-violet-50 text-violet-700 border-violet-100" };
        if (act.includes("CREATE_STAFF") || act.includes("ADD_STAFF")) return { label: "Staff Created", dot: "bg-indigo-500", style: "bg-indigo-50 text-indigo-700 border-indigo-100" };
        if (act.includes("UPDATE_STAFF")) return { label: "Staff Updated", dot: "bg-sky-500", style: "bg-sky-50 text-sky-700 border-sky-100" };
        if (act.includes("ORG") || act.includes("SETTINGS")) return { label: actionStr.replace(/_/g, " "), dot: "bg-orange-400", style: "bg-orange-50 text-orange-700 border-orange-100" };
        if (act.includes("QUEUE") || act.includes("SESSION") || act.includes("BRANCH")) return { label: actionStr.replace(/_/g, " "), dot: "bg-cyan-500", style: "bg-cyan-50 text-cyan-700 border-cyan-100" };
        return { label: actionStr.replace(/_/g, " "), dot: "bg-slate-400", style: "bg-slate-50 text-slate-600 border-slate-200" };
    };

    const getInitials = (email: string) => {
        if (!email) return "?";
        const parts = email.split("@")[0].split(/[._-]/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return email.substring(0, 2).toUpperCase();
    };

    const avatarColor = (email: string) => {
        const colors = [
            "bg-indigo-100 text-indigo-700",
            "bg-emerald-100 text-emerald-700",
            "bg-violet-100 text-violet-700",
            "bg-rose-100 text-rose-700",
            "bg-amber-100 text-amber-700",
            "bg-sky-100 text-sky-700",
        ];
        const idx = (email || "").charCodeAt(0) % colors.length;
        return colors[idx];
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    const filterButtons = [
        { id: "ALL", label: "All Actions", icon: Activity },
        { id: "LOGINS", label: "Logins", icon: Key },
        { id: "SKIPPED", label: "Skipped", icon: SkipForward },
        { id: "REMOVED", label: "Removed / Served", icon: XCircle },
        { id: "STAFF", label: "Staff Ops", icon: UserCog },
        { id: "QUEUE", label: "Queue Controls", icon: Settings },
    ];

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Audit Trail</h1>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">
                        Monitor administrative actions and security events across branches.
                    </p>
                </div>
                <div className="shrink-0">
                    <BranchSelector />
                </div>
            </div>

            {/* ── Filter + Controls Row ── */}
            <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Action filter tabs */}
                <div className="flex flex-wrap items-center gap-1">
                    {filterButtons.map((btn) => {
                        const Icon = btn.icon;
                        const isActive = actionFilter === btn.id;
                        return (
                            <button
                                key={btn.id}
                                onClick={() => setActionFilter(btn.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all duration-150 ${
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                                {btn.label}
                            </button>
                        );
                    })}
                </div>

                {/* Right: event count + date picker */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400 hidden sm:block">
                        {sortedLogs.length} event{sortedLogs.length !== 1 ? 's' : ''}
                    </span>
                    <div className="w-px h-4 bg-slate-200 hidden sm:block" />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="text-[12px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all cursor-pointer"
                    />
                    {dateFilter && (
                        <button
                            onClick={() => setDateFilter("")}
                            className="text-[12px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main Table Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100">
                                <th className="px-5 py-3 w-[14%]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Timestamp</span>
                                </th>
                                <th className="px-5 py-3 w-[11%]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Branch</span>
                                </th>
                                <th className="px-5 py-3 w-[24%]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Performed By</span>
                                </th>
                                <th className="px-5 py-3 w-[18%]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Action Event</span>
                                </th>
                                <th className="px-5 py-3 w-[29%]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Summary</span>
                                </th>
                                <th className="px-3 py-3 w-[4%]" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                                                <Shield className="w-5 h-5 text-slate-300" />
                                            </div>
                                            <p className="text-[14px] font-bold text-slate-700">No audit events</p>
                                            <p className="text-[12px] text-slate-400 mt-1">
                                                {actionFilter !== "ALL" || dateFilter
                                                    ? "No events match your current filters."
                                                    : "All clear — no activity recorded yet."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log: any, idx: number) => {
                                    const badge = formatActionBadge(log.action);
                                    const isExpanded = expandedRows.has(idx);

                                    let parsedDetails: any = null;
                                    let summaryText = "—";

                                    if (log.details) {
                                        try {
                                            parsedDetails = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
                                            if (parsedDetails.token_number) {
                                                summaryText = `Token #${parsedDetails.token_number}`;
                                                if (parsedDetails.customer_name) summaryText += ` · ${parsedDetails.customer_name}`;
                                            } else if (parsedDetails.email) {
                                                summaryText = `Staff: ${parsedDetails.email}`;
                                            } else if (log.entity_type) {
                                                summaryText = `${log.entity_type.replace(/_/g, " ")} ${log.entity_id ? '#' + log.entity_id.split("-")[0] : ''}`;
                                            } else {
                                                const keys = Object.keys(parsedDetails).filter(k => k !== 'queue_name' && k !== 'action');
                                                if (keys.length > 0) summaryText = `${keys[0].replace(/_/g, " ")}: ${parsedDetails[keys[0]]}`;
                                            }
                                        } catch {
                                            summaryText = String(log.details).substring(0, 40) + "…";
                                        }
                                    }

                                    // Format timestamp
                                    const ts = new Date(log.timestamp);
                                    const dateStr = ts.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                                    const timeStr = ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                                    const initials = getInitials(log.user_email);
                                    const avColor = avatarColor(log.user_email);

                                    return (
                                        <React.Fragment key={idx}>
                                            <tr
                                                className={`group cursor-pointer transition-colors ${isExpanded ? "bg-indigo-50/30" : "hover:bg-slate-50/60"}`}
                                                onClick={() => toggleRow(idx)}
                                            >
                                                {/* Timestamp */}
                                                <td className="px-5 py-3.5">
                                                    <div className="text-[12px] font-semibold text-slate-700">{dateStr}</div>
                                                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">{timeStr}</div>
                                                </td>

                                                {/* Branch */}
                                                <td className="px-5 py-3.5">
                                                    <span className="text-[12.5px] font-medium text-slate-700 truncate block" title={log.branch}>
                                                        {log.branch || "—"}
                                                    </span>
                                                </td>

                                                {/* Performed By */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avColor}`}>
                                                            {initials}
                                                        </div>
                                                        <span className="text-[12.5px] font-medium text-slate-700 truncate" title={log.user_email}>
                                                            {log.user_email || "System"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Action Event */}
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap border ${badge.style}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                                        {badge.label}
                                                    </span>
                                                </td>

                                                {/* Summary */}
                                                <td className="px-5 py-3.5">
                                                    <span className="text-[12.5px] text-slate-600 font-medium truncate block" title={summaryText}>
                                                        {summaryText}
                                                    </span>
                                                </td>

                                                {/* Expand toggle */}
                                                <td className="px-3 py-3.5 text-right">
                                                    <div className={`p-1 rounded-md transition-colors inline-flex ${isExpanded ? "text-indigo-500 bg-indigo-50" : "text-slate-300 group-hover:text-slate-500"}`}>
                                                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Detail Row */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/60">
                                                    <td colSpan={6} className="px-5 py-4">
                                                        <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
                                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                                                <div className="flex items-center gap-2">
                                                                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                                                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Event Metadata</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] font-mono text-slate-400">Log ID: {log.id}</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigator.clipboard.writeText(log.id);
                                                                            toast.success("Log ID copied");
                                                                        }}
                                                                        className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                                                        title="Copy Log ID"
                                                                    >
                                                                        <Copy size={11} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                                                                {log.branch_slug && (
                                                                    <div>
                                                                        <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Branch Slug</span>
                                                                        <span className="font-mono text-[12px] text-slate-700 font-semibold">{log.branch_slug}</span>
                                                                    </div>
                                                                )}
                                                                {log.entity_type && (
                                                                    <div>
                                                                        <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Resource</span>
                                                                        <span className="text-[13px] font-semibold text-slate-800 capitalize">{log.entity_type.replace(/_/g, " ")}</span>
                                                                    </div>
                                                                )}
                                                                {log.entity_id && (
                                                                    <div>
                                                                        <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Resource ID</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="font-mono text-[12px] text-slate-700 font-semibold" title={log.entity_id}>
                                                                                {log.entity_id.includes("-") ? `${log.entity_id.split("-")[0]}…` : log.entity_id}
                                                                            </span>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    navigator.clipboard.writeText(log.entity_id);
                                                                                    toast.success("Resource ID copied");
                                                                                }}
                                                                                className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                                                                title="Copy full Resource ID"
                                                                            >
                                                                                <Copy size={11} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {parsedDetails && Object.entries(parsedDetails).map(([k, v], i) => (
                                                                    <div key={i} className={typeof v === 'object' && v !== null ? "col-span-2 sm:col-span-3 lg:col-span-4" : ""}>
                                                                        <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                                            {k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                                                        </span>
                                                                        {renderMetadataValue(v, k)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Feed */}
                <div className="block md:hidden divide-y divide-slate-100">
                    {paginatedLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                                <Shield className="w-5 h-5 text-slate-300" />
                            </div>
                            <p className="text-[13px] font-bold text-slate-700">No audit events</p>
                            <p className="text-[12px] text-slate-400 mt-1 px-6">
                                {actionFilter !== "ALL" || dateFilter ? "No events match your filters." : "No activity recorded yet."}
                            </p>
                        </div>
                    ) : (
                        paginatedLogs.map((log: any, idx: number) => {
                            const badge = formatActionBadge(log.action);
                            const isExpanded = expandedRows.has(idx);
                            const initials = getInitials(log.user_email);
                            const avColor = avatarColor(log.user_email);
                            const ts = new Date(log.timestamp);

                            return (
                                <div key={idx} className="p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${badge.style}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                            {badge.label}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-400">
                                            {ts.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avColor}`}>
                                            {initials}
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-bold text-slate-900 break-all">{log.user_email}</div>
                                            <div className="text-[11px] text-slate-400 font-medium">{log.branch}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleRow(idx)}
                                        className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[12px] font-semibold text-slate-600 flex items-center justify-between transition-colors"
                                    >
                                        View Metadata {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                    {isExpanded && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="text-slate-400">Resource</div>
                                                <div className="font-semibold text-slate-800 text-right capitalize">{log.entity_type ? log.entity_type.replace(/_/g, " ") : "—"}</div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="text-slate-400">Resource ID</div>
                                                <div className="font-mono text-slate-700 text-right text-[10px] truncate">{log.entity_id || "—"}</div>
                                            </div>
                                            {log.details && (
                                                <div className="pt-2 border-t border-slate-200">
                                                    <div className="font-semibold text-slate-700 mb-1.5">Payload</div>
                                                    <pre className="text-[10px] bg-white border border-slate-100 p-2 rounded-lg text-slate-600 overflow-x-auto">
                                                        {typeof log.details === 'string' ? JSON.stringify(JSON.parse(log.details), null, 2) : JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Pagination Footer ── */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-white">
                    <span className="text-[12px] text-slate-500">
                        {sortedLogs.length === 0 ? "No events" : (
                            <>
                                <strong className="text-slate-800">{((currentPage - 1) * itemsPerPage) + 1}</strong>
                                –
                                <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, sortedLogs.length)}</strong>
                                {" "}of{" "}
                                <strong className="text-slate-800">{sortedLogs.length}</strong>
                                {" "}events
                            </>
                        )}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="px-3 text-[12px] font-semibold text-slate-600">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
