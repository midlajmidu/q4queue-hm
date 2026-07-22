"use client";

import React from "react";
import { api } from "@/lib/api";
import { ServingToken } from "@/types/api";
import { CheckCircle, PhoneCall, FastForward, UserPlus, Check, ChevronDown, LayoutGrid, List, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

interface Props {
    queueId: string;
    serviceLines: number;
    allServingTokens: ServingToken[];
    prefix: string;
    onUpdate: () => void; // refresh after action
    isGlobalOrOrgAdmin?: boolean;
    isPaused?: boolean;
    isReadOnly?: boolean;
    enableSharedTokens?: boolean;
}

export default function ServiceLinesGrid({
    queueId,
    serviceLines,
    allServingTokens,
    prefix,
    onUpdate,
    isGlobalOrOrgAdmin = false,
    isPaused = false,
    isReadOnly = false,
    enableSharedTokens = false,
}: Props) {
    const [loadingLine, setLoadingLine] = React.useState<number | null>(null);
    const [expandedLine, setExpandedLine] = React.useState<number | null>(null);
    const [mobileExpandAll, setMobileExpandAll] = React.useState(false);

    const [sharingForLine, setSharingForLine] = React.useState<number | null>(null);

    const shareToken = async (lineNum: number, tokenNumber: number) => {
        setLoadingLine(lineNum);
        try {
            await api.shareToken(queueId, tokenNumber, lineNum);
            toast.success(`Token ${prefix}${tokenNumber} shared to Lane ${lineNum}`);
            onUpdate();
        } catch {
            toast.error(`Failed to share token to Lane ${lineNum}`);
        } finally {
            setLoadingLine(null);
            setSharingForLine(null);
        }
    };


    // Build a map of line_number -> token for O(1) lookup
    const lineMap = React.useMemo(() => {
        const map = new Map<number, ServingToken>();
        for (const t of allServingTokens) {
            const completed = t.completed_lines ?? [];
            if (t.assigned_line !== null && t.assigned_line !== undefined && !completed.includes(t.assigned_line)) {
                map.set(t.assigned_line, t);
            }
            for (const sl of t.shared_lines ?? []) {
                if (!completed.includes(sl)) {
                    map.set(sl, t);
                }
            }
        }
        return map;
    }, [allServingTokens]);

    const callNext = async (lineNum: number, status: "done" | "skipped" = "done") => {
        setLoadingLine(lineNum);
        try {
            const res = await api.callNext(queueId, status, lineNum);
            if ("message" in res) {
                toast.info(res.message);
            } else {
                toast.success(status === "skipped" ? `Skipped current and called next to Lane ${lineNum}` : `Called next customer to Lane ${lineNum}`);
            }
            onUpdate();
        } catch {
            toast.error(`Failed to call next for Lane ${lineNum}`);
        } finally {
            setLoadingLine(null);
        }
    };

    const clearLine = async (lineNum: number) => {
        setLoadingLine(lineNum);
        try {
            await api.clearLine(queueId, lineNum);
            toast.success(`Lane ${lineNum} cleared`);
            onUpdate();
        } catch {
            toast.error(`Failed to clear Lane ${lineNum}`);
        } finally {
            setLoadingLine(null);
        }
    };

    const toggleExpand = (lineNum: number) => {
        setExpandedLine(prev => prev === lineNum ? null : lineNum);
    };

    return (
        <div style={{ marginBottom: 24 }}>
            <div className="flex items-center justify-between mb-3.5">
                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--q-text)", margin: 0 }}>
                        Service Lanes
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--q-text-muted)", margin: "2px 0 0" }}>
                        {allServingTokens.length} of {serviceLines} lanes occupied
                    </p>
                </div>

                {/* Mobile Toggle: Compact / Expanded */}
                <button
                    type="button"
                    onClick={() => { setMobileExpandAll(prev => !prev); setExpandedLine(null); }}
                    className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 dark:hover:border-indigo-500/40 shadow-sm"
                >
                    {mobileExpandAll ? (
                        <><List size={14} /> Compact</>
                    ) : (
                        <><LayoutGrid size={14} /> Expand</>
                    )}
                </button>
            </div>

            {/* Desktop Grid (md and up) */}
            <div className="hidden md:grid" style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
            }}>
                {Array.from({ length: serviceLines }, (_, i) => i + 1).map((lineNum) => {
                    const token = lineMap.get(lineNum);
                    const isOccupied = !!token;
                    const isLoading = loadingLine === lineNum;
                    const isShared = token != null && token.assigned_line !== lineNum;

                    return (
                        <div
                            key={lineNum}
                            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 transition-all duration-300 ${isOccupied
                                ? isShared
                                    ? "bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-500/30 shadow-[0_4px_20px_rgb(99,102,241,0.06)]"
                                    : "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 shadow-[0_4px_20px_rgb(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)]"
                                : "bg-slate-50/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-900"
                                }`}
                            style={isOccupied ? (isShared ? {
                                boxShadow: "0 0 0 1px rgba(99, 102, 241, 0.15), 0 4px 15px -2px rgba(99, 102, 241, 0.1)"
                            } : {
                                boxShadow: "0 0 0 1px rgba(16, 185, 129, 0.1), 0 4px 15px -2px rgba(16, 185, 129, 0.1)"
                            }) : {}}
                        >
                            {/* Header: Line Number & Status Pill */}
                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${isOccupied ? (isShared ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400") : "text-slate-400 dark:text-slate-500"}`}>
                                        Lane {lineNum}
                                    </span>
                                </div>
                                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${isOccupied
                                    ? isShared
                                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
                                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent"
                                    }`}>
                                    {isOccupied ? (isShared ? "Shared" : "Serving") : "Available"}
                                </span>
                            </div>

                            {isOccupied && token ? (
                                <div className="flex flex-col flex-1 relative z-10">
                                    {/* Token number */}
                                    <div className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                                        <span className={isShared ? "text-indigo-500 font-bold" : "text-emerald-500 font-bold"}>{prefix}</span>{token.token_number}
                                    </div>
                                    <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-3 truncate flex items-center">
                                        <span className="truncate">{token.customer_name || "Guest"}</span>
                                        {((token as any).pax_count && (token as any).pax_count > 1) && (
                                            <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] ml-1.5 shadow-sm border border-slate-200 dark:border-slate-700" title={`Total Pax: ${(token as any).pax_count}`}>
                                                <Users size={10} className="text-slate-400" />
                                                +{(token as any).pax_count - 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {!isGlobalOrOrgAdmin && !isReadOnly && (
                                        <div className="flex items-center gap-1.5 mt-auto">
                                            {isShared ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLoadingLine(lineNum);
                                                        api.removeSharedToken(queueId, lineNum)
                                                            .then(() => {
                                                                toast.success(`Removed token from Lane ${lineNum}`);
                                                                onUpdate();
                                                            })
                                                            .catch(() => toast.error("Failed to remove token"))
                                                            .finally(() => setLoadingLine(null));
                                                    }}
                                                    disabled={isLoading || isPaused}
                                                    title={isPaused ? "Queue is on a break" : "Unshare"}
                                                    className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition-colors disabled:opacity-50 px-1"
                                                >
                                                    Unshare
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => callNext(lineNum, "skipped")}
                                                        disabled={isLoading || isPaused}
                                                        title={isPaused ? "Queue is on a break" : "Skip & Next"}
                                                        className="flex-[1] flex items-center justify-center gap-1 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-[11px] font-bold transition-colors disabled:opacity-50 px-1"
                                                    >
                                                        <FastForward size={11} /> <span className="hidden sm:inline">Skip</span>
                                                    </button>
                                                    <button
                                                        onClick={() => callNext(lineNum, "done")}
                                                        disabled={isLoading || isPaused}
                                                        title={isPaused ? "Queue is on a break" : "Complete & Next"}
                                                        className="flex-[1.5] flex items-center justify-center gap-1 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-md shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 disabled:opacity-50 px-2"
                                                    >
                                                        <PhoneCall size={11} /> Next
                                                    </button>
                                                    <button
                                                        onClick={() => clearLine(lineNum)}
                                                        disabled={isLoading}
                                                        title="Clear Lane"
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 flex-shrink-0"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center justify-center flex-1 my-2">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                                            <UserPlus size={16} className="text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Empty Slot</span>
                                    </div>
                                    <div className="mt-auto relative z-10">
                                        {!isGlobalOrOrgAdmin && !isReadOnly && (
                                            <div className="flex items-center gap-1.5 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                                <button
                                                    onClick={() => callNext(lineNum)}
                                                    disabled={isLoading || isPaused}
                                                    title={isPaused ? "Queue is on a break" : undefined}
                                                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500 text-indigo-600 hover:text-white dark:text-indigo-400 text-[11px] font-bold disabled:opacity-50"
                                                >
                                                    <PhoneCall size={13} />
                                                    {isLoading ? "Calling..." : "Call Next"}
                                                </button>
                                                {enableSharedTokens && (
                                                    <button
                                                        onClick={() => setSharingForLine(lineNum)}
                                                        disabled={isLoading || isPaused}
                                                        className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold disabled:opacity-50 transition-colors"
                                                        title="Share a token currently serving in another lane"
                                                    >
                                                        <Plus size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile Cards (below md) */}
            <div className="md:hidden flex flex-col gap-2">
                {Array.from({ length: serviceLines }, (_, i) => i + 1).map((lineNum) => {
                    const token = lineMap.get(lineNum);
                    const isOccupied = !!token;
                    const isShared = token != null && token.assigned_line !== lineNum;
                    const isLoading = loadingLine === lineNum;
                    const isExpanded = mobileExpandAll || expandedLine === lineNum;

                    return (
                        <div key={lineNum} className="overflow-hidden rounded-xl transition-all duration-300">
                            {/* Collapsed Compact Card (always visible) */}
                            <div
                                className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-300 ${isOccupied
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                                    : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
                                    } ${isExpanded ? "rounded-t-xl rounded-b-none" : "rounded-xl"}`}
                            >
                                <button type="button" onClick={() => toggleExpand(lineNum)} className="flex items-center gap-3 flex-1 text-left">
                                    {/* Status Dot */}
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOccupied
                                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                                        : "bg-slate-300 dark:bg-slate-600"
                                        }`} />

                                    {/* Line Label */}
                                    <span className={`text-[11px] font-black uppercase tracking-wider ${isOccupied ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                                        }`}>
                                        L{lineNum}
                                    </span>

                                    {/* Divider */}
                                    <div className={`w-px h-5 ${isOccupied ? "bg-emerald-200 dark:bg-emerald-500/30" : "bg-slate-200 dark:bg-slate-600"}`} />

                                    {/* Token or Empty */}
                                    {isOccupied && token ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[17px] font-black tabular-nums text-slate-900 dark:text-white leading-none">
                                                <span className="text-emerald-500">{prefix}</span>{token.token_number}
                                            </span>
                                            {token.customer_name && (
                                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                                                    {token.customer_name}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500 italic">
                                            Available
                                        </span>
                                    )}
                                </button>

                                {/* Right: Inline Actions */}
                                <div className="flex items-center gap-2 pl-2">
                                    {!isGlobalOrOrgAdmin && !isReadOnly && (
                                        isOccupied ? (
                                            isShared ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLoadingLine(lineNum);
                                                        api.removeSharedToken(queueId, lineNum)
                                                            .then(() => {
                                                                toast.success(`Removed token from Lane ${lineNum}`);
                                                                onUpdate();
                                                            })
                                                            .catch(() => toast.error("Failed to remove token"))
                                                            .finally(() => setLoadingLine(null));
                                                    }}
                                                    disabled={isLoading}
                                                    className="h-7 px-3 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    Unshare
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => callNext(lineNum, "done")}
                                                    disabled={isLoading}
                                                    className="h-7 px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <PhoneCall size={11} /> Next
                                                </button>
                                            )
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => callNext(lineNum)}
                                                    disabled={isLoading || isPaused}
                                                    title={isPaused ? "Queue is on a break" : undefined}
                                                    className="h-7 px-3 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <PhoneCall size={11} /> {isLoading ? "..." : "Call"}
                                                </button>
                                                {enableSharedTokens && (
                                                    <button
                                                        onClick={() => setSharingForLine(lineNum)}
                                                        disabled={isLoading || isPaused}
                                                        className="h-7 w-7 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold disabled:opacity-50 flex items-center justify-center transition-colors"
                                                        title="Share a token currently serving in another lane"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    )}
                                    <button onClick={() => toggleExpand(lineNum)} className="p-1 -mr-1 text-slate-400 dark:text-slate-500">
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Full Card (slide down) */}
                            <div
                                className={`transition-all duration-300 ease-in-out origin-top ${isExpanded ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                                    } overflow-hidden`}
                            >
                                <div className={`p-4 border-x border-b rounded-b-xl ${isOccupied
                                    ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-500/20"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50"
                                    }`}>
                                    {isOccupied && token ? (
                                        <div className="flex flex-col gap-3">
                                            {/* Token Info */}
                                            <div className="flex items-center gap-3">
                                                <div className="text-[28px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
                                                    <span className="text-emerald-500 font-bold">{prefix}</span>{token.token_number}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                                        {token.customer_name || "Guest"}
                                                    </span>
                                                    {token.customer_phone && (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                            {token.customer_phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {!isGlobalOrOrgAdmin && !isReadOnly && (
                                                <div className="flex items-center gap-2">
                                                    {isShared ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLoadingLine(lineNum);
                                                                api.removeSharedToken(queueId, lineNum)
                                                                    .then(() => {
                                                                        toast.success(`Removed token from Lane ${lineNum}`);
                                                                        onUpdate();
                                                                    })
                                                                    .catch(() => toast.error("Failed to remove token"))
                                                                    .finally(() => setLoadingLine(null));
                                                            }}
                                                            disabled={isLoading || isPaused}
                                                            title={isPaused ? "Queue is on a break" : "Unshare"}
                                                            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12px] font-bold transition-colors disabled:opacity-50"
                                                        >
                                                            Unshare
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); callNext(lineNum, "skipped"); }}
                                                                disabled={isLoading || isPaused}
                                                                title={isPaused ? "Queue is on a break" : "Skip & Next"}
                                                                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[12px] font-bold transition-colors disabled:opacity-50"
                                                            >
                                                                <FastForward size={13} /> Skip
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); callNext(lineNum, "done"); }}
                                                                disabled={isLoading || isPaused}
                                                                title={isPaused ? "Queue is on a break" : "Complete & Next"}
                                                                className="flex-[1.5] flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-500 text-white text-[12px] font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                                                            >
                                                                <PhoneCall size={13} /> Next
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); clearLine(lineNum); }}
                                                                disabled={isLoading}
                                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-50 flex-shrink-0"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-center gap-2 py-2">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <UserPlus size={16} className="text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500">
                                                    No customer assigned
                                                </span>
                                            </div>
                                            {!isGlobalOrOrgAdmin && !isReadOnly && (
                                                <div className="flex w-full gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); callNext(lineNum); }}
                                                        disabled={isLoading}
                                                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 text-white text-[12px] font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                                                    >
                                                        <PhoneCall size={14} />
                                                        {isLoading ? "Calling..." : "Call Next"}
                                                    </button>
                                                    {enableSharedTokens && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSharingForLine(lineNum); }}
                                                            disabled={isLoading || isPaused}
                                                            className="flex-[0.5] flex items-center justify-center gap-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-bold disabled:opacity-50"
                                                        >
                                                            +Share
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ShareTokenModal
                isOpen={sharingForLine !== null}
                onClose={() => setSharingForLine(null)}
                lineNum={sharingForLine!}
                allServingTokens={allServingTokens}
                prefix={prefix}
                onShare={(tokenNumber) => shareToken(sharingForLine!, tokenNumber)}
            />
        </div>
    );
}

function ShareTokenModal({
    isOpen,
    onClose,
    lineNum,
    allServingTokens,
    prefix,
    onShare,
}: {
    isOpen: boolean;
    onClose: () => void;
    lineNum: number;
    allServingTokens: ServingToken[];
    prefix: string;
    onShare: (tokenNumber: number) => void;
}) {
    const [mounted, setMounted] = React.useState(false);
    
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;
    
    const availableTokens = allServingTokens.filter(t => {
        const isAlreadyInThisLane = t.assigned_line === lineNum || (t.shared_lines || []).includes(lineNum);
        if (isAlreadyInThisLane) return false;

        const completed = (t as any).completed_lines || [];
        if (completed.includes(lineNum)) return false;

        const currentLanes = 1 + (t.shared_lines || []).length;
        const paxCount = (t as any).pax_count || 1;
        if (currentLanes >= paxCount) return false;

        return true;
    });
    
    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Share Token to Lane {lineNum}</h3>
                <p className="text-sm text-slate-500 mb-4">Select an active token from another lane to process simultaneously.</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableTokens.length === 0 ? (
                        <div className="text-sm text-slate-400 py-4 text-center">No other tokens currently serving.</div>
                    ) : (
                        availableTokens.map(t => (
                            <button
                                key={t.id}
                                onClick={() => onShare(t.token_number)}
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left"
                            >
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white"><span className="text-emerald-500">{prefix}</span>{t.token_number}</div>
                                    <div className="text-xs text-slate-500">{t.customer_name || "Guest"} (from L{t.assigned_line})</div>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                    <Plus size={15} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
