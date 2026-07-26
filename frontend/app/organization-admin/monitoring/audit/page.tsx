"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { 
    Activity, 
    Shield, 
    ChevronLeft, 
    ChevronRight, 
    Info, 
    Filter,
    Key,
    PhoneCall,
    SkipForward,
    XCircle,
    UserCog,
    Settings,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import BranchSelector from "@/components/organization-admin/BranchSelector";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [actionFilter, setActionFilter] = useState<string>("ALL");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const itemsPerPage = 12;

    const { selectedBranchId } = useBranchFilter();

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        setExpandedRows(new Set());
    }, [selectedBranchId, actionFilter, dateFilter]);

    useEffect(() => {
        const loadData = () => {
            api.getOrgAdminAudit(selectedBranchId || undefined)
                .then(res => {
                    // Filter out customer join, token completion, and call next events for clean admin/staff audit tracking
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
        const interval = setInterval(loadData, 15000); // 15s polling
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    const dateFilteredLogs = useMemo(() => {
        if (!dateFilter) return logs;
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            // en-CA produces YYYY-MM-DD format based on local time
            const localDateString = logDate.toLocaleDateString('en-CA'); 
            return localDateString === dateFilter;
        });
    }, [logs, dateFilter]);

    // Action category filtering logic
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

    // Helper to format action tag badge & label
    const formatActionBadge = (actionStr: string) => {
        const act = (actionStr || "").toUpperCase();
        
        if (act.includes("LOGIN") || act.includes("AUTH")) {
            return {
                label: "Login",
                dot: "bg-blue-500",
                style: "bg-blue-50 text-blue-700 border border-blue-100"
            };
        }
        if (act.includes("CALL_NEXT") || act.includes("NEXT")) {
            return {
                label: "Called Next",
                dot: "bg-emerald-500",
                style: "bg-emerald-50 text-emerald-700 border border-emerald-100"
            };
        }
        if (act.includes("SKIP")) {
            return {
                label: "Skipped",
                dot: "bg-amber-400",
                style: "bg-amber-50 text-amber-700 border border-amber-100"
            };
        }
        if (act.includes("REMOVE") || act.includes("DONE") || act.includes("CANCEL") || act.includes("DEACTIVATE")) {
            return {
                label: act.includes("STAFF") ? "Staff Deactivated" : "Removed",
                dot: "bg-rose-500",
                style: "bg-rose-50 text-rose-700 border border-rose-100"
            };
        }
        if (act.includes("RECALL")) {
            return {
                label: "Recalled",
                dot: "bg-violet-500",
                style: "bg-violet-50 text-violet-700 border border-violet-100"
            };
        }
        if (act.includes("CREATE_STAFF") || act.includes("ADD_STAFF")) {
            return {
                label: "Staff Created",
                dot: "bg-indigo-500",
                style: "bg-indigo-50 text-indigo-700 border border-indigo-100"
            };
        }
        if (act.includes("UPDATE_STAFF")) {
            return {
                label: "Staff Updated",
                dot: "bg-sky-500",
                style: "bg-sky-50 text-sky-700 border border-sky-100"
            };
        }
        if (act.includes("QUEUE") || act.includes("SESSION") || act.includes("BRANCH")) {
            return {
                label: actionStr.replace(/_/g, " "),
                dot: "bg-cyan-500",
                style: "bg-cyan-50 text-cyan-700 border border-cyan-100"
            };
        }

        return {
            label: actionStr.replace(/_/g, " "),
            dot: "bg-slate-400",
            style: "bg-slate-50 text-slate-600 border border-slate-200"
        };
    };

    const getInitials = (email: string) => {
        if (!email) return "?";
        const parts = email.split("@")[0].split(/[._-]/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center bg-slate-50/50">
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
        { id: "QUEUE", label: "Queue Controls", icon: Settings }
    ];

    return (
        <div className="space-y-6">
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Audit Trail
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Monitor administrative actions and security events across branches.</span>
                    </div>
                </div>
                <div className="shrink-0">
                    <BranchSelector />
                </div>
            </div>

            <div className="space-y-4">
                
                {/* Filter Tabs + Date Picker — single unified row, no scroll */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
                    {/* Action filter tabs */}
                    <div className="flex flex-wrap items-center gap-1">
                        {filterButtons.map((btn) => {
                            const Icon = btn.icon;
                            const isActive = actionFilter === btn.id;
                            return (
                                <button
                                    key={btn.id}
                                    onClick={() => setActionFilter(btn.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                                        isActive
                                            ? "text-indigo-700 bg-indigo-50"
                                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                                    }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-500" : "text-slate-400"}`} />
                                    {btn.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Date picker */}
                    <div className="shrink-0 flex items-center gap-1.5">
                        <input
                            type="date"
                            id="dateFilter"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200/80 text-slate-600 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors cursor-pointer"
                        />
                        {dateFilter && (
                            <button
                                onClick={() => setDateFilter("")}
                                className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200/80 text-slate-500 bg-white shadow-xs hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Table Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Desktop View Table — table-fixed enforces column widths, no scrollbar */}
                    <div className="hidden md:block">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wide">
                                    <th className="px-4 py-3 w-[15%]">Timestamp</th>
                                    <th className="px-4 py-3 w-[10%]">Branch</th>
                                    <th className="px-4 py-3 w-[25%]">Performed By</th>
                                    <th className="px-4 py-3 w-[20%]">Action Event</th>
                                    <th className="px-4 py-3 w-[26%]">Summary</th>
                                    <th className="px-4 py-3 w-[4%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {paginatedLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                                                    <Activity className="w-5 h-5 text-slate-400" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">No audit events</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {actionFilter !== "ALL" || dateFilter
                                                        ? "No events match your current filters."
                                                        : "All clear — no activity recorded yet for this branch."
                                                    }
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLogs.map((log: any, idx: number) => {
                                        const badge = formatActionBadge(log.action);
                                        const isExpanded = expandedRows.has(idx);
                                        
                                        let parsedDetails: any = null;
                                        let summaryText = "-";
                                        
                                        if (log.details) {
                                            try {
                                                parsedDetails = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
                                                // Create a clean summary string
                                                if (parsedDetails.token_number) {
                                                    summaryText = `Token #${parsedDetails.token_number}`;
                                                    if (parsedDetails.customer_name) summaryText += ` • ${parsedDetails.customer_name}`;
                                                } else if (parsedDetails.email) {
                                                    summaryText = `Staff: ${parsedDetails.email}`;
                                                } else if (log.entity_type) {
                                                    summaryText = `${log.entity_type.replace(/_/g, " ")} ${log.entity_id ? '#' + log.entity_id.split("-")[0] : ''}`;
                                                } else {
                                                    const keys = Object.keys(parsedDetails).filter(k => k !== 'queue_name' && k !== 'action');
                                                    if (keys.length > 0) {
                                                        summaryText = `${keys[0].replace(/_/g, " ")}: ${parsedDetails[keys[0]]}`;
                                                    }
                                                }
                                            } catch {
                                                summaryText = String(log.details).substring(0, 30) + "...";
                                            }
                                        }

                                        const localTime = new Date(log.timestamp).toLocaleString(undefined, {
                                            month: "short", day: "numeric",
                                            hour: "2-digit", minute: "2-digit"
                                        });
                                        const initials = getInitials(log.user_email);

                                        return (
                                            <React.Fragment key={idx}>
                                                <tr
                                                    className={`hover:bg-slate-50/40 transition-colors group cursor-pointer ${isExpanded ? "bg-indigo-50/30" : ""}`}
                                                    onClick={() => toggleRow(idx)}
                                                >
                                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs truncate">
                                                        {localTime}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-800 truncate">
                                                        {log.branch}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {initials}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-700 truncate" title={log.user_email}>
                                                                {log.user_email || "System"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.style}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 truncate font-medium">
                                                        {summaryText}
                                                    </td>
                                                    <td className="px-2 py-3 text-right">
                                                        <button className="p-1.5 text-slate-300 hover:text-slate-600 rounded transition-colors opacity-0 group-hover:opacity-100">
                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {/* Expandable Details Row — px-5 matches table cell alignment */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/60 border-t border-indigo-100/60">
                                                        <td colSpan={6} className="px-5 py-4">
                                                            <div className="bg-white rounded-lg border border-slate-200/60 p-4 shadow-xs">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <Info className="w-4 h-4 text-slate-400" />
                                                                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Event Metadata</h4>
                                                                </div>
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                                                                    {log.entity_type && (
                                                                        <div>
                                                                            <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Resource</span>
                                                                            <span className="text-sm font-medium text-slate-800 capitalize">{log.entity_type.replace(/_/g, " ")}</span>
                                                                        </div>
                                                                    )}
                                                                    {log.entity_id && (
                                                                        <div>
                                                                            <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Resource ID</span>
                                                                            <span className="font-mono text-sm text-slate-600">{log.entity_id.split("-")[0]}&hellip;</span>
                                                                        </div>
                                                                    )}
                                                                    {parsedDetails && Object.entries(parsedDetails).map(([k, v], i) => (
                                                                        <div key={i}>
                                                                            <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 capitalize">{k.replace(/_/g, " ")}</span>
                                                                            <span className="text-sm font-medium text-slate-800 truncate block" title={String(v)}>{String(v)}</span>
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
                    <div className="block md:hidden divide-y divide-slate-100 bg-white">
                        {paginatedLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                                    <Activity className="w-4 h-4 text-slate-400" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">No audit events</p>
                                <p className="text-xs text-slate-400 mt-1 px-6">
                                    {actionFilter !== "ALL" || dateFilter
                                        ? "No events match your current filters."
                                        : "No activity recorded yet."
                                    }
                                </p>
                            </div>
                        ) : (
                            paginatedLogs.map((log: any, idx: number) => {
                                const badge = formatActionBadge(log.action);
                                const isExpanded = expandedRows.has(idx);
                                const initials = getInitials(log.user_email);
                                
                                return (
                                    <div key={idx} className="p-5 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${badge.style}`}>
                                                {badge.label}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">
                                                {new Date(log.timestamp).toLocaleTimeString(undefined, {
                                                    hour: "2-digit", minute: "2-digit"
                                                })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                {initials}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm break-all">{log.user_email}</div>
                                                <div className="text-xs text-slate-500 font-medium">{log.branch}</div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => toggleRow(idx)}
                                            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                                        >
                                            View Metadata {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        
                                        {isExpanded && (
                                            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="text-slate-500">Resource:</div>
                                                    <div className="font-medium text-slate-800 text-right capitalize">
                                                        {log.entity_type ? log.entity_type.replace(/_/g, " ") : "-"}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="text-slate-500">Resource ID:</div>
                                                    <div className="font-mono text-slate-800 text-right text-[10px] truncate">
                                                        {log.entity_id || "-"}
                                                    </div>
                                                </div>
                                                {log.details && (
                                                    <div className="pt-2 border-t border-slate-200 mt-2">
                                                        <div className="font-semibold text-slate-900 mb-1">Payload:</div>
                                                        <pre className="text-[10px] bg-white border border-slate-200 p-2 rounded-lg text-slate-700 overflow-x-auto">
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

                    {/* Pagination — flush px-5 to match table cells */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
                            <div className="text-xs text-slate-500">
                                Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, sortedLogs.length)}</span> of <span className="font-semibold text-slate-700">{sortedLogs.length}</span> events
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all cursor-pointer"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <div className="px-2.5 text-xs font-medium text-slate-600">
                                    {currentPage} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all cursor-pointer"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
